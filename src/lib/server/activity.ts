import { ASSETS, USDC_MINT } from "@/lib/assets";
import { EARN_SHARES_MINT } from "@/lib/server/earn";
import { SOL_MINT, TOKEN_PROGRAMS, rpc } from "@/lib/server/portfolio";

const KLEND = "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD";

type Balance = { accountIndex: number; owner?: string; mint: string; uiTokenAmount: { uiAmountString: string } };
type Tx = {
  meta: { err: unknown; preBalances: number[]; postBalances: number[]; preTokenBalances: Balance[]; postTokenBalances: Balance[] };
  transaction: { message: { accountKeys: { pubkey: string }[] } };
};

// amount is the change in the user's cash, in dollars: negative when money left it. logo is the asset's, for buys and sells.
// `action` is what happened, which the app names in the reader's language; `name` is the asset it happened to.
export type Activity = { signature: string; time: number; kind: Kind; action: Action; amount: number; name?: string; symbol?: string; logo?: string };
export type Kind = "deposit" | "withdraw" | "buy" | "sell" | "receive" | "gift" | "earn" | "loan";
export type Action = "toEarn" | "toCash" | "borrowed" | "repaid" | "bought" | "sold" | "received" | "gifted" | "withdrew" | "deposited";

type Sig = { signature: string; blockTime: number; err: unknown };
type TokenAccounts = { value: { pubkey: string; account: { data: { parsed: { info: { mint: string } } } } }[] };
const TRACKED = new Set([USDC_MINT, EARN_SHARES_MINT, ...ASSETS.map((a) => a.mint)]);

// The wallet's recent transactions, named from what changed in it: cash, stocks, Earn shares, Kamino loans.
// A plain transfer into a token account (how many exchanges send) never names the wallet itself, so the wallet's
// cash, stock and Earn accounts are searched too.
export async function activity(owner: string): Promise<Activity[]> {
  const accountSets = await Promise.all(TOKEN_PROGRAMS.map((programId) => rpc<TokenAccounts>("getTokenAccountsByOwner", [owner, { programId }, { encoding: "jsonParsed" }])));
  const addresses = [owner, ...accountSets.flatMap((s) => s.value).filter((a) => TRACKED.has(a.account.data.parsed.info.mint)).map((a) => a.pubkey)];
  // One account's lookup failing (a busy RPC, say) only leaves its transactions out.
  const lists = await Promise.all(addresses.map((a) => rpc<Sig[]>("getSignaturesForAddress", [a, { limit: 25 }]).catch(() => [] as Sig[])));
  const sigs = [...new Map(lists.flat().map((s) => [s.signature, s])).values()].sort((x, y) => y.blockTime - x.blockTime).slice(0, 25);
  const txs = await Promise.all(
    sigs.filter((s) => !s.err).map((s) => rpc<Tx | null>("getTransaction", [s.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]).then((tx) => ({ s, tx }), () => ({ s, tx: null }))),
  );
  return txs.flatMap(({ s, tx }) => {
    if (!tx || tx.meta.err) return [];
    const sum = (list: Balance[], mint: string) => list.filter((b) => b.owner === owner && b.mint === mint).reduce((n, b) => n + Number(b.uiTokenAmount.uiAmountString), 0);
    const delta = (mint: string) => sum(tx.meta.postTokenBalances, mint) - sum(tx.meta.preTokenBalances, mint);
    const keys = tx.transaction.message.accountKeys.map((k) => k.pubkey);
    const i = keys.indexOf(owner);
    const sol = i < 0 ? 0 : (tx.meta.postBalances[i] - tx.meta.preBalances[i]) / 1e9;
    const cash = Math.round(delta(USDC_MINT) * 1e6) / 1e6;
    const shares = delta(EARN_SHARES_MINT);
    // Bought or sold: the asset whose amount changed (SOL as plain SOL, beyond account rent).
    const asset = ASSETS.find((a) => (a.mint === SOL_MINT ? Math.abs(sol) > 0.003 : Math.abs(delta(a.mint)) > 0));
    // A gift: cash went out and an asset arrived in someone else's account (a pool's account only goes down on a buy).
    const gifted = ASSETS.find((a) => tx.meta.postTokenBalances.some((b) => b.mint === a.mint && b.owner !== owner && Number(b.uiTokenAmount.uiAmountString) > Number(tx.meta.preTokenBalances.find((p) => p.accountIndex === b.accountIndex)?.uiTokenAmount.uiAmountString ?? 0)));

    const named = ((): [Kind, Action] | null => {
      if (shares > 0) return ["earn", "toEarn"];
      if (shares < 0) return ["earn", "toCash"];
      if (keys.includes(KLEND)) return cash > 0 ? ["loan", "borrowed"] : cash < 0 ? ["loan", "repaid"] : null;
      if (asset) return cash < 0 ? ["buy", "bought"] : cash > 0 ? ["sell", "sold"] : ["receive", "received"];
      if (gifted && cash < 0) return ["gift", "gifted"];
      if (cash < 0) return ["withdraw", "withdrew"];
      if (cash > 0) return ["deposit", "deposited"];
      return null;
    })();
    if (!named) return [];
    const [kind, action] = named;
    const shown = kind === "gift" ? gifted : kind === "buy" || kind === "sell" || kind === "receive" ? asset : undefined;
    return [{ signature: s.signature, time: s.blockTime * 1000, kind, action, amount: cash, ...(shown && { name: shown.name, symbol: shown.symbol, logo: shown.logo }) }];
  });
}
