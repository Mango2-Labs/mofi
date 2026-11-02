import {
  DEFAULT_RECENT_SLOT_DURATION_MS,
  KaminoAction,
  KaminoMarket,
  KaminoVault,
  PROGRAM_ID,
  U64_MAX,
  VanillaObligation,
  getCurrentLedgerInstant,
  type KaminoObligation,
} from "@kamino-finance/klend-sdk";
import { Scope } from "@kamino-finance/scope-sdk";
import Decimal from "decimal.js";
import {
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  compressTransactionMessageUsingAddressLookupTables,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  fetchAddressesForLookupTables,
  getBase64EncodedWireTransaction,
  partiallySignTransactionMessageWithSigners,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";
import { USDC_MINT, assetByMint, type AssetInfo } from "@/lib/assets";
import { EARN_VAULT } from "@/lib/server/earn";
import { feeSigner, payTreasury } from "@/lib/server/fee-payer";
import { prices } from "@/lib/server/jupiter";
import { balanceOf } from "@/lib/server/portfolio";

// Kamino lending markets Mofi borrows USDC from, with the lookup table that keeps a loan in one transaction.
const MARKETS = [
  { name: "xStocks", address: "5wJeMrUYECGq41fxRESKALVcHnNX26TAWy4W98yULsua", lut: "8ofreL6hKfEet1DnhHVGvCTnSdz4pg85PpbuCUHnEcKm" },
  { name: "Backpack", address: "4iRHKGsTq3e4uut6e4PfyV9AEbNuXaMu9JaSP378p9qy", lut: "DQUBKNkMfRjKsYD6fwrAjA34TNMS3P5ytxNcrSJiTqBy" },
];

// Mofi lends at most half of what Kamino would, so a price drop has room before Kamino sells the stock.
const CAP = 0.5;
// A first loan in a market pays about this much setup; the exact amount is measured when the loan is built.
const SETUP_ESTIMATE = 2.75;
const MIN_LOAN = 1;

export class KaminoError extends Error {}

const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com");
// Kamino's SDK is typed against an older @solana/kit; the RPC object is the same shape.
const kaminoRpc = rpc as never;

const loaded = new Map<string, { at: number; market: Promise<KaminoMarket> }>();

// Loading a market reads every reserve, so each server instance keeps it for 30 seconds.
function market(addr: string) {
  const hit = loaded.get(addr);
  if (hit && Date.now() - hit.at < 30_000) return hit.market;
  const market = KaminoMarket.load(kaminoRpc, address(addr), DEFAULT_RECENT_SLOT_DURATION_MS).then((m) => {
    if (!m) throw new KaminoError("Kamino isn't answering right now. Try again in a moment.");
    return m;
  });
  loaded.set(addr, { at: Date.now(), market });
  market.catch(() => loaded.delete(addr));
  return market;
}

const markets = () => Promise.all(MARKETS.map(async (m) => ({ ...m, market: await market(m.address) })));

const collateralReserve = (m: KaminoMarket, mint: string) => m.getReserves().find((r) => r.getLiquidityMint() === mint && r.stats.loanToValue > 0);
const usdcReserve = (m: KaminoMarket) => m.getReserves().find((r) => r.getLiquidityMint() === USDC_MINT)!;
const obligationOf = (m: KaminoMarket, owner: string) => m.getUserVanillaObligation(address(owner)).catch(() => null) as Promise<KaminoObligation | null>;

// Kamino's USDC borrow rates, from its public API.
async function borrowRate(marketAddress: string) {
  const res = await fetch(`https://api.kamino.finance/kamino-market/${marketAddress}/reserves/metrics`, { next: { revalidate: 300 } }).catch(() => null);
  const reserves: { liquidityTokenMint: string; borrowApy: string }[] = res?.ok ? await res.json() : [];
  return Number(reserves.find((r) => r.liquidityTokenMint === USDC_MINT)?.borrowApy ?? 0);
}

// How close a loan is to Kamino selling the collateral: loan-to-value as a share of the liquidation point.
export const health = (ltv: number, liquidationLtv: number) => {
  const used = liquidationLtv > 0 ? ltv / liquidationLtv : 0;
  return used < 0.6 ? "Safe" : used < 0.85 ? "Watch" : "At risk";
};

export type Loan = { market: string; debt: number; collateral: { symbol: string; name: string; value: number }[]; health: string; rate: number };
// `needed` is how much of the stock (in USD) it takes to borrow the minimum, or 0 when the user already can.
export type BorrowOption = { symbol: string; name: string; held: number; max: number; rate: number; needed: number };

// The user's loans, and how much more they can borrow against each stock in their wallet.
export async function borrowOverview(owner: string, holdings: { mint: string; value: number }[]) {
  const all = await markets();
  const loans: Loan[] = [];
  const options: BorrowOption[] = [];
  for (const m of all) {
    const [obligation, rate] = await Promise.all([obligationOf(m.market, owner), borrowRate(m.address)]);
    const stats = obligation?.refreshedStats;
    const debt = stats?.userTotalBorrow.toNumber() ?? 0;
    // Room left on what's already locked, under Mofi's cap.
    const room = Math.max(0, (stats?.borrowLimit.toNumber() ?? 0) * CAP - debt);
    if (obligation && (debt > 0.005 || obligation.getDeposits().length)) {
      loans.push({
        market: m.name,
        debt,
        collateral: obligation.getDeposits().map((p) => ({ symbol: assetByMint.get(p.mintAddress)?.symbol ?? "", name: assetByMint.get(p.mintAddress)?.name ?? "Collateral", value: p.marketValueRefreshed.toNumber() })),
        health: health(stats!.loanToValue.toNumber(), stats!.liquidationLtv.toNumber()),
        rate,
      });
    }
    for (const h of holdings) {
      const reserve = collateralReserve(m.market, h.mint);
      const asset = assetByMint.get(h.mint);
      if (!reserve || !asset) continue;
      const perDollar = reserve.stats.loanToValue * CAP;
      const max = Math.floor((h.value * perDollar + room) * 100) / 100;
      const least = MIN_LOAN + (obligation ? 0 : SETUP_ESTIMATE);
      options.push({ symbol: asset.symbol, name: asset.name, held: h.value, max, rate, needed: max >= least ? 0 : Math.ceil((least - room) / perDollar) });
    }
  }
  return { loans, options };
}

// Kamino's setup steps make the borrower pay rent for new accounts. Mofi users hold no SOL,
// so those payments move to the fee wallet, and the borrower pays it back in USDC from the loan.
const SETUP = /^(CreateUserAta|initUserMetadata|InitObligation|InitObligationForFarm)/;
const NEW_ACCOUNTS = /^(initUserMetadata|InitObligation)/;

function feeWalletPaysSetup(action: KaminoAction, owner: string, payer: TransactionSigner): Instruction[] {
  const labels = KaminoAction.actionToIxLabels(action);
  return KaminoAction.actionToIxs(action).map((ix, i) =>
    SETUP.test(labels[i]) ? { ...ix, accounts: ix.accounts?.map((a) => (a.address === owner && a.role === 3 ? { address: payer.address, role: 3, signer: payer } : a)) } : ix,
  ) as Instruction[];
}

async function compile(instructions: Instruction[], payer: TransactionSigner, lookupTables: string[]) {
  const { value: latest } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const tables = await fetchAddressesForLookupTables(lookupTables.map((t) => address(t)), rpc);
  return compressTransactionMessageUsingAddressLookupTables(
    pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(payer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(latest, m),
      (m) => appendTransactionMessageInstructions(instructions, m),
    ),
    tables,
  );
}

type Simulation = { err: unknown; logs: string[] | null; accounts: ({ lamports: bigint } | null)[] | null };

// Simulates without signatures, to catch failures before the user signs and to measure what the fee wallet spends.
async function simulate(message: Awaited<ReturnType<typeof compile>>, payer: string, assetName: string) {
  const tx = getBase64EncodedWireTransaction(compileTransaction(message));
  const { value } = (await rpc
    .simulateTransaction(tx, { encoding: "base64", sigVerify: false, replaceRecentBlockhash: true, accounts: { encoding: "base64", addresses: [address(payer)] } })
    .send()) as unknown as { value: Simulation };
  if (value.err) {
    const logs = (value.logs ?? []).join("\n");
    if (/PriceTooOld|Price is too old/.test(logs)) throw new KaminoError(`${assetName}'s price isn't updating right now, usually because US markets are closed. Try again when they open.`);
    if (/insufficient funds/i.test(logs)) throw new KaminoError("You don't have enough to do this.");
    throw new KaminoError("Kamino turned this down. Try a smaller amount.");
  }
  return value.accounts?.[0]?.lamports ?? BigInt(0);
}

// Stock prices go stale between oracle updates, so every loan refreshes them first. The config rarely changes.
let scopeConfig: Promise<{ scope: Scope; scopeConfigurations: Awaited<ReturnType<Scope["getAllConfigurations"]>> }> | undefined;
const scopeRefresh = () => {
  if (!scopeConfig) {
    const scope = new Scope("mainnet-beta", kaminoRpc);
    scopeConfig = scope.getAllConfigurations().then((scopeConfigurations) => ({ scope, scopeConfigurations }));
    scopeConfig.catch(() => (scopeConfig = undefined));
  }
  return scopeConfig;
};

const lamportsOf = async (addr: string) => (await rpc.getBalance(address(addr)).send()).value;

// Locks the user's whole holding of a stock (if any is still in the wallet) and borrows USDC against it.
// On a first loan in a market, the setup cost comes out of the loan to the treasury.
export async function buildBorrow(owner: string, asset: AssetInfo, dollars: number) {
  const all = await markets();
  const m = all.find((x) => collateralReserve(x.market, asset.mint));
  if (!m) throw new KaminoError(`${asset.name} can't be borrowed against yet.`);
  const [obligation, wallet, ledger, scopeRefreshConfig, payer, rate] = await Promise.all([
    obligationOf(m.market, owner),
    balanceOf(owner, asset.mint),
    getCurrentLedgerInstant(kaminoRpc),
    scopeRefresh(),
    feeSigner(),
    borrowRate(m.address),
  ]);
  const stats = obligation?.refreshedStats;
  const reserve = collateralReserve(m.market, asset.mint)!;
  const price = (await prices([asset.mint]))[asset.mint]?.usdPrice ?? 0;
  const max = (stats?.borrowLimit.toNumber() ?? 0) * CAP - (stats?.userTotalBorrow.toNumber() ?? 0) + wallet.ui * price * reserve.stats.loanToValue * CAP;
  if (dollars > max + 0.005) throw new KaminoError(`You can borrow up to $${Math.max(0, Math.floor(max * 100) / 100).toFixed(2)} against your ${asset.name}.`);

  const signer = createNoopSigner(address(owner));
  // The SDK's props are typed against its own @solana/kit copy, hence the `as never` casts below.
  const common = { kaminoMarket: m.market, owner: signer, obligation: obligation ?? new VanillaObligation(PROGRAM_ID), useV2Ixs: true, scopeRefreshConfig, currentLedgerInstant: ledger, initUserMetadata: { skipInitialization: false, skipLutCreation: true } };
  const borrowAmount = Math.round(dollars * 1e6).toString();
  const action = wallet.raw > BigInt(0)
    ? await KaminoAction.buildDepositAndBorrowTxns({ ...common, depositAmount: wallet.raw.toString(), depositReserveAddress: reserve.address, borrowAmount, borrowReserveAddress: usdcReserve(m.market).address } as never)
    : await KaminoAction.buildBorrowTxns({ ...common, amount: borrowAmount, reserveAddress: usdcReserve(m.market).address } as never);

  const instructions = feeWalletPaysSetup(action, owner, payer);
  const tables = [m.lut, ...action.luts];
  const opensAccounts = KaminoAction.actionToIxLabels(action).some((l) => NEW_ACCOUNTS.test(l));

  // Measure the setup cost by simulation, then charge it in USDC, rounded up to the cent.
  let setupFee = 0;
  if (opensAccounts) {
    const [before, after] = await Promise.all([lamportsOf(payer.address), compile(instructions, payer, tables).then((msg) => simulate(msg, payer.address, asset.name))]);
    const sol = (await prices(["So11111111111111111111111111111111111111112"]))["So11111111111111111111111111111111111111112"]?.usdPrice ?? 0;
    setupFee = Math.ceil((Number(before - after) / 1e9) * sol * 100) / 100;
    if (!sol || setupFee >= dollars) throw new KaminoError(`Your first loan needs to be more than the one-time setup of $${setupFee.toFixed(2)}.`);
    instructions.push(...(await payTreasury(signer, BigInt(Math.round(setupFee * 1e6)), payer)));
  }

  const message = await compile(instructions, payer, tables);
  if (!opensAccounts) await simulate(message, payer.address, asset.name);
  const transaction = getBase64EncodedWireTransaction(await partiallySignTransactionMessageWithSigners(message));
  if (Buffer.from(transaction, "base64").length > 1232) throw new KaminoError("This loan doesn't fit in one transaction yet. Try again later.");
  const locked = (stats?.userTotalDeposit.toNumber() ?? 0) + wallet.ui * price;
  const after = health(((stats?.userTotalBorrow.toNumber() ?? 0) + dollars) / locked, reserve.stats.liquidationThreshold);
  return { transaction, setupFee, receive: dollars - setupFee, rate, locked, health: after };
}

// Pays back the whole loan in a market and unlocks the collateral, in one transaction.
export async function buildRepay(owner: string, marketName: string) {
  const m = (await markets()).find((x) => x.name === marketName);
  const obligation = m && (await obligationOf(m.market, owner));
  if (!m || !obligation) throw new KaminoError("There's no loan to repay.");
  const deposit = obligation.getDeposits()[0];
  const debt = obligation.refreshedStats.userTotalBorrow.toNumber();
  const cash = (await balanceOf(owner, USDC_MINT)).ui;
  if (cash < debt) throw new KaminoError(`You need $${debt.toFixed(2)} in cash to repay. You have $${cash.toFixed(2)}.`);
  const [ledger, scopeRefreshConfig, payer] = await Promise.all([getCurrentLedgerInstant(kaminoRpc), scopeRefresh(), feeSigner()]);
  const action = await KaminoAction.buildRepayAndWithdrawTxns({
    kaminoMarket: m.market,
    repayAmount: U64_MAX,
    repayReserveAddress: usdcReserve(m.market).address,
    withdrawAmount: U64_MAX,
    withdrawReserveAddress: deposit.reserveAddress,
    payer: createNoopSigner(address(owner)),
    obligation,
    useV2Ixs: true,
    scopeRefreshConfig,
    currentLedgerInstant: ledger,
  } as never);
  const message = await compile(feeWalletPaysSetup(action, owner, payer), payer, [m.lut, ...action.luts]);
  await simulate(message, payer.address, assetByMint.get(deposit.mintAddress)?.name ?? "This stock");
  return { transaction: getBase64EncodedWireTransaction(await partiallySignTransactionMessageWithSigners(message)), debt };
}

let earnVault: { at: number; vault: Promise<KaminoVault> } | undefined;

// Like markets, the Earn vault and its reserves are kept for 30 seconds.
function vault() {
  if (earnVault && Date.now() - earnVault.at < 30_000) return earnVault.vault;
  const v = new KaminoVault(kaminoRpc, address(EARN_VAULT), DEFAULT_RECENT_SLOT_DURATION_MS);
  const loading = v.getState().then(() => v.reloadVaultReserves()).then(() => v);
  earnVault = { at: Date.now(), vault: loading };
  loading.catch(() => (earnVault = undefined));
  return loading;
}

// Moves cash into Earn ("in") or back to cash ("out"), for the user to sign. The fee wallet pays the network fee,
// and opens the user's share account on a first move in.
export async function buildEarnMove(owner: string, direction: "in" | "out", dollars: number) {
  const [v, payer] = await Promise.all([vault(), feeSigner()]);
  const signer = createNoopSigner(address(owner));
  const reserves = v.vaultReservesStateCache!;
  let instructions: Instruction[];
  if (direction === "in") {
    const cash = (await balanceOf(owner, USDC_MINT)).ui;
    if (dollars > cash + 1e-6) throw new KaminoError(`You have $${cash.toFixed(2)} in cash.`);
    const ixs = await v.depositIxs(signer as never, new Decimal(dollars), reserves, null, null, payer as never);
    instructions = ixs.depositIxs as Instruction[];
  } else {
    const ledger = await getCurrentLedgerInstant(kaminoRpc);
    const [shares, rate] = await Promise.all([v.getUserShares(address(owner)), v.getExchangeRate(ledger)]);
    const balance = shares.totalShares.mul(rate).toNumber();
    if (dollars > balance + 0.005) throw new KaminoError(`You have $${balance.toFixed(2)} in Earn.`);
    // Moving out nearly everything moves out all of it, so no dust is left behind.
    const amount = dollars >= balance - 0.005 ? shares.totalShares : new Decimal(dollars).div(rate).toDecimalPlaces(6, Decimal.ROUND_DOWN);
    const ixs = await v.withdrawIxs(signer as never, amount, ledger, reserves, null, null, payer as never);
    instructions = [...ixs.unstakeFromFarmIfNeededIxs, ...(ixs.memoIx ? [ixs.memoIx] : []), ...ixs.withdrawIxs, ...ixs.postWithdrawIxs] as Instruction[];
  }
  const message = await compile(instructions, payer, [(await v.getState()).vaultLookupTable]);
  await simulate(message, payer.address, "USDC");
  const transaction = getBase64EncodedWireTransaction(await partiallySignTransactionMessageWithSigners(message));
  if (Buffer.from(transaction, "base64").length > 1232) throw new KaminoError("This doesn't fit in one transaction yet. Try a smaller amount.");
  return { transaction };
}
