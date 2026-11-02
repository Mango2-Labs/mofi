import { isSolanaAddress } from "@/lib/chains";
import { activity } from "@/lib/server/activity";

export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner") ?? "";
  if (!isSolanaAddress(owner)) return Response.json({ error: "Unknown wallet." }, { status: 400 });
  try {
    return Response.json(await activity(owner));
  } catch {
    return Response.json({ error: "Couldn't load your activity right now." }, { status: 502 });
  }
}
