import { USDC_MINT } from "@/lib/assets";
import { feeWallet, usdcAccount } from "@/lib/server/fee-payer";
import { prices } from "@/lib/server/jupiter";
import { rpc } from "@/lib/server/portfolio";

// A withdrawal pays USDC into an Aurora address on Solana, and the first one to an address opens its USDC account,
// whose rent never comes back to Mofi. Each user gets FREE_OPENINGS a day. Past that, or while the fee wallet is down to
// its floor, the user pays the exact cost (rent plus the transaction fee) in USDC. Openings are counted from the user's
// own Solana history, so nothing is stored and every server instance agrees.
export const FREE_OPENINGS = 3;
export const FEE_WALLET_FLOOR = 20_000_000; // lamports kept for network fees on trades and withdrawals (0.02 SOL)
const TX_FEE = 16_000; // two signatures plus the priority fee, in lamports
const SOL_MINT = "So11111111111111111111111111111111111111112";

export class SetupError extends Error {}

type Balance = { accountIndex: number; mint: string; owner?: string };
type Parsed = { transaction: { message: { accountKeys: { pubkey: string }[] } }; meta: { preTokenBalances: Balance[]; postTokenBalances: Balance[] } };

// USDC accounts the fee wallet opened for someone else in the user's transactions over the last day: withdrawals to
// new addresses. Kept for half a minute, since the Withdraw screen prices as people type.
const counted = new Map<string, { at: number; count: number }>();
async function openingsToday(owner: string, payer: string) {
  const hit = counted.get(owner);
  if (hit && Date.now() - hit.at < 30_000) return hit.count;
  const since = Date.now() / 1000 - 86_400;
  const sigs = await rpc<{ signature: string; blockTime: number | null; err: unknown }[]>("getSignaturesForAddress", [owner, { limit: 50 }]);
  const txs = await Promise.all(
    sigs
      .filter((s) => !s.err && (s.blockTime ?? 0) > since)
      .map((s) => rpc<Parsed | null>("getTransaction", [s.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]).catch(() => null)),
  );
  const count = txs.filter(
    (tx) =>
      tx?.transaction.message.accountKeys[0]?.pubkey === payer &&
      tx.meta.postTokenBalances.some((b) => b.mint === USDC_MINT && b.owner !== owner && !tx.meta.preTokenBalances.some((p) => p.accountIndex === b.accountIndex)),
  ).length;
  counted.set(owner, { at: Date.now(), count });
  return count;
}

// What the user pays to open the USDC account at `depositAddress` (null for a fresh one, as private withdrawals use):
// 0 when it's already open or still free for them, else the exact cost, rounded up to a tenth of a cent.
export async function setupCost(owner: string, depositAddress: string | null) {
  if (depositAddress) {
    const { value } = await rpc<{ value: unknown }>("getAccountInfo", [await usdcAccount(depositAddress), { encoding: "base64" }]);
    if (value) return 0;
  }
  const payer = (await feeWallet())!.address;
  const [count, { value: balance }] = await Promise.all([openingsToday(owner, payer), rpc<{ value: number }>("getBalance", [payer])]);
  if (count < FREE_OPENINGS && balance > FEE_WALLET_FLOOR) return 0;
  const [rent, sol] = await Promise.all([rpc<number>("getMinimumBalanceForRentExemption", [165]), prices([SOL_MINT]).then((p) => p[SOL_MINT]?.usdPrice)]);
  if (!sol) throw new SetupError("Couldn't price the network setup right now. Try again.");
  return Math.ceil(((rent + TX_FEE) / 1e9) * sol * 1000) / 1000;
}
