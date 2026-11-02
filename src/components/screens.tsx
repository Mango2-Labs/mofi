import type { ReactNode } from "react";
import { Wordmark } from "@/components/logo";
import { AssetIcon, AssetRow, Card, Change, Header, Icon, Money, Pill, Spark, TabBar, TokenIcon } from "@/components/phone";
import { cash, holdings, popular, readyMade, sources, total } from "@/lib/examples";
import { usd } from "@/lib/format";

const SPARKS = [
  "M0 26 L10 24 L20 25 L30 20 L40 21 L50 16 L60 18 L70 12 L80 13 L90 8 L100 6",
  "M0 22 L10 25 L20 18 L30 20 L40 14 L50 17 L60 11 L70 14 L80 9 L90 10 L100 5",
  "M0 8 L10 10 L20 9 L30 14 L40 12 L50 17 L60 15 L70 20 L80 19 L90 24 L100 25",
];

const SPACEX = { ticker: "SPCX", logo: "/logos/stocks/spcx.svg" };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11.5px] text-ink-muted">{label}</span>
      {children}
    </div>
  );
}

function Selector({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-2 rounded-full bg-card py-2 pr-3 pl-2">
      {icon}
      <span className="flex-1 text-[13px] font-semibold">{label}</span>
      <Icon name="down" size={14} stroke={2.2} className="text-ink-muted" />
    </span>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <div className="flex flex-col text-xs tabular-nums">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between border-b border-divider py-1.5 last:border-0">
          <span className="text-ink-muted">{label}</span>
          <span className="font-semibold">{value}</span>
        </div>
      ))}
    </div>
  );
}

function Avatar({ letter, size = 30 }: { letter: string; size?: number }) {
  return (
    <span style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-full bg-line text-[11px] font-semibold">
      {letter}
    </span>
  );
}

function Qr() {
  return (
    <svg width="112" height="112" viewBox="0 0 29 29" aria-hidden shapeRendering="crispEdges">
      <rect width="29" height="29" fill="#fff" />
      <path fill="#0a0a0b" d="M2 2h7v7H2zM20 2h7v7h-7zM2 20h7v7H2z" />
      <path fill="#fff" d="M3 3h5v5H3zM21 3h5v5h-5zM3 21h5v5H3z" />
      <path fill="#0a0a0b" d="M4 4h3v3H4zM22 4h3v3h-3zM4 22h3v3H4zM11 2h1v1h-1zM13 3h2v1h-2zM11 5h3v1h-3zM16 4h1v3h-1zM12 7h2v2h-2zM17 8h1v1h-1zM2 11h2v1H2zM6 11h3v1H6zM11 11h2v2h-2zM15 10h3v1h-3zM20 11h1v2h-1zM23 11h4v1h-4zM3 13h2v2H3zM8 14h2v1H8zM13 14h4v1h-4zM19 14h2v1h-2zM24 13h1v3h-1zM2 17h3v1H2zM7 16h1v2H7zM10 17h3v1h-3zM15 16h1v3h-1zM18 17h3v1h-3zM25 17h2v1h-2zM11 20h2v2h-2zM14 21h3v1h-3zM19 20h1v2h-1zM21 21h3v1h-3zM26 20h1v3h-1zM11 24h1v3h-1zM13 25h3v1h-3zM17 23h2v2h-2zM20 25h2v2h-2zM23 24h3v1h-3zM24 26h1v1h-1z" />
    </svg>
  );
}

