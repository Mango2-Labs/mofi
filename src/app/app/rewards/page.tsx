"use client";

import Link from "next/link";
import { useState } from "react";
import { useMoney } from "@/components/currency";
import { inviteLink } from "@/components/invite";
import { useT } from "@/components/language";
import { Card, Icon } from "@/components/phone";
import { QrCode } from "@/components/qr-code";
import { SignedIn, useMofiWallet } from "@/components/signed-in";
import { usernameOf } from "@/components/username";
import { INVITED_FEE_BPS, TRADE_FEE_BPS } from "@/lib/fees";
import { usePoll } from "@/lib/use-poll";

type Rewards = { friends: number; earned: number; week: number; cashReady: boolean };

// How much less an invited friend pays, in percent.
const OFF = Math.round((1 - INVITED_FEE_BPS / TRADE_FEE_BPS) * 100);

export default function RewardsPage() {
  return (
    <SignedIn>
      <RewardsScreen />
    </SignedIn>
  );
}

// Inviting friends: the link (to share, copy or scan) and what it has earned.
// Earnings land in the inviter's cash as friends trade.
function RewardsScreen() {
  const { address } = useMofiWallet();
  const { data, error } = usePoll<Rewards>(address ? `/api/referral?wallet=${address}&rewards=1` : null, 60_000);
  const t = useT();
  const m = useMoney();
  const [copied, setCopied] = useState(false);
  const username = usernameOf(address);
  const link = address ? inviteLink(username ?? address) : null;
  const copy = () => link && navigator.clipboard?.writeText(link).then(() => setCopied(true), () => {});

  // Share sends a short note with the link; where sharing isn't available, the link is copied.
  async function share() {
    if (!link) return;
    try {
      if (navigator.share) await navigator.share({ text: t.rewards.message(OFF), url: link });
      else await copy();
    } catch {}
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Link href="/app/account" aria-label={t.common.back} className="flex size-10 items-center justify-center rounded-full bg-card"><Icon name="back" size={16} stroke={2.2} /></Link>
        <h1 className="text-lg font-semibold">{t.rewards.title}</h1>
      </div>

      <p className="px-1 pt-1 text-xl leading-snug font-semibold tracking-[-0.02em]">
        {t.rewards.headline(OFF)} <span className="text-ink-faint">{t.rewards.headlineFaint}</span>
      </p>

      <Card className="items-center gap-4 px-4 py-5">
        {link ? <QrCode value={link} label={t.rewards.qr} size={148} /> : <span className="size-[148px] rounded-xl bg-surface-app" />}
        {address && (
          <span className="max-w-full truncate text-sm font-medium">
            <span className="text-ink-faint">{location.host}/r/</span>{username ?? `${address.slice(0, 4)}…${address.slice(-4)}`}
          </span>
        )}
        <div className="flex w-full gap-2">
          <button type="button" onClick={share} disabled={!link} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-on-ink disabled:cursor-default disabled:opacity-40">
            <Icon name="share" size={15} stroke={2.2} />
            {t.rewards.share}
          </button>
          <button type="button" onClick={copy} disabled={!link} className="cursor-pointer rounded-full bg-surface-app px-5 py-3 text-sm font-semibold disabled:cursor-default disabled:opacity-40">
            {copied ? t.common.copied : t.common.copyLink}
          </button>
        </div>
      </Card>

      {/* Earnings land in the inviter's cash, which opens with their first deposit. */}
      {data && !data.cashReady && (
        <Link href="/app/deposit" className="flex items-center gap-3 rounded-[18px] bg-card px-4 py-3.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-on-ink">!</span>
          <span className="flex-1 text-[15px] font-semibold">{t.rewards.deposit}</span>
          <Icon name="next" size={14} stroke={2.2} className="text-ink-faint" />
        </Link>
      )}

      <Card className="px-4 py-1 text-sm">
        <div className="flex items-center justify-between gap-3 border-b border-divider py-3">
          <span className="text-ink-muted">{t.rewards.friends}</span>
          <span className="font-semibold tabular-nums">{data ? data.friends : <span className="text-ink-faint">{m.none}</span>}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-divider py-3">
          <span className="text-ink-muted">{t.rewards.thisWeek}</span>
          <span className={`font-semibold tabular-nums ${data && data.week > 0 ? "text-gain" : ""}`}>{data ? `+${m.money(data.week)}` : <span className="text-ink-faint">{m.none}</span>}</span>
        </div>
        <div className="flex items-center justify-between gap-3 py-3">
          <span className="text-ink-muted">{t.rewards.earned}</span>
          <span className="font-semibold tabular-nums">{data ? m.money(data.earned) : <span className="text-ink-faint">{m.none}</span>}</span>
        </div>
      </Card>
      {!data && error && <p className="px-1 text-sm text-ink-muted">{t.rewards.failed}</p>}

    </>
  );
}
