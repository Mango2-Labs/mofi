import { isSolanaAddress } from "@/lib/chains";
import { guard } from "@/lib/server/auth";
import { feeWallet } from "@/lib/server/fee-payer";
import { GiftError, buildClaim } from "@/lib/server/gift";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

// The claim transaction for a gift link, for the claimer's browser to sign with the link's key.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const denied = await guard(req, { counted: true, wallet: String(body?.to ?? "") });
  if (denied) return denied;
  const gift = String(body?.gift ?? "");
  const to = String(body?.to ?? "");
  if (!isSolanaAddress(gift) || !isSolanaAddress(to) || gift === to) return fail("This gift link isn't valid.");
  // A claim moves everything out of the "gift" wallet, so it must never be the fee wallet.
  if (gift === (await feeWallet())?.address) return fail("This gift link isn't valid.");
  try {
    return Response.json({ transaction: await buildClaim(gift, to) });
  } catch (e) {
    return fail(e instanceof GiftError ? e.message : "Couldn't set up the claim. Try again.", e instanceof GiftError ? 422 : 502);
  }
}
