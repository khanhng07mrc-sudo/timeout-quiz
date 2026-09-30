import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-border flex flex-col p-4 gap-2 fixed h-full">
        <Link href="/" className="flex items-center gap-2 mb-6 p-2">
          <span className="text-2xl">⚡</span>
          <span className="font-black text-lg bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Timeout Quiz
          </span>
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
          {[
            { href: "/admin", icon: "📊", label: "Dashboard" },
            { href: "/admin/quiz-bank", icon: "📚", label: "Bộ câu hỏi" },
            { href: "/admin/rooms/create", icon: "➕", label: "Tạo phòng" },
            { href: "/admin/rooms", icon: "🚪", label: "Phòng của tôi" },
          ].map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-card transition-colors text-muted-foreground hover:text-foreground"
            >
              <span>{icon}</span>
              <span className="font-medium">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-border pt-4">
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <span>🚪</span>
            <span className="font-medium">Đăng xuất</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
