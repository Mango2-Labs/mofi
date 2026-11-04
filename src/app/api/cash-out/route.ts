import { guard } from "@/lib/server/auth";
import { AuroraError, assets, createQuote } from "@/lib/server/aurora";
import { feeWallet, payUsdc } from "@/lib/server/fee-payer";
import { SOL_USDC_ASSET, chainName, isSolanaAddress, looksLikeAddress, toBaseUnits } from "@/lib/chains";
import { CASH_OUT_NETWORK_FEE } from "@/lib/fees";
import { usd } from "@/lib/format";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

// The flat network fee covers what the fee wallet spends in SOL on each withdrawal.
const NETWORK_FEE = BigInt(Math.round(CASH_OUT_NETWORK_FEE * 1e6));

// Aurora gives a Solana deposit address that pays out on the chosen chain. The server builds the
// user's USDC transfer to it in the same request, so the fee wallet never signs for an address a client chose.
// `amount` is everything taken from the user's cash: the network fee, and Aurora gets the rest.
// With `compare`, `amount` is what should arrive instead. It prices the withdrawal with and without Private
// (dry quotes, no deposit address) and returns the total to take, fees on top, before the user taps Withdraw.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const compare = body?.compare === true;
  // Price checks make nothing, so they don't count toward the hourly cap.
  const denied = await guard(req, { counted: !compare, wallet: String(body?.owner ?? "") });
  if (denied) return denied;
  const owner = String(body?.owner ?? "");
  const recipient = String(body?.recipient ?? "").trim();
  const amount = toBaseUnits(String(body?.amount ?? ""), 6);
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
    if (compare) {
      const want = Number(amount) / 1e6;
      // Aurora's cost at this size is what goes in minus what comes out, so sending want + that cost arrives as about want.
      // The total is rounded up to a tenth of a cent, and exactly that is taken when the user withdraws.
      const price = async (privately: boolean) => {
        const q = await quote(BigInt(amount), privately, true);
        const cost = Math.max(0, want - q.amountOutUsd);
        return {
          total: Math.ceil((want + cost + CASH_OUT_NETWORK_FEE) * 1000) / 1000,
          amountOut: q.amountOutUsd > 0 ? (Number(q.amountOut) * want) / q.amountOutUsd : Number(q.amountOut),
          timeEstimate: q.timeEstimate,
        };
      };
      const [plain, hidden] = await Promise.all([price(false), price(true).catch(() => null)]);
      // private is null when there's no private route for this coin right now.
      return Response.json({ plain, private: hidden });
    }
    const send = BigInt(amount) - NETWORK_FEE;
    const q = await quote(send, body?.private === true, false);
    const transaction = await payUsdc(owner, q.depositAddress, send, NETWORK_FEE);
    return Response.json({ transaction, depositAddress: q.depositAddress, amountOut: q.amountOut, timeEstimate: q.timeEstimate });
  } catch (e) {
    return fail(e instanceof AuroraError ? e.message : "Something went wrong. Try again.", 502);
  }
}
