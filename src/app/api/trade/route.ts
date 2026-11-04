import { guard } from "@/lib/server/auth";
import { ASSETS, USDC_MINT } from "@/lib/assets";
import { cosign, feeWallet } from "@/lib/server/fee-payer";
import { JupiterError, order, prices, type Order } from "@/lib/server/jupiter";
import { balanceOf } from "@/lib/server/portfolio";
import { isSolanaAddress, toBaseUnits } from "@/lib/chains";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

// Error codes from Jupiter's aggregator routes. RFQ routes reuse the numbers with other meanings.
function orderError(o: Order, buy: boolean, name: string) {
  if (o.router !== "jupiterz" && o.errorCode === 1) return buy ? "You don't have that much cash." : `You don't have that much ${name}.`;
  // 2: the wallet has no SOL for fees. 3: too small for Jupiter to cover the fees itself (about $5 and up).
  if (o.router !== "jupiterz" && (o.errorCode === 2 || o.errorCode === 3)) return "Try a larger amount.";
  return "Couldn't get a price right now. Try a different amount.";
}

// Sells are entered in dollars. Selling nearly everything sells all of it, so no dust is left behind.
async function sellAmount(owner: string, mint: string, dollars: number) {
  const [{ raw, ui }, quotes] = await Promise.all([balanceOf(owner, mint), prices([mint])]);
  const worth = ui * (quotes[mint]?.usdPrice ?? 0);
  if (!raw || !worth) return null;
  if (dollars >= worth * 0.995) return raw.toString();
  return ((raw * BigInt(Math.round((dollars / worth) * 1e6))) / BigInt(1e6)).toString();
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const denied = await guard(req, { counted: true, wallet: String(body?.taker ?? "") });
  if (denied) return denied;
  const asset = ASSETS.find((a) => a.symbol === body?.symbol);
  const taker = String(body?.taker ?? "");
  const dollars = Number(body?.amount);
  if (!asset || (body.side !== "buy" && body.side !== "sell")) return fail("Pick something to buy or sell.");
  if (!isSolanaAddress(taker)) return fail("Your Mofi wallet isn't ready yet.");
  if (!(dollars > 0)) return fail("Enter an amount.");
  if (body.side === "buy" && dollars < 1) return fail("The smallest buy is $1.");

  const buy = body.side === "buy";
  try {
    const amount = buy ? toBaseUnits(String(body.amount), 6) : await sellAmount(taker, asset.mint, dollars);
    if (!amount) return fail(buy ? "Enter an amount." : `You don't have any ${asset.name} to sell.`);
    const params = { inputMint: buy ? USDC_MINT : asset.mint, outputMint: buy ? asset.mint : USDC_MINT, amount, taker };
    // Mofi's fee wallet pays the network fee, so any amount works. If it can't, Jupiter covers it from the swap.
    const payer = await feeWallet();
    const paid = payer ? await order({ ...params, payer: payer.address }).catch(() => null) : null;
    const sponsored = !!paid?.transaction;
    const o = paid?.transaction ? { ...paid, transaction: await cosign(paid.transaction) } : await order(params);
    if (!o.transaction) return fail(orderError(o, buy, asset.name), 422);
    return Response.json({ transaction: o.transaction, requestId: o.requestId, feeBps: o.feeBps, sponsored, cashOut: buy ? null : Number(o.outAmount) / 1e6 });
  } catch (e) {
    return fail(e instanceof JupiterError ? e.message : "Something went wrong. Try again.", 502);
  }
}
