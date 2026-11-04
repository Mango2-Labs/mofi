import { getSetComputeUnitLimitInstruction, getSetComputeUnitPriceInstruction } from "@solana-program/compute-budget";
import {
  findAssociatedTokenPda,
  getCloseAccountInstruction,
  getCreateAssociatedTokenIdempotentInstruction,
  getHarvestWithheldTokensToMintInstruction,
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
} from "@solana/kit";
import { ASSETS, USDC_MINT } from "@/lib/assets";
import { feeSigner } from "@/lib/server/fee-payer";
import { TOKEN_PROGRAMS, rpc } from "@/lib/server/portfolio";

export class GiftError extends Error {}

const GIFTABLE = new Set([USDC_MINT, ...ASSETS.map((a) => a.mint)]);

type Holding = {
  pubkey: string;
  account: { data: { parsed: { info: { mint: string; tokenAmount: { amount: string; decimals: number }; extensions?: { extension: string }[] } } } };
};

// A claim fits about five tokens in one transaction; anything beyond (dust someone sent to the gift wallet, say) is
// left for the next claim, so it can never block the gift.
const PER_CLAIM = 5;

// What's still in a gift wallet, from raw token balances (never prices, which can be briefly missing).
export async function giftHoldings(gift: string) {
  const sets = await Promise.all(
    TOKEN_PROGRAMS.map((programId) => rpc<{ value: Holding[] }>("getTokenAccountsByOwner", [gift, { programId }, { encoding: "jsonParsed" }]).then((r) => r.value.map((h) => ({ ...h, programId })))),
  );
  return sets.flat().filter((h) => GIFTABLE.has(h.account.data.parsed.info.mint) && BigInt(h.account.data.parsed.info.tokenAmount.amount) > BigInt(0));
}

// A claim: everything in a gift wallet moves to the claimer's Mofi wallet, and the gift wallet's token accounts close,
// returning their rent to the fee wallet that opened them. The fee wallet pays and signs; the link's key signs after,
// in the claimer's browser, so the server never sees it.
export async function buildClaim(gift: string, to: string) {
  const [payer, all] = await Promise.all([feeSigner(), giftHoldings(gift)]);
  if (!all.length) throw new GiftError("This gift has already been claimed.");
  const held = all.slice(0, PER_CLAIM);

  const owner = createNoopSigner(address(gift));
  const instructions: Instruction[] = [getSetComputeUnitLimitInstruction({ units: 60_000 * held.length + 20_000 }), getSetComputeUnitPriceInstruction({ microLamports: 100_000 })];
  for (const h of held) {
    const { mint, tokenAmount, extensions } = h.account.data.parsed.info;
    const program = { programAddress: address(h.programId) } as { programAddress: Address<never> };
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
    instructions.push(getCloseAccountInstruction({ account: address(h.pubkey), destination: payer.address, owner }, program));
  }

  const { value: latest } = await rpc<{ value: { blockhash: string; lastValidBlockHeight: number } }>("getLatestBlockhash", [{ commitment: "confirmed" }]);
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash({ blockhash: blockhash(latest.blockhash), lastValidBlockHeight: BigInt(latest.lastValidBlockHeight) }, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );
  const transaction = getBase64EncodedWireTransaction(await partiallySignTransactionMessageWithSigners(message));
  // Simulated first, so a token that can't move right now (paused, say) fails here and not after signing.
  const { value } = await rpc<{ value: { err: unknown } }>("simulateTransaction", [transaction, { encoding: "base64", sigVerify: false, replaceRecentBlockhash: true }]);
  if (value.err) throw new GiftError("This gift can't be claimed right now. Try again later.");
  return transaction;
}
