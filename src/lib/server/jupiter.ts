import { getSetComputeUnitLimitInstruction, getSetComputeUnitPriceInstruction } from "@solana-program/compute-budget";
import { getTransferSolInstruction } from "@solana-program/system";
import { getTransferCheckedInstruction } from "@solana-program/token";
import { AuthorityType, getCloseAccountInstruction, getHarvestWithheldTokensToMintInstruction, getSetAuthorityInstruction } from "@solana-program/token-2022";
import {
  AccountRole,
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  compressTransactionMessageUsingAddressLookupTables,
  createNoopSigner,
  createTransactionMessage,
  getBase58Decoder,
  getBase64EncodedWireTransaction,
  getBase64Encoder,
  getSignatureFromTransaction,
  getTransactionEncoder,
  partiallySignTransaction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type AddressesByLookupTableAddress,
  type Blockhash,
  type Instruction,
} from "@solana/kit";
import { USDC_MINT } from "@/lib/assets";
import { INVITED_FEE_BPS, INVITER_BPS, TRADE_FEE_BPS } from "@/lib/fees";
import { TREASURY, feeWallet, usdcAccount } from "@/lib/server/fee-payer";
import { SOL_MINT, rpc, type TokenAccount } from "@/lib/server/portfolio";
import { owe } from "@/lib/server/referral";

// Jupiter's Swap API. The key stays on the server, and errors never include it.
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

type ApiInstruction = { programId: string; accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[]; data: string };

type Build = {
  outAmount: string;
  computeBudgetInstructions: ApiInstruction[];
  setupInstructions: ApiInstruction[];
  swapInstruction: ApiInstruction;
  cleanupInstruction: ApiInstruction | null;
  otherInstructions: ApiInstruction[];
  addressesByLookupTableAddress: Record<string, string[]> | null;
  blockhashWithMetadata: { blockhash: number[]; lastValidBlockHeight: number };
};

// The wallet doesn't hold what the trade spends.
export class ShortError extends JupiterError {}

const NO_PRICE = "Couldn't get a price right now. Try a different amount.";
// The most the fee wallet pays per compute unit, in micro-lamports, however busy Jupiter says the network is.
const MAX_UNIT_PRICE = BigInt(500_000);
const MAX_UNITS = 1_400_000;
const ASSOCIATED_TOKEN_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
// Inviters' cash accounts known to be open. Cash accounts never close, so once seen is enough.
const cashAccounts = new Set<string>();
// Jupiter's own error for a wallet that doesn't hold what the swap spends.
const INSUFFICIENT_FUNDS = 6024;

const bytes = (base64: string) => getBase64Encoder().encode(base64);

const instruction = (ix: ApiInstruction): Instruction => ({
  programAddress: address(ix.programId),
  accounts: ix.accounts.map((a) => ({
    address: address(a.pubkey),
    role: a.isSigner ? (a.isWritable ? AccountRole.WRITABLE_SIGNER : AccountRole.READONLY_SIGNER) : a.isWritable ? AccountRole.WRITABLE : AccountRole.READONLY,
  })),
  data: bytes(ix.data),
});

// Jupiter's suggested price per compute unit, capped.
function unitPrice(build: Build) {
  const data = build.computeBudgetInstructions.map((ix) => bytes(ix.data)).find((d) => d[0] === 3 && d.length === 9);
  const suggested = data ? new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(1, true) : BigInt(0);
  return suggested < MAX_UNIT_PRICE ? suggested : MAX_UNIT_PRICE;
}

