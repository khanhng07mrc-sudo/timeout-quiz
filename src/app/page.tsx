import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-background to-cyan-900/20 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center max-w-2xl">
        {/* Logo */}
        <div className="mb-6 inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 glow-purple">
          <span className="text-4xl">⚡</span>
        </div>

        <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Timeout Quiz
        </h1>
        <p className="text-xl text-muted-foreground mb-10">
          Nền tảng thi trả lời câu hỏi realtime · Thẻ hỗ trợ · Nhiều chế độ chơi
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            href="/play"
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 font-bold text-lg transition-all duration-200 glow-purple hover:scale-105"
          >
            🎮 Tham gia phòng
          </Link>
          <Link
            href="/admin"
            className="px-8 py-4 rounded-xl border border-border hover:border-purple-500 font-bold text-lg transition-all duration-200 hover:bg-card hover:scale-105 glass"
          >
            👨💼 Quản lý (Admin)
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: "🃏", label: "Thẻ hỗ trợ", desc: "10 loại power-up" },
            { icon: "⚡", label: "Realtime", desc: "WebSocket" },
            { icon: "👥", label: "Đội nhóm", desc: "Không giới hạn" },
            { icon: "🏆", label: "Đa chế độ", desc: "5 chế độ chơi" },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="glass rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="font-semibold text-sm">{label}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
