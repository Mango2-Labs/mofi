import { guard } from "@/lib/server/auth";
import { ASSETS, USDC_MINT } from "@/lib/assets";
import { JupiterError, ShortError, build, prices } from "@/lib/server/jupiter";
import { balanceOf } from "@/lib/server/portfolio";
import { inviterOf } from "@/lib/server/referral";
import { isSolanaAddress, toBaseUnits } from "@/lib/chains";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

// Sells are entered in dollars. Selling nearly everything (within 0.5%, or a cent, since Max rounds down) sells all of it,
// so no dust is left behind, and `emptied` is the account that then has nothing left in it.
async function sale(owner: string, mint: string, dollars: number) {
  const [{ raw, ui, accounts }, quotes] = await Promise.all([balanceOf(owner, mint), prices([mint])]);
  const worth = ui * (quotes[mint]?.usdPrice ?? 0);
  if (!raw || !worth) return null;
  if (dollars >= Math.min(worth * 0.995, worth - 0.01)) return { amount: raw.toString(), emptied: accounts.length === 1 ? accounts[0] : undefined };
  return { amount: ((raw * BigInt(Math.round((dollars / worth) * 1e6))) / BigInt(1e6)).toString() };
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
    const sold = buy ? null : await sale(taker, asset.mint, dollars);
    const amount = buy ? toBaseUnits(String(body.amount), 6) : sold?.amount;
    if (!amount) return fail(buy ? "Enter an amount." : `You don't have any ${asset.name} to sell.`);
    const { transaction, outAmount } = await build({ inputMint: buy ? USDC_MINT : asset.mint, outputMint: buy ? asset.mint : USDC_MINT, amount, taker, emptied: sold?.emptied, inviter: await inviterOf(taker) });
    return Response.json({ transaction, cashOut: buy ? null : Number(outAmount) / 1e6 });
  } catch (e) {
    if (e instanceof ShortError) return fail(buy ? "You don't have that much cash." : `You don't have that much ${asset.name}.`, 422);
    return fail(e instanceof JupiterError ? e.message : "Something went wrong. Try again.", 502);
  }
}
