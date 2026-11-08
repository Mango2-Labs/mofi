import { feeWallet } from "@/lib/server/fee-payer";
import { rpc } from "@/lib/server/portfolio";
import { FEE_WALLET_FLOOR } from "@/lib/server/withdraw-setup";

const LOW = 100_000_000; // lamports (0.1 SOL): time to top up

// Daily check, run by Vercel Cron (see vercel.json) with `Authorization: Bearer <CRON_SECRET>`. When the fee wallet runs
// low it posts to ALERT_WEBHOOK_URL (a Discord or Slack incoming webhook), if one is set. Below the floor, new
// withdrawal accounts are already charged to users instead of the wallet.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Not allowed." }, { status: 401 });
  const wallet = await feeWallet();
  if (!wallet) return Response.json({ error: "No fee wallet." }, { status: 503 });
  try {
    const { value } = await rpc<{ value: number }>("getBalance", [wallet.address]);
    const sol = value / 1e9;
    const hook = process.env.ALERT_WEBHOOK_URL;
    if (value < LOW && hook) {
      const text = `Mofi's fee wallet has ${sol.toFixed(4)} SOL left${value <= FEE_WALLET_FLOOR ? " (below the floor: users now pay for new withdrawal accounts)" : ""}. Top it up: ${wallet.address}`;
      await fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: text, text }) }).catch(() => null);
    }
    return Response.json({ sol, low: value < LOW });
  } catch {
    return Response.json({ error: "Couldn't read the fee wallet." }, { status: 502 });
  }
}
