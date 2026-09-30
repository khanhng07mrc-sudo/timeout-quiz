"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Danh sách phòng đấu (Rooms)</h1>
          <p className="text-muted-foreground mt-1">Quản lý và điều phối các phòng đang mở hoặc đã diễn ra</p>
        </div>
        <Link
          href="/admin/rooms/create"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 font-bold hover:opacity-90 transition inline-flex items-center gap-2"
        >
          <span>➕</span> Tạo phòng mới
        </Link>
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      {room.mode} ({room.teamMode === "TEAM" ? "Đội" : "Cá nhân"})
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
                      📺 Màn chiếu
                    </Link>
                    <Link
                      href={`/play/${room.code}`}
                      target="_blank"
                      className="px-3 py-2 rounded-xl glass border border-border hover:border-purple-400 font-bold text-xs text-center transition"
                      title="Vào giao diện thí sinh"
                    >
                      🎮 Thi đấu
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
