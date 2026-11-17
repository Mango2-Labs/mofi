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

// Whether a wallet could still be tied to an inviter: only one that has never done anything, so an invite is for
// new accounts.
export async function canJoin(wallet: string) {
  if (!kvReady()) return false;
  return !(await rpc<unknown[]>("getSignaturesForAddress", [wallet, { limit: 1 }])).length;
}

// Ties a wallet to its inviter, once. Says whether it joined.
export async function join(wallet: string, by: string) {
  if (by === wallet || !(await canJoin(wallet))) return false;
  if (!(await kvSetNew(key(wallet), JSON.stringify({ by, at: Date.now() } satisfies Invite)))) return false;
  await kvRun([["SADD", `invited:${by}`, wallet]]);
  return true;
}

// What inviters have earned, for the Rewards screen. The money itself moves on-chain inside each friend's trade;
// this only keeps count, in base units of USDC: a running total, and one per week (Monday to Sunday, UTC).
//
// A trade's share is noted when the trade is built, under the inviter (`owed:`) and under its signature (`reward:`).
// It's counted once the trade confirms: straight away when /api/send sees it confirm, or the next time the inviter's
// rewards are read, for a trade that confirmed late or whose sender stopped waiting. Whoever takes the note out of
// `owed:` is the one that counts it, so it's never counted twice.
const week = () => Math.floor((Date.now() / 86_400_000 + 3) / 7);
// How long a built trade can still land: its blockhash lasts about a minute and a half.
const LANDS_WITHIN = 180_000;

type Owed = { amount: string; at: number };

export async function owe(signature: string, inviter: string, amount: bigint) {
  if (!kvReady()) return;
  const owed: Owed = { amount: amount.toString(), at: Date.now() };
  await kvRun([
    ["HSET", `owed:${inviter}`, signature, JSON.stringify(owed)],
    ["SET", `reward:${signature}`, inviter, "EX", 600],
  ]);
}

async function count(inviter: string, signature: string, amount: string) {
  if (!/^\d+$/.test(amount)) return;
  const [taken] = await kvRun<number>([["HDEL", `owed:${inviter}`, signature]]);
  if (!taken) return;
  const weekly = `earned:${inviter}:${week()}`;
  await kvRun([["INCRBY", `earned:${inviter}`, amount], ["INCRBY", weekly, amount], ["EXPIRE", weekly, 21 * 86_400]]);
}

const noted = async (inviter: string) => {
  const [flat] = await kvRun<string[] | null>([["HGETALL", `owed:${inviter}`]]);
  const notes = new Map<string, Owed>();
  for (let i = 0; i + 1 < (flat?.length ?? 0); i += 2) notes.set(flat![i], JSON.parse(flat![i + 1]));
  return notes;
};

// A trade just confirmed: if it carried an inviter's share, count it.
export async function settle(signature: string) {
  if (!kvReady()) return;
  const [inviter] = await kvRun<string | null>([["GETDEL", `reward:${signature}`]]);
  if (!inviter) return;
  const note = (await noted(inviter)).get(signature);
  if (note) await count(inviter, signature, note.amount);
}

type Statuses = { value: ({ err: unknown; confirmationStatus?: string } | null)[] };

// Counts the inviter's noted trades that have confirmed since, and forgets the ones that failed or never landed.
async function catchUp(inviter: string) {
  const notes = [...(await noted(inviter))].slice(0, 200);
  if (!notes.length) return;
  const { value } = await rpc<Statuses>("getSignatureStatuses", [notes.map(([signature]) => signature), { searchTransactionHistory: true }]);
  const gone: string[] = [];
  for (const [i, [signature, note]] of notes.entries()) {
    const status = value[i];
    if (status && !status.err && (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized")) await count(inviter, signature, note.amount);
    else if (status?.err || (!status && Date.now() - note.at > LANDS_WITHIN)) gone.push(signature);
  }
  if (gone.length) await kvRun([["HDEL", `owed:${inviter}`, ...gone]]);
}

// How many friends a wallet has invited, and what it has earned from them in dollars, in all and this week.
export async function rewards(wallet: string) {
  if (!kvReady()) return { friends: 0, earned: 0, week: 0 };
  await catchUp(wallet).catch(() => {});
  const [friends, earned, thisWeek] = await kvRun<number | string | null>([["SCARD", `invited:${wallet}`], ["GET", `earned:${wallet}`], ["GET", `earned:${wallet}:${week()}`]]);
  return { friends: Number(friends ?? 0), earned: Number(earned ?? 0) / 1e6, week: Number(thisWeek ?? 0) / 1e6 };
}
