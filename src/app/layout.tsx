import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { connection } from "next/server";
import { LanguageProvider } from "@/components/language";
import { getLang, getT } from "@/lib/i18n/server";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  return (await getT()).meta;
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render per request, so Next.js can put the proxy's CSP nonce on its scripts.
  await connection();
  const lang = await getLang();
  return (
    <html lang={lang} className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body>
        <LanguageProvider initial={lang}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
