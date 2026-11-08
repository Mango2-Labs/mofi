import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitch } from "@/components/language";
import { AppTour } from "@/components/landing/app-tour";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Wordmark } from "@/components/logo";
import { AssetIcon, Icon, Money, type IconName } from "@/components/phone";
import { GiftLink } from "@/components/screens";
import { TRADE_FEE_BPS } from "@/lib/fees";
import { getT } from "@/lib/i18n/server";

const H2 = "text-[clamp(32px,3.8vw,52px)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance";

function Section({ id, tint = false, children }: { id?: string; tint?: boolean; children: ReactNode }) {
  return (
    <section id={id} className={`px-6 py-20 sm:py-[104px] ${tint ? "bg-surface-subtle" : ""}`}>
      <div className="mx-auto max-w-[1200px]">{children}</div>
    </section>
  );
}

function GetStarted({ label, className = "" }: { label: string; className?: string }) {
  return <Link href="/app" className={`rounded-full bg-ink px-[26px] py-3.5 text-center font-semibold text-on-ink ${className}`}>{label}</Link>;
}

const COINS = ["/logos/usdt.png", "/logos/usdc.png", "/logos/bitcoin.png", "/logos/ethereum.png", "/logos/solana.png"];

const PRE_IPO = [
  { ticker: "SPCX", logo: "/logos/stocks/spcx.svg" },
  { ticker: "OPENAI", logo: "/logos/stocks/openai.png" },
  { ticker: "ANTHROPIC", logo: "/logos/stocks/anthropic.png" },
];

const TRUST_ICONS: IconName[] = ["lock", "bank", "hidden", "shield"];

