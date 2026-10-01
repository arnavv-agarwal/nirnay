import type { Metadata } from "next";
import { Noto_Sans_Devanagari, Reddit_Sans } from "next/font/google";
import { SettingsProvider } from "@/components/SettingsProvider";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

// PW's product typeface, with a Devanagari companion for Hindi tickets.
const reddit = Reddit_Sans({ subsets: ["latin"], variable: "--font-reddit" });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-deva" });

export const metadata: Metadata = {
  title: "Nirnay · Support Triage",
  description: "Reads every student ticket, drafts a cited reply, and decides: send it, or hand it to a person.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${reddit.variable} ${deva.variable}`}>
      <body>
        <SettingsProvider>
          <div className="app-shell">
            <Sidebar />
            <div className="app-main">{children}</div>
          </div>
        </SettingsProvider>
      </body>
    </html>
  );
}
