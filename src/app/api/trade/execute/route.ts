import { guard } from "@/lib/server/auth";
import { JupiterError, execute } from "@/lib/server/jupiter";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

// -1 is an expired order, -1004/-1005 an expired transaction, -2003 an expired market-maker quote.
const STALE = new Set([-1, -1004, -1005, -2003]);

export async function POST(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const signedTransaction = String(body?.signedTransaction ?? "");
  const requestId = String(body?.requestId ?? "");
  if (!/^[A-Za-z0-9+/]{100,3000}={0,2}$/.test(signedTransaction) || !requestId || requestId.length > 200) return fail("Something went wrong. Try again.");

  try {
    const result = await execute(signedTransaction, requestId);
    if (result.status === "Success") return Response.json({ signature: result.signature });
    return fail(STALE.has(result.code) ? "The price moved before this went through. Try again." : "This didn't go through, and your money didn't move. Try again.", 422);
  } catch (e) {
    return fail(e instanceof JupiterError ? e.message : "Something went wrong. Try again.", 502);
  }
}
