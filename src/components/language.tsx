"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { LANG_COOKIE, messages, type Lang } from "@/lib/i18n";

const LanguageContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void }>({ lang: "en", setLang: () => {} });

// The page's language, chosen on the server from the cookie or the browser. Switching saves it for a year and
// re-renders the server parts of the page in the new language.
export function LanguageProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const router = useRouter();
  const [lang, setState] = useState(initial);
  const setLang = (next: Lang) => {
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    setState(next);
    router.refresh();
  };
  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export const useLang = () => useContext(LanguageContext);
export const useT = () => messages[useLang().lang];

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div role="radiogroup" aria-label={messages[lang].common.language} className={`flex shrink-0 rounded-full bg-surface-app p-0.5 text-[13px] font-semibold ${className}`}>
      {(["en", "id"] as const).map((l) => (
        <button key={l} type="button" role="radio" aria-checked={lang === l} onClick={() => lang !== l && setLang(l)} className={`cursor-pointer rounded-full px-2.5 py-1 ${lang === l ? "bg-ink text-on-ink" : "text-ink-muted"}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
