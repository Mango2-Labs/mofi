"use client";

import { useState, type ReactNode } from "react";
import { Icon, Phone } from "@/components/phone";
import {
  AddMoneyScreen, BorrowScreen, CashOutDoneScreen, CashOutScreen, ChainPickerScreen, GiftOpenScreen, GiftSendScreen, StockScreen,
} from "@/components/screens";

type Step = { name: string; alt: string; screen: ReactNode };

const TABS: { label: string; title: string; desc: string; steps: Step[] }[] = [
  {
    label: "Deposit",
    title: "Deposit from any chain",
    desc: "Send USDT or USDC from your wallet. It shows up as dollars within minutes.",
    steps: [
      { name: "Pick a chain", alt: "Choose where you send from: USDT on Tron or BNB Chain, or USDC on Ethereum, Base, Arbitrum or Solana.", screen: <ChainPickerScreen /> },
      { name: "Send to your address", alt: "Send 250 USDT on Tron to your address, shown with a QR code. Waiting for your USDT.", screen: <AddMoneyScreen /> },
    ],
  },
  {
    label: "Invest",
    title: "Pick a stock, a mix or crypto",
    desc: "Buy any amount. You see the price, the fee and the most you'll pay before you confirm.",
    steps: [
      { name: "Choose what to buy", alt: "The SpaceX screen: $152.40, up 2.1% today, a one-month chart, your position and a Buy button.", screen: <StockScreen /> },
      { name: "Review and confirm", alt: "A Buy SpaceX sheet: $50, the price, about 0.328 shares, the most you will pay per share, the fee, and Confirm.", screen: <StockScreen sheet /> },
    ],
  },
  {
    label: "Withdraw",
    title: "Withdraw any time",
    desc: "Sell whenever you like and get USDT or USDC back on the chain you choose.",
    steps: [
      { name: "Choose where it goes", alt: "Withdraw $100 as USDT on Tron to your saved address. You get about 99.20 USDT.", screen: <CashOutScreen /> },
      { name: "On its way", alt: "On its way: 99.20 USDT to your Tron address, usually within minutes.", screen: <CashOutDoneScreen /> },
    ],
  },
  {
    label: "Gift",
    title: "Gift a stock",
    desc: "Send any amount to a friend's email. They sign in and it's theirs.",
    steps: [
      { name: "Send a gift", alt: "Gift $10 of SpaceX to dimas@mail.com with a birthday message.", screen: <GiftSendScreen /> },
      { name: "Your friend opens it", alt: "Dimas sees $10 of SpaceX from Rina and signs in with email to open it.", screen: <GiftOpenScreen /> },
    ],
  },
  {
    label: "Borrow",
    title: "Keep your stocks. Get cash.",
    desc: "Borrow dollars against what you own and pay them back whenever you like.",
    steps: [{ name: "Choose your loan", alt: "Borrow $200 against the S&P 500, 31% of your stocks' value, marked safe.", screen: <BorrowScreen /> }],
  },
];

export function HowItWorks() {
  const [tab, setTab] = useState(0);
  const [step, setStep] = useState(0);
  const current = TABS[tab];
  const last = current.steps.length - 1;

  return (
    <div className="flex flex-col gap-8">
      <div role="tablist" aria-label="Features" className="flex flex-wrap gap-2">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={i === tab}
            onClick={() => { setTab(i); setStep(0); }}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-[18px] text-[15px] font-semibold ${i === tab ? "border-ink bg-ink text-on-ink" : "border-line bg-card text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="flex flex-wrap items-center gap-x-16 gap-y-12">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
          <h3 className="text-[clamp(28px,3vw,40px)] leading-[1.1] font-semibold tracking-[-0.03em] text-balance">{current.title}</h3>
          <p className="max-w-[30em] text-lg text-ink-muted">{current.desc}</p>
          {last > 0 && (
            <>
              <div className="flex flex-col gap-1">
                {current.steps.map((s, i) => (
                  <button key={s.name} type="button" onClick={() => setStep(i)} className={`flex min-h-11 cursor-pointer items-center gap-3 text-left text-base font-semibold ${i === step ? "text-ink" : "text-ink-muted"}`}>
                    <span className={`flex size-7 items-center justify-center rounded-full text-[13px] ${i === step ? "bg-ink text-on-ink" : "bg-line text-ink-muted"}`}>{i + 1}</span>
                    {s.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0} aria-label="Previous step" className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-line bg-card disabled:cursor-default disabled:opacity-40">
                  <Icon name="back" size={18} stroke={2.2} />
                </button>
                <span className="text-sm text-ink-muted tabular-nums">{step + 1} of {current.steps.length}</span>
                <button type="button" onClick={() => setStep(step + 1)} disabled={step === last} aria-label="Next step" className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-line bg-card disabled:cursor-default disabled:opacity-40">
                  <Icon name="next" size={18} stroke={2.2} />
                </button>
              </div>
            </>
          )}
        </div>
        <div className="flex min-w-0 flex-[0_1_340px] justify-center">
          <Phone label={current.steps[step].alt}>{current.steps[step].screen}</Phone>
        </div>
      </div>
    </div>
  );
}
