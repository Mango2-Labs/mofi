import { withdrawAddress } from "@/lib/server/aurora";
import { feeWallet, usdcAccount } from "@/lib/server/fee-payer";
import { prices } from "@/lib/server/jupiter";
import { kvAdd, kvCountWith, kvGet, kvReady, kvSet } from "@/lib/server/kv";
import { SOL_MINT, rpc } from "@/lib/server/portfolio";

// A withdrawal pays USDC into an Aurora address on Solana, and the first one to an address opens its USDC account, whose
// rent never comes back to Mofi. Normal withdrawals reuse one permanent address per user and destination, so that
// happens once. Each user gets FREE_OPENINGS a day, reserved in the shared store when a withdrawal is built, so a burst
// of requests can't all be free; a retry to the same address counts once. Past that, while the fee wallet is down to its
// floor, or when the store isn't set up or answering, the user pays the exact cost (rent plus the transaction fee) in USDC.
export const FREE_OPENINGS = 3;
export const FEE_WALLET_FLOOR = 20_000_000; // lamports kept for network fees on trades and withdrawals (0.02 SOL)
const TX_FEE = 16_000; // two signatures plus the priority fee, in lamports

export class SetupError extends Error {}

const day = () => new Date().toISOString().slice(0, 10);
// EVM addresses are case-insensitive, and so is any address written all in capitals (Bitcoin's in QR codes, say);
// others (Tron, Solana) aren't.
const destination = (owner: string, chain: string, assetId: string, recipient: string) =>
  `withdraw:${owner}:${chain}:${assetId}:${/^0x/i.test(recipient) || recipient === recipient.toUpperCase() ? recipient.toLowerCase() : recipient}`;

// The user's permanent address for a destination, if they've withdrawn there before. Never creates one.
export const knownAddress = (owner: string, chain: string, assetId: string, recipient: string) =>
  kvGet(destination(owner, chain, assetId, recipient));

// The permanent address for a destination, made (and remembered) on the first withdrawal there.
export async function permanentAddress(owner: string, chain: string, assetId: string, recipient: string) {
  const key = destination(owner, chain, assetId, recipient);
  const known = await kvGet(key);
  if (known) return known;
  const made = await withdrawAddress(owner, chain, assetId, recipient);
  await kvSet(key, made);
  return made;
}

async function exactCost() {
  const [rent, sol] = await Promise.all([rpc<number>("getMinimumBalanceForRentExemption", [165]), prices([SOL_MINT]).then((p) => p[SOL_MINT]?.usdPrice)]);
  if (!sol) throw new SetupError("Couldn't price the network setup right now. Try again.");
  return Math.ceil(((rent + TX_FEE) / 1e9) * sol * 1000) / 1000;
}

// What the user pays to open the USDC account at `depositAddress` (null for one not open yet, as a new destination or a
// private withdrawal has): 0 when it's open already or still free for them, else the exact cost, rounded up to a tenth
// of a cent. With `reserve`, the address takes a place in today's allowance (a private one, a new place each time);
// without, it's only priced.
export async function setupCost(owner: string, depositAddress: string | null, { reserve = false } = {}) {
  if (depositAddress) {
    const { value } = await rpc<{ value: unknown }>("getAccountInfo", [await usdcAccount(depositAddress), { encoding: "base64" }]);
    if (value) return 0;
  }
  if (!kvReady()) return exactCost();
  const { value: balance } = await rpc<{ value: number }>("getBalance", [(await feeWallet())!.address]);
  if (balance <= FEE_WALLET_FLOOR) return exactCost();
  const key = `openings:${owner}:${day()}`;
  const used = await (reserve ? kvAdd(key, depositAddress ?? crypto.randomUUID(), 172_800) : kvCountWith(key, depositAddress)).catch(() => Infinity);
  return used <= FREE_OPENINGS ? 0 : exactCost();
}
