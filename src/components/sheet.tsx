"use client";

import { useEffect, useRef, type ReactNode } from "react";

// A bottom sheet over the current screen. Escape or a tap on the backdrop closes it.
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => panel.current?.focus(), []);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default bg-ink/30" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="relative flex max-h-[92dvh] w-full max-w-[440px] flex-col gap-4 overflow-y-auto rounded-t-[32px] bg-surface-app px-4 pt-2.5 pb-6 outline-none"
      >
        <span className="h-1 w-10 shrink-0 self-center rounded-full bg-line" />
        {children}
      </div>
    </div>
  );
}
