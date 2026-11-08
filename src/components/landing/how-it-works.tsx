"use client";

import { useState, type ReactNode } from "react";
import { useT } from "@/components/language";
import { Icon, Phone } from "@/components/phone";
import {
  BuyScreen, DepositAddressScreen, DepositCoinsScreen, EarnScreen, ExploreScreen, GiftClaimScreen, GiftScreen, WithdrawDoneScreen, WithdrawScreen,
} from "@/components/screens";

// The screens for each tab's steps, in the order of the tabs in lib/i18n (Deposit, Buy, Withdraw, Gift, Earn).
const SCREENS: ReactNode[][] = [
  [<DepositCoinsScreen key="coins" />, <DepositAddressScreen key="address" />],
  [<ExploreScreen key="explore" />, <BuyScreen key="buy" />],
  [<WithdrawScreen key="withdraw" />, <WithdrawDoneScreen key="done" />],
  [<GiftScreen key="gift" />, <GiftClaimScreen key="claim" />],
  [<EarnScreen key="earn" />],
];

export function HowItWorks() {
  const t = useT();
  const [tab, setTab] = useState(0);
  const [step, setStep] = useState(0);
  const current = t.landing.how[tab];
  const last = current.steps.length - 1;

  return (
    <div className="flex flex-col gap-10">
      <div role="tablist" aria-label={t.landing.features} className="-mx-6 flex gap-2 overflow-x-auto px-6 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {t.landing.how.map((h, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === tab}
            onClick={() => { setTab(i); setStep(0); }}
            className={`flex min-h-11 shrink-0 cursor-pointer items-center rounded-full border px-[18px] text-[15px] font-semibold ${i === tab ? "border-ink bg-ink text-on-ink" : "border-line bg-card text-ink"}`}
          >
            {h.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="grid items-center gap-12 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-16">
        <div className="flex min-w-0 flex-col gap-5 lg:pt-24">
          <h3 className="text-[clamp(28px,3vw,40px)] leading-[1.1] font-semibold tracking-[-0.03em] text-balance">{current.title}</h3>
          <p className="max-w-[30em] text-lg text-ink-muted">{current.desc}</p>
          {last > 0 && (
            <>
              <div className="flex flex-col gap-1">
                {current.steps.map((s, i) => (
                  <button key={i} type="button" onClick={() => setStep(i)} className={`flex min-h-11 cursor-pointer items-center gap-3 text-left text-base font-semibold ${i === step ? "text-ink" : "text-ink-muted"}`}>
                    <span className={`flex size-7 items-center justify-center rounded-full text-[13px] ${i === step ? "bg-ink text-on-ink" : "bg-line text-ink-muted"}`}>{i + 1}</span>
                    {s.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0} aria-label={t.landing.prev} className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-line bg-card disabled:cursor-default disabled:opacity-40">
                  <Icon name="back" size={18} stroke={2.2} />
                </button>
                <span className="text-sm text-ink-muted tabular-nums">{t.landing.stepOf(step + 1, current.steps.length)}</span>
                <button type="button" onClick={() => setStep(step + 1)} disabled={step === last} aria-label={t.landing.next} className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-line bg-card disabled:cursor-default disabled:opacity-40">
                  <Icon name="next" size={18} stroke={2.2} />
                </button>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-center lg:w-[310px]">
          <Phone label={current.steps[step].alt}>{SCREENS[tab][step]}</Phone>
        </div>
      </div>
    </div>
  );
}
