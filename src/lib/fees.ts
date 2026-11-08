// What people pay Mofi. Deposits and withdrawals carry no Mofi fee: it's 0 on Mofi's Aurora key (Aurora's portal), so
// only the route's spread and Aurora's 2 bps apply, and the fee wallet pays the Solana side. Private withdrawals carry
// the confidential fee set there (8 bps: Aurora 4, Mofi 4).

// Buys, sells and gifts pay 0.5%, as a Jupiter referral fee into Mofi's Ultra referral account (its owner wallet
// claims it). Jupiter keeps 20% of it and charges no fee of its own on those trades. 50 bps is the lowest it allows.
export const TRADE_FEE_BPS = 50;
export const JUPITER_REFERRAL_ACCOUNT = "61EbBcbKgq4svcaJJapafSY6SYYktEAVsLKfFbeN5LYf";
export const tradeFee = (dollars: number) => (dollars * TRADE_FEE_BPS) / 10_000;
