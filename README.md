# Mofi

Modern finance, a dollar away. Buy and sell stocks, ETFs, pre-IPO companies and crypto 24/7 from $1, or borrow against them, with the dollars you already hold on any chain. Built for Indonesia first.

**Live on Solana mainnet:** https://getmofi.com

## What you can do

- **Sign in with email.** You get a self-custodial Solana wallet (Privy). No seed phrase and no SOL: Mofi pays the network fees.
- **Deposit from any chain.** A permanent deposit address on 30+ networks, for USDT, USDC and 100+ coins (Aurora Intents). Money arrives as USDC cash.
- **Buy and sell** stocks, ETFs, pre-IPO companies (SpaceX, OpenAI, Anthropic) and crypto on Jupiter. Short on cash? "Deposit $X and buy" buys as soon as the deposit lands.
- **Gift a stock as a link.** Your friend signs in with email and it's theirs.
- **Withdraw to any chain** (Aurora Intents), through a permanent address per destination. **Private** mode (Aurora Confidential Intents) hides the link between your Mofi wallet and the receiving address.
- **Borrow** USDC against your stocks (Kamino), capped at half of Kamino's limit.
- **Earn** interest on idle cash in Kamino's Steakhouse USDC vault.
- **Activity** lists every deposit, buy, sale, gift, withdrawal and loan, each linked to Solscan.
- **English or Bahasa Indonesia**, with amounts in dollars or rupiah.

## Fees

- **Buy, sell and gift:** 0.5%, taken as a Jupiter referral fee. Mofi keeps 0.4%.
- **Deposits and regular withdrawals:** no Mofi fee. The route's own cost is shown before you confirm.
- **Private withdrawals:** a small confidential fee, of which Mofi gets 0.04%.

## How it's built

| Part | Built with |
|---|---|
| Wallet | Privy email wallets. Mofi's fee wallet co-signs and pays network fees and rent. |
| Money in | Aurora Intents persistent deposit addresses |
| Trading | Jupiter Swap API (xStocks, PreStocks, Backpack pre-stocks, crypto) |
| Gifts | A one-time key in the link. Mofi's fee wallet is the gift account's only closer, so its rent always comes back. |
| Money out | Aurora persistent addresses per destination, Confidential Intents for Private |
| Earn and Borrow | Kamino |
| App | Next.js 16, Bun, Tailwind v4, @solana/kit, Upstash Redis, Vercel |

## Run it locally

```bash
bun install
bun run dev   # http://localhost:3000
```

Put these in `.env.local`:

| Variable | What it's for |
|---|---|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app ID, for email sign-in |
| `PRIVY_APP_SECRET` | Privy server secret, to check which wallet a signed-in user owns |
| `SOLANA_RPC_URL` | A Solana mainnet RPC URL |
| `MOFI_FEE_PAYER_KEY` | Base58 secret key of the fee wallet. Fund it with SOL. |
| `JUPITER_API_KEY` | Jupiter API key, for trading |
| `AURORA_API_KEY` | Aurora Intents API key, for deposits and withdrawals |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis. Optional: without it, each withdrawal pays its exact network setup cost. |
| `CRON_SECRET` | Protects the daily jobs in `vercel.json` |
| `ALERT_WEBHOOK_URL` | Optional Discord or Slack webhook for low fee-wallet alerts |

Trading fees go to the Jupiter referral account set in `src/lib/fees.ts`. Mofi runs on mainnet with real money, so test with small amounts.
