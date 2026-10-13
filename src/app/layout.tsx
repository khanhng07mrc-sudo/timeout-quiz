import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import OfflineBanner from "@/components/ui/OfflineBanner";
import QuizSoulBackground from "@/components/ui/QuizSoulBackground";
import GlobalPageTransition from "@/components/ui/GlobalPageTransition";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

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
    <html lang="vi">
      <body className={`${inter.className} bg-background text-foreground relative min-h-screen`}>
        <QuizSoulBackground />
        <GlobalPageTransition />
        <OfflineBanner />
        <div className="relative z-10 w-full min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
