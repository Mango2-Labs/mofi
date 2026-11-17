import { guard } from "@/lib/server/auth";
import { rpc } from "@/lib/server/portfolio";
import { settle } from "@/lib/server/referral";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

type Statuses = { value: ({ err: unknown; confirmationStatus?: string } | null)[] };

// Jupiter's error for a swap that would land outside its price limit.
const SLIPPAGE = 6001;

// Sends a transaction. Why the network turned one away is written to the server log, never shown to the user.
async function send(transaction: string): Promise<{ signature?: string; stale?: boolean }> {
  const res = await fetch(process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "sendTransaction", params: [transaction, { encoding: "base64", preflightCommitment: "confirmed" }] }),
    cache: "no-store",
  }).catch(() => null);
  const data: { result?: string; error?: { message?: string; data?: { err?: unknown; logs?: string[] } } } | null = res ? await res.json().catch(() => null) : null;
  if (data?.result) return { signature: data.result };
  const why = JSON.stringify(data?.error?.data?.err ?? data?.error?.message ?? "no answer");
  console.error("A transaction was turned away:", why, data?.error?.data?.logs?.slice(-4));
  return { stale: why.includes(`"Custom":${SLIPPAGE}`) || why.includes("BlockhashNotFound") || /blockhash not found/i.test(why) };
}

// Sends a transaction the user signed and waits up to 30 seconds for it to confirm.
export async function POST(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const transaction = String(body?.transaction ?? "");
  if (!/^[A-Za-z0-9+/]{100,3000}={0,2}$/.test(transaction)) return fail("Something went wrong. Try again.");

  const failed = fail("This didn't go through, and your money didn't move. Try again.", 422);
  // The network checks a transaction before taking it. A swap whose price moved past its limit, or one built too
  // long ago, is turned away here, and nothing has moved.
  const sent = await send(transaction);
  if (sent.stale) return fail("The price moved before this went through. Try again.", 422);
  const signature = sent.signature;
  if (!signature) return failed;
  for (let i = 0; i < 30; i++) {
    const { value: [status] } = await rpc<Statuses>("getSignatureStatuses", [[signature]]).catch(() => ({ value: [null] }));
    if (status?.err) return failed;
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
      // If this was an invited friend's trade, the inviter's share now counts on their Rewards screen.
      await settle(signature).catch(() => {});
      return Response.json({ signature });
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return fail("This is taking longer than usual. Check your balance in a minute.", 504);
}