// A swap built from Jupiter's instructions (its /build route charges no fee of its own), with Mofi's fee (see
// lib/fees.ts) paid in USDC straight to the treasury. Mofi's fee wallet pays the network fee and any new-account rent
// and has already signed; the user's wallet signs after, and /api/send sends it.
// destinationTokenAccount sends what's bought to another wallet's token account (a gift).
//
// The fee wallet pays the rent on every token account it opens for a user, and gets it back when the account closes:
// a buy makes the fee wallet the account's only closer, and `emptied` (the account a sale sells all of) closes with
// the sale. Both are left out if they'd make the trade fail or too big to send, so they never stand in its way.
//
// `inviter` is the friend who invited this user (see lib/server/referral.ts). The user then pays the invited fee, and
// the inviter's share of it goes to the inviter's cash in the same transaction. An inviter with no cash account yet
// gets nothing for this trade, and the treasury keeps that share.
export async function build({
  emptied,
  inviter,
  ...params
}: {
  inputMint: string;
  outputMint: string;
  amount: string;
  taker: string;
  destinationTokenAccount?: string;
  emptied?: TokenAccount;
  inviter?: string | null;
}) {
  const payer = await feeWallet();
  if (!payer) throw new JupiterError("Investing isn't set up yet.");
  const exists = async (account: string) => !!(await rpc<{ value: object | null }>("getAccountInfo", [account, { encoding: "base64", dataSlice: { offset: 0, length: 0 } }])).value;

  const reward = inviter ? await usdcAccount(inviter) : null;
  const rewarded = !!reward && (cashAccounts.has(reward) || (await exists(reward)));
  if (rewarded) cashAccounts.add(reward);
  const share = (amount: bigint, of: number) => (amount * BigInt(INVITER_BPS)) / BigInt(of);
  // On a buy the inviter's share comes off the cash before the swap; on a sale, off what the swap brings in.
  const buying = params.inputMint === USDC_MINT;
  const upfront = rewarded && buying ? share(BigInt(params.amount), 10_000) : BigInt(0);
  const treasuryBps = inviter ? INVITED_FEE_BPS - (rewarded ? INVITER_BPS : 0) : TRADE_FEE_BPS;
  const b: Build = await swapApi(
    `build?${new URLSearchParams({
      ...params,
      amount: (BigInt(params.amount) - upfront).toString(),
      payer: payer.address,
      platformFeeBps: String(treasuryBps),
      feeAccount: await usdcAccount(TREASURY),
      slippageBps: "rtse",
      // Leaves room for the fee wallet's signature and the instructions added below.
      maxBytes: rewarded ? "1000" : "1050",
    })}`,
  );
  if (!b.swapInstruction) throw new JupiterError(NO_PRICE);

  const instructions = [...b.setupInstructions, b.swapInstruction, ...(b.cleanupInstruction ? [b.cleanupInstruction] : []), ...b.otherInstructions].map(instruction);
  const owner = createNoopSigner(address(params.taker));
  // What the swap brings in is quoted after the treasury's fee, so the inviter's share is worked back from it.
  const paid = rewarded && !buying ? share(BigInt(b.outAmount), 10_000 - treasuryBps) : upfront;
  if (reward && paid > BigInt(0)) {
    instructions.push(getTransferCheckedInstruction({ source: await usdcAccount(params.taker), mint: address(USDC_MINT), destination: reward, authority: owner, amount: paid, decimals: 6 }));
  }
  const closer = createNoopSigner(address(payer.address));
  const programOf = (programId: string) => ({ programAddress: address(programId) }) as { programAddress: Address<never> };
  // The user's own account for what's bought, when the swap opens it (if it isn't open yet).
  const bought = b.setupInstructions.find((ix) => ix.programId === ASSOCIATED_TOKEN_PROGRAM && ix.accounts[2]?.pubkey === params.taker && ix.accounts[3]?.pubkey === params.outputMint);
  const optional: Instruction[] = [];

  if (bought && params.destinationTokenAccount) {
    // A gift passes through the sender's own account for the asset on its way to the gift wallet. If the swap had to
    // open that account, it closes again right after, so its rent returns to the fee wallet that paid it.
    if (!(await exists(bought.accounts[1].pubkey))) {
      const account = address(bought.accounts[1].pubkey);
      const mint = await rpc<{ value: { data: { parsed?: { info?: { extensions?: { extension: string }[] } } } } | null }>("getAccountInfo", [params.outputMint, { encoding: "jsonParsed" }]);
      // Tokens with a transfer fee keep fees withheld in the account, and it can't close until they're swept to the mint.
      if (mint.value?.data.parsed?.info?.extensions?.some((e) => e.extension === "transferFeeConfig")) {
        instructions.push(getHarvestWithheldTokensToMintInstruction({ mint: address(params.outputMint), sources: [account] }, programOf(bought.accounts[5].pubkey)));
      }
      instructions.push(getCloseAccountInstruction({ account, destination: closer.address, owner }, programOf(bought.accounts[5].pubkey)));
    }
  } else if (bought && params.outputMint !== SOL_MINT && params.outputMint !== USDC_MINT) {
    // Only the fee wallet can close the account from here on, so the rent it paid can only come back to it.
    // Not the cash account, though: that one stays open for good, for deposits to land in.
    const { value } = await rpc<{ value: { data: { parsed?: { info?: { closeAuthority?: string } } } } | null }>("getAccountInfo", [bought.accounts[1].pubkey, { encoding: "jsonParsed" }]);
    if (!value?.data.parsed?.info?.closeAuthority) {
      optional.push(getSetAuthorityInstruction({ owned: address(bought.accounts[1].pubkey), owner, authorityType: AuthorityType.CloseAccount, newAuthority: closer.address }, programOf(bought.accounts[5].pubkey)));
    }
  }

  if (emptied && (!emptied.closeAuthority || emptied.closeAuthority === payer.address)) {
    if (emptied.withholds) optional.push(getHarvestWithheldTokensToMintInstruction({ mint: address(params.inputMint), sources: [address(emptied.account)] }, programOf(emptied.program)));
    optional.push(getCloseAccountInstruction({ account: address(emptied.account), destination: closer.address, owner: emptied.closeAuthority ? closer : owner }, programOf(emptied.program)));
  }

  // Routes through SOL open a wrapped-SOL account at the fee wallet's cost, then close it into the user's wallet.
  // The user pays that rent back, so it isn't theirs to keep.
  const [wrapped, receiver] = b.cleanupInstruction?.accounts ?? [];
  if (wrapped && receiver?.pubkey === params.taker && bytes(b.cleanupInstruction!.data)[0] === 9) {
    const [open, rent] = await Promise.all([exists(wrapped.pubkey), rpc<number>("getMinimumBalanceForRentExemption", [165])]);
    if (!open) instructions.push(getTransferSolInstruction({ source: owner, destination: address(payer.address), amount: BigInt(rent) }));
  }

  const lookups: AddressesByLookupTableAddress = Object.fromEntries(Object.entries(b.addressesByLookupTableAddress ?? {}).map(([table, list]) => [address(table), list.map((a) => address(a))]));
  const lifetime = {
    blockhash: getBase58Decoder().decode(Uint8Array.from(b.blockhashWithMetadata.blockhash)) as Blockhash,
    lastValidBlockHeight: BigInt(b.blockhashWithMetadata.lastValidBlockHeight),
  };
  const microLamports = unitPrice(b);
  const compile = (units: number, all: Instruction[]) =>
    compileTransaction(
      pipe(
        createTransactionMessage({ version: 0 }),
        (m) => setTransactionMessageFeePayer(address(payer.address), m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
        (m) => appendTransactionMessageInstructions([getSetComputeUnitLimitInstruction({ units }), getSetComputeUnitPriceInstruction({ microLamports }), ...all], m),
        (m) => compressTransactionMessageUsingAddressLookupTables(m, lookups),
      ),
    );

  // Simulated first: it tells how much compute to pay for, and anything that would fail does so here, before signing.
  // Nothing comes back for a transaction too big to send.
  const simulate = async (all: Instruction[]) => {
    const transaction = compile(MAX_UNITS, all);
    if (getTransactionEncoder().encode(transaction).length > 1232) return null;
    const { value } = await rpc<{ value: { err: unknown; logs: string[] | null; unitsConsumed?: number } }>("simulateTransaction", [
      getBase64EncodedWireTransaction(transaction),
      { encoding: "base64", sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed" },
    ]);
    return value;
  };
  let all = [...instructions, ...optional];
  let sim = await simulate(all);
  if ((!sim || sim.err) && optional.length) {
    all = instructions;
    sim = await simulate(all);
  }
  if (!sim) throw new JupiterError(NO_PRICE);
  if (sim.err) {
    const short = JSON.stringify(sim.err).includes(`"Custom":${INSUFFICIENT_FUNDS}`) || sim.logs?.some((l) => l.includes("insufficient funds"));
    throw short ? new ShortError(NO_PRICE) : new JupiterError(NO_PRICE);
  }

  const transaction = await partiallySignTransaction([payer.keyPair], compile(Math.min(Math.ceil((sim.unitsConsumed ?? MAX_UNITS) * 1.2), MAX_UNITS), all));
  // For the inviter's Rewards screen. The money moves either way, so a miss here never stops the trade.
  if (inviter && paid > BigInt(0)) await owe(getSignatureFromTransaction(transaction), inviter, paid).catch(() => {});
  return { transaction: getBase64EncodedWireTransaction(transaction), outAmount: buying ? b.outAmount : (BigInt(b.outAmount) - paid).toString() };
}
