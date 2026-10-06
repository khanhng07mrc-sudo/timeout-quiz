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
  { href: "/admin/rooms", icon: "rooms", label: "Phòng đang có", desc: "Quản lý & Điều phối" },
  { href: "/admin/sandbox", icon: "sandbox", label: "Sandbox Studio", desc: "Test solo 1 người" },
  { href: "/display", icon: "display", label: "Màn hình chiếu", desc: "TV & Máy chiếu" },
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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0b0c16] text-foreground">
      {/* ── Mobile Top Header (Screens < lg) ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#121424]/95 backdrop-blur-md border-b border-[#222642] px-4 flex items-center justify-between z-40">
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
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[80vw] h-full bg-[#121424] border-r border-[#222642] p-5 flex flex-col gap-4 animate-slide-right shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#222642]">
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
                const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-purple-600/20 border border-purple-500/50 text-white font-bold"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <SystemIcon name={icon} className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="text-sm block">{label}</span>
                      <span className="text-[10px] text-muted-foreground block">{desc}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-[#222642] flex flex-col gap-2">
              {user && (
                <div className="p-2.5 rounded-xl bg-[#171a30] border border-[#272c50] flex items-center gap-2.5">
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

      {/* ── Desktop Permanent Sidebar (lg+) ── */}
      <aside
        className={`hidden lg:flex ${
          sidebarCollapsed ? "w-16 p-2 items-center" : "w-64 xl:w-72 p-6"
        } bg-[#121424] border-r border-[#222642] flex-col fixed h-full z-20 transition-all duration-200`}
      >
        {/* Brand Header */}
        <div className={`mb-6 flex items-center ${sidebarCollapsed ? "justify-center flex-col gap-2" : "justify-between"} w-full px-1`}>
          {sidebarCollapsed ? (
            <BrandLogo variant="icon" size="sm" href="/" />
          ) : (
            <BrandLogo variant="compact" size="md" subText="ADMIN PORTAL" href="/" />
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer text-xs"
            title={sidebarCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
          >
            {sidebarCollapsed ? "▶" : "◀"}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-1.5 flex-1 w-full">
          {NAV_ITEMS.map(({ href, icon, label, desc }) => {
            const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                title={sidebarCollapsed ? `${label} - ${desc}` : undefined}
                className={`flex items-center ${
                  sidebarCollapsed ? "justify-center px-0 py-3" : "gap-3.5 px-4 py-3"
                } rounded-xl transition-all group ${
                  isActive
                    ? "bg-[#1c203b] border border-[#3b4375] text-white"
                    : "text-slate-300 hover:text-white hover:bg-[#1c203b] border border-transparent hover:border-[#2f355f]"
                }`}
              >
                <SystemIcon name={icon} className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
                {!sidebarCollapsed && (
                  <div>
                    <span className="font-bold text-sm block">{label}</span>
                    <span className="text-[11px] text-slate-500 block">{desc}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions & User Profile */}
        <div className="border-t border-[#222642] pt-4 flex flex-col gap-2 w-full">
          {user && (
            <div
              className={`p-2 rounded-xl bg-[#171a30] border border-[#272c50] flex items-center ${
                sidebarCollapsed ? "justify-center" : "gap-2.5 p-2.5"
              }`}
              title={sidebarCollapsed ? `${user.name} (${user.email})` : undefined}
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
            </div>
          )}
          <Link
            href="/"
            title={sidebarCollapsed ? "Về trang chủ" : undefined}
            className={`flex items-center ${
              sidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2"
            } rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#1a1c33] transition-colors`}
          >
            <SystemIcon name="home" className="w-4 h-4 shrink-0 text-slate-400" />
            {!sidebarCollapsed && <span>Về trang chủ</span>}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            title={sidebarCollapsed ? "Đăng xuất" : undefined}
            className={`flex items-center ${
              sidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2 text-left"
            } rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors w-full cursor-pointer`}
          >
            <SystemIcon name="logout" className="w-4 h-4 shrink-0 text-rose-400" />
            {!sidebarCollapsed && <span>Đăng xuất</span>}
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
          <div className="w-full h-full flex flex-col min-h-0">
            {children}
          </div>
        </main>
      ) : (
        <main
          className={`${
            sidebarCollapsed ? "lg:ml-16" : "lg:ml-64 xl:ml-72"
          } flex-1 p-4 sm:p-6 lg:p-10 pt-20 lg:pt-10 min-h-screen transition-all duration-200`}
        >
          <div className="max-w-6xl mx-auto w-full">
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
