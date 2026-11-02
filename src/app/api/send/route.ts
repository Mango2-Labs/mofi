import { guard } from "@/lib/server/auth";
import { rpc } from "@/lib/server/portfolio";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

type Statuses = { value: ({ err: unknown; confirmationStatus?: string } | null)[] };

// Sends a transaction the user signed and waits up to 30 seconds for it to confirm.
export async function POST(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const transaction = String(body?.transaction ?? "");
  if (!/^[A-Za-z0-9+/]{100,3000}={0,2}$/.test(transaction)) return fail("Something went wrong. Try again.");

  const failed = fail("This didn't go through, and your money didn't move. Try again.", 422);
  const signature = await rpc<string>("sendTransaction", [transaction, { encoding: "base64", preflightCommitment: "confirmed" }]).catch(() => null);
  if (!signature) return failed;
  for (let i = 0; i < 30; i++) {
    const { value: [status] } = await rpc<Statuses>("getSignatureStatuses", [[signature]]).catch(() => ({ value: [null] }));
    if (status?.err) return failed;
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") return Response.json({ signature });
    await new Promise((r) => setTimeout(r, 1000));
  }
  return fail("This is taking longer than usual. Check your balance in a minute.", 504);
}
