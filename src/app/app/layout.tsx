import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CurrencyProvider } from "@/components/currency";
import { TabBar } from "@/components/tab-bar";
import { CURRENCY_COOKIE } from "@/lib/format";
import { idrRate } from "@/lib/server/fx";
import { Providers } from "./providers";

export const metadata: Metadata = { title: "Mofi" };

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const saved = (await cookies()).get(CURRENCY_COOKIE)?.value;
  return (
    <CurrencyProvider saved={saved === "usd" || saved === "idr" ? saved : null} rate={await idrRate()}>
      <Providers>
        <div className="min-h-dvh bg-surface-app">
          <div className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-3.5 px-4 pt-5 pb-28">{children}</div>
          <TabBar />
        </div>
      </Providers>
    </CurrencyProvider>
  );
}
