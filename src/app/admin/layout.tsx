import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[#0b0c16]">
      {/* Sidebar with solid background and clean borders */}
      <aside className="w-64 sm:w-72 bg-[#121424] border-r border-[#222642] flex flex-col p-6 fixed h-full z-20">
        {/* Brand Header */}
        <Link href="/" className="flex items-center gap-3 mb-10 px-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-xl shadow-md group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <div>
            <span className="font-black text-xl text-white block">
              Timeout Quiz
            </span>
            <span className="text-xs text-purple-400 font-bold uppercase tracking-wider">
              Admin Portal
            </span>
          </div>
        </Link>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-2.5 flex-1">
          {[
            { href: "/admin", icon: "📊", label: "Dashboard", desc: "Tổng quan" },
            { href: "/admin/quiz-bank", icon: "📚", label: "Bộ câu hỏi", desc: "Soạn & Nhập file" },
            { href: "/admin/rooms/create", icon: "➕", label: "Tạo phòng thi", desc: "Thiết lập trận đấu" },
            { href: "/admin/rooms", icon: "🚪", label: "Phòng đang có", desc: "Quản lý & Điều phối" },
            { href: "/display", icon: "📺", label: "Màn hình chiếu", desc: "TV & Máy chiếu" },
          ].map(({ href, icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-slate-300 hover:text-white hover:bg-[#1c203b] border border-transparent hover:border-[#2f355f] transition-all group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
              <div>
                <span className="font-bold text-sm block">{label}</span>
                <span className="text-[11px] text-slate-500 block">{desc}</span>
              </div>
            </Link>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="border-t border-[#222642] pt-4 flex flex-col gap-2">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-[#1a1c33] transition-colors"
          >
            <span>🏠</span>
            <span>Về trang chủ</span>
          </Link>
        </div>
      </aside>

      {/* Main workspace content with generous padding */}
      <main className="ml-64 sm:ml-72 flex-1 p-8 sm:p-12 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
