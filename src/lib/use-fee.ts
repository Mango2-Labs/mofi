"use client";

import { TRADE_FEE_BPS } from "@/lib/fees";
import { usePoll } from "@/lib/use-poll";

// What this wallet pays to trade, in basis points: less if a friend invited it. The standard fee until it's known.
export const useFeeBps = (wallet: string | undefined) =>
  usePoll<{ feeBps: number }>(wallet ? `/api/referral?wallet=${wallet}` : null, 60_000).data?.feeBps ?? TRADE_FEE_BPS;
