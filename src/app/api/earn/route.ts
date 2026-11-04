import { guard } from "@/lib/server/auth";
import { isSolanaAddress } from "@/lib/chains";
import { earnMetrics } from "@/lib/server/earn";
import { KaminoError, buildEarnMove } from "@/lib/server/kamino";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

// Earn's current yearly rate.
export async function GET() {
  try {
    return Response.json({ apy: (await earnMetrics()).apy });
  } catch {
    return fail("Couldn't load the rate right now.", 502);
  }
}

// A move into or out of Earn for the user to sign, already signed by the fee wallet.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const denied = await guard(req, { counted: true, wallet: String(body?.owner ?? "") });
  if (denied) return denied;
  const owner = String(body?.owner ?? "");
  const direction = body?.direction;
  const dollars = Math.floor(Number(body?.amount) * 1e6) / 1e6;
  if (!isSolanaAddress(owner)) return fail("Your Mofi wallet isn't ready yet.");
  if (direction !== "in" && direction !== "out") return fail("Pick a direction.");
  if (direction === "in" ? !(dollars >= 1) : !(dollars > 0)) return fail(direction === "in" ? "Move in at least $1." : "Enter an amount.");
  try {
    return Response.json(await buildEarnMove(owner, direction, dollars));
  } catch (e) {
    return e instanceof KaminoError ? fail(e.message, 422) : fail("Couldn't set this up. Try again.", 502);
  }
}
