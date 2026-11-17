// What people pay Mofi. Deposits and withdrawals carry no Mofi fee: it's 0 on Mofi's Aurora key (Aurora's portal), so
// only the route's spread and Aurora's 2 bps apply, and the fee wallet pays the Solana side. Private withdrawals carry
// the confidential fee set there (8 bps: Aurora 4, Mofi 4).

// Buys, sells and gifts pay 0.5%, in USDC, as part of the swap. Trades are built with Jupiter's /build route, which
// charges no fee of its own, so all of it is Mofi's to keep or share.
export const TRADE_FEE_BPS = 50;

// Someone who joined through a friend's invite link pays 0.4%, for good. Of that, 0.1% of each trade (a quarter of
// the fee) goes straight to the friend's cash, in the same transaction, and Mofi's treasury gets 0.3%.
export const INVITED_FEE_BPS = 40;
export const INVITER_BPS = 10;

export const tradeFee = (dollars: number, bps = TRADE_FEE_BPS) => (dollars * bps) / 10_000;
