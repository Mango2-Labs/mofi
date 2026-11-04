import { createRemoteJWKSet, jwtVerify } from "jose";

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const keys = createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${APP_ID}/jwks.json`));

// Requests that cost Mofi money (fees, rent, Aurora addresses) per user per hour. Counted per server instance.
const LIMIT = 40;
const HOUR = 3_600_000;
const recent = new Map<string, number[]>();

const deny = (message: string, status: number) => Response.json({ error: message }, { status });

// The Solana wallets a Privy user owns, from Privy's server API with the app secret. Kept for ten minutes.
const owned = new Map<string, { at: number; wallets: Set<string> }>();
async function walletsOf(user: string, fresh = false) {
  const hit = owned.get(user);
  if (hit && !fresh && Date.now() - hit.at < 600_000) return hit.wallets;
  const secret = process.env.PRIVY_APP_SECRET;
  if (!secret) return null;
  const res = await fetch(`https://api.privy.io/v1/users/${encodeURIComponent(user)}`, {
    headers: { authorization: `Basic ${btoa(`${APP_ID}:${secret}`)}`, "privy-app-id": APP_ID },
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  const { linked_accounts }: { linked_accounts: { type: string; chain_type?: string; address?: string }[] } = await res.json();
  const wallets = new Set(linked_accounts.filter((a) => a.type === "wallet" && a.chain_type === "solana" && a.address).map((a) => a.address!));
  owned.set(user, { at: Date.now(), wallets });
  return wallets;
}

// Lets only signed-in Mofi users through, checked against Privy's signing keys. With `wallet`, the request must name
// one of the signed-in user's own wallets, so nobody can act for another wallet (or for Mofi's fee wallet). With
// `counted`, also caps how often each user can make Mofi pay. Returns a response to send back when refused.
export async function guard(req: Request, { counted = false, wallet }: { counted?: boolean; wallet?: string } = {}) {
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const user = token
    ? await jwtVerify(token, keys, { issuer: "privy.io", audience: APP_ID }).then(({ payload }) => payload.sub, () => null)
    : null;
  if (!user) return deny("Sign in again to continue.", 401);

  if (wallet !== undefined) {
    // A wallet made moments ago may not be in the cached list yet, so a miss asks Privy again before refusing.
    const mine = (await walletsOf(user))?.has(wallet) || (await walletsOf(user, true))?.has(wallet);
    if (!mine) return deny("That isn't your Mofi wallet. Sign in again to continue.", 403);
  }

  if (!counted) return null;
  const now = Date.now();
  const times = (recent.get(user) ?? []).filter((t) => now - t < HOUR);
  if (times.length >= LIMIT) return deny("Too many tries in the last hour. Try again later.", 429);
  recent.set(user, [...times, now]);
  return null;
}
