// Upstash Redis over its REST API, connected through Vercel's Storage tab. It holds the little that every server
// instance must agree on: each user's withdrawal addresses and how many free account openings they've used today.
const url = () => process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = () => process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export const kvReady = () => !!(url() && token());

// Runs commands in one request. Errors never include the URL or token.
async function run<T>(commands: (string | number)[][]): Promise<T[]> {
  const res = await fetch(`${url()}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${token()}`, "content-type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
  }).catch(() => null);
  const data: { result?: T; error?: string }[] | null = res?.ok ? await res.json().catch(() => null) : null;
  if (!data || data.some((d) => d.error)) throw new Error("The shared store isn't answering.");
  return data.map((d) => d.result as T);
}

export const kvGet = async (key: string) => (await run<string | null>([["GET", key]]))[0];
export const kvSet = async (key: string, value: string) => void (await run([["SET", key, value]]));

// Adds one and returns the new count; the key expires `ttl` seconds after its last increment.
export const kvIncr = async (key: string, ttl: number) => (await run<number>([["INCR", key], ["EXPIRE", key, ttl]]))[0];
