"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GameModeIcon from "@/components/ui/GameModeIcon";
import SystemIcon from "@/components/ui/SystemIcon";
import DualTabTransition from "@/components/ui/DualTabTransition";

interface RoomItem {
  id: string;
  code: string;
  name: string;
  mode: string;
  teamMode: string;
  status: string;
  config?: any;
  createdAt: string;
  quizBank?: { title: string };
  _count?: { players: number; teams: number };
}

export default function AdminRoomsListPage() {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupStats, setCleanupStats] = useState<{
    finishedCount: number;
    sandboxCount: number;
    staleLobbyCount: number;
    stalePlayingCount: number;
    emptyCount: number;
    totalStaleCount: number;
  } | null>(null);
  const [cleanupToast, setCleanupToast] = useState<string | null>(null);

  // Tab filter: OFFICIAL (default) vs SANDBOX vs ALL
  const [activeTab, setActiveTab] = useState<"OFFICIAL" | "SANDBOX" | "ALL">("OFFICIAL");

  const isSandboxRoom = (room: RoomItem) =>
    room.name?.startsWith("[Sandbox]") ||
    Boolean(room.config?.isSandbox) ||
    room.code?.startsWith("sb_");

  const officialRooms = rooms.filter((r) => !isSandboxRoom(r));
  const sandboxRooms = rooms.filter((r) => isSandboxRoom(r));
  const displayedRooms =
    activeTab === "OFFICIAL"
      ? officialRooms
      : activeTab === "SANDBOX"
      ? sandboxRooms
      : rooms;

  const fetchCleanupStats = async () => {
    try {
      const token = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/rooms/cleanup", { headers });
      const data = await res.json();
      if (data.stats) {
        setCleanupStats(data.stats);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunCleanup = async (forceAllFinished: boolean = false, forceAllSandbox: boolean = false) => {
    try {
      setCleaningUp(true);
      const token = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/rooms/cleanup", {
        method: "POST",
        headers,
        body: JSON.stringify({ forceAllFinished, forceAllSandbox }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCleanupModal(false);
        setCleanupToast(`Đã dọn dẹp ${data.deletedCount} phòng thành công!`);
        setTimeout(() => setCleanupToast(null), 5000);
        await fetchRooms();
      } else {
        alert(data.error || "Lỗi dọn dẹp phòng!");
      }
    } catch {
      alert("Lỗi kết nối khi dọn dẹp phòng!");
    } finally {
      setCleaningUp(false);
    }
  };

  const handleCleanupAllSandbox = async () => {
    if (!confirm(`Xóa toàn bộ ${sandboxRooms.length} phòng Sandbox thử nghiệm trên hệ thống?`)) return;
    try {
      setCleaningUp(true);
      const token = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/rooms/cleanup", {
        method: "POST",
        headers,
        body: JSON.stringify({ forceAllSandbox: true }),
      });
      const data = await res.json();
      if (data.success) {
        setCleanupToast(`Đã xóa ${data.deletedCount} phòng Sandbox thành công!`);
        setTimeout(() => setCleanupToast(null), 5000);
        await fetchRooms();
      } else {
        alert(data.error || "Lỗi dọn dẹp phòng Sandbox!");
      }
    } catch {
      alert("Lỗi kết nối khi dọn dẹp phòng Sandbox!");
    } finally {
      setCleaningUp(false);
    }
  };

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/rooms?hostId=demo-host-id", { headers });
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
      const token = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
      const hostKey = localStorage.getItem(`host_key_${room.code}`);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (hostKey) headers["x-host-key"] = hostKey;

      const res = await fetch(`/api/rooms/${room.code}`, { method: "DELETE", headers });
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
          <h1 className="text-2xl sm:text-3xl font-black whitespace-nowrap">Danh sách phòng đấu (Rooms)</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Quản lý <strong className="text-amber-400">Phòng đấu chính</strong> của Ban tổ chức và phân tách với <strong className="text-cyan-400">Phòng Sandbox</strong> thử nghiệm độc lập.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {/* Segmented layout switcher: Grid vs List */}
          <div className="flex items-center p-0.5 rounded-xl bg-card border border-border gap-0.5 text-xs shadow-inner">
            <button
              type="button"
              onClick={() => handleSetRoomsLayout("GRID")}
              title="Bố cục Lưới thẻ (Cards)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                roomsLayout === "GRID"
                  ? "bg-purple-600 text-white shadow-md glow-purple"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <span>⊞</span>
              <span className="text-xs whitespace-nowrap">Lưới</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetRoomsLayout("LIST")}
              title="Bố cục Danh sách dòng (Dense list)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                roomsLayout === "LIST"
                  ? "bg-purple-600 text-white shadow-md glow-purple"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <span>☰</span>
              <span className="text-xs whitespace-nowrap">Danh sách</span>
            </button>
          </div>

          {/* Dọn dẹp phòng cũ */}
          <button
            type="button"
            onClick={() => {
              fetchCleanupStats();
              setShowCleanupModal(true);
            }}
            className="px-4 py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold transition inline-flex items-center justify-center gap-2 text-sm shadow-sm whitespace-nowrap cursor-pointer active:scale-95"
            title="Dọn dẹp các phòng cũ, phòng đã kết thúc hoặc bị bỏ rơi"
          >
            <span>🧹</span>
            <span className="whitespace-nowrap">Dọn dẹp phòng cũ</span>
          </button>

          <Link
            href="/admin/rooms/create"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white font-bold hover:opacity-90 transition inline-flex items-center justify-center gap-2 text-sm shadow-md whitespace-nowrap"
          >
            <SystemIcon name="create_room" className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Tạo phòng đấu chính</span>
          </Link>
        </div>
      </div>

      {/* ── Segmented Category Tabs: Phòng đấu chính vs Phòng Sandbox vs Tất cả ── */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab("OFFICIAL")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeTab === "OFFICIAL"
              ? "bg-gradient-to-r from-amber-500/25 to-yellow-500/20 border border-amber-500/50 text-amber-300 shadow-lg glow-amber"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
          }`}
        >
          <span>🏆</span>
          <span>Phòng đấu chính (Admin)</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {officialRooms.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("SANDBOX")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeTab === "SANDBOX"
              ? "bg-gradient-to-r from-blue-500/25 to-cyan-500/20 border border-cyan-500/50 text-cyan-300 shadow-lg glow-cyan"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
          }`}
        >
          <span>🧪</span>
          <span>Phòng Sandbox (Thử nghiệm)</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            {sandboxRooms.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeTab === "ALL"
              ? "bg-purple-600/25 border border-purple-500/50 text-purple-300 shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
          }`}
        >
          <span>📋</span>
          <span>Tất cả</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {rooms.length}
          </span>
        </button>
      </div>

      {/* Sandbox Category Notice */}
      {activeTab === "SANDBOX" && (
        <div className="glass rounded-2xl p-4 border border-cyan-500/30 bg-cyan-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-cyan-200 animate-tab-enter">
          <div className="flex items-start gap-2.5">
            <span className="text-2xl shrink-0">🧪</span>
            <div>
              <div className="font-bold text-sm text-cyan-100">Môi trường thử nghiệm Sandbox độc lập</div>
              <p className="text-cyan-300/80 mt-0.5">
                Các phòng Sandbox hoạt động độc lập để kiểm thử trực tiếp trên máy của bạn và không can thiệp vào các phòng đấu chính thức. Bạn có thể xóa bất cứ lúc nào để giải phóng hệ thống.
              </p>
            </div>
          </div>
          {sandboxRooms.length > 0 && (
            <button
              type="button"
              onClick={handleCleanupAllSandbox}
              disabled={cleaningUp}
              className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/40 text-rose-300 font-bold text-xs shrink-0 flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <span>🧹</span>
              <span>Xóa tất cả Sandbox ({sandboxRooms.length})</span>
            </button>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {cleanupToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600/95 border border-emerald-400 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm animate-bounce-in flex items-center gap-2">
          <span>✓</span>
          <span>{cleanupToast}</span>
        </div>
      )}

      {/* Cleanup Modal */}
      {showCleanupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => !cleaningUp && setShowCleanupModal(false)}
        >
          <div
            className="w-full max-w-lg glass rounded-3xl border border-white/20 p-6 flex flex-col gap-5 shadow-2xl bg-[#121324]/95 text-white animate-zoom-in-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-black flex items-center gap-2">
                <span>🧹</span>
                <span>Dọn dẹp phòng cũ & giải phóng hệ thống</span>
              </h3>
              <button
                type="button"
                disabled={cleaningUp}
                onClick={() => setShowCleanupModal(false)}
                className="w-8 h-8 rounded-full glass hover:bg-white/10 flex items-center justify-center text-sm font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Hệ thống sẽ quét và thu hồi các phòng thi đã diễn ra xong, phòng thử nghiệm hoặc bị bỏ rơi quá lâu để giải phóng bộ nhớ RAM và cơ sở dữ liệu.
            </p>

            {/* Stats Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-black/40 p-3.5 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                <span className="text-slate-400">Đã kết thúc (&gt;2h):</span>
                <span className="font-mono font-bold text-amber-300">{cleanupStats?.finishedCount ?? "..."}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                <span className="text-slate-400">Sandbox test (&gt;1h):</span>
                <span className="font-mono font-bold text-blue-300">{cleanupStats?.sandboxCount ?? "..."}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                <span className="text-slate-400">Phòng chờ bỏ quên (&gt;6h):</span>
                <span className="font-mono font-bold text-purple-300">{cleanupStats?.staleLobbyCount ?? "..."}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                <span className="text-slate-400">Phòng trống (0 người):</span>
                <span className="font-mono font-bold text-cyan-300">{cleanupStats?.emptyCount ?? "..."}</span>
              </div>
              <div className="col-span-2 flex items-center justify-between p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 font-bold mt-1">
                <span>Tổng số phòng có thể dọn dẹp:</span>
                <span className="font-mono text-base text-rose-300">{cleanupStats?.totalStaleCount ?? "..."} phòng</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2 flex-wrap">
              <button
                type="button"
                disabled={cleaningUp}
                onClick={() => handleRunCleanup(false, false)}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs sm:text-sm shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>🧹</span>
                <span>{cleaningUp ? "Đang dọn dẹp..." : "Dọn dẹp phòng cũ & bỏ rơi"}</span>
              </button>
              <button
                type="button"
                disabled={cleaningUp}
                onClick={() => handleRunCleanup(false, true)}
                className="py-3 px-4 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50 text-cyan-200 font-bold text-xs sm:text-sm shadow transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Xóa tất cả các phòng thử nghiệm Sandbox trên máy"
              >
                <span>🧪</span>
                <span>Xóa hết Sandbox</span>
              </button>
              <button
                type="button"
                disabled={cleaningUp}
                onClick={() => handleRunCleanup(true, false)}
                className="py-3 px-4 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-200 font-bold text-xs sm:text-sm shadow transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Xóa tất cả các phòng có trạng thái FINISHED không kể thời gian"
              >
                <span>🗑️</span>
                <span>Xóa hết phòng FINISHED</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <DualTabTransition tabKey={activeTab} className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Đang tải danh sách phòng...</span>
          </div>
        ) : (
          <div className="animate-loaded-reveal space-y-4">
            {displayedRooms.length === 0 ? (
        activeTab === "OFFICIAL" ? (
          <div className="glass rounded-2xl p-12 text-center border border-amber-500/20">
            <div className="flex justify-center mb-3 text-4xl">🏆</div>
            <h3 className="text-xl font-bold mb-2 text-amber-300">Chưa có phòng đấu chính nào</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
              Phòng đấu chính là các trận thi đấu chính thức được quản lý bởi Ban tổ chức. Bấm nút dưới để thiết lập và mở phòng thi đấu mới.
            </p>
            <Link
              href="/admin/rooms/create"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 font-bold transition inline-flex items-center gap-2 shadow-lg text-white"
            >
              <SystemIcon name="create_room" className="w-4 h-4 shrink-0" />
              Tạo phòng đấu chính ngay
            </Link>
          </div>
        ) : activeTab === "SANDBOX" ? (
          <div className="glass rounded-2xl p-12 text-center border border-cyan-500/20">
            <div className="flex justify-center mb-3 text-4xl">🧪</div>
            <h3 className="text-xl font-bold mb-2 text-cyan-300">Không có phòng Sandbox nào</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
              Phòng Sandbox là các phiên thử nghiệm độc lập trên máy của bạn (hoạt động độc lập, không làm ảnh hưởng đến phòng đấu chính).
            </p>
            <Link
              href="/admin/sandbox"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 font-bold transition inline-flex items-center gap-2 shadow-lg text-white"
            >
              <span>🧪</span>
              Mở Sandbox Studio để thử nghiệm
            </Link>
          </div>
        ) : (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="flex justify-center mb-3">
              <SystemIcon name="rooms" className="w-14 h-14 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Chưa có phòng đấu nào</h3>
            <p className="text-muted-foreground mb-6">Bạn chưa tạo phòng thi nào. Bấm nút dưới để tạo phòng đầu tiên.</p>
            <Link
              href="/admin/rooms/create"
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold transition inline-flex items-center gap-2"
            >
              <SystemIcon name="create_room" className="w-4 h-4 shrink-0" />
              Tạo phòng ngay
            </Link>
          </div>
        )
      ) : roomsLayout === "GRID" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
          {displayedRooms.map((room) => {
            const isSb = isSandboxRoom(room);
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
                className={`glass rounded-2xl p-5 border flex flex-col justify-between transition ${
                  isSb
                    ? "border-cyan-500/30 hover:border-cyan-400/60 bg-cyan-950/10"
                    : "border-amber-500/30 hover:border-amber-400/60 bg-amber-950/10 shadow-lg"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${statusColor}`}>
                        {room.status === "FINISHED" ? "Đã kết thúc" : room.status}
                      </span>
                      {isSb ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1">
                          <span>🧪</span>
                          <span>Sandbox Test</span>
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                          <span>🏆</span>
                          <span>Đấu chính</span>
                        </span>
                      )}
                      {Math.floor((Date.now() - new Date(room.createdAt).getTime()) / (3600 * 1000)) >= 24 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold" title="Phòng đã tồn tại hơn 24 giờ">
                          ⚠️ Cũ
                        </span>
                      )}
                    </div>
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
                      className={`flex-1 py-2 rounded-xl font-bold text-xs text-center transition flex items-center justify-center gap-1.5 text-white ${
                        isSb ? "bg-cyan-600 hover:bg-cyan-500" : "bg-purple-600 hover:bg-purple-500"
                      }`}
                    >
                      <SystemIcon name="dashboard" className="w-3.5 h-3.5 shrink-0" /> Điều khiển
                    </Link>
                    <Link
                      href={`/display/${room.code}`}
                      target="_blank"
                      className="px-3 py-2 rounded-xl glass border border-border hover:border-cyan-400 font-bold text-xs text-center transition flex items-center justify-center text-cyan-400"
                      title="Mở màn chiếu"
                    >
                      <SystemIcon name="display" className="w-3.5 h-3.5 shrink-0" />
                    </Link>
                    <Link
                      href={`/play/${room.code}`}
                      target="_blank"
                      className="px-3 py-2 rounded-xl glass border border-border hover:border-purple-400 font-bold text-xs text-center transition flex items-center justify-center text-purple-400"
                      title="Vào giao diện thí sinh"
                    >
                      <SystemIcon name="device" className="w-3.5 h-3.5 shrink-0" />
                    </Link>
                    <button
                      onClick={() => handleDeleteRoom(room)}
                      disabled={deletingId === room.code}
                      className="px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/30 hover:bg-destructive/20 text-destructive font-bold text-xs transition disabled:opacity-50 flex items-center justify-center cursor-pointer"
                      title="Xóa phòng"
                    >
                      {deletingId === room.code ? "..." : <SystemIcon name="trash" className="w-3.5 h-3.5 shrink-0 text-red-400" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2.5 animate-slide-up">
          {displayedRooms.map((room) => {
            const isSb = isSandboxRoom(room);
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
                className={`glass rounded-xl p-4 border flex flex-col md:flex-row md:items-center justify-between gap-3 transition ${
                  isSb
                    ? "border-cyan-500/30 hover:border-cyan-400/60 bg-cyan-950/10"
                    : "border-amber-500/30 hover:border-amber-400/60 bg-amber-950/10"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-base font-black text-cyan-300 tracking-wider bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 shrink-0">
                    {room.code}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-foreground truncate">{room.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${statusColor}`}>
                        {room.status === "FINISHED" ? "Đã kết thúc" : room.status}
                      </span>
                      {isSb ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1">
                          <span>🧪</span>
                          <span>Sandbox Test</span>
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                          <span>🏆</span>
                          <span>Đấu chính</span>
                        </span>
                      )}
                      {Math.floor((Date.now() - new Date(room.createdAt).getTime()) / (3600 * 1000)) >= 24 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold" title="Phòng đã tồn tại hơn 24 giờ">
                          ⚠️ Cũ
                        </span>
                      )}
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
                    className={`px-4 py-2 rounded-xl font-bold text-xs text-center transition inline-flex items-center gap-1.5 text-white ${
                      isSb ? "bg-cyan-600 hover:bg-cyan-500" : "bg-purple-600 hover:bg-purple-500"
                    }`}
                  >
                    <SystemIcon name="dashboard" className="w-3.5 h-3.5 shrink-0" /> Điều khiển
                  </Link>
                  <Link
                    href={`/display/${room.code}`}
                    target="_blank"
                    className="p-2 rounded-xl glass border border-border hover:border-cyan-400 font-bold text-xs transition inline-flex items-center text-cyan-400"
                    title="Mở màn chiếu"
                  >
                    <SystemIcon name="display" className="w-3.5 h-3.5 shrink-0" />
                  </Link>
                  <Link
                    href={`/play/${room.code}`}
                    target="_blank"
                    className="p-2 rounded-xl glass border border-border hover:border-purple-400 font-bold text-xs transition inline-flex items-center text-purple-400"
                    title="Vào giao diện thí sinh"
                  >
                    <SystemIcon name="device" className="w-3.5 h-3.5 shrink-0" />
                  </Link>
                  <button
                    onClick={() => handleDeleteRoom(room)}
                    disabled={deletingId === room.code}
                    className="p-2 rounded-xl bg-destructive/10 border border-destructive/30 hover:bg-destructive/20 text-destructive font-bold text-xs transition disabled:opacity-50 inline-flex items-center cursor-pointer"
                    title="Xóa phòng"
                  >
                    {deletingId === room.code ? "..." : <SystemIcon name="trash" className="w-3.5 h-3.5 shrink-0 text-red-400" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
          </div>
        )}
      </DualTabTransition>
    </div>
  );
}
