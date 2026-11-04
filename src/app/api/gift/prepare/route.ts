import { ASSETS, GIFTABLE, USDC_MINT } from "@/lib/assets";
import { isSolanaAddress } from "@/lib/chains";
import { guard } from "@/lib/server/auth";
import { feeWallet } from "@/lib/server/fee-payer";
import { GiftError, buildPrepare } from "@/lib/server/gift";
import { balanceOf } from "@/lib/server/portfolio";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

// The first step of a gift: opens the gift wallet's account with Mofi's fee wallet as its only closer. The sender's
// browser signs it with the link's key, which it just made. It only runs for a sender who has the gift's amount in
// cash, so it can't be used just to make the fee wallet open accounts (empty ones are swept back anyway).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const denied = await guard(req, { counted: true, wallet: String(body?.owner ?? "") });
  if (denied) return denied;
  const asset = ASSETS.find((a) => a.symbol === body?.symbol);
  const owner = String(body?.owner ?? "");
  const gift = String(body?.gift ?? "");
  const dollars = Number(body?.amount);
  if (!asset || !GIFTABLE.has(asset.symbol)) return fail("Pick something to gift.");
  if (!isSolanaAddress(gift) || gift === owner || gift === (await feeWallet())?.address) return fail("Something went wrong. Try again.");
  if (!(dollars >= 1)) return fail("The smallest gift is $1.");
  try {
    if ((await balanceOf(owner, USDC_MINT)).ui < dollars) return fail("You don't have that much cash.");
    return Response.json({ transaction: await buildPrepare(gift, asset.mint) });
  } catch (e) {
    return fail(e instanceof GiftError ? e.message : "Couldn't set up this gift. Try again.", 502);
  }
}
