// Chains Aurora moves money between, keyed by Aurora's blockchain id.
// The few without a logo (QTC, PRL) show their first letter.
export const CHAINS: Record<string, { name: string; logo?: string }> = {
  tron: { name: "Tron", logo: "/logos/tron.png" },
  bsc: { name: "BNB Chain", logo: "/logos/bnb.png" },
  eth: { name: "Ethereum", logo: "/logos/ethereum.png" },
  sol: { name: "Solana", logo: "/logos/solana.png" },
  base: { name: "Base", logo: "/logos/base.png" },
  arb: { name: "Arbitrum", logo: "/logos/arbitrum.png" },
  ton: { name: "TON", logo: "/logos/ton.png" },
  pol: { name: "Polygon", logo: "/logos/pol.png" },
  op: { name: "Optimism", logo: "/logos/op.png" },
  avax: { name: "Avalanche", logo: "/logos/avax.png" },
  hood: { name: "Robinhood Chain", logo: "/logos/hood.webp" },
  btc: { name: "Bitcoin", logo: "/logos/bitcoin.png" },
  aptos: { name: "Aptos", logo: "/logos/aptos.png" },
  sui: { name: "Sui", logo: "/logos/sui.png" },
  near: { name: "NEAR", logo: "/logos/near.png" },
  stellar: { name: "Stellar", logo: "/logos/stellar.png" },
  hypercore: { name: "Hyperliquid", logo: "/logos/hypercore.png" },
  monad: { name: "Monad", logo: "/logos/monad.png" },
  plasma: { name: "Plasma", logo: "/logos/plasma.png" },
  xlayer: { name: "X Layer", logo: "/logos/xlayer.png" },
  gnosis: { name: "Gnosis", logo: "/logos/gnosis.png" },
  scroll: { name: "Scroll", logo: "/logos/scroll.png" },
  bera: { name: "Berachain", logo: "/logos/bera.webp" },
  abs: { name: "Abstract", logo: "/logos/abs.webp" },
  starknet: { name: "Starknet", logo: "/logos/starknet.png" },
  xrp: { name: "XRP Ledger", logo: "/logos/xrp.png" },
  doge: { name: "Dogecoin", logo: "/logos/doge.png" },
  ltc: { name: "Litecoin", logo: "/logos/ltc.png" },
  bch: { name: "Bitcoin Cash", logo: "/logos/bch.png" },
  cardano: { name: "Cardano", logo: "/logos/cardano.png" },
  zec: { name: "Zcash", logo: "/logos/zec.png" },
  dash: { name: "Dash", logo: "/logos/dash.png" },
  aleo: { name: "Aleo", logo: "/logos/aleo.webp" },
  movement: { name: "Movement", logo: "/logos/movement.webp" },
  fogo: { name: "Fogo", logo: "/logos/fogo.webp" },
  adi: { name: "ADI Chain", logo: "/logos/adi.webp" },
};

// The chains people pick most, shown first in chain dropdowns. The rest sit under "Other chains".
export const MAIN_CHAINS = ["sol", "tron", "bsc", "eth", "base", "hood", "monad"];

// Chains where Aurora gives each user a permanent deposit address. EVM chains share one address.
export const EVM_CHAINS = ["eth", "base", "bsc", "arb", "op", "pol", "avax", "hood", "gnosis", "monad", "plasma", "scroll", "xlayer", "bera", "adi"];
export const DEPOSIT_CHAINS = new Set([...EVM_CHAINS, "sol", "tron", "ton", "btc", "sui", "aptos", "near", "stellar", "xrp", "doge", "ltc", "bch", "cardano", "zec", "dash", "aleo", "starknet"]);

export const chainName = (id: string) => CHAINS[id]?.name ?? id.toUpperCase();

const TOKEN_LOGOS: Record<string, string> = {
  USDT: "/logos/usdt.png",
  USDT0: "/logos/usdt.png",
  USDC: "/logos/usdc.png",
  USDCx: "/logos/usdc.png",
  USDG: "/logos/usdg.webp",
  USDe: "/logos/usde.webp",
  ETH: "/logos/ethereum.png",
  WETH: "/logos/ethereum.png",
  BTC: "/logos/bitcoin.png",
  WBTC: "/logos/bitcoin.png",
  cbBTC: "/logos/bitcoin.png",
  SOL: "/logos/solana.png",
  BNB: "/logos/bnb.png",
};

// An asset in Aurora's token list. A native coin (no contract) uses its chain's logo.
export type AuroraAsset = { assetId: string; chain: string; symbol: string; decimals: number; native: boolean };

export const tokenLogo = (a: AuroraAsset) => TOKEN_LOGOS[a.symbol] ?? (a.native ? CHAINS[a.chain]?.logo : undefined);

// Order tokens the way people look for them: USDT, then USDC and other dollars, then the chain's own coin.
const rank = (a: AuroraAsset) => (a.symbol === "USDT" ? 0 : /^USD/.test(a.symbol) ? 1 : a.native ? 2 : 3);
export const byPreference = (x: AuroraAsset, y: AuroraAsset) => rank(x) - rank(y) || x.symbol.localeCompare(y.symbol);

export const SOL_USDC_ASSET = "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near";

export const isSolanaAddress = (address: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address.trim());

// Aurora checks the address format for each chain; this only stops obvious junk before the request.
export const looksLikeAddress = (address: string) => /^[A-Za-z0-9:._-]{2,120}$/.test(address.trim());

// "12.5" with 6 decimals → "12500000", without floating-point rounding.
export function toBaseUnits(amount: string, decimals: number): string | null {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(amount.trim());
  if (!m || (m[2] ?? "").length > decimals) return null;
  return BigInt(m[1] + (m[2] ?? "").padEnd(decimals, "0")).toString();
}
