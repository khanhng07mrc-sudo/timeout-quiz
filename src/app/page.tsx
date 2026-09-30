import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 md:py-24 relative overflow-hidden">
      {/* Background ambient glowing orbs */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-background to-cyan-950/20 pointer-events-none" />
      <div className="absolute top-1/6 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/6 right-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center">
        {/* Brand Icon */}
        <div className="mb-8 inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 shadow-2xl shadow-purple-500/30 ring-4 ring-purple-500/20 transition-transform duration-300 hover:scale-105">
          <span className="text-5xl drop-shadow-md">⚡</span>
        </div>

        {/* Title & Tagline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 bg-gradient-to-r from-purple-300 via-indigo-200 to-cyan-300 bg-clip-text text-transparent drop-shadow-sm">
          Timeout Quiz
        </h1>
        
        <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto mb-12 leading-relaxed">
          Nền tảng thi đấu câu hỏi realtime · Thẻ bài chiến thuật · Đa hình thức & Đa chế độ
        </p>

        {/* Action Buttons - Khoảng cách lớn, nút to rõ ràng */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-xl mb-16 px-4">
          <Link
            href="/play"
            className="w-full sm:w-1/2 py-5 px-8 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-lg sm:text-xl shadow-xl shadow-purple-600/30 hover:shadow-purple-500/50 hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-3 border border-purple-400/30"
          >
            <span className="text-2xl">🎮</span>
            <span>Tham gia phòng</span>
          </Link>

          <Link
            href="/admin"
            className="w-full sm:w-1/2 py-5 px-8 rounded-2xl glass hover:bg-white/10 text-white font-extrabold text-lg sm:text-xl border-2 border-border hover:border-purple-400/80 hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
          >
            <span className="text-2xl">👨‍💼</span>
            <span>Quản lý (Admin)</span>
          </Link>
        </div>

        {/* Feature Cards - Spacing thoáng đãng, rộng rãi */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 w-full max-w-4xl px-4">
          {[
            {
              icon: "🃏",
              label: "Thẻ hỗ trợ",
              desc: "10 loại thẻ chiến thuật đa năng",
              color: "hover:border-purple-500/50 hover:shadow-purple-500/10",
            },
            {
              icon: "⚡",
              label: "Realtime",
              desc: "Socket.IO đồng bộ siêu tốc",
              color: "hover:border-cyan-500/50 hover:shadow-cyan-500/10",
            },
            {
              icon: "👥",
              label: "Đội nhóm",
              desc: "Cá nhân & Tổ chức không giới hạn",
              color: "hover:border-indigo-500/50 hover:shadow-indigo-500/10",
            },
            {
              icon: "🏆",
              label: "Đa chế độ",
              desc: "Classic, Buzz, Elimination, v.v.",
              color: "hover:border-yellow-500/50 hover:shadow-yellow-500/10",
            },
          ].map(({ icon, label, desc, color }) => (
            <div
              key={label}
              className={`glass rounded-2xl p-6 text-center border border-border/80 transition-all duration-300 hover:-translate-y-1.5 shadow-md ${color}`}
            >
              <div className="text-4xl mb-3.5 inline-block">{icon}</div>
              <div className="font-bold text-base sm:text-lg mb-1.5 text-foreground">{label}</div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-snug">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
