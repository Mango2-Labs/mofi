import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mofi · Investing made simple",
  description: "Own SpaceX, Nvidia and the S&P 500 with a few dollars.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render per request, so Next.js can put the proxy's CSP nonce on its scripts.
  await connection();
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
