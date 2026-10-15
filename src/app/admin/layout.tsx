"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/ui/BrandLogo";
import SystemIcon, { SystemIconName } from "@/components/ui/SystemIcon";
import AdminAuthGuard, { useAdminAuth } from "@/components/admin/AdminAuthGuard";

const NAV_ITEMS: { href: string; icon: SystemIconName; label: string; desc: string }[] = [
  { href: "/admin", icon: "dashboard", label: "Dashboard", desc: "Tổng quan" },
  { href: "/admin/quiz-bank", icon: "quiz_bank", label: "Bộ câu hỏi", desc: "Soạn & Nhập file" },
  { href: "/admin/rooms/create", icon: "create_room", label: "Tạo phòng thi", desc: "Thiết lập trận đấu" },
  { href: "/admin/rooms", icon: "rooms", label: "Phòng đấu chính", desc: "Quản lý trận đấu" },
  { href: "/admin/sandbox", icon: "sandbox", label: "Sandbox Studio", desc: "Test độc lập trên máy" },
  { href: "/display", icon: "display", label: "Màn hình chiếu", desc: "TV & Máy chiếu" },
  { href: "/play", icon: "device", label: "Vào thi đấu", desc: "Thí sinh & Thiết bị" },
];

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isSandbox = pathname.startsWith("/admin/sandbox");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isSandbox);
  const { user, logout } = useAdminAuth();

  const handleLogout = async () => {
    if (confirm("Bạn có chắc chắn muốn đăng xuất và khóa lại quyền quản trị?")) {
      await logout();
    }
  };

  const isRouteActive = (targetHref: string, currentPath: string) => {
    if (targetHref === "/admin") {
      return currentPath === "/admin";
    }
    if (targetHref === "/admin/rooms") {
      return (
        currentPath === "/admin/rooms" ||
        (currentPath.startsWith("/admin/rooms/") && !currentPath.startsWith("/admin/rooms/create"))
      );
    }
    return currentPath === targetHref || currentPath.startsWith(targetHref + "/");
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-transparent text-foreground relative">
      {/* ── Mobile Top Header (Screens < lg) ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#131626]/90 backdrop-blur-md border-b border-[#232845] px-4 flex items-center justify-between z-40">
        <BrandLogo variant="compact" size="sm" subText="ADMIN PORTAL" href="/" />

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 active:scale-95 transition"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <span className="text-xl leading-none">✕</span> : <span className="text-xl leading-none">☰</span>}
        </button>
      </header>

      {/* ── Mobile Drawer Backdrop & Menu ── */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[80vw] h-full bg-[#131626]/95 backdrop-blur-xl border-r border-[#232845] p-5 flex flex-col gap-4 animate-slide-right shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#232845]">
              <BrandLogo variant="compact" size="sm" href="/" />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
              {NAV_ITEMS.map(({ href, icon, label, desc }) => {
                const isActive = isRouteActive(href, pathname);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-purple-600/25 border border-purple-500/50 text-white font-bold shadow-lg"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center transition-all ${
                      isActive
                        ? "bg-gradient-to-br from-[#261f5c] via-[#1a173b] to-[#0f1226] border border-cyan-400/60 text-cyan-200 shadow-[0_0_16px_rgba(6,182,212,0.45)] ring-1 ring-white/25"
                        : "bg-[#13172e]/80 border border-white/10 text-slate-400"
                    }`}>
                      <SystemIcon name={icon} className="w-6 h-6 shrink-0 drop-shadow-md" />
                    </div>
                    <div>
                      <span className="text-sm block">{label}</span>
                      <span className="text-[10px] text-muted-foreground block">{desc}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-[#232845] flex flex-col gap-2">
              {user && (
                <div className="p-2.5 rounded-xl bg-[#191d33] border border-[#272c50] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-xs font-black shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>
              )}
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5"
              >
                <SystemIcon name="home" className="w-4 h-4 shrink-0 text-slate-400" />
                <span>Về trang chủ</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition text-left"
              >
                <SystemIcon name="logout" className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop Permanent Holo Nav Rail (lg+) ── */}
      <aside
        className={`hidden lg:flex ${
          sidebarCollapsed ? "w-16 p-2 items-center" : "w-64 xl:w-72 p-4.5"
        } bg-[#0c0f20]/90 backdrop-blur-2xl border-r border-purple-500/25 shadow-2xl flex-col fixed h-full z-20 transition-all duration-250`}
      >
        {/* Brand Header & Toggle */}
        <div className={`mb-5 flex items-center ${sidebarCollapsed ? "justify-center flex-col gap-2.5" : "justify-between"} w-full px-1`}>
          {sidebarCollapsed ? (
            <BrandLogo variant="icon" size="sm" href="/" />
          ) : (
            <BrandLogo variant="compact" size="md" subText="CYBER CONTROL CENTER" href="/" />
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer text-xs border border-white/10 flex items-center justify-center"
            title={sidebarCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
          >
            {sidebarCollapsed ? "▶" : "◀"}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-2 flex-1 w-full items-center">
          {NAV_ITEMS.map(({ href, icon, label, desc }) => {
            const isActive = isRouteActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center ${
                  sidebarCollapsed ? "w-12 h-12 justify-center" : "w-full gap-3.5 px-3 py-2.5"
                } rounded-2xl transition-all duration-200 group ${
                  isActive
                    ? "bg-gradient-to-r from-purple-900/60 via-indigo-950/50 to-transparent border border-cyan-400/50 text-white shadow-lg shadow-purple-950/60"
                    : "text-slate-400 hover:text-white hover:bg-white/6 border border-transparent hover:border-purple-500/20"
                }`}
              >
                {/* Active Indicator LED */}
                {isActive && (
                  <span
                    className={`absolute ${
                      sidebarCollapsed
                        ? "left-0.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                        : "right-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                    } bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse`}
                  />
                )}

                <div
                  className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center transition-all duration-200 relative ${
                    isActive
                      ? "bg-gradient-to-br from-[#2b2269] via-[#1b173e] to-[#0d0f24] border border-cyan-400/80 text-cyan-200 shadow-[0_0_16px_rgba(6,182,212,0.45)] ring-1 ring-white/20 scale-105"
                      : "bg-[#14172c]/80 border border-white/8 text-slate-400 group-hover:text-white group-hover:border-purple-400/40 group-hover:shadow-[0_0_14px_rgba(168,85,247,0.3)] group-hover:scale-105"
                  }`}
                >
                  <SystemIcon
                    name={icon}
                    className="w-5.5 h-5.5 group-hover:scale-110 transition-transform duration-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                  />
                </div>

                {!sidebarCollapsed && (
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-sm block truncate">{label}</span>
                    <span className="text-[10px] text-slate-400 block truncate">{desc}</span>
                  </div>
                )}

                {/* Floating Tooltip khi ở chế độ Mini Dock */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-[#14172e]/95 border border-purple-500/40 text-white text-xs whitespace-nowrap shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0 backdrop-blur-md">
                    <p className="font-bold text-cyan-200">{label}</p>
                    <p className="text-[10px] text-slate-400 font-normal">{desc}</p>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions & User Profile */}
        <div className="border-t border-[#20243d] pt-3 flex flex-col gap-2 w-full items-center">
          {user && (
            <div
              className={`rounded-xl bg-[#15182e] border border-[#252a4a] flex items-center relative group ${
                sidebarCollapsed ? "w-12 h-12 justify-center" : "w-full gap-2.5 p-2.5"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                  </div>
                  {user.role === "ADMIN" && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shrink-0">
                      ADMIN
                    </span>
                  )}
                </>
              )}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-[#14172e]/95 border border-purple-500/40 text-white text-xs whitespace-nowrap shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0 backdrop-blur-md">
                  <p className="font-bold text-white">{user.name}</p>
                  <p className="text-[10px] text-slate-400">{user.email}</p>
                </div>
              )}
            </div>
          )}
          <Link
            href="/"
            className={`flex items-center ${
              sidebarCollapsed ? "w-12 h-10 justify-center" : "w-full gap-3 px-3 py-2"
            } rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/6 transition-colors relative group`}
          >
            <SystemIcon name="home" className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-cyan-300 drop-shadow" />
            {!sidebarCollapsed && <span>Về trang chủ</span>}
            {sidebarCollapsed && (
              <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[#14172e]/95 border border-white/10 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none transition-all z-50">
                Về trang chủ
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className={`flex items-center ${
              sidebarCollapsed ? "w-12 h-10 justify-center" : "w-full gap-3 px-3 py-2 text-left"
            } rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer relative group`}
          >
            <SystemIcon name="logout" className="w-5 h-5 shrink-0 text-rose-400 group-hover:text-rose-300 drop-shadow" />
            {!sidebarCollapsed && <span>Đăng xuất</span>}
            {sidebarCollapsed && (
              <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[#14172e]/95 border border-rose-500/30 text-rose-300 text-[11px] font-semibold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none transition-all z-50">
                Đăng xuất
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main workspace content ── */}
      {isSandbox ? (
        <main
          className={`${
            sidebarCollapsed ? "lg:ml-16" : "lg:ml-64 xl:ml-72"
          } flex-1 h-screen max-h-screen overflow-hidden p-1 sm:p-2 pt-16 lg:pt-2 flex flex-col min-h-0 transition-all duration-200`}
        >
          <div key={pathname} className="w-full h-full flex flex-col min-h-0 animate-fade-in">
            {children}
          </div>
        </main>
      ) : (
        <main
          className={`${
            sidebarCollapsed ? "lg:ml-16" : "lg:ml-64 xl:ml-72"
          } flex-1 p-4 sm:p-6 lg:p-10 pt-20 lg:pt-10 min-h-screen transition-all duration-200`}
        >
          <div key={pathname} className="max-w-6xl mx-auto w-full animate-fade-in">
            {children}
          </div>
        </main>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminAuthGuard>
  );
}
