import { isSolanaAddress } from "@/lib/chains";
import { giftHoldings } from "@/lib/server/gift";

// Whether a gift link still holds anything, so the sender's list can hide claimed ones.
export async function GET(req: Request) {
  const gift = new URL(req.url).searchParams.get("address") ?? "";
  if (!isSolanaAddress(gift)) return Response.json({ error: "Unknown gift." }, { status: 400 });
  try {
    return Response.json({ claimed: (await giftHoldings(gift)).length === 0 });
  } catch {
    return Response.json({ error: "Couldn't check this gift right now." }, { status: 502 });
  }
}
