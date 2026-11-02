"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DepositFlow } from "@/components/deposit-flow";
import { Icon } from "@/components/phone";
import { SignedIn, useMofiWallet } from "@/components/signed-in";
import { usd } from "@/lib/format";
import { usePortfolio } from "@/lib/use-portfolio";

export default function DepositPage() {
  return (
    <SignedIn>
      <Deposit />
    </SignedIn>
  );
}

function Deposit() {
  const router = useRouter();
  const { address } = useMofiWallet();
  const { portfolio } = usePortfolio(address);
  // Cash when the address was shown: a deposit shows up as the difference.
  const [baseline, setBaseline] = useState<number | null>(null);
  const added = baseline != null && portfolio ? portfolio.cash - baseline : 0;

  return (
    <DepositFlow onBack={() => router.push("/app/account")} onPicked={() => setBaseline(portfolio?.cash ?? 0)} onUnpick={() => setBaseline(null)}>
      {added >= 0.01 ? (
        <>
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gain" aria-live="polite">
            <Icon name="check" size={16} stroke={2.6} />{usd(added)} landed in your cash
          </div>
          <Link href="/app/explore" className="rounded-full bg-ink py-3.5 text-center font-semibold text-on-ink">Find something to buy</Link>
        </>
      ) : (
        <div className="flex items-center justify-center gap-2 text-sm text-ink-muted" aria-live="polite">
          <span className="size-2 animate-pulse rounded-full bg-gain motion-reduce:animate-none" />Waiting for your deposit
        </div>
      )}
    </DepositFlow>
  );
}
