import { ASSETS, USDC_MINT } from "@/lib/assets";
import { EARN_SHARES_MINT } from "@/lib/server/earn";
import { rpc } from "@/lib/server/portfolio";

const KLEND = "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD";
const SOL_MINT = "So11111111111111111111111111111111111111112";

type Balance = { owner?: string; mint: string; uiTokenAmount: { uiAmountString: string } };
type Tx = {
  meta: { err: unknown; preBalances: number[]; postBalances: number[]; preTokenBalances: Balance[]; postTokenBalances: Balance[] };
  transaction: { message: { accountKeys: { pubkey: string }[] } };
};

// amount is the change in the user's cash, in dollars: negative when money left it. logo is the asset's, for buys and sells.
export type Activity = { signature: string; time: number; kind: Kind; title: string; amount: number; symbol?: string; logo?: string };
export type Kind = "deposit" | "withdraw" | "buy" | "sell" | "receive" | "earn" | "loan";

// The wallet's recent transactions, named from what changed in it: cash, stocks, Earn shares, Kamino loans.
export async function activity(owner: string): Promise<Activity[]> {
  const sigs = await rpc<{ signature: string; blockTime: number; err: unknown }[]>("getSignaturesForAddress", [owner, { limit: 25 }]);
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

    const named = ((): [Kind, string] | null => {
      if (shares > 0) return ["earn", "Moved to Earn"];
      if (shares < 0) return ["earn", "Moved to cash"];
      if (keys.includes(KLEND)) return cash > 0 ? ["loan", "Borrowed"] : cash < 0 ? ["loan", "Repaid a loan"] : null;
      if (asset) return cash < 0 ? ["buy", `Bought ${asset.name}`] : cash > 0 ? ["sell", `Sold ${asset.name}`] : ["receive", `Received ${asset.name}`];
      if (cash < 0) return ["withdraw", "Withdrew"];
      if (cash > 0) return ["deposit", "Deposited"];
      return null;
    })();
    if (!named) return [];
    const [kind, title] = named;
    const traded = asset && (kind === "buy" || kind === "sell" || kind === "receive");
    return [{ signature: s.signature, time: s.blockTime * 1000, kind, title, amount: cash, ...(traded && { symbol: asset.symbol, logo: asset.logo }) }];
  });
}
