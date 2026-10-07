import Link from "next/link";
import SystemIcon from "@/components/ui/SystemIcon";

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

      {/* 5 Main Action Cards with high visibility, padding, and interaction */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/admin/sandbox"
          className="quiz-card-interactive p-8 flex flex-col justify-between group border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/20 via-[#16192e] to-[#121424]"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <SystemIcon name="sandbox" className="w-8 h-8" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-black text-white group-hover:text-fuchsia-300 transition-colors">
                Sandbox Studio
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                Solo Test
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Môi trường test độc lập không cần nhiều thiết bị: 1-click kích hoạt 9 mode chơi với 3 virtual Bot tự động tương tác & điều khiển đa màn hình trên 1 trình duyệt.
            </p>
          </div>
          <span className="text-sm font-bold text-fuchsia-400 group-hover:text-fuchsia-300 flex items-center gap-1.5 pt-4 border-t border-[#232747]">
            Mở phòng thí nghiệm test solo ➔
          </span>
        </Link>

        <Link
          href="/admin/quiz-bank"
          className="quiz-card-interactive p-8 flex flex-col justify-between group"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <SystemIcon name="quiz_bank" className="w-8 h-8" />
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
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <SystemIcon name="create_room" className="w-8 h-8" />
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
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <SystemIcon name="rooms" className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white group-hover:text-emerald-300 transition-colors mb-2">
              Phòng của tôi
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Xem danh sách các phòng thi, mở giao diện điều khiển của Host hoặc giám sát thí sinh trong phòng.
            </p>
          </div>
          <span className="text-sm font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center gap-1.5 pt-4 border-t border-[#232747]">
            Xem danh sách phòng ➔
          </span>
        </Link>

        <Link
          href="/display"
          className="quiz-card-interactive p-8 flex flex-col justify-between group"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <SystemIcon name="display" className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white group-hover:text-amber-300 transition-colors mb-2">
              Màn hình chiếu (Display)
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Mở giao diện màn hình lớn cho Máy chiếu hoặc TV hội trường: tự động hiển thị câu hỏi, đồng hồ đếm ngược, chuông Buzz & bảng xếp hạng thời gian thực.
            </p>
          </div>
          <span className="text-sm font-bold text-amber-400 group-hover:text-amber-300 flex items-center gap-1.5 pt-4 border-t border-[#232747]">
            Mở cổng màn hình chiếu ➔
          </span>
        </Link>
      </div>
    </div>
  );
}
