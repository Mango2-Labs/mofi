"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Phone } from "@/components/phone";
import { AddMoneyScreen, FriendsScreen, HomeScreen, InvestScreen } from "@/components/screens";

const SLIDES = [
  { title: "Your money at a glance", alt: "The Home screen: total value $1,284.50, a notice that 250 USDT arrived from Tron, and holdings in the S&P 500, SpaceX, NVIDIA, Bitcoin and cash.", screen: <HomeScreen /> },
  { title: "Deposit from any chain", alt: "The Deposit screen: 250 USDT from Tron, a deposit address with a QR code, waiting for the USDT.", screen: <AddMoneyScreen /> },
  { title: "Stocks, funds and crypto", alt: "The Invest screen: ready-made portfolios, and popular stocks and crypto with prices.", screen: <InvestScreen /> },
  { title: "See everything before you buy", alt: "A Buy SpaceX sheet: $50, the price, about 0.328 shares, the most you will pay per share, the fee, and Confirm.", screen: <InvestScreen sheet /> },
  { title: "Invest with friends", alt: "The Friends screen: a monthly league and a feed of what friends buy, with a Copy button.", screen: <FriendsScreen /> },
];

const STEP_MS = 4000;
const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function AppTour() {
  const [index, setIndex] = useState(0);
  const reducedMotion = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);
  // Starts paused for people who ask for less motion, until they press play.
  const [userPaused, setPaused] = useState<boolean | null>(null);
  const paused = userPaused ?? reducedMotion;

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), STEP_MS);
    return () => clearTimeout(timer);
  }, [index, paused]);

  const slide = SLIDES[index];
  return (
    <div className="flex w-full flex-col items-center gap-3.5">
      <div className="flex items-center gap-1">
        {SLIDES.map((s, i) => (
          <button key={s.title} type="button" onClick={() => setIndex(i)} aria-label={`Show ${s.title.toLowerCase()}`} aria-current={i === index} className="cursor-pointer px-[3px] py-5">
            <span className={`block h-1 w-[30px] rounded-full ${i === index ? "bg-ink" : "bg-zinc-300"}`} />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? "Play the app tour" : "Pause the app tour"}
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
      <Phone size="lg" label={slide.alt}>{slide.screen}</Phone>
      <span className="text-xs text-ink-muted">Example</span>
    </div>
  );
}
