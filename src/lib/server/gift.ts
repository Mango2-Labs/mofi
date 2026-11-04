import { getSetComputeUnitLimitInstruction, getSetComputeUnitPriceInstruction } from "@solana-program/compute-budget";
import {
  AuthorityType,
  findAssociatedTokenPda,
  getCloseAccountInstruction,
  getCreateAssociatedTokenIdempotentInstruction,
  getHarvestWithheldTokensToMintInstruction,
  getSetAuthorityInstruction,
  getTransferCheckedInstruction,
} from "@solana-program/token-2022";
import {
  address,
  appendTransactionMessageInstructions,
  blockhash,
  createNoopSigner,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  partiallySignTransactionMessageWithSigners,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";
import { ASSETS, USDC_MINT } from "@/lib/assets";
import { feeSigner } from "@/lib/server/fee-payer";
import { TOKEN_PROGRAMS, rpc } from "@/lib/server/portfolio";

export class GiftError extends Error {}

const GIFTABLE = new Set([USDC_MINT, ...ASSETS.map((a) => a.mint)]);

type Holding = {
  pubkey: string;
  account: {
    data: { parsed: { info: { mint: string; owner: string; closeAuthority?: string; tokenAmount: { amount: string; decimals: number }; extensions?: { extension: string }[] } } };
  };
};

// A claim fits about five tokens in one transaction; anything beyond (dust someone sent to the gift wallet, say) is
// left for the next claim, so it can never block the gift.
const PER_CLAIM = 5;

const programOf = (programId: string) => ({ programAddress: address(programId) }) as { programAddress: Address<never> };

// Which token program a mint belongs to: classic Token, or Token-2022 (xStocks, pre-stocks).
const programs = new Map<string, string>();
async function mintProgram(mint: string) {
  if (!programs.has(mint)) {
    const { value } = await rpc<{ value: { owner: string } | null }>("getAccountInfo", [mint, { encoding: "base64" }]);
    if (!value) throw new GiftError("This can't be gifted right now.");
    programs.set(mint, value.owner);
  }
  return programs.get(mint)!;
}

const giftAccount = async (gift: string, mint: string) => (await findAssociatedTokenPda({ owner: address(gift), mint: address(mint), tokenProgram: address(await mintProgram(mint)) }))[0];

// Signs as the fee wallet (fee payer) and simulates, so anything that would fail does so here and not after signing.
async function finish(instructions: Instruction[], payer: TransactionSigner, failure: string) {
  const { value: latest } = await rpc<{ value: { blockhash: string; lastValidBlockHeight: number } }>("getLatestBlockhash", [{ commitment: "confirmed" }]);
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash({ blockhash: blockhash(latest.blockhash), lastValidBlockHeight: BigInt(latest.lastValidBlockHeight) }, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );
  const transaction = getBase64EncodedWireTransaction(await partiallySignTransactionMessageWithSigners(message));
  const { value } = await rpc<{ value: { err: unknown } }>("simulateTransaction", [transaction, { encoding: "base64", sigVerify: false, replaceRecentBlockhash: true }]);
  if (value.err) throw new GiftError(failure);
  return transaction;
}

// Before a gift is bought, the fee wallet opens the gift wallet's account for it and becomes the only one that can
// close it (the link's key signs that, in the sender's browser). The rent it paid then always comes back to it,
// even if the link holder moves the gift out on their own.
export async function buildPrepare(gift: string, mint: string) {
  const payer = await feeSigner();
  const tokenProgram = await mintProgram(mint);
  const ata = await giftAccount(gift, mint);
  return finish(
    [
      getSetComputeUnitLimitInstruction({ units: 60_000 }),
      getSetComputeUnitPriceInstruction({ microLamports: 100_000 }),
      getCreateAssociatedTokenIdempotentInstruction({ payer, ata, owner: address(gift), mint: address(mint), tokenProgram: address(tokenProgram) }),
      getSetAuthorityInstruction({ owned: ata, owner: createNoopSigner(address(gift)), authorityType: AuthorityType.CloseAccount, newAuthority: payer.address }, programOf(tokenProgram)),
    ],
    payer,
    "Couldn't set up this gift. Try again.",
  );
}

// Whether the gift wallet's account is open with the fee wallet as its only closer, so buying into it costs the fee
// wallet no rent it can't get back.
export async function giftReady(gift: string, mint: string) {
  const [payer, ata] = await Promise.all([feeSigner(), giftAccount(gift, mint)]);
  const { value } = await rpc<{ value: Holding["account"] | null }>("getAccountInfo", [ata, { encoding: "jsonParsed" }]);
  const info = value?.data.parsed?.info;
  return info?.owner === gift && info.closeAuthority === payer.address;
}

type ParsedIx = { parsed?: { type?: string; info?: { account?: string; authorityType?: string; newAuthority?: string } } };

// Empty token accounts the fee wallet is the closer of: gift accounts prepared but never bought into, or emptied by a
// link holder outside Mofi. Closing them returns their rent to the fee wallet. They're found from the fee wallet's
// recent prepare transactions (the RPC blocks a search across all token accounts), a few at a time so one
// transaction always fits.
export async function sweepGiftAccounts({ send = false } = {}) {
  const payer = await feeSigner();
  const sigs = await rpc<{ signature: string; err: unknown }[]>("getSignaturesForAddress", [payer.address, { limit: 200 }]);
  const txs = await Promise.all(
    sigs.filter((s) => !s.err).map((s) => rpc<{ transaction: { message: { instructions: ParsedIx[] } } } | null>("getTransaction", [s.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]).catch(() => null)),
  );
  const prepared = [
    ...new Set(
      txs.flatMap((tx) => tx?.transaction.message.instructions ?? []).flatMap(({ parsed }) =>
        parsed?.type === "setAuthority" && parsed.info?.authorityType === "closeAccount" && parsed.info.newAuthority === payer.address && parsed.info.account ? [parsed.info.account] : [],
      ),
    ),
  ].slice(0, 100);
  if (!prepared.length) return { closed: 0 };
  const { value } = await rpc<{ value: ({ owner: string; data: Holding["account"]["data"] } | null)[] }>("getMultipleAccounts", [prepared, { encoding: "jsonParsed" }]);
  const found = prepared
    .map((pubkey, i) => ({ pubkey, programId: value[i]?.owner ?? "", account: value[i] && { data: value[i]!.data } }))
    .filter((a): a is { pubkey: string; programId: string; account: Holding["account"] } => {
      const info = a.account?.data.parsed?.info;
      return !!info && info.tokenAmount.amount === "0" && info.closeAuthority === payer.address;
    })
    .slice(0, 8);
  if (!found.length) return { closed: 0 };
  const instructions: Instruction[] = [getSetComputeUnitLimitInstruction({ units: 30_000 * found.length + 10_000 }), getSetComputeUnitPriceInstruction({ microLamports: 100_000 })];
  for (const a of found) {
    const program = programOf(a.programId);
    const { mint, extensions } = a.account.data.parsed.info;
    if (extensions?.some((e) => e.extension === "transferFeeAmount")) {
      instructions.push(getHarvestWithheldTokensToMintInstruction({ mint: address(mint), sources: [address(a.pubkey)] }, program));
    }
    instructions.push(getCloseAccountInstruction({ account: address(a.pubkey), destination: payer.address, owner: payer }, program));
  }
  const transaction = await finish(instructions, payer, "Couldn't sweep gift accounts.");
  if (!send) return { closed: found.length, sent: false };
  return { closed: found.length, signature: await rpc<string>("sendTransaction", [transaction, { encoding: "base64" }]) };
}

// What's still in a gift wallet, from raw token balances (never prices, which can be briefly missing).
export async function giftHoldings(gift: string) {
  const sets = await Promise.all(
    TOKEN_PROGRAMS.map((programId) => rpc<{ value: (Holding & { pubkey: string })[] }>("getTokenAccountsByOwner", [gift, { programId }, { encoding: "jsonParsed" }]).then((r) => r.value.map((h) => ({ ...h, programId })))),
  );
  return sets.flat().filter((h) => GIFTABLE.has(h.account.data.parsed.info.mint) && BigInt(h.account.data.parsed.info.tokenAmount.amount) > BigInt(0));
}

// A claim: everything in a gift wallet moves to the claimer's Mofi wallet, and the gift wallet's token accounts close,
// returning their rent to the fee wallet that opened them. The fee wallet pays and signs (and closes, where it's the
// account's closer); the link's key signs the transfers after, in the claimer's browser, so the server never sees it.
export async function buildClaim(gift: string, to: string) {
  const [payer, all] = await Promise.all([feeSigner(), giftHoldings(gift)]);
  if (!all.length) throw new GiftError("This gift has already been claimed.");
  const held = all.slice(0, PER_CLAIM);

  const owner = createNoopSigner(address(gift));
  const instructions: Instruction[] = [getSetComputeUnitLimitInstruction({ units: 60_000 * held.length + 20_000 }), getSetComputeUnitPriceInstruction({ microLamports: 100_000 })];
  for (const h of held) {
    const { mint, tokenAmount, extensions, closeAuthority } = h.account.data.parsed.info;
    const program = programOf(h.programId);
    const [ata] = await findAssociatedTokenPda({ owner: address(to), mint: address(mint), tokenProgram: address(h.programId) });
    instructions.push(
      getCreateAssociatedTokenIdempotentInstruction({ payer, ata, owner: address(to), mint: address(mint), tokenProgram: address(h.programId) }),
      getTransferCheckedInstruction({ source: address(h.pubkey), mint: address(mint), destination: ata, authority: owner, amount: BigInt(tokenAmount.amount), decimals: tokenAmount.decimals }, program),
    );
    // Tokens with a transfer fee (OpenAI and Anthropic, for example) keep fees withheld in the account, and it can't
    // close until they're swept to the mint.
    if (extensions?.some((e) => e.extension === "transferFeeAmount")) {
      instructions.push(getHarvestWithheldTokensToMintInstruction({ mint: address(mint), sources: [address(h.pubkey)] }, program));
    }
    instructions.push(getCloseAccountInstruction({ account: address(h.pubkey), destination: payer.address, owner: closeAuthority === payer.address ? payer : owner }, program));
  }
  return finish(instructions, payer, "This gift can't be claimed right now. Try again later.");
}
