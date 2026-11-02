import type { Metadata } from "next";
import { TabBar } from "@/components/tab-bar";
import { Providers } from "./providers";

export const metadata: Metadata = { title: "Mofi" };

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <Providers>
      <div className="min-h-dvh bg-surface-app">
        <div className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-3.5 px-4 pt-5 pb-28">{children}</div>
        <TabBar />
      </div>
    </Providers>
  );
}