export function HomeScreen() {
  return (
    <>
      <div className="flex items-center gap-2">
        <Avatar letter="R" size={32} />
        <span className="flex h-[34px] flex-1 items-center gap-1.5 rounded-full bg-card px-3 text-[13px] text-ink-muted">
          <Icon name="search" size={14} />Search stocks
        </span>
        <span className="flex size-[34px] items-center justify-center rounded-full bg-card"><Icon name="bell" stroke={1.8} /></span>
      </div>
      <div className="flex flex-col px-0.5 pt-1.5">
        <span className="text-xs text-ink-muted">Total value</span>
        <Money value={total} className="text-[40px] leading-[1.1]" />
        <span className="flex items-center gap-1 text-xs font-medium text-gain tabular-nums">
          <Icon name="rise" size={12} stroke={2.6} />$41.20 (3.3%) <span className="font-normal text-ink-muted">this month</span>
        </span>
        <span className="text-xs text-ink-muted tabular-nums">≈ Rp 21.194.250</span>
      </div>
      <div className="flex gap-2">
        <Pill dark className="flex-1 py-[11px]"><Icon name="plus" size={14} stroke={2.4} />Deposit</Pill>
        <Pill className="flex-1 py-[11px]"><Icon name="up" size={14} stroke={2.2} />Withdraw</Pill>
      </div>
      <div className="flex items-center gap-2.5 rounded-[18px] bg-card px-3 py-[11px]">
        <TokenIcon token="/logos/usdt.png" chain="/logos/tron.png" size={32} />
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-[13px] font-semibold">250 USDT arrived</span>
          <span className="text-[11.5px] text-ink-muted tabular-nums">From Tron · $249.40</span>
        </span>
        <span className="rounded-full bg-ink px-3 py-[7px] text-xs font-semibold text-on-ink">Invest</span>
      </div>
      <span className="px-0.5 text-[13px] font-semibold">Holdings</span>
      <Card className="px-3 py-0.5">
        {holdings.map((asset) => <AssetRow key={asset.ticker} asset={asset} />)}
        <div className="flex items-center gap-2.5 py-[9px]">
          <span className="flex size-[30px] items-center justify-center rounded-full bg-gain-soft text-sm font-semibold text-gain">$</span>
          <span className="flex flex-1 flex-col leading-tight">
            <span className="text-[13px] font-semibold">Cash</span>
            <span className="text-[11px] text-ink-muted">Earning interest</span>
          </span>
          <span className="text-[13px] font-semibold tabular-nums">{usd(cash)}</span>
        </div>
      </Card>
      <TabBar active="Home" />
    </>
  );
}

export function ChainPickerScreen() {
  return (
    <>
      <Header title="Deposit" />
      <span className="px-0.5 text-[13px] font-semibold">Send from</span>
      <Card className="px-3 py-0.5">
        {sources.map((s) => (
          <div key={s.token + s.chain} className="flex items-center gap-2.5 border-b border-divider py-[9px] last:border-0">
            <TokenIcon token={s.tokenLogo} chain={s.chainLogo} />
            <span className="flex flex-1 flex-col leading-tight">
              <span className="text-[13px] font-semibold">{s.token}</span>
              <span className="text-[11px] text-ink-muted">on {s.chain}</span>
            </span>
            <Icon name="next" size={14} stroke={2.2} className="text-ink-faint" />
          </div>
        ))}
      </Card>
      <span className="mt-auto self-center text-xs text-ink-muted">You can withdraw to any of these</span>
    </>
  );
}

export function AddMoneyScreen() {
  return (
    <>
      <Header title="Deposit" />
      <Field label="From">
        <Selector icon={<TokenIcon token="/logos/usdt.png" chain="/logos/tron.png" size={28} />} label="USDT on Tron" />
      </Field>
      <div className="flex flex-col px-0.5 py-1">
        <span className="text-[34px] leading-[1.1] font-semibold tracking-[-0.04em] tabular-nums">250 <span className="text-ink-faint">USDT</span></span>
        <span className="text-xs text-ink-muted tabular-nums">You get about $249.40</span>
      </div>
      <Card className="items-center gap-3 p-3.5">
        <Qr />
        <div className="flex w-full items-center justify-between gap-2">
          <span className="flex min-w-0 flex-col leading-snug">
            <span className="text-[11px] text-ink-muted">Send to this Tron address</span>
            <span className="font-mono text-[13px] font-medium">TQ7h…k2Fp</span>
          </span>
          <span className="rounded-full bg-surface-app px-3 py-1.5 text-xs font-semibold">Copy</span>
        </div>
      </Card>
      <span className="mt-auto flex items-center gap-2 self-center text-xs text-ink-muted">
        <span className="size-2 rounded-full bg-gain" />Waiting for your USDT
      </span>
    </>
  );
}

export function BuySheet() {
  return (
    <>
      <div className="absolute inset-0 bg-ink/30" />
      <div className="absolute inset-x-1.5 bottom-1.5 flex flex-col gap-3 rounded-[34px] bg-card px-4 pt-2.5 pb-4">
        <span className="h-1 w-9 self-center rounded-full bg-line" />
        <div className="flex items-center gap-2.5">
          <AssetIcon asset={SPACEX} size={28} />
          <span className="text-[15px] font-semibold">Buy SpaceX</span>
        </div>
        <Money value={50} className="text-[32px] leading-[1.1]" />
        <Rows rows={[["Price", "$152.40"], ["Estimated shares", "0.328"], ["Most you'll pay per share", "$153.92"], ["Fee", "[FEE]"], ["Network fee", "Free"]]} />
        <Pill dark>Confirm</Pill>
      </div>
    </>
  );
}