export default async function Landing() {
  const t = await getT();
  const l = t.landing;
  return (
    <main>
      <section className="bg-[radial-gradient(circle_at_72%_46%,#fff_0%,#f4f4f5_55%)] px-6">
        <header className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 py-5">
          <a href="#top" aria-label="Mofi"><Wordmark /></a>
          <nav aria-label={t.tabs.main} className="flex items-center gap-4 text-[15px] font-medium text-zinc-700 sm:gap-7">
            <a href="#how" className="hidden md:block">{l.howItWorks}</a>
            <a href="#faq" className="hidden md:block">{l.faq}</a>
            <LanguageSwitch className="bg-card" />
            <Link href="/app" className="rounded-full bg-ink px-5 py-2.5 font-semibold text-on-ink">{t.hero.getStarted}</Link>
          </nav>
        </header>
        <div id="top" className="mx-auto grid max-w-[1200px] items-center gap-14 pt-10 pb-20 sm:pt-14 sm:pb-24 lg:grid-cols-[1fr_auto] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-7">
            <h1 className="text-[clamp(44px,5.6vw,76px)] leading-[1.02] font-semibold tracking-[-0.04em] text-balance">
              {t.hero.title} <span className="text-ink-faint">{t.hero.titleFaint}</span>
            </h1>
            <p className="max-w-[30em] text-[19px] text-ink-muted">{t.hero.lead}</p>
            <div className="flex gap-3">
              <GetStarted label={t.hero.getStarted} className="flex-1 sm:flex-none" />
              <a href="#how" className="flex-1 rounded-full border border-zinc-300 bg-card px-[25px] py-[13px] text-center font-semibold sm:flex-none">{l.howItWorks}</a>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex shrink-0 pl-1.5">
                {COINS.map((logo) => <Image key={logo} src={logo} alt="" width={28} height={28} className="-ml-1.5 rounded-full bg-card ring-2 ring-surface-subtle" />)}
              </span>
              <span className="text-sm text-ink-muted">{l.coins}</span>
            </div>
          </div>
          <div className="flex justify-center lg:w-[340px]"><AppTour /></div>
        </div>
      </section>

      <Section id="how">
        <h2 className={`${H2} mb-8`}>{l.howItWorks}</h2>
        <HowItWorks />
      </Section>

      <Section tint>
        <div className="flex flex-col gap-7 rounded-card bg-ink p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
            <span className="flex shrink-0 pl-2">
              {PRE_IPO.map((a) => <span key={a.ticker} className="-ml-2 rounded-full ring-3 ring-zinc-700"><AssetIcon asset={a} size={48} /></span>)}
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-2xl font-semibold tracking-[-0.02em]">{l.preIpoTitle}</span>
              <span className="text-zinc-400">{l.preIpoText}</span>
            </span>
          </div>
          <Link href="/app" className="shrink-0 rounded-full bg-white px-6 py-[13px] text-center font-semibold text-ink">{t.hero.getStarted}</Link>
        </div>
      </Section>

      <Section id="gift">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <div className="flex min-w-0 flex-col gap-[18px] lg:order-last">
            <h2 className={H2}>{l.giftTitle}</h2>
            <p className="max-w-[30em] text-lg text-ink-muted">{l.giftText}</p>
            <div className="flex flex-wrap gap-2">
              {l.occasions.map((c) => <span key={c} className="rounded-full bg-surface-subtle px-3.5 py-1.5 text-sm font-medium">{c}</span>)}
            </div>
          </div>
          <div role="img" aria-label={l.chatAlt} className="flex w-full max-w-[460px] min-w-0 flex-col gap-2.5 justify-self-center rounded-[28px] bg-surface-subtle p-5 sm:p-7">
            <span className="self-start rounded-[18px] rounded-bl-md bg-card px-3.5 py-2.5">{l.chatHello}</span>
            <div className="w-full max-w-[320px] self-start"><GiftLink /></div>
            <span className="self-end rounded-[18px] rounded-br-md bg-gain-soft px-3.5 py-2.5">{l.chatThanks}</span>
          </div>
        </div>
      </Section>

      <Section tint>
        <h2 className={`${H2} mb-10`}>{l.trustTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {l.trust.map(([title, text], i) => (
            <div key={title} className="flex flex-col gap-2.5 rounded-card bg-card p-[26px]">
              <Icon name={TRUST_ICONS[i]} size={26} stroke={1.8} />
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-ink-muted">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <h2 className={`${H2} mb-10`}>{l.workTitle}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Feature title={l.earnTitle} text={l.earnText}>
            <div className="flex items-center gap-3 rounded-row bg-card p-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-gain-soft text-gain"><Icon name="rise" size={16} stroke={2.4} /></span>
              <span className="flex flex-col leading-tight">
                <span className="text-xs text-ink-muted">{t.portfolio.earning}</span>
                <Money value={500} className="text-[26px]" />
                <span className="text-xs font-medium text-gain">{l.everySecond}</span>
              </span>
            </div>
          </Feature>
          <Feature title={l.borrowTitle} text={l.borrowText}>
            <div className="flex flex-col rounded-row bg-card px-4 py-1 text-sm tabular-nums">
              {[[t.borrow.youBorrow, "$200.00"], [t.borrow.youLock, "S&P 500 · $642.10"], [t.borrow.healthLabel, t.borrow.health.Safe]].map(([label, value], i) => (
                <span key={label} className="flex justify-between gap-3 border-b border-divider py-2.5 last:border-0">
                  <span className="text-ink-muted">{label}</span>
                  <span className={`text-right font-semibold ${i === 2 ? "text-gain" : ""}`}>{value}</span>
                </span>
              ))}
            </div>
          </Feature>
        </div>
      </Section>

      <Section id="faq" tint>
        <div className="mx-auto max-w-[860px]">
          <h2 className={`${H2} mb-8`}>{l.faqTitle}</h2>
          <div className="border-b border-line">
            {l.faqs(TRADE_FEE_BPS / 100).map(([q, a]) => (
              <div key={q} className="flex flex-col gap-1.5 border-t border-line py-[22px]">
                <h3 className="text-lg font-semibold">{q}</h3>
                <p className="text-ink-muted">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <section id="start" className="px-6 py-20 sm:py-24">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="max-w-[680px] text-[clamp(36px,4.4vw,60px)] leading-[1.04] font-semibold tracking-[-0.04em] text-balance">
            {l.finalTitle} <span className="text-ink-faint">{l.finalFaint}</span>
          </h2>
          <GetStarted label={t.hero.getStarted} className="shrink-0 self-start px-[30px] py-4 text-[17px] sm:self-auto" />
        </div>
      </section>

      <footer className="border-t border-line px-6 py-8">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-3 text-sm text-ink-muted">
          <Wordmark width={62} />
          <span>{l.notInUs}</span>
          <a href="https://github.com/Mango2-Labs/mofi" className="font-medium text-ink">GitHub</a>
        </div>
      </footer>
    </main>
  );
}

function Feature({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-card bg-surface-subtle p-6 sm:p-8">
      {children}
      <h3 className="pt-2 text-[22px] font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="text-ink-muted">{text}</p>
    </div>
  );
}
