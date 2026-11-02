// Example figures for the screens on the landing page. They are labelled "Example" there.

export type Asset = {
  name: string;
  ticker: string;
  value: number;
  change: number;
  logo?: string;
};

export const holdings: Asset[] = [
  { name: "S&P 500", ticker: "SPY", value: 642.1, change: 2.8, logo: "/logos/stocks/spy.png" },
  { name: "SpaceX", ticker: "SPCX", value: 236.4, change: 5.4, logo: "/logos/stocks/spcx.svg" },
  { name: "NVIDIA", ticker: "NVDA", value: 165.5, change: 4.1, logo: "/logos/stocks/nvda.png" },
  { name: "Bitcoin", ticker: "BTC", value: 100, change: 1.6, logo: "/logos/bitcoin.png" },
];

export const cash = 140.5;
export const total = holdings.reduce((sum, a) => sum + a.value, cash);

export const popular: Asset[] = [
  { name: "SpaceX", ticker: "SPCX", value: 152.4, change: 2.1, logo: "/logos/stocks/spcx.svg" },
  { name: "NVIDIA", ticker: "NVDA", value: 187.2, change: 1.2, logo: "/logos/stocks/nvda.png" },
  { name: "Bitcoin", ticker: "BTC", value: 104320, change: -0.8, logo: "/logos/bitcoin.png" },
  { name: "Solana", ticker: "SOL", value: 186.4, change: 2.4, logo: "/logos/solana.png" },
];

export const readyMade = [
  { name: "S&P 500", sub: "SPY", change: 0.6 },
  { name: "Nasdaq 100", sub: "QQQ", change: 0.9 },
  { name: "Big Tech", sub: "6 stocks", change: -0.3 },
];

export const sources = [
  { token: "USDT", chain: "Tron", tokenLogo: "/logos/usdt.png", chainLogo: "/logos/tron.png" },
  { token: "USDT", chain: "BNB Chain", tokenLogo: "/logos/usdt.png", chainLogo: "/logos/bnb.png" },
  { token: "USDC", chain: "Ethereum", tokenLogo: "/logos/usdc.png", chainLogo: "/logos/ethereum.png" },
  { token: "USDC", chain: "Base", tokenLogo: "/logos/usdc.png", chainLogo: "/logos/base.png" },
  { token: "USDC", chain: "Arbitrum", tokenLogo: "/logos/usdc.png", chainLogo: "/logos/arbitrum.png" },
  { token: "USDC", chain: "Solana", tokenLogo: "/logos/usdc.png", chainLogo: "/logos/solana.png" },
];

export const chains = [
  { name: "Tron", logo: "/logos/tron.png" },
  { name: "BNB Chain", logo: "/logos/bnb.png" },
  { name: "Ethereum", logo: "/logos/ethereum.png" },
  { name: "Base", logo: "/logos/base.png" },
  { name: "Arbitrum", logo: "/logos/arbitrum.png" },
  { name: "Solana", logo: "/logos/solana.png" },
];