export function InvestScreen({ sheet = false }: { sheet?: boolean }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xl font-semibold tracking-[-0.03em]">Invest</span>
        <span className="flex size-8 items-center justify-center rounded-full bg-card"><Icon name="search" size={14} /></span>
      </div>
      <div className="flex gap-1.5 text-[11.5px] font-medium">
        {["All", "Stocks", "Crypto", "Portfolios"].map((chip, i) => (
          <span key={chip} className={`rounded-full px-[11px] py-[5px] ${i === 0 ? "bg-ink text-on-ink" : "bg-card"}`}>{chip}</span>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold">Ready-made</span>
        <span className="flex items-center gap-1.5 text-[10.5px] text-ink-muted"><span className="size-1.5 rounded-full bg-gain" />US market open</span>
      </div>
      <div className="flex gap-2 overflow-hidden">
        {readyMade.map((r, i) => (
          <div key={r.name} className="flex w-[112px] shrink-0 flex-col gap-1 rounded-row bg-card p-2.5">
            <span className="text-xs leading-tight font-semibold">{r.name}</span>
            <span className="text-[10px] text-ink-muted">{r.sub}</span>
            <Spark path={SPARKS[i]} up={r.change >= 0} />
            <Change value={r.change} className="text-[10.5px] font-medium" />
          </div>
        ))}
      </div>
      <span className="text-[13px] font-semibold">Popular</span>
      <Card className="px-3 py-0.5">
        {popular.map((asset) => <AssetRow key={asset.ticker} asset={asset} />)}
      </Card>
      <TabBar active="Invest" />
      {sheet && <BuySheet />}
    </>
  );
}

const CHART = "M0 118 L14 112 L28 115 L42 104 L56 108 L70 96 L84 99 L98 86 L106 112 L114 90 L128 80 L142 84 L156 70 L170 72 L184 58 L198 61 L212 44 L226 47 L240 30 L252 26 L260 18";

export function StockScreen({ sheet = false }: { sheet?: boolean }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="flex size-8 items-center justify-center rounded-full bg-card"><Icon name="back" size={15} stroke={2.2} /></span>
        <span className="flex size-8 items-center justify-center rounded-full bg-card"><Icon name="star" size={15} stroke={1.8} /></span>
      </div>
      <div className="flex flex-col gap-0.5 px-0.5">
        <span className="flex items-center gap-1.5"><AssetIcon asset={SPACEX} size={22} /><span className="text-sm font-semibold">SpaceX</span></span>
        <Money value={152.4} className="text-[34px] leading-[1.15]" />
        <span className="flex items-center gap-1 text-[11.5px] font-medium text-gain tabular-nums">
          <Icon name="rise" size={11} stroke={2.6} />$3.12 (2.1%) <span className="font-normal text-ink-muted">today</span>
        </span>
      </div>
      <svg viewBox="0 0 260 140" width="100%" height="140" aria-hidden className="block shrink-0">
        <defs>
          <linearGradient id="spacex-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#15803d" stopOpacity="0.18" />
            <stop offset="1" stopColor="#15803d" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${CHART} L260 140 L0 140 Z`} fill="url(#spacex-fill)" />
        <path d={CHART} fill="none" stroke="#15803d" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[10.5px] font-medium text-ink-muted">
        {["1D", "1W", "1M", "3M", "1Y", "All"].map((r) => (
          <span key={r} className={`rounded-full px-[7px] py-1 ${r === "1M" ? "bg-card text-ink" : ""}`}>{r}</span>
        ))}
      </div>
      <Card className="gap-2 p-3">
        <span className="text-[12.5px] font-semibold">Your position</span>
        <div className="grid grid-cols-2 gap-2 tabular-nums">
          <span className="flex flex-col leading-snug">
            <span className="text-[10.5px] text-ink-muted">Value</span>
            <span className="text-[15px] font-semibold">$236.40</span>
            <span className="text-[10.5px] text-ink-muted">1.55 shares</span>
          </span>
          <span className="flex flex-col leading-snug">
            <span className="text-[10.5px] text-ink-muted">Return</span>
            <span className="text-[15px] font-semibold text-gain">+$12.10</span>
            <span className="text-[10.5px] text-gain">+5.4%</span>
          </span>
        </div>
      </Card>
      <div className="mt-auto flex gap-2">
        <Pill dark className="flex-1">Buy</Pill>
        <Pill className="flex-1">Sell</Pill>
      </div>
      {sheet && <BuySheet />}
    </>
  );
}

export function CashOutScreen() {
  return (
    <>
      <Header title="Withdraw" />
      <div className="flex flex-col px-0.5 py-1">
        <Money value={100} className="text-[34px] leading-[1.1]" />
        <span className="text-xs text-ink-muted tabular-nums">From cash · {usd(cash)} available</span>
      </div>
      <Field label="To">
        <Selector icon={<TokenIcon token="/logos/usdt.png" chain="/logos/tron.png" size={28} />} label="USDT on Tron" />
      </Field>
      <div className="flex items-center justify-between gap-2 rounded-[18px] bg-card px-3.5 py-3">
        <span className="flex min-w-0 flex-col leading-snug">
          <span className="text-[11px] text-ink-muted">Your Tron address</span>
          <span className="font-mono text-[13px] font-medium">TXa9…3fQe</span>
        </span>
        <span className="rounded-full bg-surface-app px-3 py-1.5 text-xs font-semibold">Change</span>
      </div>
      <Card className="px-3.5 py-0.5">
        <Rows rows={[["You get about", "99.20 USDT"], ["Fees", "$0.80"]]} />
      </Card>
      <Pill dark className="mt-auto">Withdraw $100</Pill>
    </>
  );
}

export function CashOutDoneScreen() {
  const steps = [
    { label: "Sent from Mofi", state: "done" },
    { label: "Moving to Tron", state: "now" },
    { label: "In your wallet", state: "next" },
  ];
  return (
    <>
      <span className="mt-10 flex size-16 items-center justify-center self-center rounded-full bg-gain-soft text-gain"><Icon name="check" size={30} stroke={2.4} /></span>
      <span className="self-center text-[22px] font-semibold tracking-[-0.02em]">On its way</span>
      <span className="max-w-[220px] self-center text-center text-[12.5px] text-ink-muted">99.20 USDT to TXa9…3fQe on Tron. It usually arrives within minutes.</span>
      <Card className="px-3.5 py-1 text-[12.5px]">
        {steps.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 border-b border-divider py-2.5 last:border-0">
            {s.state === "done" && <span className="flex size-5 items-center justify-center rounded-full bg-gain text-white"><Icon name="check" size={12} stroke={3} /></span>}
            {s.state === "now" && <span className="flex size-5 items-center justify-center rounded-full border-2 border-gain"><span className="size-2 rounded-full bg-gain" /></span>}
            {s.state === "next" && <span className="size-5 rounded-full border-2 border-line" />}
            <span className={s.state === "next" ? "text-ink-muted" : "font-semibold"}>{s.label}</span>
          </div>
        ))}
      </Card>
      <Pill className="mt-auto">Done</Pill>
    </>
  );
}

export function GiftSendScreen() {
  return (
    <>
      <Header title="Gift a stock" />
      <Selector icon={<AssetIcon asset={SPACEX} size={28} />} label="SpaceX" />
      <Money value={10} className="px-0.5 py-1 text-[34px] leading-[1.1]" />
      <Card className="px-3.5 py-0.5">
        <div className="flex flex-col gap-0.5 border-b border-divider py-2.5">
          <span className="text-[11px] text-ink-muted">To</span>
          <span className="text-[13px] font-semibold">dimas@mail.com</span>
        </div>
        <div className="flex flex-col gap-0.5 py-2.5">
          <span className="text-[11px] text-ink-muted">Message</span>
          <span className="text-[13px] font-semibold">Happy birthday, Dimas!</span>
        </div>
      </Card>
      <span className="px-0.5 text-[11.5px] text-ink-muted">Dimas signs in with this email to open it.</span>
      <Pill dark className="mt-auto">Send gift</Pill>
    </>
  );
}

export function GiftCard({ large = false }: { large?: boolean }) {
  return (
    <div className={`flex flex-col gap-3.5 bg-ink text-white ${large ? "rounded-[22px] rounded-bl-md p-5" : "rounded-[22px] p-[18px]"}`}>
      <div className="flex items-center gap-3">
        <span className={`flex shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-monogram font-semibold ${large ? "size-[46px] text-[11px]" : "size-[42px] text-[10px]"}`}>SPCX</span>
        <span className="flex flex-col leading-tight">
          <span className="text-xs text-zinc-400">A gift from Rina</span>
          <span className={`font-semibold tracking-[-0.03em] ${large ? "text-2xl" : "text-[22px]"}`}>$10 of SpaceX</span>
        </span>
      </div>
      {large ? (
        <span className="rounded-full bg-white py-[11px] text-center text-sm font-semibold text-ink">Open your gift</span>
      ) : (
        <span className="text-[13px] text-zinc-200">“Happy birthday, Dimas!”</span>
      )}
    </div>
  );
}

export function GiftOpenScreen() {
  return (
    <>
      <span className="mt-2 self-center"><Wordmark width={58} /></span>
      <GiftCard />
      <span className="self-center text-[13px] font-semibold">Sign in to open your gift</span>
      <span className="flex items-center gap-2 rounded-full bg-card px-3.5 py-[11px] text-[13px]">
        <Icon name="mail" size={15} stroke={1.8} className="text-ink-muted" />dimas@mail.com
      </span>
      <Pill dark className="mt-auto">Open your gift</Pill>
    </>
  );
}

export function BorrowScreen() {
  return (
    <>
      <Header title="Borrow" />
      <div className="flex items-center gap-2.5 rounded-[18px] bg-card p-3">
        <AssetIcon asset={{ ticker: "SPY", logo: "/logos/stocks/spy.png" }} />
        <span className="flex flex-1 flex-col leading-tight">
          <span className="text-[11px] text-ink-muted">Using</span>
          <span className="text-[13px] font-semibold">S&amp;P 500</span>
        </span>
        <span className="text-[13px] font-semibold tabular-nums">$642.10</span>
      </div>
      <div className="flex flex-col px-0.5 py-1">
        <span className="text-xs text-ink-muted">You get</span>
        <Money value={200} className="text-[34px] leading-[1.1]" />
      </div>
      <div className="flex flex-col gap-2 px-0.5">
        <div className="h-2 overflow-hidden rounded-full bg-line"><div className="h-2 w-[31%] rounded-full bg-gain" /></div>
        <span className="flex items-center justify-between gap-2 text-xs text-ink-muted">
          31% of your stocks&apos; value
          <span className="rounded-full bg-gain-soft px-2 py-0.5 font-semibold text-gain">Safe</span>
        </span>
      </div>
      <Card className="px-3.5 py-0.5">
        <Rows rows={[["Rate", "[RATE] a year"], ["Pay back", "Any time"]]} />
      </Card>
      <Pill dark className="mt-auto">Borrow $200</Pill>
    </>
  );
}

function FeedItem({ letter, children, time }: { letter: string; children: ReactNode; time: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-row bg-card px-3 py-[11px]">
      <Avatar letter={letter} />
      <span className="min-w-0 flex-1 text-[13px]">{children}</span>
      <span className="text-[10.5px] text-ink-muted">{time}</span>
    </div>
  );
}

export function FriendsScreen() {
  const league = [["Rina", 6.2, true], ["Dimas", 4.8, false], ["Sari", 3.1, false]] as const;
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xl font-semibold tracking-[-0.03em]">Friends</span>
        <span className="rounded-full bg-ink px-3.5 py-[7px] text-xs font-semibold text-on-ink">Invite</span>
      </div>
      <Card className="px-3 py-2.5">
        <div className="flex items-center justify-between pb-1">
          <span className="text-[13px] font-semibold">October league</span>
          <span className="text-[10.5px] text-ink-muted">Friends only</span>
        </div>
        {league.map(([name, change, you], i) => (
          <div key={name} className="flex items-center gap-2.5 py-1.5 tabular-nums">
            <span className="w-2.5 text-[11px] text-ink-muted">{i + 1}</span>
            <Avatar letter={name[0]} size={28} />
            <span className="flex-1 text-[13px] font-semibold">{name} {you && <span className="font-normal text-ink-muted">(you)</span>}</span>
            <Change value={change} className="text-[13px] font-semibold" />
          </div>
        ))}
      </Card>
      <span className="px-0.5 text-[13px] font-semibold">Feed</span>
      <FeedItem letter="D" time="2h"><b className="font-semibold">Dimas</b> bought SpaceX</FeedItem>
      <Card className="gap-2 px-3 py-[11px]">
        <div className="flex items-center gap-2.5">
          <Avatar letter="A" />
          <span className="min-w-0 flex-1 text-[13px]"><b className="font-semibold">Arif</b> shared a portfolio</span>
          <span className="text-[10.5px] text-ink-muted">4h</span>
        </div>
        <div className="grid grid-cols-[12fr_5fr_3fr] gap-0.5">
          <div className="h-1.5 rounded-l-full bg-ink" />
          <div className="h-1.5 bg-zinc-500" />
          <div className="h-1.5 rounded-r-full bg-zinc-300" />
        </div>
        <span className="text-[11px] text-ink-muted tabular-nums">S&amp;P 500 60% · Bitcoin 25% · NVIDIA 15%</span>
        <Pill dark className="py-2 text-[12.5px]">Copy</Pill>
      </Card>
      <FeedItem letter="S" time="5h"><b className="font-semibold">Sari</b> copied your Big Tech mix</FeedItem>
      <TabBar active="Friends" />
    </>
  );
}
