"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";
import { PendingBuyProvider } from "@/components/pending-buy";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["email"],
        appearance: { theme: "light", accentColor: "#0A0A0B", walletChainType: "solana-only", landingHeader: "Sign in to Mofi" },
        // Mofi shows its own review screen before anything is signed.
        embeddedWallets: { solana: { createOnLogin: "users-without-wallets" }, ethereum: { createOnLogin: "off" }, showWalletUIs: false },
      }}
    >
      <PendingBuyProvider>{children}</PendingBuyProvider>
    </PrivyProvider>
  );
}
