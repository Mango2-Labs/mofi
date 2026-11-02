import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppTour } from "@/components/landing/app-tour";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Wordmark } from "@/components/logo";
import { Icon, Money, Phone, TokenIcon, type IconName } from "@/components/phone";
import { FriendsScreen, GiftCard } from "@/components/screens";
import { chains } from "@/lib/examples";

const H2 = "text-[clamp(34px,3.8vw,52px)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance";

function Section({ id, tint = false, className = "", children }: { id?: string; tint?: boolean; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={`px-6 py-[104px] ${tint ? "bg-surface-subtle" : ""} ${className}`}>
      <div className="mx-auto max-w-[1200px]">{children}</div>
    </section>
  );
}

function GetStarted({ className = "" }: { className?: string }) {
  return <Link href="/app" className={`rounded-full bg-ink px-[26px] py-3.5 font-semibold text-on-ink ${className}`}>Get started</Link>;
}

const PORTFOLIOS = [
  { name: "S&P 500", desc: "The 500 biggest US companies in one holding.", split: [1], legend: "SPY 100%" },
  { name: "Nasdaq 100", desc: "The 100 largest companies on Nasdaq, mostly tech.", split: [1], legend: "QQQ 100%" },
  { name: "Big Tech", desc: "Six of the largest tech companies, in equal parts.", split: [1, 1, 1, 1, 1, 1], legend: "AAPL · MSFT · NVDA · GOOGL · AMZN · META" },
  { name: "Crypto Majors", desc: "Bitcoin, Ethereum and Solana. No memecoins.", split: [5, 3, 2], legend: "BTC 50% · ETH 30% · SOL 20%" },
];
const SPLIT_COLORS = ["bg-ink", "bg-zinc-500", "bg-zinc-300"];

const TRUST: [IconName, string, string][] = [
  ["lock", "Only you can move it", "Your account is a wallet only you can sign for. We can't touch your money."],
  ["bank", "Backed one to one", "Every stock you hold is backed by a real share, kept by its issuer."],
  ["mail", "Sign in with email", "No seed phrase to write down. We pay the network fees."],
  ["shield", "Investing, not gambling", "No memecoins and no leveraged trading. Just stocks, funds and major crypto."],
];

const FAQ = [
  ["Who can use it?", "Anyone 18 or older who lives outside the US and [OTHER COUNTRIES]."],
  ["Do I own the actual shares?", "You own a token that follows the share's price one to one and is backed by it. It doesn't come with voting rights."],
  ["Which dollars can I add?", "USDT or USDC on Tron, BNB Chain, Ethereum, Base, Arbitrum or Solana, from [MIN]."],
  ["When can I buy and sell?", "Any time, weekends included. Prices can move more while US markets are closed."],
  ["Can I buy crypto?", "Yes. Bitcoin, Ethereum and Solana, on their own or in a portfolio. No memecoins."],
  ["Can friends see how much I have?", "No. Friends only see percentages, never amounts, and you can keep your portfolio private."],
  ["How do gifts work?", "Pick a stock and an amount, then send the link. Your friend signs in with their email and it's theirs."],
  ["How do I withdraw?", "Sell, then pick the chain and the address. Your USDT or USDC arrives within minutes."],
  ["Can I borrow against my stocks?", "Yes. Borrow dollars without selling and pay them back any time. Mofi shows how safe your loan is and warns you if prices fall."],
  ["What does it cost?", "[FEE] per trade, shown before you confirm. Network fees are on us."],
];

