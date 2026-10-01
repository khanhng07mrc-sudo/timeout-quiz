import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import SystemIcon from "@/components/ui/SystemIcon";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[250px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center">
        {/* Brand Logo */}
        <div className="mb-6 hover:scale-105 transition-transform duration-300 cursor-pointer">
          <BrandLogo variant="full" size="xl" subText="Realtime Multiplayer Arena" />
        </div>

        {/* Tagline */}
        <p className="text-lg sm:text-xl text-slate-300 font-medium max-w-2xl mb-12 leading-relaxed">
          Nền tảng thi đấu câu hỏi realtime · Thẻ bài chiến thuật · Đa hình thức & Đa chế độ
        </p>

        {/* Action Buttons with distinct styling and healthy gap */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-2xl mb-16">
          <Link
            href="/play"
            className="btn-gradient w-full py-4 px-6 text-center text-lg flex items-center justify-center gap-3 shadow-lg shadow-purple-600/20"
          >
            <SystemIcon name="device" className="w-5 h-5 text-white shrink-0" />
            <span>Tham gia phòng</span>
          </Link>

          <Link
            href="/display"
            className="w-full py-4 px-6 rounded-2xl bg-[#181d36] hover:bg-cyan-600/20 text-cyan-300 hover:text-white border-2 border-cyan-500/40 hover:border-cyan-400 font-bold text-lg text-center transition-all shadow-lg flex items-center justify-center gap-3"
          >
            <SystemIcon name="display" className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>Màn hình chiếu</span>
          </Link>

          <Link
            href="/admin"
            className="btn-glass w-full py-4 px-6 text-center text-lg flex items-center justify-center gap-3"
          >
            <SystemIcon name="dashboard" className="w-5 h-5 text-purple-400 shrink-0" />
            <span>Quản lý (Admin)</span>
          </Link>
        </div>

        {/* 5 Feature Cards with generous padding and spacing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 w-full">
          <div className="quiz-card p-6 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 shadow-sm">
              <SystemIcon name="sandbox" className="w-6 h-6" />
            </div>
            <div className="font-bold text-base text-white mb-2">Thẻ hỗ trợ</div>
            <div className="text-xs text-slate-400">10 loại thẻ chiến thuật đa năng cướp điểm, phong tỏa, nhân đôi</div>
          </div>

          <div className="quiz-card p-6 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-sm">
              <SystemIcon name="device" className="w-6 h-6" />
            </div>
            <div className="font-bold text-base text-white mb-2">Realtime</div>
            <div className="text-xs text-slate-400">Đồng bộ tức thì qua WebSocket, bấm Buzz cướp quyền nhạy bén</div>
          </div>

          <div className="quiz-card p-6 text-center border-cyan-500/30 bg-cyan-950/10 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 mb-4 shadow-sm">
              <SystemIcon name="display" className="w-6 h-6" />
            </div>
            <div className="font-bold text-base text-cyan-300 mb-2">Màn hình chiếu</div>
            <div className="text-xs text-slate-400">Chế độ TV/Projector tối ưu hội trường, hiển thị câu hỏi & bảng điểm sống động</div>
          </div>

          <div className="quiz-card p-6 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-sm">
              <SystemIcon name="team" className="w-6 h-6" />
            </div>
            <div className="font-bold text-base text-white mb-2">Đội nhóm</div>
            <div className="text-xs text-slate-400">Chơi cá nhân hoặc tổ chức theo đội không giới hạn thành viên</div>
          </div>

          <div className="quiz-card p-6 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-sm">
              <SystemIcon name="trophy" className="w-6 h-6" />
            </div>
            <div className="font-bold text-base text-white mb-2">Đa chế độ</div>
            <div className="text-xs text-slate-400">Classic, Buzz, Bounceback cướp lượt, và Elimination</div>
          </div>
        </div>
      </div>
    </main>
  );
}
