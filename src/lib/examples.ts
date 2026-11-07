// Made-up figures for the phone screens on the landing page.
import type { AssetKind } from "@/lib/assets";

export type Asset = {
  name: string;
  ticker: string;
  value: number;
  change: number;
  logo?: string;
};

const NVDA = { name: "NVIDIA", ticker: "NVDA", logo: "/logos/stocks/nvda.png" };
const SPY = { name: "S&P 500", ticker: "SPY", logo: "/logos/stocks/spy.png" };
const SPCX = { name: "SpaceX", ticker: "SPCX", logo: "/logos/stocks/spcx.svg" };
const BTC = { name: "Bitcoin", ticker: "BTC", logo: "/logos/bitcoin.png" };

// What the example person holds, grouped the way Portfolio groups it.
export const portfolio: { kind: AssetKind; items: Asset[] }[] = [
  { kind: "stock", items: [{ ...NVDA, value: 165.5, change: 4.1 }] },
  { kind: "etf", items: [{ ...SPY, value: 542.1, change: 0.6 }] },
  { kind: "prestock", items: [{ ...SPCX, value: 236.4, change: 5.4 }] },
  { kind: "crypto", items: [{ ...BTC, value: 100, change: 1.6 }] },
];

export const earning = 100;
export const cash = 140.5;
export const total = portfolio.flatMap((g) => g.items).reduce((sum, a) => sum + a.value, earning + cash);

// Prices as Explore lists them.
export const explore: { kind: AssetKind; items: Asset[] }[] = [
  {
    kind: "stock",
    items: [
      { ...NVDA, value: 186.12, change: 1.2 },
      { name: "Apple", ticker: "AAPL", logo: "/logos/stocks/aapl.png", value: 342.47, change: 0.8 },
      { name: "Tesla", ticker: "TSLA", logo: "/logos/stocks/tsla.png", value: 348.71, change: -2.1 },
    ],
  },
  {
    kind: "etf",
    items: [
      { ...SPY, value: 734.93, change: 0.4 },
      { name: "Nasdaq 100", ticker: "QQQ", logo: "/logos/stocks/qqq.png", value: 656.07, change: 0.6 },
    ],
  },
  {
    kind: "prestock",
    items: [
      { ...SPCX, value: 126.92, change: 2.1 },
      { name: "OpenAI", ticker: "OPENAI", logo: "/logos/stocks/openai.png", value: 972.63, change: 3.4 },
      { name: "Anthropic", ticker: "ANTHROPIC", logo: "/logos/stocks/anthropic.png", value: 85.35, change: 1.8 },
    ],
  },
];

export const spacex = explore[2].items[0];

// The coins Deposit lists first, with how many networks each comes from.
export const coins = [
  { name: "Tether", symbol: "USDT", logo: "/logos/usdt.png", networks: 16 },
  { name: "USD Coin", symbol: "USDC", logo: "/logos/usdc.png", networks: 15 },
  { name: "Global Dollar", symbol: "USDG", logo: "/logos/usdg.webp", networks: 1 },
  { name: "Bitcoin", symbol: "BTC", logo: "/logos/bitcoin.png", networks: 3 },
  { name: "Ether", symbol: "ETH", logo: "/logos/ethereum.png", networks: 8 },
];
