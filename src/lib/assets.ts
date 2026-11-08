export type AssetKind = "stock" | "etf" | "prestock" | "crypto";

export type AssetInfo = {
  symbol: string;
  name: string;
  mint: string;
  logo: string;
  kind: AssetKind;
};

// How Explore and the portfolio group assets, in order. Their names and each asset's About are in lib/i18n.
export const KINDS: AssetKind[] = ["stock", "etf", "prestock", "crypto"];

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// Stocks and ETFs are xStocks. Pre-stocks are SpaceX (Backpack Securities) and OpenAI and Anthropic (PreStocks).
// Crypto is cbBTC, Wormhole ETH, wrapped SOL, and Jupiter-verified Solana tokens for Sui, NEAR, Zcash and Monad.
export const ASSETS: AssetInfo[] = [
  { symbol: "NVDA", name: "NVIDIA", mint: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh", logo: "/logos/stocks/nvda.png", kind: "stock" },
  { symbol: "AAPL", name: "Apple", mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp", logo: "/logos/stocks/aapl.png", kind: "stock" },
  { symbol: "GOOGL", name: "Alphabet", mint: "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN", logo: "/logos/stocks/googl.png", kind: "stock" },
  { symbol: "META", name: "Meta", mint: "Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu", logo: "/logos/stocks/meta.png", kind: "stock" },
  { symbol: "TSLA", name: "Tesla", mint: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB", logo: "/logos/stocks/tsla.png", kind: "stock" },
  { symbol: "SPY", name: "S&P 500", mint: "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W", logo: "/logos/stocks/spy.png", kind: "etf" },
  { symbol: "QQQ", name: "Nasdaq 100", mint: "Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ", logo: "/logos/stocks/qqq.png", kind: "etf" },
  { symbol: "GLD", name: "Gold", mint: "Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re", logo: "/logos/stocks/gld.png", kind: "etf" },
  { symbol: "SPCX", name: "SpaceX", mint: "SPCXxcqXj6e5dJDVNovHN8744zkbhM2bYudU45BimGb", logo: "/logos/stocks/spcx.svg", kind: "prestock" },
  { symbol: "OPENAI", name: "OpenAI", mint: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF", logo: "/logos/stocks/openai.png", kind: "prestock" },
  { symbol: "ANTHROPIC", name: "Anthropic", mint: "Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw", logo: "/logos/stocks/anthropic.png", kind: "prestock" },
  { symbol: "BTC", name: "Bitcoin", mint: "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij", logo: "/logos/bitcoin.png", kind: "crypto" },
  { symbol: "ETH", name: "Ethereum", mint: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", logo: "/logos/ethereum.png", kind: "crypto" },
  { symbol: "SOL", name: "Solana", mint: "So11111111111111111111111111111111111111112", logo: "/logos/solana.png", kind: "crypto" },
  { symbol: "SUI", name: "Sui", mint: "suifhC9gU1VbJAPYPTBkHJyyyStKGLLYPVDTmPoqbvA", logo: "/logos/sui.png", kind: "crypto" },
  { symbol: "NEAR", name: "NEAR", mint: "3ZLekZYq2qkZiSpnSvabjit34tUkjSwD1JFuW9as9wBG", logo: "/logos/near.png", kind: "crypto" },
  { symbol: "ZEC", name: "Zcash", mint: "A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS", logo: "/logos/zec.png", kind: "crypto" },
  { symbol: "MON", name: "Monad", mint: "CrAr4RRJMBVwRsZtT62pEhfA9H5utymC2mVx8e7FreP2", logo: "/logos/monad.png", kind: "crypto" },
];

export const assetByMint = new Map(ASSETS.map((a) => [a.mint, a]));

// What can be gifted: everything that's a token. SOL would land as plain SOL, which a gift claim doesn't move.
export const GIFTABLE = new Set(ASSETS.filter((a) => a.symbol !== "SOL").map((a) => a.symbol));

// "0.365 shares" for stocks and funds, "0.00065 BTC" for crypto. `shares` is the word in the reader's language.
export const units = (a: AssetInfo, n: number, shares: string) =>
  `${n.toLocaleString("en-US", { maximumSignificantDigits: 4 })} ${a.kind === "crypto" ? a.symbol : shares}`;
