"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/logo";

export function useMofiWallet() {
  const { user, logout } = usePrivy();
  const { wallets } = useWallets();
  return { address: wallets[0]?.address as string | undefined, wallet: wallets[0], email: user?.email?.address, logout };
}

export function SignedIn({ children }: { children: ReactNode }) {
  const { ready, authenticated, login } = usePrivy();
  if (!ready) return <div className="m-auto"><Wordmark width={72} /></div>;
  if (authenticated) return children;
  return (
    <div className="m-auto flex w-full flex-col items-center gap-6 text-center">
      <Wordmark width={88} />
      <div className="flex flex-col gap-2">
        <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.03em]">Investing <span className="text-ink-faint">made simple</span></h1>
        <p className="text-ink-muted">Own SpaceX, Nvidia and the S&amp;P 500 with a few dollars.</p>
      </div>
      <button type="button" onClick={login} className="w-full cursor-pointer rounded-full bg-ink py-3.5 font-semibold text-on-ink">Sign in with email</button>
    </div>
  );
}
