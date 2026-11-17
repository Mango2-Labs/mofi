import { ASSETS, USDC_MINT, assetByMint } from "@/lib/assets";
import { EARN_SHARES_MINT, earnMetrics } from "@/lib/server/earn";
import { prices } from "@/lib/server/jupiter";

export const TOKEN_PROGRAMS = ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"];
export const SOL_MINT = "So11111111111111111111111111111111111111112";

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

type TokenAccounts = {
  value: {
    pubkey: string;
    account: { owner: string; data: { parsed: { info: { mint: string; closeAuthority?: string; tokenAmount: { amount: string; uiAmountString: string }; extensions?: { extension: string }[] } } } };
  }[];
};

// One token account: its token program, who besides its owner may close it, and whether it withholds transfer fees
// (which must be swept to the mint before it can close).
export type TokenAccount = { account: string; program: string; closeAuthority?: string; withholds: boolean };

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

// What a wallet can sell of one asset, in base units, what it's worth in UI units, and the token accounts holding it.
// SOL keeps 0.01 back, because a wallet holding SOL pays its own network fees.
export async function balanceOf(owner: string, mint: string): Promise<{ raw: bigint; ui: number; accounts: TokenAccount[] }> {
  if (mint === SOL_MINT) {
    const { value } = await rpc<{ value: number }>("getBalance", [owner]);
    const raw = BigInt(Math.max(0, value - 10_000_000));
    return { raw, ui: Number(raw) / 1e9, accounts: [] };
  }
  const { value } = await rpc<TokenAccounts>("getTokenAccountsByOwner", [owner, { mint }, { encoding: "jsonParsed" }]);
  return {
    raw: value.reduce((sum, { account }) => sum + BigInt(account.data.parsed.info.tokenAmount.amount), BigInt(0)),
    ui: value.reduce((sum, { account }) => sum + Number(account.data.parsed.info.tokenAmount.uiAmountString), 0),
    accounts: value.map(({ pubkey, account }) => ({
      account: pubkey,
      program: account.owner,
      closeAuthority: account.data.parsed.info.closeAuthority,
      withholds: !!account.data.parsed.info.extensions?.some((e) => e.extension === "transferFeeAmount"),
    })),
  };
}
