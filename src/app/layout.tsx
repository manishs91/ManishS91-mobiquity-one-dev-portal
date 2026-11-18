import type { Metadata } from "next";
import { JetBrains_Mono, Public_Sans } from "next/font/google";
import { site } from "@/config/site";
import "./globals.css";

const sans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: { default: site.portalName, template: `%s — ${site.portalName}` },
  description: "Guides, API reference and a self-serve sandbox for integrating Mobiquity One payment orchestration.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 btn btn-secondary">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
