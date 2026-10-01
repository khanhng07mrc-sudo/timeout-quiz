import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import SystemIcon from "@/components/ui/SystemIcon";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[250px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
        {/* Brand Logo */}
        <div className="mb-6 hover:scale-105 transition-transform duration-300 cursor-pointer">
          <BrandLogo variant="full" size="xl" subText="Realtime Multiplayer Arena" />
        </div>

        {/* Tagline - Balanced and on 1 line on desktop, clean semantic phrases on mobile */}
        <p className="text-base sm:text-lg md:text-xl text-slate-300 font-medium max-w-4xl mb-12 leading-relaxed text-balance">
          <span className="inline-block whitespace-nowrap">Nền tảng thi đấu câu hỏi realtime</span>
          <span className="hidden sm:inline mx-2 text-slate-500">·</span>
          <span className="sm:hidden block my-0.5 text-slate-500 text-xs">●</span>
          <span className="inline-block whitespace-nowrap">Thẻ bài chiến thuật</span>
          <span className="hidden sm:inline mx-2 text-slate-500">·</span>
          <span className="sm:hidden block my-0.5 text-slate-500 text-xs">●</span>
          <span className="inline-block whitespace-nowrap">Đa hình thức &amp; Đa chế độ</span>
        </p>

        {/* Action Buttons with distinct styling and healthy gap */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-2xl mb-16">
          <Link
            href="/play"
            className="btn-gradient w-full py-4 px-5 text-center text-base sm:text-lg flex items-center justify-center gap-3 shadow-lg shadow-purple-600/20 whitespace-nowrap"
          >
            <SystemIcon name="device" className="w-5 h-5 text-white shrink-0" />
            <span className="whitespace-nowrap font-bold">Tham gia phòng</span>
          </Link>

          <Link
            href="/display"
            className="w-full py-4 px-5 rounded-2xl bg-[#181d36] hover:bg-cyan-600/20 text-cyan-300 hover:text-white border-2 border-cyan-500/40 hover:border-cyan-400 font-bold text-base sm:text-lg text-center transition-all shadow-lg flex items-center justify-center gap-3 whitespace-nowrap"
          >
            <SystemIcon name="display" className="w-5 h-5 text-cyan-400 shrink-0" />
            <span className="whitespace-nowrap font-bold">Màn hình chiếu</span>
          </Link>

          <Link
            href="/admin"
            className="btn-glass w-full py-4 px-5 text-center text-base sm:text-lg flex items-center justify-center gap-3 whitespace-nowrap"
          >
            <SystemIcon name="dashboard" className="w-5 h-5 text-purple-400 shrink-0" />
            <span className="whitespace-nowrap font-bold">Quản lý (Admin)</span>
          </Link>
        </div>

        {/* 5 Feature Cards with generous padding and spacing */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
          <div className="quiz-card p-4 sm:p-5 text-center flex flex-col items-center justify-between">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 shadow-sm shrink-0">
                <SystemIcon name="sandbox" className="w-6 h-6" />
              </div>
              <div className="font-bold text-sm sm:text-base text-white mb-2 whitespace-nowrap tracking-tight">Thẻ hỗ trợ</div>
            </div>
            <div className="text-xs text-slate-400 leading-snug">10 loại thẻ chiến thuật đa năng cướp điểm, phong tỏa, nhân đôi</div>
          </div>

          <div className="quiz-card p-4 sm:p-5 text-center flex flex-col items-center justify-between">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-sm shrink-0">
                <SystemIcon name="device" className="w-6 h-6" />
              </div>
              <div className="font-bold text-sm sm:text-base text-white mb-2 whitespace-nowrap tracking-tight">Realtime</div>
            </div>
            <div className="text-xs text-slate-400 leading-snug">Đồng bộ tức thì qua WebSocket, bấm Buzz cướp quyền nhạy bén</div>
          </div>

          <div className="quiz-card p-4 sm:p-5 text-center border-cyan-500/30 bg-cyan-950/10 flex flex-col items-center justify-between">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 mb-3 shadow-sm shrink-0">
                <SystemIcon name="display" className="w-6 h-6" />
              </div>
              <div className="font-bold text-sm sm:text-base text-cyan-300 mb-2 whitespace-nowrap tracking-tight">Màn hình chiếu</div>
            </div>
            <div className="text-xs text-slate-400 leading-snug">Chế độ TV/Projector tối ưu hội trường, hiển thị câu hỏi &amp; bảng điểm sống động</div>
          </div>

          <div className="quiz-card p-4 sm:p-5 text-center flex flex-col items-center justify-between">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-sm shrink-0">
                <SystemIcon name="team" className="w-6 h-6" />
              </div>
              <div className="font-bold text-sm sm:text-base text-white mb-2 whitespace-nowrap tracking-tight">Đội nhóm</div>
            </div>
            <div className="text-xs text-slate-400 leading-snug">Chơi cá nhân hoặc tổ chức theo đội không giới hạn thành viên</div>
          </div>

          <div className="quiz-card p-4 sm:p-5 text-center flex flex-col items-center justify-between col-span-2 md:col-span-1">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-sm shrink-0">
                <SystemIcon name="trophy" className="w-6 h-6" />
              </div>
              <div className="font-bold text-sm sm:text-base text-white mb-2 whitespace-nowrap tracking-tight">Đa chế độ</div>
            </div>
            <div className="text-xs text-slate-400 leading-snug">Classic, Buzz, Bounceback cướp lượt, và Elimination</div>
          </div>
        </div>
      </div>
    </main>
  );
}
