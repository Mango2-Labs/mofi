"use client";

import { useEffect, useState } from "react";

// Fetches JSON now and again every few seconds, so balances and prices stay fresh without a reload.
export function usePoll<T>(url: string | null, everyMs = 15000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let live = true;
    const load = () =>
      fetch(url)
        .then(async (r) => {
          const body = await r.json();
          if (!live) return;
          if (r.ok) { setData(body); setError(null); } else setError(body.error);
        })
        .catch(() => live && setError("Couldn't load this right now."));
    load();
    const timer = setInterval(load, everyMs);
    return () => { live = false; clearInterval(timer); };
  }, [url, everyMs]);

  return { data, error };
}
