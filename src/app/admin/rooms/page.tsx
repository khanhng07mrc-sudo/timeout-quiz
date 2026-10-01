"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GameModeIcon from "@/components/ui/GameModeIcon";

interface RoomItem {
  id: string;
  code: string;
  name: string;
  mode: string;
  teamMode: string;
  status: string;
  createdAt: string;
  quizBank?: { title: string };
  _count?: { players: number; teams: number };
}

export default function AdminRoomsListPage() {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/rooms?hostId=demo-host-id");
      const data = await res.json();
      if (data.rooms) {
        setRooms(data.rooms);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async (room: RoomItem) => {
    if (!confirm(`Xóa phòng "${room.name}" (${room.code})? Không thể hoàn tác!`)) return;
    setDeletingId(room.code);
    try {
      const res = await fetch(`/api/rooms/${room.code}`, { method: "DELETE" });
      if (res.ok) {
        setRooms((prev) => prev.filter((r) => r.code !== room.code));
      } else {
        alert("Lỗi khi xóa phòng!");
      }
    } catch {
      alert("Lỗi kết nối!");
    } finally {
      setDeletingId(null);
    }
  };

  const [roomsLayout, setRoomsLayout] = useState<"GRID" | "LIST">("GRID");

  useEffect(() => {
    fetchRooms();
    try {
      const saved = localStorage.getItem("timeout_admin_rooms_layout") as "GRID" | "LIST" | null;
      if (saved && ["GRID", "LIST"].includes(saved)) {
        setRoomsLayout(saved);
      }
    } catch {}
  }, []);

  const handleSetRoomsLayout = (layout: "GRID" | "LIST") => {
    setRoomsLayout(layout);
    try {
      localStorage.setItem("timeout_admin_rooms_layout", layout);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">Danh sách phòng đấu (Rooms)</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Quản lý và điều phối các phòng đang mở hoặc đã diễn ra</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {/* Segmented layout switcher: Grid vs List */}
          <div className="flex items-center p-0.5 rounded-xl bg-card border border-border gap-0.5 text-xs shadow-inner">
            <button
              type="button"
              onClick={() => handleSetRoomsLayout("GRID")}
              title="Bố cục Lưới thẻ (Cards)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                roomsLayout === "GRID"
                  ? "bg-purple-600 text-white shadow-md glow-purple"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <span>⊞</span>
              <span className="text-xs">Lưới</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetRoomsLayout("LIST")}
              title="Bố cục Danh sách dòng (Dense list)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                roomsLayout === "LIST"
                  ? "bg-purple-600 text-white shadow-md glow-purple"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <span>☰</span>
              <span className="text-xs">Danh sách</span>
            </button>
          </div>

          <Link
            href="/admin/rooms/create"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 font-bold hover:opacity-90 transition inline-flex items-center justify-center gap-2 text-sm shadow-md"
          >
            <span>➕</span> Tạo phòng mới
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Đang tải danh sách phòng...</div>
      ) : rooms.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-5xl mb-3">🚪</p>
          <h3 className="text-xl font-bold mb-2">Chưa có phòng đấu nào</h3>
          <p className="text-muted-foreground mb-6">Bạn chưa tạo phòng thi nào. Bấm nút dưới để tạo phòng đầu tiên.</p>
          <Link
            href="/admin/rooms/create"
            className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold transition inline-block"
          >
            Tạo phòng ngay
          </Link>
        </div>
      ) : roomsLayout === "GRID" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
          {rooms.map((room) => {
            const statusColor =
              room.status === "PLAYING"
                ? "text-green-400 bg-green-500/10 border-green-500/30"
                : room.status === "PAUSED"
                ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
                : room.status === "FINISHED"
                ? "text-red-400 bg-red-500/10 border-red-500/30"
                : "text-cyan-400 bg-cyan-500/10 border-cyan-500/30";

            return (
              <div
                key={room.id}
                className="glass rounded-2xl p-5 border border-border flex flex-col justify-between hover:border-purple-500/50 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${statusColor}`}>
                      {room.status}
                    </span>
                    <span className="font-mono text-xl font-black text-foreground tracking-wider">
                      {room.code}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-foreground mb-1 line-clamp-1">{room.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    {room.quizBank ? `Bộ đề: ${room.quizBank.title}` : "Bộ đề mặc định"}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4 bg-muted/20 p-2.5 rounded-xl">
                    <div>
                      <span className="block font-medium text-foreground">Chế độ:</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <GameModeIcon mode={room.mode} className="w-4 h-4 shrink-0" />
                        <span className="truncate">{room.mode} ({room.teamMode === "TEAM" ? "Đội" : "Cá nhân"})</span>
                      </div>
                    </div>
                    <div>
                      <span className="block font-medium text-foreground">Tham gia:</span>
                      {room.teamMode === "TEAM"
                        ? `${room._count?.teams ?? 0} Đội`
                        : `${room._count?.players ?? 0} Người`}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/rooms/${room.code}`}
                      className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-xs text-center transition"
                    >
                      👨‍💼 Điều khiển
                    </Link>
                    <Link
                      href={`/display/${room.code}`}
                      target="_blank"
                      className="px-3 py-2 rounded-xl glass border border-border hover:border-cyan-400 font-bold text-xs text-center transition"
                      title="Mở màn chiếu"
                    >
                      📺
                    </Link>
                    <Link
                      href={`/play/${room.code}`}
                      target="_blank"
                      className="px-3 py-2 rounded-xl glass border border-border hover:border-purple-400 font-bold text-xs text-center transition"
                      title="Vào giao diện thí sinh"
                    >
                      🎮
                    </Link>
                    <button
                      onClick={() => handleDeleteRoom(room)}
                      disabled={deletingId === room.code}
                      className="px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/30 hover:bg-destructive/20 text-destructive font-bold text-xs transition disabled:opacity-50"
                      title="Xóa phòng"
                    >
                      {deletingId === room.code ? "..." : "🗑️"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2.5 animate-slide-up">
          {rooms.map((room) => {
            const statusColor =
              room.status === "PLAYING"
                ? "text-green-400 bg-green-500/10 border-green-500/30"
                : room.status === "PAUSED"
                ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
                : room.status === "FINISHED"
                ? "text-red-400 bg-red-500/10 border-red-500/30"
                : "text-cyan-400 bg-cyan-500/10 border-cyan-500/30";

            return (
              <div
                key={room.id}
                className="glass rounded-xl p-4 border border-border flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-purple-500/50 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-base font-black text-cyan-300 tracking-wider bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 shrink-0">
                    {room.code}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-foreground truncate">{room.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${statusColor}`}>
                        {room.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <GameModeIcon mode={room.mode} className="w-3.5 h-3.5 shrink-0" />
                        Chế độ: <strong className="text-foreground">{room.mode}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        {room.teamMode === "TEAM" ? `${room._count?.teams ?? 0} Đội` : `${room._count?.players ?? 0} Người`}
                      </span>
                      <span>·</span>
                      <span>{room.quizBank ? room.quizBank.title : "Bộ đề mặc định"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Link
                    href={`/admin/rooms/${room.code}`}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-xs text-center transition"
                  >
                    👨‍💼 Điều khiển
                  </Link>
                  <Link
                    href={`/display/${room.code}`}
                    target="_blank"
                    className="p-2 rounded-xl glass border border-border hover:border-cyan-400 font-bold text-xs transition"
                    title="Mở màn chiếu"
                  >
                    📺
                  </Link>
                  <Link
                    href={`/play/${room.code}`}
                    target="_blank"
                    className="p-2 rounded-xl glass border border-border hover:border-purple-400 font-bold text-xs transition"
                    title="Vào giao diện thí sinh"
                  >
                    🎮
                  </Link>
                  <button
                    onClick={() => handleDeleteRoom(room)}
                    disabled={deletingId === room.code}
                    className="p-2 rounded-xl bg-destructive/10 border border-destructive/30 hover:bg-destructive/20 text-destructive font-bold text-xs transition disabled:opacity-50"
                    title="Xóa phòng"
                  >
                    {deletingId === room.code ? "..." : "🗑️"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
