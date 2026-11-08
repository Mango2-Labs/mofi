import { guard } from "@/lib/server/auth";
import { AuroraError, depositAddress, swapStatus, withdrawStatus } from "@/lib/server/aurora";
import { DEPOSIT_CHAINS, isSolanaAddress } from "@/lib/chains";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

// Deposit: the user's permanent deposit address on the chosen chain.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const denied = await guard(req, { counted: true, wallet: String(body?.recipient ?? "") });
  if (denied) return denied;
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

// A withdrawal's progress. One through a permanent address also names its Solana transaction (`tx`), since the address
// may have carried earlier ones.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const address = params.get("address");
  const tx = params.get("tx");
  if (!address) return fail("Missing deposit address.");
  try {
    if (tx) return Response.json({ status: await withdrawStatus(address, tx) });
    return Response.json(await swapStatus(address));
  } catch (e) {
    return fail(e instanceof AuroraError ? e.message : "Something went wrong.", 502);
  }
}
