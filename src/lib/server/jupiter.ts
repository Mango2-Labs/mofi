// Jupiter's Swap API. The key stays on the server, and errors never include it.
// When a wallet holds under 0.01 SOL, Jupiter pays the network fee and takes it from the swap.
const SWAP = "https://api.jup.ag/swap/v2";

export class JupiterError extends Error {}

async function swapApi(path: string, init?: RequestInit) {
  const key = process.env.JUPITER_API_KEY;
  if (!key) throw new JupiterError("Investing isn't set up yet.");
  const res = await fetch(`${SWAP}/${path}`, { ...init, headers: { ...init?.headers, "x-api-key": key }, cache: "no-store" }).catch(() => null);
  if (!res) throw new JupiterError("Couldn't reach Jupiter. Try again in a moment.");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new JupiterError("Couldn't get a price right now. Try again.");
  return data;
}

export type Prices = Record<string, { usdPrice: number; priceChange24h?: number }>;

export async function prices(mints: string[]): Promise<Prices> {
  if (!mints.length) return {};
  const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${mints.join(",")}`, { cache: "no-store" }).catch(() => null);
  return res?.ok ? res.json() : {};
}

export type Order = {
  transaction: string | null;
  requestId: string;
  outAmount: string;
  feeBps: number;
  router: string;
  errorCode?: number;
};

export function order(params: { inputMint: string; outputMint: string; amount: string; taker: string; payer?: string }): Promise<Order> {
  return swapApi(`order?${new URLSearchParams(params)}`);
}

export function execute(signedTransaction: string, requestId: string): Promise<{ status: string; signature?: string; code: number }> {
  return swapApi("execute", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ signedTransaction, requestId }),
  });
}
