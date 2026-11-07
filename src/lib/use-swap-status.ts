"use client";

import { useEffect, useState } from "react";

const FINAL = new Set(["SUCCESS", "REFUNDED", "FAILED"]);

// Follows an Aurora swap by its deposit address until it succeeds, refunds or fails. A withdrawal through a permanent
// address also passes its Solana transaction and when it was sent, to tell it apart from earlier ones.
export function useSwapStatus(depositAddress: string | null, sent?: { tx: string; at: number }) {
  const [seen, setSeen] = useState<{ address: string; status: string } | null>(null);
  const status = seen?.address === depositAddress ? seen.status : "PENDING_DEPOSIT";

  useEffect(() => {
    if (!depositAddress || FINAL.has(status)) return;
    let live = true;
    const timer = setInterval(
      () =>
        fetch(`/api/deposit?address=${encodeURIComponent(depositAddress)}${sent ? `&tx=${sent.tx}&since=${sent.at}` : ""}`)
          .then((r) => r.json())
          .then((d) => live && d.status && setSeen({ address: depositAddress, status: d.status }))
          .catch(() => {}),
      5000,
    );
    return () => { live = false; clearInterval(timer); };
  }, [depositAddress, status, sent]);

  return status;
}
