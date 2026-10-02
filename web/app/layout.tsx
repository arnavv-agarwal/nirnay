import type { Metadata } from "next";
import { Noto_Sans_Devanagari, Reddit_Sans } from "next/font/google";
import { SettingsProvider } from "@/components/SettingsProvider";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

// PW's product typeface, with a Devanagari companion for Hindi tickets.
const reddit = Reddit_Sans({ subsets: ["latin"], variable: "--font-reddit" });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-deva" });

const description = "Reads every student ticket, drafts a cited reply, and decides: send it, or hand it to a person.";

// Icons and the link-preview image (WhatsApp, Slack...) come from app/icon.svg, apple-icon.png
// and opengraph-image.png; metadataBase makes the image's address absolute.
export const metadata: Metadata = {
  metadataBase: new URL("https://nirnay-sandy.vercel.app"),
  title: "Nirnay · Support Triage",
  description,
  openGraph: { title: "Nirnay · Support Triage", description, siteName: "Nirnay", type: "website", url: "/" },
  twitter: { card: "summary_large_image", title: "Nirnay · Support Triage", description },
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
