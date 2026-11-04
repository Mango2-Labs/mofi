import { ASSETS, GIFTABLE, USDC_MINT } from "@/lib/assets";
import { isSolanaAddress, toBaseUnits } from "@/lib/chains";
import { guard } from "@/lib/server/auth";
import { cosign, feeWallet } from "@/lib/server/fee-payer";
import { giftReady } from "@/lib/server/gift";
import { JupiterError, order } from "@/lib/server/jupiter";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

// A gift: buys the asset with the sender's cash straight into a gift wallet whose key lives only in the gift link.
// The sender signs; Mofi's fee wallet pays the network fee. The gift wallet's account must already be open with the
// fee wallet as its only closer (see /api/gift/prepare), so the purchase opens nothing whose rent could be kept.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const denied = await guard(req, { counted: true, wallet: String(body?.owner ?? "") });
  if (denied) return denied;
  const asset = ASSETS.find((a) => a.symbol === body?.symbol);
  const owner = String(body?.owner ?? "");
  const gift = String(body?.gift ?? "");
  const amount = toBaseUnits(String(body?.amount ?? ""), 6);
  // SOL would arrive as plain SOL, which a claim doesn't move, so it isn't giftable.
  if (!asset || !GIFTABLE.has(asset.symbol)) return fail("Pick something to gift.");
  if (!isSolanaAddress(owner)) return fail("Your Mofi wallet isn't ready yet.");
  if (!isSolanaAddress(gift) || gift === owner) return fail("Something went wrong. Try again.");
  if (!amount || Number(body.amount) < 1) return fail("The smallest gift is $1.");

  try {
    const payer = await feeWallet();
    if (!payer) return fail("Gifts aren't set up yet.", 503);
    if (gift === payer.address) return fail("Something went wrong. Try again.");
    if (!(await giftReady(gift, asset.mint))) return fail("This gift wasn't set up. Try again.");
    const o = await order({ inputMint: USDC_MINT, outputMint: asset.mint, amount, taker: owner, receiver: gift, payer: payer.address });
    if (!o.transaction) return fail(o.errorCode === 1 ? "You don't have that much cash." : "Couldn't get a price right now. Try a different amount.", 422);
    return Response.json({ transaction: await cosign(o.transaction), requestId: o.requestId });
  } catch (e) {
    return fail(e instanceof JupiterError ? e.message : "Something went wrong. Try again.", 502);
  }
}
