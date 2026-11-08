import { en, type Messages } from "./en";
import { id } from "./id";

export type { Messages };
export type Lang = "en" | "id";
export const messages: Record<Lang, Messages> = { en, id };
export const LANG_COOKIE = "lang";

// The language someone picked, else their browser's: Indonesian when it asks for Indonesian first, English otherwise.
export function pickLang(saved?: string | null, acceptLanguage?: string | null): Lang {
  if (saved === "en" || saved === "id") return saved;
  return /^(id|in)\b/i.test(acceptLanguage?.trim() ?? "") ? "id" : "en";
}
