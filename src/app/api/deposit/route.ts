import { guard } from "@/lib/server/auth";
import { AuroraError, depositAddress, swapStatus } from "@/lib/server/aurora";
import { DEPOSIT_CHAINS, isSolanaAddress } from "@/lib/chains";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

// Deposit: the user's permanent deposit address on the chosen chain.
export async function POST(req: Request) {
  const denied = await guard(req, { counted: true });
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const chain = String(body?.chain ?? "");
  const recipient = String(body?.recipient ?? "");
  if (!DEPOSIT_CHAINS.has(chain) || chain === "sol") return fail("Pick the chain you're sending from.");
  if (!isSolanaAddress(recipient)) return fail("Your Mofi wallet isn't ready yet.");
  try {
    return Response.json(await depositAddress(chain, recipient));
  } catch (e) {
    return fail(e instanceof AuroraError ? e.message : "Something went wrong. Try again.", 502);
  }
}

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address");
  if (!address) return fail("Missing deposit address.");
  try {
    return Response.json(await swapStatus(address));
  } catch (e) {
    return fail(e instanceof AuroraError ? e.message : "Something went wrong.", 502);
  }
}
