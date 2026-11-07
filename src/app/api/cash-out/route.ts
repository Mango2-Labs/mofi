import { guard } from "@/lib/server/auth";
import { AuroraError, assets, createQuote } from "@/lib/server/aurora";
import { feeWallet, payUsdc } from "@/lib/server/fee-payer";
import { kvReady } from "@/lib/server/kv";
import { SetupError, knownAddress, permanentAddress, setupCost } from "@/lib/server/withdraw-setup";
import { SOL_USDC_ASSET, chainName, isSolanaAddress, looksLikeAddress, toBaseUnits } from "@/lib/chains";
import { usd } from "@/lib/format";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

// A withdrawal is a USDC transfer to a Solana address of Aurora's that pays out on the chosen chain. A normal one goes
// to the user's permanent address for that destination, so its USDC account is opened once. A private one (or any,
// while the shared store isn't set up) takes a fresh address from a quote each time. The server builds the transfer
// itself, so the fee wallet never signs for an address a client chose. Mofi charges nothing, except the exact cost of
// opening an account once a user's free openings are used up (see withdraw-setup.ts). Pricing never creates addresses.
// `amount` is everything taken from the user's cash: that setup cost, if any, and Aurora gets the rest.
// With `compare`, `amount` is what should arrive instead. It prices the withdrawal with and without Private (dry
// quotes) and returns the total to take, fees on top, before the user taps Withdraw.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const compare = body?.compare === true;
  // Price checks make nothing, so they don't count toward the hourly cap.
  const denied = await guard(req, { counted: !compare, wallet: String(body?.owner ?? "") });
  if (denied) return denied;
  const owner = String(body?.owner ?? "");
  const recipient = String(body?.recipient ?? "").trim();
  const amount = toBaseUnits(String(body?.amount ?? ""), 6);
  const privately = body?.private === true;
  if (!isSolanaAddress(owner)) return fail("Your Mofi wallet isn't ready yet.");
  if (!amount || Number(body.amount) < 1) return fail("Withdraw at least $1.");
  if (!feeWallet()) return fail("Withdrawals aren't set up yet.", 503);

  try {
    const to = (await assets()).find((a) => a.assetId === body?.assetId && a.assetId !== SOL_USDC_ASSET);
    if (!to) return fail("Pick where to send it.");
    if (!looksLikeAddress(recipient)) return fail(`Enter your ${chainName(to.chain)} address.`);
    const quote = (input: bigint, privately: boolean, dry: boolean) =>
      createQuote({
        amount: input.toString(),
        originAsset: SOL_USDC_ASSET,
        destinationAsset: to.assetId,
        recipient,
        refundTo: owner,
        dry,
        ...(privately && { confidentiality: "advanced" as const }),
      }).catch((e) => {
        // Aurora states its minimum in USDC base units ("try at least 2650360").
        const least = e instanceof AuroraError && e.message.match(/try at least (\d+)/)?.[1];
        if (least) throw new AuroraError(`The smallest withdrawal to ${chainName(to.chain)} right now is ${usd(Math.ceil(Number(least) / 1e4) / 100)}.`);
        if (privately && e instanceof AuroraError && /liquidity/i.test(e.message)) throw new AuroraError(`${to.symbol} on ${chainName(to.chain)} can't be sent privately right now. Turn off Private to send it.`);
        throw e;
      });
    const permanent = !privately && kvReady();

    if (compare) {
      const want = Number(amount) / 1e6;
      // Aurora's cost at this size is what goes in minus what comes out, so sending want + that cost arrives as about want.
      // The total is rounded up to a tenth of a cent, and exactly that is taken when the user withdraws.
      const price = async (privately: boolean) => {
        const known = !privately && kvReady() ? await knownAddress(owner, to.chain, to.assetId, recipient) : null;
        const [q, setup] = await Promise.all([quote(BigInt(amount), privately, true), setupCost(owner, known)]);
        const cost = Math.max(0, want - q.amountOutUsd);
        return {
          total: Math.ceil((want + cost + setup) * 1000) / 1000,
          setup,
          amountOut: q.amountOutUsd > 0 ? (Number(q.amountOut) * want) / q.amountOutUsd : Number(q.amountOut),
          timeEstimate: q.timeEstimate,
        };
      };
      const [plain, hidden] = await Promise.all([price(false), price(true).catch(() => null)]);
      // private is null when there's no private route for this coin right now.
      return Response.json({ plain, private: hidden });
    }

    // The setup cost is worked out again here and must match what the user saw, so nobody pays a surprise.
    const depositAddress = permanent ? await permanentAddress(owner, to.chain, to.assetId, recipient) : null;
    const setup = await setupCost(owner, depositAddress, { reserve: true });
    if (Math.abs(setup - Number(body?.setup ?? 0)) > 0.0005) return fail("The network setup cost changed. Check the new total and try again.", 409);
    const fee = BigInt(Math.round(setup * 1e6));
    const send = BigInt(amount) - fee;
    if (!depositAddress) {
      const q = await quote(send, privately, false);
      const transaction = await payUsdc(owner, q.depositAddress, send, fee);
      return Response.json({ transaction, depositAddress: q.depositAddress, amountOut: q.amountOut, timeEstimate: q.timeEstimate });
    }
    // A permanent address converts at arrival, so the payout shown is a dry quote's estimate.
    const estimate = await quote(send, false, true).catch(() => null);
    const transaction = await payUsdc(owner, depositAddress!, send, fee);
    return Response.json({ transaction, depositAddress, permanent: true, amountOut: estimate?.amountOut ?? null, timeEstimate: estimate?.timeEstimate ?? 120 });
  } catch (e) {
    return fail(e instanceof AuroraError || e instanceof SetupError ? e.message : "Something went wrong. Try again.", 502);
  }
}
