import { isSolanaAddress } from "@/lib/chains";
import { INVITED_FEE_BPS, TRADE_FEE_BPS } from "@/lib/fees";
import { guard } from "@/lib/server/auth";
import { usdcAccount } from "@/lib/server/fee-payer";
import { rpc } from "@/lib/server/portfolio";
import { canJoin, inviterOf, join, rewards } from "@/lib/server/referral";
import { walletOf } from "@/lib/server/username";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

// What a wallet pays to trade: the invited fee if a friend invited it, the standard fee otherwise. With `rewards`,
// also what it has earned by inviting friends, and whether it has a cash account for those earnings to land in.
// With `ask`, whether it could still use a friend's invite code.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet") ?? "";
  if (!isSolanaAddress(wallet)) return fail("Unknown wallet.");
  try {
    const invited = !!(await inviterOf(wallet));
    const fee = { invited, feeBps: invited ? INVITED_FEE_BPS : TRADE_FEE_BPS };
    if (searchParams.has("ask")) return Response.json({ ...fee, eligible: !invited && (await canJoin(wallet)) });
    if (!searchParams.has("rewards")) return Response.json(fee);
    const [earned, cash] = await Promise.all([
      rewards(wallet),
      rpc<{ value: object | null }>("getAccountInfo", [await usdcAccount(wallet), { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]),
    ]);
    return Response.json({ ...fee, ...earned, cashReady: !!cash.value });
  } catch {
    return fail("Couldn't load rewards right now.", 502);
  }
}

// A new account arriving through an invite link: ties it to the friend who sent the link.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const wallet = String(body?.wallet ?? "");
  const by = String(body?.by ?? "");
  const denied = await guard(req, { counted: true, wallet });
  if (denied) return denied;
  try {
    // An invite link carries the friend's username, so the inviter is always someone with a Mofi account, never
    // an arbitrary wallet.
    const inviter = await walletOf(by);
    if (!inviter) return fail("That invite link isn't valid.");
    return Response.json({ joined: await join(wallet, inviter) });
  } catch {
    return fail("Couldn't use the invite right now.", 502);
  }
}
