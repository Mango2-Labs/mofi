export type AssetKind = "stock" | "etf" | "prestock" | "crypto";

export type AssetInfo = {
  symbol: string;
  name: string;
  mint: string;
  logo: string;
  kind: AssetKind;
  about: string;
};

// How Explore and the portfolio group assets, in order.
export const KINDS: { kind: AssetKind; label: string }[] = [
  { kind: "stock", label: "Stocks" },
  { kind: "etf", label: "ETFs" },
  { kind: "prestock", label: "Pre-stocks" },
  { kind: "crypto", label: "Crypto" },
];

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// Stocks and ETFs are xStocks. Pre-stocks are SpaceX (Backpack Securities) and OpenAI and Anthropic (PreStocks).
// Crypto is cbBTC, Wormhole ETH and wrapped SOL.
export const ASSETS: AssetInfo[] = [
  { symbol: "NVDA", name: "NVIDIA", mint: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh", logo: "/logos/stocks/nvda.png", kind: "stock", about: "Chips that power AI and gaming." },
  { symbol: "AAPL", name: "Apple", mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp", logo: "/logos/stocks/aapl.png", kind: "stock", about: "iPhone, Mac and the services around them." },
  { symbol: "GOOGL", name: "Alphabet", mint: "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN", logo: "/logos/stocks/googl.png", kind: "stock", about: "Google Search, YouTube and Android." },
  { symbol: "META", name: "Meta", mint: "Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu", logo: "/logos/stocks/meta.png", kind: "stock", about: "Facebook, Instagram and WhatsApp." },
  { symbol: "TSLA", name: "Tesla", mint: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB", logo: "/logos/stocks/tsla.png", kind: "stock", about: "Electric cars, batteries and solar." },
  { symbol: "SPY", name: "S&P 500", mint: "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W", logo: "/logos/stocks/spy.png", kind: "etf", about: "The 500 largest US companies in one fund." },
  { symbol: "QQQ", name: "Nasdaq 100", mint: "Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ", logo: "/logos/stocks/qqq.png", kind: "etf", about: "The 100 largest companies on the Nasdaq, mostly tech." },
  { symbol: "GLD", name: "Gold", mint: "Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re", logo: "/logos/stocks/gld.png", kind: "etf", about: "Follows the price of gold." },
  { symbol: "SPCX", name: "SpaceX", mint: "SPCXxcqXj6e5dJDVNovHN8744zkbhM2bYudU45BimGb", logo: "/logos/stocks/spcx.svg", kind: "prestock", about: "Rockets and Starlink. A private company, held through Backpack Securities." },
  { symbol: "OPENAI", name: "OpenAI", mint: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF", logo: "/logos/stocks/openai.png", kind: "prestock", about: "Maker of ChatGPT. A private company, held through PreStocks." },
  { symbol: "ANTHROPIC", name: "Anthropic", mint: "Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw", logo: "/logos/stocks/anthropic.png", kind: "prestock", about: "Maker of Claude. A private company, held through PreStocks." },
  { symbol: "BTC", name: "Bitcoin", mint: "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij", logo: "/logos/bitcoin.png", kind: "crypto", about: "The first and largest cryptocurrency." },
  { symbol: "ETH", name: "Ethereum", mint: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", logo: "/logos/ethereum.png", kind: "crypto", about: "The network behind most apps and stablecoins." },
  { symbol: "SOL", name: "Solana", mint: "So11111111111111111111111111111111111111112", logo: "/logos/solana.png", kind: "crypto", about: "A fast, low-cost network." },
];

export const assetByMint = new Map(ASSETS.map((a) => [a.mint, a]));

// What can be gifted: everything that's a token. SOL would land as plain SOL, which a gift claim doesn't move.
export const GIFTABLE = new Set(ASSETS.filter((a) => a.symbol !== "SOL").map((a) => a.symbol));

// "0.365 shares" for stocks and funds, "0.00065 BTC" for crypto.
export const units = (a: AssetInfo, n: number) =>
  `${n.toLocaleString("en-US", { maximumSignificantDigits: 4 })} ${a.kind === "crypto" ? a.symbol : "shares"}`;
