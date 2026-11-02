import { SOL_USDC_ASSET, type AuroraAsset } from "@/lib/chains";

// Aurora Intents Swap API. The key goes in the URL path, so these calls stay on the server
// and errors never include the URL.
const BASE = "https://intents-api.aurora.dev/api";

export class AuroraError extends Error {}

async function call(path: string, init?: RequestInit) {
  const key = process.env.AURORA_API_KEY;
  if (!key) throw new AuroraError("Moving money isn't set up yet.");
  let res: Response;
  try {
    res = await fetch(`${BASE}/${path.replace("{key}", key)}`, { ...init, cache: "no-store" });
  } catch {
    throw new AuroraError("Couldn't reach Aurora. Try again in a moment.");
  }
  const data = await res.json().catch(() => ({}));
  // Aurora answers a contract address (as recipient or for refunds) with an error.
  if (res.status >= 500) throw new AuroraError("Couldn't get a quote. Check that the address is your own wallet, then try again.");
  // Aurora's own messages explain things like amounts that are too small, but a 404 echoes the URL, key included.
  const safe = typeof data.message === "string" && !data.message.includes(key) && res.status !== 404;
  if (!res.ok) throw new AuroraError(safe ? data.message : "Aurora couldn't make a quote.");
  return data;
}

export type QuoteRequest = {
  amount: string;
  originAsset: string;
  destinationAsset: string;
  recipient: string;
  refundTo: string;
  // "advanced" routes through NEAR's private shard, so the payout can't be linked back to the sender.
  confidentiality?: "advanced";
  // A price check only: no deposit address is made.
  dry?: boolean;
};

export async function createQuote(q: QuoteRequest) {
  const data = await call("quote/{key}", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      dry: false,
      swapType: "FLEX_INPUT", // accepts a slightly smaller deposit, e.g. after an exchange's withdrawal fee
      depositType: "ORIGIN_CHAIN",
      refundType: "ORIGIN_CHAIN",
      recipientType: "DESTINATION_CHAIN",
      slippageTolerance: 100,
      quoteWaitingTimeMs: 3000,
      ...q,
    }),
  });
  const quote = data.quote;
  return {
    depositAddress: quote.depositAddress as string,
    depositMemo: quote.depositMemo as string | undefined,
    amountIn: quote.amountInFormatted as string,
    amountOut: quote.amountOutFormatted as string,
    amountOutUsd: Number(quote.amountOutUsd),
    timeEstimate: quote.timeEstimate as number,
    deadline: quote.deadline as string,
  };
}

// A user's permanent deposit address on a chain. Anything sent there arrives as USDC in their Mofi wallet.
export async function depositAddress(chain: string, recipient: string) {
  const data = await call("persistent-deposit-address/{key}", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ recipient, sender: recipient, depositChain: chain, destinationChain: "sol", destinationAsset: SOL_USDC_ASSET }),
  });
  return { depositAddress: data.depositAddress as string, memo: data.memo as string | undefined };
}

export async function swapStatus(depositAddress: string) {
  const data = await call(`status/{key}?depositAddress=${encodeURIComponent(depositAddress)}`);
  return { status: data.status as string, amountOut: data.swapDetails?.amountOutFormatted as string | undefined };
}

type Token = { assetId: string; blockchain: string; symbol: string; decimals: number; contractAddress?: string };
let cached: { at: number; list: AuroraAsset[] } | undefined;

// Aurora's token list rarely changes, so each server instance keeps it for ten minutes.
export async function assets(): Promise<AuroraAsset[]> {
  if (cached && Date.now() - cached.at < 600_000) return cached.list;
  const { tokens }: { tokens: Token[] } = await call("tokens/{key}");
  const list = tokens
    .filter((t) => !t.symbol.includes("DEPRECATED"))
    .map((t) => ({ assetId: t.assetId, chain: t.blockchain, symbol: t.symbol, decimals: t.decimals, native: !t.contractAddress }));
  cached = { at: Date.now(), list };
  return list;
}
