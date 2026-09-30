import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center">
        {/* Brand Icon */}
        <div className="mb-6 w-24 h-24 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-purple-500/25 border border-purple-400/30">
          <span className="text-5xl">⚡</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-white mb-4">
          Timeout Quiz
        </h1>
        
        {/* Tagline */}
        <p className="text-lg sm:text-xl text-slate-400 font-medium max-w-2xl mb-12 leading-relaxed">
          Nền tảng thi đấu câu hỏi realtime · Thẻ bài chiến thuật · Đa hình thức & Đa chế độ
        </p>

        {/* Action Buttons with distinct styling and healthy 24px gap */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-md mb-20">
          <Link
            href="/play"
            className="btn-gradient w-full py-4 px-8 text-center text-lg flex items-center justify-center gap-3"
          >
            <span className="text-2xl">🎮</span>
            <span>Tham gia phòng</span>
          </Link>

          <Link
            href="/admin"
            className="btn-glass w-full py-4 px-8 text-center text-lg flex items-center justify-center gap-3"
          >
            <span className="text-2xl">👨‍💼</span>
            <span>Quản lý (Admin)</span>
          </Link>
        </div>

        {/* 4 Feature Cards with generous padding and spacing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          <div className="quiz-card p-6 text-center">
            <div className="text-4xl mb-4">🃏</div>
            <div className="font-bold text-lg text-white mb-2">Thẻ hỗ trợ</div>
            <div className="text-sm text-slate-400">10 loại thẻ chiến thuật đa năng cướp điểm, phong tỏa, nhân đôi</div>
          </div>

          <div className="quiz-card p-6 text-center">
            <div className="text-4xl mb-4">⚡</div>
            <div className="font-bold text-lg text-white mb-2">Realtime</div>
            <div className="text-sm text-slate-400">Đồng bộ tức thì qua WebSocket, bấm Buzz cướp quyền nhạy bén</div>
          </div>

          <div className="quiz-card p-6 text-center">
            <div className="text-4xl mb-4">👥</div>
            <div className="font-bold text-lg text-white mb-2">Đội nhóm</div>
            <div className="text-sm text-slate-400">Chơi cá nhân hoặc tổ chức theo đội không giới hạn thành viên</div>
          </div>

          <div className="quiz-card p-6 text-center">
            <div className="text-4xl mb-4">🏆</div>
            <div className="font-bold text-lg text-white mb-2">Đa chế độ</div>
            <div className="text-sm text-slate-400">Classic, Buzz, Elimination loại trực tiếp, và Tournament</div>
          </div>
        </div>
      </div>
    </main>
  );
}
