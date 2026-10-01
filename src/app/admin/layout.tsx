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
  const { logout } = useAdminAuth();

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
                <span>Khóa & Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop Permanent Sidebar (lg+) ── */}
      <aside className="hidden lg:flex w-64 xl:w-72 bg-[#121424] border-r border-[#222642] flex-col p-6 fixed h-full z-20">
        {/* Brand Header */}
        <div className="mb-8 px-1">
          <BrandLogo variant="compact" size="md" subText="ADMIN PORTAL" href="/" />
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-2 flex-1">
          {NAV_ITEMS.map(({ href, icon, label, desc }) => {
            const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all group ${
                  isActive
                    ? "bg-[#1c203b] border border-[#3b4375] text-white"
                    : "text-slate-300 hover:text-white hover:bg-[#1c203b] border border-transparent hover:border-[#2f355f]"
                }`}
              >
                <SystemIcon name={icon} className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="font-bold text-sm block">{label}</span>
                  <span className="text-[11px] text-slate-500 block">{desc}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="border-t border-[#222642] pt-4 flex flex-col gap-1.5">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-[#1a1c33] transition-colors"
          >
            <SystemIcon name="home" className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Về trang chủ</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors w-full text-left cursor-pointer"
          >
            <SystemIcon name="logout" className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Khóa & Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* ── Main workspace content ── */}
      {pathname.startsWith("/admin/sandbox") ? (
        <main className="lg:ml-64 xl:ml-72 flex-1 h-screen max-h-screen overflow-hidden p-2 pt-16 lg:pt-2 flex flex-col min-h-0">
          <div className="w-full h-full flex flex-col min-h-0">
            {children}
          </div>
        </main>
      ) : (
        <main className="lg:ml-64 xl:ml-72 flex-1 p-4 sm:p-6 lg:p-10 pt-20 lg:pt-10 min-h-screen">
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
