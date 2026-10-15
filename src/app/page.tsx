"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import SystemIcon from "@/components/ui/SystemIcon";

export default function HomePage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleQuickJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || !name.trim()) {
      setError("Vui lòng nhập đầy đủ mã PIN và tên người chơi");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/rooms/${pin.trim()}/validate`);
      if (!res.ok) {
        setError("Mã phòng không tồn tại hoặc cuộc thi đã kết thúc");
        setLoading(false);
        return;
      }
      sessionStorage.setItem("playerName", name.trim());
      localStorage.setItem("playerName", name.trim());
      router.push(`/play/${pin.trim()}`);
    } catch {
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại sau.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-16 relative overflow-hidden">
      {/* Dynamic Arena Volumetric Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/3 w-[500px] h-[300px] bg-cyan-500/15 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col items-center text-center">
        {/* Esports Arena Top Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/15 border border-purple-400/40 text-purple-300 text-xs font-black tracking-wider uppercase mb-5 shadow-lg shadow-purple-900/30 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>REALTIME MULTIPLAYER ARENA · ĐẤU TRƯỜNG TƯƠNG LAI</span>
        </div>

        {/* Brand Logo with 3D Specular Glow */}
        <div className="mb-4 hover:scale-105 transition-transform duration-300 cursor-pointer drop-shadow-[0_0_35px_rgba(168,85,247,0.35)]">
          <BrandLogo variant="full" size="xl" subText="Tactical Game Show Engine" />
        </div>

        {/* Dynamic Tagline */}
        <p className="text-sm sm:text-base md:text-lg text-slate-300 font-medium max-w-3xl mb-10 leading-relaxed text-balance">
          <span className="text-white font-bold">Nền tảng thi đấu câu hỏi realtime</span>
          <span className="hidden sm:inline mx-3 text-cyan-400 font-bold">/</span>
          <span className="text-purple-300 font-bold">10 thẻ bài chiến thuật</span>
          <span className="hidden sm:inline mx-3 text-cyan-400 font-bold">/</span>
          <span className="text-cyan-300 font-bold">9 chế độ tranh tài đỉnh cao</span>
        </p>

        {/* ── 3 CỔNG DỊCH CHUYỂN PHÂN CẤP THỊ GIÁC (HERO PORTAL DOCK) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-5xl mb-16 items-stretch">
          {/* CỔNG 1: VÀO THI ĐẤU (THÍ SINH) - HERO CARD (7 CỘT ~ 60%) NỔI BẬT NHẤT */}
          <div className="lg:col-span-7 portal-gate-3d portal-gate-purple flex flex-col justify-between text-left p-6 sm:p-7 relative overflow-hidden ring-2 ring-purple-500/50 shadow-2xl shadow-purple-950/60 bg-gradient-to-br from-[#1c183b] via-[#121428] to-[#0b0c18]">
            {/* Top decorative glow */}
            <div className="absolute top-0 right-0 w-56 h-56 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" />

            <div>
              <div className="w-full flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/35 to-indigo-600/35 border-2 border-purple-400/50 flex items-center justify-center text-white shadow-xl shadow-purple-950/60">
                    <SystemIcon name="device" className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300 block mb-0.5">
                      CỔNG CHÍNH DÀNH CHO NGƯỜI CHƠI
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white">
                      Vào thi đấu
                    </h2>
                  </div>
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md border border-purple-300/40 shrink-0">
                  Phổ biến nhất ✨
                </span>
              </div>

              <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed mb-5">
                Nhập mã PIN 6 số và tên hiển thị để tham gia phòng thi tức thì, sử dụng thẻ bài chiến thuật và bấm Buzz độc quyền ngay trên điện thoại!
              </p>

              {/* Inline Quick PIN Entry Form */}
              <form onSubmit={handleQuickJoin} className="p-3.5 sm:p-4 rounded-2xl bg-black/40 border border-purple-500/30 backdrop-blur-md space-y-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                      Mã phòng (PIN)
                    </label>
                    <input
                      type="text"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      className="input-box w-full py-2.5 px-3 text-center text-xl sm:text-2xl font-mono font-black tracking-widest text-purple-300 placeholder:text-slate-600"
                      maxLength={6}
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                      Tên của bạn
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value.slice(0, 30))}
                      placeholder="VD: Nguyễn Văn A"
                      className="input-box w-full py-2.5 px-3 text-sm font-semibold"
                      maxLength={30}
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-rose-400 text-xs font-semibold text-center bg-rose-950/40 border border-rose-500/30 rounded-xl p-2">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-purple-900/40 border border-white/20 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <span>{loading ? "Đang kết nối..." : "🚀 Vào phòng thi ngay"}</span>
                </button>
              </form>
            </div>

            <div className="pt-2 border-t border-purple-400/20 flex items-center justify-between text-xs font-bold text-purple-300">
              <Link href="/play" className="hover:text-white transition-colors flex items-center gap-1.5">
                <span>Hoặc mở cổng riêng Thí sinh (/play)</span>
                <span>➔</span>
              </Link>
              <span className="text-[11px] text-slate-400">Hỗ trợ Mobile, Tablet &amp; PC</span>
            </div>
          </div>

          {/* NHÓM 2 CỔNG PHỤ DÀNH CHO BAN TỔ CHỨC (5 CỘT ~ 40%) */}
          <div className="lg:col-span-5 flex flex-col gap-5 justify-between">
            {/* Cổng 2: Màn hình chiếu */}
            <Link
              href="/display"
              className="portal-gate-3d portal-gate-cyan group text-left flex-1 p-5 flex flex-col justify-between"
            >
              <div>
                <div className="w-full flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/25 border border-cyan-300/40 flex items-center justify-center text-cyan-200 shadow-lg group-hover:scale-110 transition-transform">
                    <SystemIcon name="display" className="w-6 h-6 text-cyan-200" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-cyan-500/30 text-cyan-200 border border-cyan-400/30">
                    Hội trường
                  </span>
                </div>
                <div className="text-xl font-black text-white group-hover:text-cyan-200 transition-colors mb-1">
                  Màn hình chiếu
                </div>
                <p className="text-xs text-cyan-200/80 leading-snug">
                  Chế độ TV / Máy chiếu độ nét cao, phát đề, đồng hồ đếm ngược và bảng xếp hạng sống động
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-cyan-400/20 flex items-center justify-between text-xs font-black text-cyan-300 group-hover:text-white">
                <span>Mở cổng màn chiếu</span>
                <span className="group-hover:translate-x-1 transition-transform">➔</span>
              </div>
            </Link>

            {/* Cổng 3: Đài chỉ huy Quản trị */}
            <Link
              href="/admin"
              className="portal-gate-3d portal-gate-slate group text-left flex-1 p-5 flex flex-col justify-between"
            >
              <div>
                <div className="w-full flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-700/40 border border-slate-500/40 flex items-center justify-center text-purple-400 shadow-lg group-hover:scale-110 transition-transform">
                    <SystemIcon name="dashboard" className="w-6 h-6 text-purple-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/10 text-slate-300 border border-white/15">
                    Ban tổ chức
                  </span>
                </div>
                <div className="text-xl font-black text-white group-hover:text-purple-300 transition-colors mb-1">
                  Đài chỉ huy (Admin)
                </div>
                <p className="text-xs text-slate-300/80 leading-snug">
                  Tạo phòng thi, cấp thẻ chiến thuật, điều hành trận đấu hoặc kiểm thử solo tại Sandbox
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-600/30 flex items-center justify-between text-xs font-black text-slate-300 group-hover:text-white">
                <span>Quản trị &amp; Điều hành</span>
                <span className="group-hover:translate-x-1 transition-transform">➔</span>
              </div>
            </Link>
          </div>
        </div>

        {/* ── 5 MODULE VÒM CHIẾN HẠM (SCI-FI COCKPIT HUD PANELS) ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
          <div className="cockpit-panel-card text-center flex flex-col items-center justify-between group">
            <div className="flex flex-col items-center w-full">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400 mb-3 shadow-md group-hover:scale-110 group-hover:border-purple-300/60 transition-all duration-200 shrink-0">
                <SystemIcon name="sandbox" className="w-6 h-6" />
              </div>
              <div className="font-bold text-sm sm:text-base text-white mb-2 whitespace-nowrap tracking-tight group-hover:text-purple-300 transition-colors">
                Thẻ chiến thuật
              </div>
            </div>
            <div className="text-xs text-slate-400 leading-snug">
              10 loại thẻ độc quyền cướp điểm, phong tỏa, nhân đôi và khiên bảo vệ
            </div>
          </div>

          <div className="cockpit-panel-card text-center flex flex-col items-center justify-between group">
            <div className="flex flex-col items-center w-full">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 mb-3 shadow-md group-hover:scale-110 group-hover:border-cyan-300/60 transition-all duration-200 shrink-0">
                <SystemIcon name="device" className="w-6 h-6" />
              </div>
              <div className="font-bold text-sm sm:text-base text-white mb-2 whitespace-nowrap tracking-tight group-hover:text-cyan-300 transition-colors">
                Realtime Sync
              </div>
            </div>
            <div className="text-xs text-slate-400 leading-snug">
              Đồng bộ dữ liệu tức thời qua WebSocket, độ trễ cực thấp dưới 15ms
            </div>
          </div>

          <div className="cockpit-panel-card text-center flex flex-col items-center justify-between group border-cyan-500/40">
            <div className="flex flex-col items-center w-full">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/25 border border-cyan-400/60 flex items-center justify-center text-cyan-300 mb-3 shadow-md group-hover:scale-110 group-hover:border-cyan-200 transition-all duration-200 shrink-0">
                <SystemIcon name="display" className="w-6 h-6" />
              </div>
              <div className="font-bold text-sm sm:text-base text-cyan-300 mb-2 whitespace-nowrap tracking-tight group-hover:text-white transition-colors">
                Màn hình chiếu
              </div>
            </div>
            <div className="text-xs text-slate-300 leading-snug">
              Tối ưu hội trường, hiển thị câu hỏi và bảng xếp hạng sống động
            </div>
          </div>

          <div className="cockpit-panel-card text-center flex flex-col items-center justify-between group">
            <div className="flex flex-col items-center w-full">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 mb-3 shadow-md group-hover:scale-110 group-hover:border-indigo-300/60 transition-all duration-200 shrink-0">
                <SystemIcon name="team" className="w-6 h-6" />
              </div>
              <div className="font-bold text-sm sm:text-base text-white mb-2 whitespace-nowrap tracking-tight group-hover:text-indigo-300 transition-colors">
                Đội ngũ linh hoạt
              </div>
            </div>
            <div className="text-xs text-slate-400 leading-snug">
              Thi đấu cá nhân hoặc chia đội linh hoạt, hỗ trợ không giới hạn thí sinh
            </div>
          </div>

          <div className="cockpit-panel-card text-center flex flex-col items-center justify-between group col-span-2 md:col-span-1">
            <div className="flex flex-col items-center w-full">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 mb-3 shadow-md group-hover:scale-110 group-hover:border-amber-300/60 transition-all duration-200 shrink-0">
                <SystemIcon name="trophy" className="w-6 h-6" />
              </div>
              <div className="font-bold text-sm sm:text-base text-white mb-2 whitespace-nowrap tracking-tight group-hover:text-amber-300 transition-colors">
                9 chế độ chơi
              </div>
            </div>
            <div className="text-xs text-slate-400 leading-snug">
              Classic, Buzz bấm chuông, Bounceback cướp lượt, Caro 4x4, Đua cờ xí ngầu
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
