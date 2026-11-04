import { ASSETS, USDC_MINT, assetByMint } from "@/lib/assets";
import { EARN_SHARES_MINT, earnMetrics } from "@/lib/server/earn";
import { prices } from "@/lib/server/jupiter";

export const TOKEN_PROGRAMS = ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"];
const SOL_MINT = "So11111111111111111111111111111111111111112";

export async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error("Couldn't read balances right now.");
  return data.result;
}

type TokenAccounts = { value: { account: { data: { parsed: { info: { mint: string; tokenAmount: { amount: string; uiAmountString: string } } } } } }[] };

export type Holding = { symbol: string; name: string; mint: string; amount: number; value: number; change: number; logo: string };

export async function portfolio(owner: string) {
  const [lamports, ...accountSets] = await Promise.all([
    rpc<{ value: number }>("getBalance", [owner]),
    ...TOKEN_PROGRAMS.map((programId) => rpc<TokenAccounts>("getTokenAccountsByOwner", [owner, { programId }, { encoding: "jsonParsed" }])),
  ]);

  // uiAmountString already applies a token's scaled-UI multiplier, which xStocks use for dividends.
  const amounts = new Map<string, number>([[SOL_MINT, lamports.value / 1e9]]);
  for (const { account } of accountSets.flatMap((s) => s.value)) {
    const { mint, tokenAmount } = account.data.parsed.info;
    amounts.set(mint, (amounts.get(mint) ?? 0) + Number(tokenAmount.uiAmountString));
  }

  const held = ASSETS.filter((a) => (amounts.get(a.mint) ?? 0) > 0);
  const quotes = await prices(held.map((a) => a.mint));

  const holdings: Holding[] = held
    .map((a) => {
      const amount = amounts.get(a.mint)!;
      const price = quotes[a.mint];
      return { ...assetByMint.get(a.mint)!, amount, value: amount * (price?.usdPrice ?? 0), change: price?.priceChange24h ?? 0 };
    })
    .filter((h) => h.value >= 0.01)
    .sort((x, y) => y.value - x.value);

  const cash = amounts.get(USDC_MINT) ?? 0;
  // Earn is held as vault shares; if Kamino's API is down for a moment, it counts as nothing rather than failing the page.
  const shares = amounts.get(EARN_SHARES_MINT) ?? 0;
  const earn = shares > 0 ? shares * (await earnMetrics().catch(() => ({ tokensPerShare: 0 }))).tokensPerShare : 0;
  return { cash, earn, holdings, total: cash + earn + holdings.reduce((sum, h) => sum + h.value, 0) };
}

// What a wallet can sell of one asset, in base units, and what it's worth in UI units.
// SOL keeps 0.01 back, because a wallet holding SOL pays its own network fees.
export async function balanceOf(owner: string, mint: string) {
  if (mint === SOL_MINT) {
    const { value } = await rpc<{ value: number }>("getBalance", [owner]);
    const raw = BigInt(Math.max(0, value - 10_000_000));
    return { raw, ui: Number(raw) / 1e9 };
  }
  const { value } = await rpc<TokenAccounts>("getTokenAccountsByOwner", [owner, { mint }, { encoding: "jsonParsed" }]);
  return value.reduce(
    (sum, { account }) => ({ raw: sum.raw + BigInt(account.data.parsed.info.tokenAmount.amount), ui: sum.ui + Number(account.data.parsed.info.tokenAmount.uiAmountString) }),
    { raw: BigInt(0), ui: 0 },
  );
}
