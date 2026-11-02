"use client";

import { useSignTransaction } from "@privy-io/react-auth/solana";
import { useMofiWallet } from "@/components/signed-in";
import { postJson } from "@/lib/api";
import { fromBase64, toBase64 } from "@/lib/base64";

export type Order = { transaction: string; requestId: string; feeBps: number; sponsored: boolean; cashOut: number | null; at: number };

// A message from Mofi's server that is safe to show as is.
export class TradeError extends Error {}

async function post(path: string, body: object) {
  const res = await postJson(path, body);
  const data = await res.json();
  if (!res.ok) throw new TradeError(data.error);
  return data;
}

// Stamps an order with when it arrived: it carries a recent blockhash, so an old one is fetched again before signing.
const stamped = (o: Omit<Order, "at">): Order => ({ ...o, at: Date.now() });

// Buying and selling on Jupiter: the server builds the order, the Mofi wallet signs it without a pop-up, the server sends it.
export function useTrade() {
  const { address, wallet } = useMofiWallet();
  const { signTransaction } = useSignTransaction();
  return {
    order: async (side: "buy" | "sell", symbol: string, amount: string) => stamped(await post("/api/trade", { side, symbol, amount, taker: address })),
    execute: async (o: Order) => {
      const { signedTransaction } = await signTransaction({ transaction: fromBase64(o.transaction), wallet: wallet!, chain: "solana:mainnet" });
      return (await post("/api/trade/execute", { signedTransaction: toBase64(signedTransaction), requestId: o.requestId })).signature as string;
    },
  };
}
