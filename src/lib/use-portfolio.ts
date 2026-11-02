"use client";

import type { Holding } from "@/lib/server/portfolio";
import type { Prices } from "@/lib/server/jupiter";
import { usePoll } from "@/lib/use-poll";

export type Portfolio = { cash: number; earn: number; holdings: Holding[]; total: number };

export function usePortfolio(owner: string | undefined) {
  const { data, error } = usePoll<Portfolio>(owner ? `/api/portfolio?owner=${owner}` : null);
  return { portfolio: data, error };
}

export const usePrices = () => usePoll<Prices>("/api/prices", 30000).data;
