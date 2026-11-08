"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useT } from "@/components/language";
import { Phone } from "@/components/phone";
import { BuyScreen, DepositAddressScreen, ExploreScreen, PortfolioScreen, WithdrawScreen } from "@/components/screens";

// One screen per slide of the tour; titles and descriptions are in lib/i18n.
const SCREENS = [<PortfolioScreen key="portfolio" />, <ExploreScreen key="explore" />, <BuyScreen key="buy" />, <DepositAddressScreen key="deposit" />, <WithdrawScreen key="withdraw" />];

const STEP_MS = 4000;
const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function AppTour() {
  const t = useT();
  const [index, setIndex] = useState(0);
  const reducedMotion = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);
  // Starts paused for people who ask for less motion, until they press play.
  const [userPaused, setPaused] = useState<boolean | null>(null);
  const paused = userPaused ?? reducedMotion;

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % SCREENS.length), STEP_MS);
    return () => clearTimeout(timer);
  }, [index, paused]);

  const slide = t.landing.tour[index];
  return (
    <div className="flex w-full flex-col items-center gap-3.5">
      <div className="flex items-center gap-1">
        {t.landing.tour.map((s, i) => (
          <button key={i} type="button" onClick={() => setIndex(i)} aria-label={t.landing.tourShow(s.title)} aria-current={i === index} className="cursor-pointer px-[3px] py-5">
            <span className={`block h-1 w-[30px] rounded-full ${i === index ? "bg-ink" : "bg-zinc-300"}`} />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? t.landing.tourPlay : t.landing.tourPause}
          className="ml-2 flex size-[34px] cursor-pointer items-center justify-center rounded-full border border-line bg-card"
        >
          {paused ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5.5v13l10.5-6.5z" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          )}
        </button>
      </div>
      <p className="text-center text-xl font-semibold tracking-[-0.02em]" aria-live="polite">{slide.title}</p>
      <Phone size="lg" label={slide.alt}>{SCREENS[index]}</Phone>
    </div>
  );
}
