import { createRemoteJWKSet, jwtVerify } from "jose";

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const keys = createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${APP_ID}/jwks.json`));

// Requests that cost Mofi money (fees, rent, Aurora addresses) per user per hour. Counted per server instance.
const LIMIT = 40;
const HOUR = 3_600_000;
const recent = new Map<string, number[]>();

const deny = (message: string, status: number) => Response.json({ error: message }, { status });

// Lets only signed-in Mofi users through, checked against Privy's signing keys. With `counted`, also caps how often
// each user can make Mofi pay. Returns a response to send back when the request is refused.
export async function guard(req: Request, { counted = false } = {}) {
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const user = token
    ? await jwtVerify(token, keys, { issuer: "privy.io", audience: APP_ID }).then(({ payload }) => payload.sub, () => null)
    : null;
  if (!user) return deny("Sign in again to continue.", 401);
  if (!counted) return null;

  const now = Date.now();
  const times = (recent.get(user) ?? []).filter((t) => now - t < HOUR);
  if (times.length >= LIMIT) return deny("Too many tries in the last hour. Try again later.", 429);
  recent.set(user, [...times, now]);
  return null;
}
