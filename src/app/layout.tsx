import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// BRIEF.md §4.3 — three type roles.
// next/font downloads at BUILD time and self-hosts the output, so there is
// no runtime request to Google. §3: "Zero external network requests at runtime."

// Display. Variable width axis is the point — see docs/DECISIONS.md.
const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  display: "swap",
});

// Body.
const geistSans = Geist({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

// Numeric/utility — money, rates, hours, batch years.
const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PINTU Karir",
  description: "Kerja, mentor, dan referral untuk mahasiswa Indonesia di NTU.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${bricolage.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
