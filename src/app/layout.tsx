import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import OfflineBanner from "@/components/ui/OfflineBanner";
import QuizSoulBackground from "@/components/ui/QuizSoulBackground";
import GlobalPageTransition from "@/components/ui/GlobalPageTransition";
import AppProviders from "@/components/providers/AppProviders";
import GlobalNavigationToolbar from "@/components/ui/GlobalNavigationToolbar";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quizorra — Đấu Trường Trí Tuệ & Realtime Quiz Arena",
  description: "Nền tảng thi đấu trắc nghiệm & boardgame thời gian thực đa chế độ, đối kháng đỉnh cao — Quizorra",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/brand/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/brand/icon.svg",
    apple: "/brand/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={plusJakartaSans.variable}>
      <body className={`${plusJakartaSans.className} font-sans bg-background text-foreground relative min-h-screen antialiased`}>
        <QuizSoulBackground />
        <GlobalPageTransition />
        <OfflineBanner />
        <div className="relative z-10 w-full min-h-screen flex flex-col">
          <AppProviders>
            {children}
            <GlobalNavigationToolbar />
          </AppProviders>
        </div>
      </body>
    </html>
  );
}