export default function Landing() {
  return (
    <main>
      <section className="bg-[radial-gradient(circle_at_72%_46%,#fff_0%,#f4f4f5_55%)] px-6">
        <header className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-8 gap-y-4 py-5">
          <a href="#top" aria-label="Mofi"><Wordmark /></a>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[15px] font-medium text-zinc-700">
            <a href="#how">How it works</a>
            <a href="#portfolios">Portfolios</a>
            <a href="#faq">FAQ</a>
            <Link href="/app" className="rounded-full bg-ink px-5 py-2.5 font-semibold text-on-ink">Get started</Link>
          </nav>
        </header>
        <div id="top" className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-16 pt-14 pb-24">
          <div className="flex min-w-0 flex-[1_1_500px] flex-col gap-7">
            <h1 className="text-[clamp(44px,5.6vw,76px)] leading-[1.02] font-semibold tracking-[-0.04em] text-balance">
              Investing <span className="text-ink-faint">made simple</span>
            </h1>
            <p className="max-w-[30em] text-[19px] text-ink-muted">Own SpaceX, Nvidia and the S&amp;P 500 with a few dollars.</p>
            <div className="flex flex-wrap gap-3">
              <GetStarted />
              <a href="#how" className="rounded-full border border-zinc-300 bg-card px-[25px] py-[13px] font-semibold">See how it works</a>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm text-ink-muted">Add from</span>
              {chains.map((c) => (
                <span key={c.name} className="flex items-center gap-[7px] rounded-full border border-line bg-card py-1 pr-3 pl-1 text-[13px] font-medium">
                  <Image src={c.logo} alt="" width={22} height={22} className="rounded-full" />{c.name}
                </span>
              ))}
            </div>
          </div>
          <div className="flex min-w-0 flex-[0_1_380px] justify-center"><AppTour /></div>
        </div>
      </section>

      <Section id="how">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
          <h2 className={H2}>How it works</h2>
          <span className="text-sm text-ink-muted">Example screens</span>
        </div>
        <HowItWorks />
      </Section>

      <Section id="portfolios" tint>
        <div className="flex flex-col gap-10">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <h2 className={`${H2} max-w-[640px]`}>Start with a ready-made portfolio</h2>
            <p className="text-[17px] text-ink-muted">Or pick single stocks and crypto.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            {PORTFOLIOS.map((p) => (
              <div key={p.name} className="flex min-w-0 flex-[1_1_260px] flex-col gap-3.5 rounded-card bg-card p-7">
                <h3 className="text-[22px] font-semibold tracking-[-0.02em]">{p.name}</h3>
                <p className="text-ink-muted">{p.desc}</p>
                <div className="mt-auto flex flex-col gap-2.5 pt-2">
                  <div className="flex gap-[3px] overflow-hidden rounded-full">
                    {p.split.map((w, i) => <div key={i} style={{ flexGrow: w }} className={`h-2 ${SPLIT_COLORS[p.split.length === 6 ? i % 2 : i]}`} />)}
                  </div>
                  <span className="text-[13px] text-ink-muted tabular-nums">{p.legend}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5 rounded-card bg-ink p-8 text-white">
            <div className="flex min-w-0 items-center gap-[18px]">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-monogram text-[13px] font-semibold">SPCX</span>
              <span className="flex flex-col gap-1">
                <span className="text-2xl font-semibold tracking-[-0.02em]">SpaceX is here</span>
                <span className="text-zinc-400">Buy any amount, even a small slice of one share.</span>
              </span>
            </div>
            <Link href="/app" className="rounded-full bg-white px-6 py-[13px] font-semibold text-ink">Get started</Link>
          </div>
        </div>
      </Section>

      <Section id="friends">
        <div className="flex flex-wrap items-center gap-x-16 gap-y-14">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-[22px]">
            <h2 className={H2}>Invest with friends</h2>
            <p className="max-w-[30em] text-lg text-ink-muted">See what your friends buy, copy a portfolio in one tap, and share yours with a link. Friends see percentages, never amounts.</p>
            <ul className="flex flex-col gap-3">
              {["Follow friends and see their moves", "Copy a portfolio in one tap", "Share your mix with a link", "A monthly league, friends only"].map((item) => (
                <li key={item} className="flex items-center gap-3"><Icon name="check" size={20} stroke={2.2} className="text-gain" />{item}</li>
              ))}
            </ul>
          </div>
          <div className="flex min-w-0 flex-[0_1_340px] flex-col items-center gap-[22px]">
            <Phone label="The Friends screen: an October league, a feed of what friends buy, and a shared portfolio with a Copy button."><FriendsScreen /></Phone>
            <span className="text-xs text-ink-muted">Example</span>
          </div>
        </div>
      </Section>

      <Section id="gift" className="border-t border-line">
        <div className="flex flex-wrap-reverse items-center gap-x-16 gap-y-14">
          <div role="img" aria-label="A chat. Rina sends Dimas a gift of $10 of SpaceX for his birthday, and he opens it." className="flex min-w-0 flex-[0_1_440px] flex-col gap-2.5 rounded-[28px] bg-surface-subtle p-7">
            <span className="self-start rounded-[18px] rounded-bl-md bg-card px-3.5 py-2.5">Happy birthday, Dimas!</span>
            <div className="w-full max-w-[320px] self-start"><GiftCard large /></div>
            <span className="self-end rounded-[18px] rounded-br-md bg-gain-soft px-3.5 py-2.5">Thank you! Opening it now</span>
            <span className="mt-2 self-center text-xs text-ink-muted">Example</span>
          </div>
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-[18px]">
            <h2 className={H2}>Gift a stock</h2>
            <p className="max-w-[30em] text-lg text-ink-muted">Send $10 of SpaceX to a friend&apos;s email and share the link anywhere. They sign in and it&apos;s theirs.</p>
            <div className="flex flex-wrap gap-2">
              {["Birthdays", "Lebaran", "Christmas", "Graduations"].map((c) => <span key={c} className="rounded-full bg-surface-subtle px-3.5 py-1.5 text-sm font-medium">{c}</span>)}
            </div>
          </div>
        </div>
      </Section>

      <Section tint>
        <h2 className={`${H2} mb-10`}>Made for dollars outside the US</h2>
        <div className="flex flex-wrap gap-4">
          <Tile title="See it in your currency" text="Your balance in rupiah, pesos or naira next to dollars, and how it compares with holding cash.">
            <div className="flex flex-col gap-0.5 rounded-[18px] bg-surface-app p-4 tabular-nums">
              <span className="text-xs text-ink-muted">Total value</span>
              <span className="text-[26px] leading-tight font-semibold tracking-[-0.03em]">Rp 21.194.250</span>
              <span className="text-xs text-ink-muted">$1,284.50</span>
              <span className="mt-2 text-xs font-medium text-gain">+Rp 1.420.000 vs keeping rupiah</span>
            </div>
          </Tile>
          <Tile title="Invest every deposit" text="Pick your mix once. When money arrives, one tap invests it.">
            <div className="flex flex-col gap-3 rounded-[18px] bg-surface-app p-3.5">
              <div className="flex items-center gap-2.5">
                <TokenIcon token="/logos/usdt.png" chain="/logos/tron.png" size={32} />
                <span className="flex flex-col leading-tight">
                  <span className="text-[13px] font-semibold">250 USDT arrived</span>
                  <span className="text-[11.5px] text-ink-muted">Invest it in your mix?</span>
                </span>
              </div>
              <div className="flex gap-2 text-[12.5px] font-semibold">
                <span className="flex-1 rounded-full bg-ink py-[9px] text-center text-on-ink tabular-nums">Invest $249.40</span>
                <span className="rounded-full bg-card px-4 py-[9px]">Later</span>
              </div>
            </div>
          </Tile>
          <Tile title="Cash and dividends keep working" text="Cash earns interest until you invest it, and dividends are added to your stocks automatically.">
            <div className="flex flex-col rounded-[18px] bg-surface-app px-3.5 py-1">
              <div className="flex items-center gap-2.5 border-b border-line py-2.5">
                <span className="flex size-[30px] items-center justify-center rounded-full bg-gain-soft text-sm font-semibold text-gain">$</span>
                <span className="flex flex-1 flex-col leading-tight"><span className="text-[13px] font-semibold">Cash</span><span className="text-[11px] text-ink-muted">Earning [RATE] a year</span></span>
                <span className="text-[13px] font-semibold tabular-nums">$140.50</span>
              </div>
              <div className="flex items-center gap-2.5 py-2.5">
                <span className="flex size-[30px] items-center justify-center rounded-full bg-ink text-[9px] font-semibold text-white">SPY</span>
                <span className="flex flex-1 flex-col leading-tight"><span className="text-[13px] font-semibold">Dividend added</span><span className="text-[11px] text-ink-muted">S&amp;P 500</span></span>
                <span className="text-[13px] font-semibold text-gain tabular-nums">+$1.84</span>
              </div>
            </div>
          </Tile>
        </div>
      </Section>

      <Section>
        <h2 className={`${H2} mb-10`}>Your money stays yours</h2>
        <div className="flex flex-wrap gap-4">
          {TRUST.map(([icon, title, text]) => (
            <div key={title} className="flex min-w-0 flex-[1_1_250px] flex-col gap-2.5 rounded-card bg-surface-subtle p-[26px]">
              <Icon name={icon} size={26} stroke={1.8} />
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-ink-muted">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tint>
        <div className="flex flex-wrap items-center gap-x-16 gap-y-12">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-[18px]">
            <h2 className={H2}>Keep your stocks. Get cash.</h2>
            <p className="max-w-[30em] text-lg text-ink-muted">Borrow dollars against what you own and pay them back whenever you like.</p>
          </div>
          <div className="flex min-w-0 flex-[0_1_400px] flex-col gap-[18px] rounded-[28px] bg-card p-[26px] shadow-[0_24px_60px_rgba(10,10,11,0.08)]">
            <span className="font-semibold">Borrow</span>
            <div className="flex items-center gap-3 rounded-row bg-surface-app p-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-ink text-[9px] font-semibold text-white">SPY</span>
              <span className="flex flex-1 flex-col leading-tight"><span className="text-xs text-ink-muted">Using</span><span className="text-sm font-semibold">S&amp;P 500</span></span>
              <span className="text-sm font-semibold tabular-nums">$642.10</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-ink-muted">You get</span>
              <Money value={200} className="text-4xl leading-[1.1]" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="h-2 overflow-hidden rounded-full bg-divider"><div className="h-2 w-[31%] rounded-full bg-gain" /></div>
              <span className="flex items-center justify-between text-[12.5px] text-ink-muted">31% of your stocks&apos; value<span className="rounded-full bg-gain-soft px-2 py-0.5 font-semibold text-gain">Safe</span></span>
            </div>
            <span className="rounded-full bg-ink py-[13px] text-center text-sm font-semibold text-on-ink">Borrow $200</span>
          </div>
        </div>
      </Section>

      <Section id="faq">
        <div className="mx-auto max-w-[860px]">
          <h2 className={`${H2} mb-8`}>Questions</h2>
          <div className="border-b border-line">
            {FAQ.map(([q, a]) => (
              <div key={q} className="flex flex-col gap-1.5 border-t border-line py-[22px]">
                <h3 className="text-lg font-semibold">{q}</h3>
                <p className="text-ink-muted">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <section id="start" className="bg-surface-subtle px-6 py-24">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-7">
          <h2 className="max-w-[680px] text-[clamp(36px,4.4vw,60px)] leading-[1.04] font-semibold tracking-[-0.04em] text-balance">
            Your first share is <span className="text-ink-faint">a few dollars away</span>
          </h2>
          <GetStarted className="px-[30px] py-4 text-[17px]" />
        </div>
      </section>

      <footer className="px-6 py-8">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-3 text-sm text-ink-muted">
          <Wordmark width={62} />
          <span>Not available in the US</span>
          <nav aria-label="Footer" className="flex gap-5">
            <a href="#top">Terms</a>
            <a href="#top">Privacy</a>
            <a href="#top">X</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}

function Tile({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 rounded-card bg-card p-6">
      {children}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-ink-muted">{text}</p>
    </div>
  );
}
