"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SystemIcon from "@/components/ui/SystemIcon";

interface RoomSummary {
  id: string;
  code: string;
  name: string;
  status: string;
  mode: string;
  teamMode: string;
  createdAt: string;
  teams: { id: string; name: string }[];
  players: { id: string; name: string }[];
}

export default function DisplayIndexPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentRooms, setRecentRooms] = useState<RoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    fetch("/api/rooms")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (data.rooms) {
          // Filter to show active/recent rooms (LOBBY, PLAYING, PAUSED first)
          const sorted = [...data.rooms].sort((a: RoomSummary, b: RoomSummary) => {
            const statusOrder: Record<string, number> = { PLAYING: 0, LOBBY: 1, PAUSED: 2, FINISHED: 3 };
            const orderA = statusOrder[a.status] ?? 4;
            const orderB = statusOrder[b.status] ?? 4;
            if (orderA !== orderB) return orderA - orderB;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          setRecentRooms(sorted.slice(0, 8));
        }
      })
      .catch((err) => console.error("Error fetching rooms for display:", err))
      .finally(() => setLoadingRooms(false));
  }, []);

  const handleOpenDisplay = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    if (!cleanPin || cleanPin.length !== 6) {
      setError("Vui lòng nhập đúng mã phòng gồm 6 chữ số");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/rooms/${cleanPin}/validate`);
      if (!res.ok) {
        setError("Mã phòng không tồn tại hoặc phòng đã bị xóa");
        setLoading(false);
        return;
      }
      router.push(`/display/${cleanPin}`);
    } catch {
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại sau.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative bg-[#0b0c16]">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-3xl relative z-10 space-y-8">
        {/* Back and Title Header */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 px-3.5 py-1.5 rounded-full bg-[#181a2e] border border-[#262a4a] transition-colors"
          >
            ← Về trang chủ
          </Link>
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-cyan-500/20 border border-cyan-400/30">
            <SystemIcon name="display" className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Màn hình trình chiếu (Display)
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto mt-2.5">
            Dành cho máy chiếu, màn hình TV hội trường hoặc màn hình phụ của Host
          </p>
        </div>

        {/* PIN Input Card */}
        <div className="quiz-card p-6 sm:p-8">
          <form onSubmit={handleOpenDisplay} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Nhập mã phòng thi (PIN)
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  inputMode="numeric"
                  className="flex-1 px-4 py-3.5 rounded-xl bg-[#141628] border-2 border-[#2b3054] text-center sm:text-left text-2xl font-mono font-bold tracking-widest text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading || pin.length !== 6}
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-bold text-base text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {loading ? (
                    <span>Đang kết nối...</span>
                  ) : (
                    <>
                      <SystemIcon name="display" className="w-4 h-4 shrink-0 text-white" />
                      <span>Mở màn chiếu</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-semibold text-center animate-bounce-in">
                ⚠️ {error}
              </div>
            )}
          </form>
        </div>

        {/* Quick Launch Active Rooms */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>⚡</span>
              <span>Các phòng đang hoạt động</span>
            </h2>
            <Link href="/admin/rooms" className="text-xs font-semibold text-cyan-400 hover:underline">
              Xem tất cả phòng ➔
            </Link>
          </div>

          {loadingRooms ? (
            <div className="quiz-card p-8 text-center text-slate-400 text-sm">
              Đang tải danh sách phòng...
            </div>
          ) : recentRooms.length === 0 ? (
            <div className="quiz-card p-6 text-center text-slate-500 text-sm">
              Chưa có phòng thi nào đang mở.{" "}
              <Link href="/admin/rooms/create" className="text-purple-400 font-bold hover:underline">
                Tạo phòng mới ngay
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentRooms.map((room) => {
                const isPlaying = room.status === "PLAYING";
                const isLobby = room.status === "LOBBY";
                const isPaused = room.status === "PAUSED";

                return (
                  <div
                    key={room.id}
                    className="quiz-card p-4 sm:p-5 flex flex-col justify-between gap-4 border border-[#232747] hover:border-cyan-500/50 transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xl font-black text-cyan-400">
                          {room.code}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                            isPlaying
                              ? "bg-green-500/20 text-green-300 border border-green-500/30 animate-pulse"
                              : isLobby
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : isPaused
                              ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                              : "bg-slate-700/40 text-slate-400"
                          }`}
                        >
                          {isPlaying ? "Đang thi đấu" : isLobby ? "Phòng chờ (Lobby)" : isPaused ? "Tạm dừng" : "Đã xong"}
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-base truncate group-hover:text-cyan-300 transition-colors">
                        {room.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Chế độ: <strong>{room.mode}</strong> · {room.teamMode === "TEAM" ? `${room.teams.length} đội` : `${room.players.length} thí sinh`}
                      </p>
                    </div>

                    <Link
                      href={`/display/${room.code}`}
                      target="_blank"
                      className="w-full py-2.5 rounded-xl bg-[#1c213d] hover:bg-cyan-600 text-cyan-300 hover:text-white font-bold text-sm text-center border border-[#2b3360] hover:border-cyan-500 transition-all flex items-center justify-center gap-2"
                    >
                      <SystemIcon name="display" className="w-4 h-4 shrink-0" />
                      <span>Mở màn chiếu phòng này</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Projector Optimization Tips */}
        <div className="quiz-card p-5 border border-cyan-500/20 bg-cyan-950/10 rounded-2xl flex items-start gap-4">
          <div className="text-2xl mt-0.5">💡</div>
          <div className="text-xs sm:text-sm text-slate-300 space-y-1">
            <p className="font-bold text-cyan-300">Mẹo thiết lập màn hình chiếu tối ưu:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-400">
              <li>Nhấn phím <strong>F11</strong> trên bàn phím để kích hoạt chế độ toàn màn hình (Full Screen).</li>
              <li>Kéo tab này sang màn hình máy chiếu hoặc TV hội trường (chế độ Extend Display trong Windows: <code>Win + P</code>).</li>
              <li>Màn hình trình chiếu tự động hiển thị câu hỏi, bộ đếm giờ, kết quả chuông Buzz và bảng điểm thời gian thực.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
