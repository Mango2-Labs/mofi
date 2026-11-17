import { kvGet, kvReady, kvRun, kvSetNew } from "@/lib/server/kv";
import { rpc } from "@/lib/server/portfolio";

// Who invited whom. An invite link carries the inviter's Mofi wallet address; a new account that arrives through one
// is tied to it once, for good, and pays the invited fee from then on (see lib/fees.ts). Kept in the shared store,
// so without one nobody is invited and everyone pays the standard fee. `at` is when it joined.
type Invite = { by: string; at: number };

const key = (wallet: string) => `invite:${wallet}`;
// Invites never change once set, so a found one is remembered for as long as this server instance lives.
const found = new Map<string, string>();

// The wallet that invited this one.
export async function inviterOf(wallet: string) {
  if (!kvReady()) return null;
  if (!found.has(wallet)) {
    const raw = await kvGet(key(wallet)).catch(() => null);
    const invite: Partial<Invite> | null = raw ? JSON.parse(raw) : null;
    if (typeof invite?.by !== "string") return null;
    found.set(wallet, invite.by);
  }
  return found.get(wallet)!;
}

// Ties a wallet to its inviter. Only a wallet that has never done anything can join, so an invite is for new
// accounts, and only once. Says whether it joined.
export async function join(wallet: string, by: string) {
  if (!kvReady() || by === wallet) return false;
  const history = await rpc<unknown[]>("getSignaturesForAddress", [wallet, { limit: 1 }]);
  if (history.length) return false;
  if (!(await kvSetNew(key(wallet), JSON.stringify({ by, at: Date.now() } satisfies Invite)))) return false;
  await kvRun([["SADD", `invited:${by}`, wallet]]);
  return true;
}

// What inviters have earned, for the Rewards screen. The money itself moves on-chain inside each friend's trade;
// this only keeps count. A trade's share is noted under its signature when it's built, and counted once the trade
// confirms (see /api/send), in base units of USDC: a running total, and one per week (Monday to Sunday, UTC).
const week = () => Math.floor((Date.now() / 86_400_000 + 3) / 7);

export async function owe(signature: string, inviter: string, amount: bigint) {
  if (kvReady()) await kvRun([["SET", `reward:${signature}`, JSON.stringify({ inviter, amount: amount.toString() }), "EX", 600]]);
}

export async function settle(signature: string) {
  if (!kvReady()) return;
  const [raw] = await kvRun<string | null>([["GETDEL", `reward:${signature}`]]);
  const reward: { inviter?: string; amount?: string } | null = raw ? JSON.parse(raw) : null;
  if (!reward?.inviter || !/^\d+$/.test(reward.amount ?? "")) return;
  const weekly = `earned:${reward.inviter}:${week()}`;
  await kvRun([["INCRBY", `earned:${reward.inviter}`, reward.amount!], ["INCRBY", weekly, reward.amount!], ["EXPIRE", weekly, 21 * 86_400]]);
}

// How many friends a wallet has invited, and what it has earned from them in dollars, in all and this week.
export async function rewards(wallet: string) {
  if (!kvReady()) return { friends: 0, earned: 0, week: 0 };
  const [friends, earned, thisWeek] = await kvRun<number | string | null>([["SCARD", `invited:${wallet}`], ["GET", `earned:${wallet}`], ["GET", `earned:${wallet}:${week()}`]]);
  return { friends: Number(friends ?? 0), earned: Number(earned ?? 0) / 1e6, week: Number(thisWeek ?? 0) / 1e6 };
}
