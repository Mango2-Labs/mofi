"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Icon, Money } from "@/components/phone";
import { SignedIn, useMofiWallet } from "@/components/signed-in";
import { usd } from "@/lib/format";
import { usePoll } from "@/lib/use-poll";
import { usePortfolio } from "@/lib/use-portfolio";

export default function AccountPage() {
  return (
    <SignedIn>
      <Account />
    </SignedIn>
  );
}

// Money in and out (Deposit, Withdraw, Borrow) and the account itself.
function Account() {
  const { address, email, logout } = useMofiWallet();
  const { portfolio } = usePortfolio(address);
  const apy = usePoll<{ apy: number }>("/api/earn", 300_000).data?.apy;
  const [copied, setCopied] = useState(false);
  return (
    <>
      <h1 className="text-center text-base font-semibold">Account</h1>

      <div className="flex flex-col gap-0.5 px-1 pt-2">
        <span className="text-xs text-ink-muted">Cash</span>
        {portfolio ? <Money value={portfolio.cash} className="text-[44px] leading-[1.05]" /> : <span className="text-[44px] leading-[1.05] font-semibold text-ink-faint">$—</span>}
      </div>

      <div className="flex gap-2">
        <Link href="/app/deposit" className="flex-1 rounded-full bg-ink py-3 text-center text-sm font-semibold text-on-ink">Deposit</Link>
        <Link href="/app/withdraw" className="flex-1 rounded-full bg-card py-3 text-center text-sm font-semibold">Withdraw</Link>
        <Link href="/app/borrow" className="flex-1 rounded-full bg-card py-3 text-center text-sm font-semibold">Borrow</Link>
      </div>

      <Link href="/app/earn" className="flex items-center gap-3 rounded-[18px] bg-card px-4 py-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-gain text-white"><Icon name="rise" size={16} stroke={2.2} /></span>
        <span className="flex flex-1 flex-col leading-tight">
          <span className="text-[15px] font-semibold">Earn</span>
          <span className="text-xs text-ink-muted">{apy != null ? `${(apy * 100).toFixed(2)}% a year on idle cash` : "Interest on idle cash"}</span>
        </span>
        {portfolio && portfolio.earn >= 0.01 && <span className="text-[15px] font-semibold tabular-nums">{usd(portfolio.earn)}</span>}
        <Icon name="next" size={14} stroke={2.2} className="text-ink-faint" />
      </Link>

      <Card className="px-4 py-1 text-sm">
        <div className="flex items-center justify-between gap-3 border-b border-divider py-3">
          <span className="text-ink-muted">Email</span>
          <span className="truncate font-semibold">{email}</span>
        </div>
        {address && (
          <div className="flex items-center justify-between gap-3 py-3">
            <span className="flex min-w-0 flex-col">
              <span className="text-ink-muted">Your Mofi address on Solana</span>
              <span className="font-mono text-[13px] font-medium">{address.slice(0, 6)}…{address.slice(-6)}</span>
            </span>
            <button type="button" onClick={() => navigator.clipboard?.writeText(address).then(() => setCopied(true), () => {})} className="cursor-pointer rounded-full bg-surface-app px-4 py-2 font-semibold">
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </Card>
      <button type="button" onClick={logout} className="cursor-pointer rounded-full bg-card py-3.5 font-semibold">Sign out</button>
    </>
  );
}
