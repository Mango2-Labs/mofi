import { portfolio } from "@/lib/server/portfolio";
import { isSolanaAddress } from "@/lib/chains";

export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner") ?? "";
  if (!isSolanaAddress(owner)) return Response.json({ error: "Unknown wallet." }, { status: 400 });
  try {
    return Response.json(await portfolio(owner));
  } catch {
    return Response.json({ error: "Couldn't read balances right now." }, { status: 502 });
  }
}
