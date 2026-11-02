import { getSetComputeUnitLimitInstruction, getSetComputeUnitPriceInstruction } from "@solana-program/compute-budget";
import { TOKEN_PROGRAM_ADDRESS, findAssociatedTokenPda, getCreateAssociatedTokenIdempotentInstruction, getTransferCheckedInstruction } from "@solana-program/token";
import {
  address,
  appendTransactionMessageInstructions,
  blockhash,
  createKeyPairFromBytes,
  createNoopSigner,
  createSignerFromKeyPair,
  createTransactionMessage,
  getAddressFromPublicKey,
  getBase58Encoder,
  getBase64Decoder,
  getBase64EncodedWireTransaction,
  getBase64Encoder,
  getTransactionDecoder,
  getTransactionEncoder,
  partiallySignTransaction,
  partiallySignTransactionMessageWithSigners,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  type TransactionSigner,
} from "@solana/kit";
import { USDC_MINT } from "@/lib/assets";
import { rpc } from "@/lib/server/portfolio";

// Mofi's fee wallet pays network fees and new-account rent, so users never need SOL.
// It only signs transactions the server built or fetched from Jupiter itself, never one a client sends in.
let wallet: Promise<{ keyPair: CryptoKeyPair; address: string }> | undefined;

export function feeWallet() {
  const secret = process.env.MOFI_FEE_PAYER_KEY;
  if (!secret) return null;
  wallet ??= createKeyPairFromBytes(getBase58Encoder().encode(secret)).then(async (keyPair) => ({
    keyPair,
    address: await getAddressFromPublicKey(keyPair.publicKey),
  }));
  return wallet;
}

// Adds the fee wallet's signature when the transaction needs it. The user's wallet signs after.
export async function cosign(base64: string) {
  const { keyPair, address: payer } = (await feeWallet())!;
  const tx = getTransactionDecoder().decode(getBase64Encoder().encode(base64));
  if (!(payer in tx.signatures)) return base64;
  return getBase64Decoder().decode(getTransactionEncoder().encode(await partiallySignTransaction([keyPair], tx)));
}

// Mofi's revenue wallet. Aurora pays Mofi's share of its fees here too.
const TREASURY = address("DRv86pCTqrEjkLMU9r6e8KiDihPBdLCbUk3Kyr213J5C");

export const feeSigner = async () => createSignerFromKeyPair((await feeWallet())!.keyPair);

const usdcAccount = (wallet: string) =>
  findAssociatedTokenPda({ owner: address(wallet), mint: address(USDC_MINT), tokenProgram: TOKEN_PROGRAM_ADDRESS }).then(([a]) => a);

// A USDC payment from the user to Mofi's treasury, opening the treasury's USDC account if needed.
// Pass the same owner signer the rest of the transaction uses.
export async function payTreasury(owner: TransactionSigner, fee: bigint, payer: TransactionSigner) {
  const mint = address(USDC_MINT);
  const [source, treasury] = await Promise.all([usdcAccount(owner.address), usdcAccount(TREASURY)]);
  return [
    getCreateAssociatedTokenIdempotentInstruction({ payer, ata: treasury, owner: TREASURY, mint }),
    getTransferCheckedInstruction({ source, mint, destination: treasury, authority: owner, amount: fee, decimals: 6 }),
  ];
}

// A USDC transfer from the user to an Aurora deposit address, plus Mofi's network fee to the treasury.
// The fee wallet pays the Solana fee and opens the deposit address's USDC account.
// The server only builds these for addresses Aurora just gave it.
export async function payUsdc(from: string, to: string, amount: bigint, fee: bigint) {
  const payer = await feeSigner();
  const owner = createNoopSigner(address(from));
  const mint = address(USDC_MINT);
  const [source, destination, toTreasury, { value: latest }] = await Promise.all([
    usdcAccount(from),
    usdcAccount(to),
    payTreasury(owner, fee, payer),
    rpc<{ value: { blockhash: string; lastValidBlockHeight: number } }>("getLatestBlockhash", [{ commitment: "confirmed" }]),
  ]);
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash({ blockhash: blockhash(latest.blockhash), lastValidBlockHeight: BigInt(latest.lastValidBlockHeight) }, m),
    (m) =>
      appendTransactionMessageInstructions(
        [
          getSetComputeUnitLimitInstruction({ units: 60_000 }),
          getSetComputeUnitPriceInstruction({ microLamports: 100_000 }),
          getCreateAssociatedTokenIdempotentInstruction({ payer, ata: destination, owner: address(to), mint }),
          getTransferCheckedInstruction({ source, mint, destination, authority: owner, amount, decimals: 6 }),
          ...toTreasury,
        ],
        m,
      ),
  );
  return getBase64EncodedWireTransaction(await partiallySignTransactionMessageWithSigners(message));
}
