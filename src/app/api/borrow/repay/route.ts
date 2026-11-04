import { guard } from "@/lib/server/auth";
import { isSolanaAddress } from "@/lib/chains";
import { KaminoError, buildRepay } from "@/lib/server/kamino";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

// A repay-everything transaction for the user to sign: pays back the loan and unlocks the stock.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const denied = await guard(req, { counted: true, wallet: String(body?.owner ?? "") });
  if (denied) return denied;
  const owner = String(body?.owner ?? "");
  if (!isSolanaAddress(owner)) return fail("Your Mofi wallet isn't ready yet.");
  try {
    return Response.json(await buildRepay(owner, String(body?.market ?? "")));
  } catch (e) {
    return e instanceof KaminoError ? fail(e.message, 422) : fail("Couldn't set up the repayment. Try again.", 502);
  }
}
