import type { InputHTMLAttributes, ReactNode } from "react";

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-[18px] bg-card px-4 py-3">
      <label htmlFor={id} className="text-xs text-ink-muted">{label}</label>
      {children}
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </div>
  );
}

// A field for typing a Mofi username: an @ in front, no autocorrect, and the focus ring around the whole field.
export function UsernameField({ id, label, hint, ...input }: { id: string; label: string; hint?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1 rounded-[18px] bg-card px-4 py-3 ring-ink focus-within:ring-2">
      <label htmlFor={id} className="text-xs text-ink-muted">{label}</label>
      <div className="flex items-center gap-0.5 text-lg font-semibold">
        <span aria-hidden className="text-ink-faint">@</span>
        <input
          id={id}
          name={id}
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          {...input}
          className="w-full bg-transparent outline-none! placeholder:text-ink-faint"
        />
      </div>
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </div>
  );
}
