import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Quản lý quiz và phòng chơi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/quiz-bank" className="glass rounded-2xl p-6 hover:border-purple-500/50 border border-transparent transition-all group">
          <div className="text-4xl mb-4">📚</div>
          <h2 className="text-xl font-bold mb-1 group-hover:text-purple-400 transition-colors">Bộ câu hỏi</h2>
          <p className="text-muted-foreground text-sm">Tạo và quản lý bộ câu hỏi, import từ Excel/CSV</p>
        </Link>

        <Link href="/admin/rooms/create" className="glass rounded-2xl p-6 hover:border-cyan-500/50 border border-transparent transition-all group">
          <div className="text-4xl mb-4">🎮</div>
          <h2 className="text-xl font-bold mb-1 group-hover:text-cyan-400 transition-colors">Tạo phòng mới</h2>
          <p className="text-muted-foreground text-sm">Cấu hình chế độ chơi, thẻ hỗ trợ, số đội</p>
        </Link>

        <Link href="/admin/rooms" className="glass rounded-2xl p-6 hover:border-green-500/50 border border-transparent transition-all group">
          <div className="text-4xl mb-4">🚪</div>
          <h2 className="text-xl font-bold mb-1 group-hover:text-green-400 transition-colors">Phòng của tôi</h2>
          <p className="text-muted-foreground text-sm">Xem và điều khiển các phòng đang hoạt động</p>
        </Link>
      </div>
    </div>
  );
}
