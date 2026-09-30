import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-black text-white">
          Bảng điều khiển quản trị
        </h1>
        <p className="text-base text-slate-400 mt-2">
          Quản lý toàn diện ngân hàng câu hỏi, tạo phòng thi đấu và điều hành trực tiếp
        </p>
      </div>

      {/* 3 Main Action Cards with high visibility, padding, and interaction */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <Link
          href="/admin/quiz-bank"
          className="quiz-card-interactive p-8 flex flex-col justify-between group"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
              📚
            </div>
            <h2 className="text-2xl font-black text-white group-hover:text-purple-300 transition-colors mb-2">
              Bộ câu hỏi
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Soạn thảo 7 loại câu hỏi đa dạng hoặc nhập nhanh danh sách hàng loạt từ file Excel (.xlsx), CSV, JSON.
            </p>
          </div>
          <span className="text-sm font-bold text-purple-400 group-hover:text-purple-300 flex items-center gap-1.5 pt-4 border-t border-[#232747]">
            Quản lý ngân hàng đề ➔
          </span>
        </Link>

        <Link
          href="/admin/rooms/create"
          className="quiz-card-interactive p-8 flex flex-col justify-between group"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
              🎮
            </div>
            <h2 className="text-2xl font-black text-white group-hover:text-cyan-300 transition-colors mb-2">
              Tạo phòng thi mới
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Thiết lập quy chế thi đấu 4 bước: Chia đội, cấp thẻ hỗ trợ (power-up), chọn chế độ Buzz tranh lượt hoặc Classic.
            </p>
          </div>
          <span className="text-sm font-bold text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1.5 pt-4 border-t border-[#232747]">
            Bắt đầu tạo phòng ➔
          </span>
        </Link>

        <Link
          href="/admin/rooms"
          className="quiz-card-interactive p-8 flex flex-col justify-between group"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
              🚪
            </div>
            <h2 className="text-2xl font-black text-white group-hover:text-emerald-300 transition-colors mb-2">
              Phòng của tôi
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Xem danh sách các phòng thi, mở giao diện máy chiếu (Projector) hoặc vào bàn điều khiển host trực tiếp.
            </p>
          </div>
          <span className="text-sm font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center gap-1.5 pt-4 border-t border-[#232747]">
            Xem danh sách phòng ➔
          </span>
        </Link>
      </div>
    </div>
  );
}
