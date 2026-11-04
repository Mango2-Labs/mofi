"use client";

import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/phone";

const TABS: [string, string, IconName][] = [
  ["/app/explore", "Explore", "explore"],
  ["/app", "Portfolio", "wallet"],
  ["/app/activity", "Activity", "activity"],
  ["/app/account", "Account", "account"],
];

// The floating tab bar, shown only on the top-level screens and once the user is signed in.
export function TabBar() {
  const path = usePathname();
  const { ready, authenticated } = usePrivy();
  if (!ready || !authenticated || !TABS.some(([href]) => href === path)) return null;
  return (
    <nav aria-label="Main" className="fixed inset-x-4 bottom-4 z-20 mx-auto grid max-w-[408px] grid-cols-4 gap-1 rounded-full bg-card p-1.5 shadow-[0_12px_30px_rgba(10,10,11,0.1)]">
      {TABS.map(([href, label, icon]) => (
        <Link key={href} href={href} aria-current={href === path ? "page" : undefined} className={`flex flex-col items-center gap-0.5 rounded-full py-2 text-[11px] font-medium ${href === path ? "bg-surface-app text-ink" : "text-ink-muted"}`}>
          <Icon name={icon} size={19} stroke={1.9} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
