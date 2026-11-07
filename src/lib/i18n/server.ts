import { cookies, headers } from "next/headers";
import { LANG_COOKIE, messages, pickLang } from ".";

export async function getLang() {
  return pickLang((await cookies()).get(LANG_COOKIE)?.value, (await headers()).get("accept-language"));
}

export async function getT() {
  return messages[await getLang()];
}
