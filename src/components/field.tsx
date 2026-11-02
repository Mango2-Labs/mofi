import type { ReactNode } from "react";

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-[18px] bg-card px-4 py-3">
      <label htmlFor={id} className="text-xs text-ink-muted">{label}</label>
      {children}
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </div>
  );
}
