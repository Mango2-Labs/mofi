import { isSolanaAddress } from "@/lib/chains";
import { guard } from "@/lib/server/auth";
import { kvReady } from "@/lib/server/kv";
import { UsernameError, claim, isFree, usernameOf } from "@/lib/server/username";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

// A wallet's username (?wallet=), or whether a name is still free (?name=). `ready` is false where usernames
// aren't set up, so the app doesn't ask for one.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  try {
    if (name !== null) return Response.json({ free: await isFree(name) });
    const wallet = searchParams.get("wallet") ?? "";
    if (!isSolanaAddress(wallet)) return fail("Unknown wallet.");
    return Response.json({ username: await usernameOf(wallet), ready: kvReady() });
  } catch {
    return fail("Couldn't check that right now.", 502);
  }
}

// Picks the signed-in user's username. It's picked once and doesn't change.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const wallet = String(body?.wallet ?? "");
  const denied = await guard(req, { counted: true, wallet });
  if (denied) return denied;
  try {
    return Response.json({ username: await claim(wallet, String(body?.username ?? "")) });
  } catch (e) {
    return e instanceof UsernameError ? fail(e.message, 409) : fail("Couldn't save that right now. Try again.", 502);
  }
}
