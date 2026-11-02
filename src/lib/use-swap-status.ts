"use client";

import { useEffect, useState } from "react";

const FINAL = new Set(["SUCCESS", "REFUNDED", "FAILED"]);

// Follows an Aurora swap by its deposit address until it succeeds, refunds or fails.
export function useSwapStatus(depositAddress: string | null) {
  const [seen, setSeen] = useState<{ address: string; status: string } | null>(null);
  const status = seen?.address === depositAddress ? seen.status : "PENDING_DEPOSIT";

  useEffect(() => {
    if (!depositAddress || FINAL.has(status)) return;
    let live = true;
    const timer = setInterval(
      () =>
        fetch(`/api/deposit?address=${encodeURIComponent(depositAddress)}`)
          .then((r) => r.json())
          .then((d) => live && d.status && setSeen({ address: depositAddress, status: d.status }))
          .catch(() => {}),
      5000,
    );
    return () => { live = false; clearInterval(timer); };
  }, [depositAddress, status]);

  return status;
}
