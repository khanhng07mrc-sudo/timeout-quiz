"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import SystemIcon from "@/components/ui/SystemIcon";
import LanguageSelector from "@/components/ui/LanguageSelector";
import { useTranslation } from "@/lib/i18n";

export default function HomePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleQuickJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || !name.trim()) {
      setError(t.playerPortal.errorEmpty);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/rooms/${pin.trim()}/validate`);
      if (!res.ok) {
        setError(t.playerPortal.errorNotFound);
        setLoading(false);
        return;
      }
      sessionStorage.setItem("playerName", name.trim());
      localStorage.setItem("playerName", name.trim());
      router.push(`/play/${pin.trim()}`);
    } catch {
      setError(t.playerPortal.errorConnection);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070913] text-slate-200 relative overflow-hidden font-sans selection:bg-purple-600/30 selection:text-purple-200">
      {/* Subtle Volumetric Ambient Lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[380px] bg-purple-600/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-2/3 right-1/4 w-[450px] h-[280px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header with Language Selector */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-2">
          {/* Subtle live indicator */}
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Quizorra Network
          </span>
        </div>
        <LanguageSelector variant="header" />
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative z-10 w-full max-w-6xl mx-auto text-center">
        {/* Platform Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/80 text-cyan-300 text-xs font-semibold tracking-wider uppercase mb-5 shadow-lg backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{t.statusBadge}</span>
        </div>

        {/* Brand Logo */}
        <div className="mb-3 hover:scale-[1.02] transition-transform duration-300 cursor-pointer drop-shadow-[0_0_35px_rgba(168,85,247,0.25)]">
          <BrandLogo variant="full" size="xl" subText="INTELLECTUAL ARENA" />
        </div>

        {/* Universal Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mb-12 leading-relaxed font-normal">
          {t.tagline}
        </p>

        {/* ── 3 CỔNG ĐIỀU PHỐI NỀN TẢNG (HERO PORTALS) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-5xl mb-16 items-stretch text-left">
          {/* CỔNG 1: THÍ SINH THAM GIA PHÒNG THI (7 CỘT) */}
          <div className="lg:col-span-7 rounded-3xl p-6 sm:p-7 relative overflow-hidden border border-purple-500/40 bg-gradient-to-br from-[#16142e] via-[#101222] to-[#0a0b16] shadow-2xl shadow-purple-950/40 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[90px] pointer-events-none" />

            <div>
              <div className="w-full flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-lg">
                    <SystemIcon name="device" className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 block">
                      {t.playerPortal.badge}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      {t.playerPortal.title}
                    </h2>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200">
                  {t.playerPortal.live}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-5">
                {t.playerPortal.desc}
              </p>

              {/* Quick PIN Entry Form */}
              <form onSubmit={handleQuickJoin} className="p-3.5 sm:p-4 rounded-2xl bg-black/40 border border-slate-700/60 backdrop-blur-md space-y-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                      {t.playerPortal.pinLabel}
                    </label>
                    <input
                      type="text"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder={t.playerPortal.pinPlaceholder}
                      className="input-box w-full py-2.5 px-3 text-center text-xl font-mono font-bold tracking-widest text-cyan-300 placeholder:text-slate-600 bg-slate-900/80 border border-slate-700 rounded-xl"
                      maxLength={6}
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                      {t.playerPortal.nameLabel}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value.slice(0, 30))}
                      placeholder={t.playerPortal.namePlaceholder}
                      className="input-box w-full py-2.5 px-3 text-sm font-semibold bg-slate-900/80 border border-slate-700 rounded-xl"
                      maxLength={30}
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-rose-400 text-xs font-semibold text-center bg-rose-950/40 border border-rose-500/30 rounded-xl p-2">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-sm uppercase tracking-wider shadow-xl shadow-purple-950/40 border border-white/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <span>{loading ? t.playerPortal.connecting : t.playerPortal.submitBtn}</span>
                </button>
              </form>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <Link href="/play" className="hover:text-cyan-300 transition-colors flex items-center gap-1 font-semibold">
                <span>{t.playerPortal.independentLink}</span>
                <span>➔</span>
              </Link>
              <span className="text-[11px] text-slate-500">{t.playerPortal.deviceSupport}</span>
            </div>
          </div>

          {/* NHÓM 2 CỔNG DÀNH CHO BAN TỔ CHỨC (5 CỘT) */}
          <div className="lg:col-span-5 flex flex-col gap-4 justify-between">
            {/* Cổng 2: Màn hình chiếu */}
            <Link
              href="/display"
              className="rounded-3xl p-5 border border-cyan-500/30 bg-gradient-to-br from-[#0e172a] via-[#091122] to-[#070913] hover:border-cyan-400/60 transition group flex flex-col justify-between flex-1 shadow-lg shadow-cyan-950/30"
            >
              <div>
                <div className="w-full flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform">
                    <SystemIcon name="display" className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                    {t.displayPortal.badge}
                  </span>
                </div>
                <div className="text-lg font-bold text-white group-hover:text-cyan-200 transition-colors mb-1">
                  {t.displayPortal.title}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t.displayPortal.desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-cyan-300 group-hover:text-white">
                <span>{t.displayPortal.btn}</span>
                <span className="group-hover:translate-x-1 transition-transform">➔</span>
              </div>
            </Link>

            {/* Cổng 3: Đài chỉ huy Quản trị */}
            <Link
              href="/admin"
              className="rounded-3xl p-5 border border-slate-700/60 bg-gradient-to-br from-[#121424] via-[#0c0e1a] to-[#070913] hover:border-slate-500 transition group flex flex-col justify-between flex-1 shadow-lg"
            >
              <div>
                <div className="w-full flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center text-purple-300 group-hover:scale-105 transition-transform">
                    <SystemIcon name="dashboard" className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {t.adminPortal.badge}
                  </span>
                </div>
                <div className="text-lg font-bold text-white group-hover:text-purple-200 transition-colors mb-1">
                  {t.adminPortal.title}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t.adminPortal.desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300 group-hover:text-white">
                <span>{t.adminPortal.btn}</span>
                <span className="group-hover:translate-x-1 transition-transform">➔</span>
              </div>
            </Link>
          </div>
        </div>

        {/* ── 4 TRỤ CỘT NỀN TẢNG PHỔ QUÁT ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl text-left">
          <div className="p-5 rounded-2xl bg-[#0d1020] border border-slate-800 hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 mb-3">
              <SystemIcon name="device" className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">{t.pillars.realtime.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.pillars.realtime.desc}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0d1020] border border-slate-800 hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-400/30 flex items-center justify-center text-purple-400 mb-3">
              <SystemIcon name="sandbox" className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">{t.pillars.quizBank.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.pillars.quizBank.desc}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0d1020] border border-slate-800 hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-400/30 flex items-center justify-center text-indigo-400 mb-3">
              <SystemIcon name="team" className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">{t.pillars.flexibleModes.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.pillars.flexibleModes.desc}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0d1020] border border-slate-800 hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400 mb-3">
              <SystemIcon name="trophy" className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">{t.pillars.analytics.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.pillars.analytics.desc}
            </p>
          </div>
        </div>
      </main>

      {/* ── CHÂN TRANG HỆ THỐNG TOÀN DIỆN (GLOBAL FOOTER) ── */}
      <footer className="border-t border-slate-800/80 bg-[#060812] py-10 px-4 sm:px-6 relative z-10 text-xs text-slate-400">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <BrandLogo variant="compact" size="sm" />
            <div className="sm:border-l sm:border-slate-700 sm:pl-3">
              <p className="font-semibold text-slate-300">Quizorra Intellectual Arena</p>
              <p className="text-[11px] text-slate-500">{t.footer.brandSub}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 font-medium">
            <Link href="/play" className="hover:text-cyan-300 transition-colors">{t.footer.play}</Link>
            <Link href="/display" className="hover:text-cyan-300 transition-colors">{t.footer.display}</Link>
            <Link href="/admin" className="hover:text-cyan-300 transition-colors">{t.footer.admin}</Link>
            <Link href="/terms" className="hover:text-white transition-colors">{t.footer.terms}</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">{t.footer.privacy}</Link>
            <LanguageSelector variant="footer" />
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-6 pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>{t.footer.copyright}</p>
          <p>{t.footer.support} <span className="text-slate-400 font-mono">support@quizorra.com</span></p>
        </div>
      </footer>
    </div>
  );
}
