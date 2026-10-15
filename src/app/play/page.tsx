"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import SystemIcon from "@/components/ui/SystemIcon";

export default function JoinPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [needsPasscode, setNeedsPasscode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || !name.trim()) {
      setError("Vui lòng nhập đầy đủ mã PIN và tên người chơi");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/rooms/${pin.trim()}/validate`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Mã phòng không tồn tại hoặc cuộc thi đã kết thúc");
        setLoading(false);
        return;
      }

      if (data.requiresPasscode && !passcode.trim()) {
        setNeedsPasscode(true);
        setError("Phòng thi này được bảo vệ bằng mật khẩu. Vui lòng nhập mật khẩu phòng.");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("playerName", name.trim());
      localStorage.setItem("playerName", name.trim());
      if (passcode.trim()) {
        sessionStorage.setItem(`room_passcode_${pin.trim()}`, passcode.trim());
        localStorage.setItem(`room_passcode_${pin.trim()}`, passcode.trim());
      }
      router.push(`/play/${pin.trim()}`);
    } catch {
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại sau.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative">
      {/* Glow background */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="mb-6 text-center flex flex-col items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
          >
            ← Về trang chủ
          </Link>
          <div className="mb-4">
            <BrandLogo variant="compact" size="lg" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white whitespace-nowrap">
            Tham gia phòng thi
          </h1>
          <p className="text-sm text-slate-400 mt-1 whitespace-nowrap">
            Nhập mã PIN 6 số được chiếu trên màn hình
          </p>
        </div>

        <form onSubmit={handleJoin} className="quiz-card p-8 sm:p-10 space-y-5 backdrop-blur-xl border border-[#232845] bg-[#131626]/90 shadow-2xl">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 whitespace-nowrap">
              Mã phòng (PIN)
            </label>
            <input
              type="text"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
              placeholder="123456"
              className="input-box w-full py-4 text-center text-3xl font-mono font-black tracking-widest text-purple-300 placeholder:text-slate-600"
              maxLength={6}
              inputMode="numeric"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 whitespace-nowrap">
              Tên hiển thị của bạn
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value.slice(0, 30));
                setError("");
              }}
              placeholder="VD: Nguyễn Văn A hoặc Tên Đội..."
              className="input-box w-full py-3.5 px-4 text-base"
              maxLength={30}
            />
          </div>

          {/* Optional or Required Room Passcode */}
          {needsPasscode && (
            <div className="animate-fade-in p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>🔐</span>
                <span>Mật khẩu phòng thi (Passcode)</span>
              </label>
              <input
                type="text"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setError("");
                }}
                placeholder="Nhập mật khẩu do Quản trò cung cấp..."
                className="input-box w-full py-3 px-4 text-sm font-mono text-center tracking-wider text-amber-200 border-amber-500/40"
                maxLength={30}
                autoFocus
              />
            </div>
          )}

          {error && (
            <div className="text-rose-400 text-xs text-center bg-rose-950/40 border border-rose-500/30 rounded-xl p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-black text-sm uppercase tracking-wider shadow-lg active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? "Đang xác thực..." : "Vào phòng thi ➔"}</span>
          </button>
        </form>
      </div>
    </main>
  );
}
