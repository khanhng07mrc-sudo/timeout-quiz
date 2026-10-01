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
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Tham gia phòng thi
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Nhập mã PIN 6 số được chiếu trên màn hình
          </p>
        </div>

        <form onSubmit={handleJoin} className="quiz-card p-8 sm:p-10 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Mã phòng (PIN)
            </label>
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="input-box w-full py-4 text-center text-3xl font-mono font-black tracking-widest text-purple-300 placeholder:text-slate-600"
              maxLength={6}
              inputMode="numeric"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Tên hiển thị của bạn
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 30))}
              placeholder="VD: Nguyễn Văn A hoặc Tên Đội..."
              className="input-box w-full py-3.5 px-4 text-base"
              maxLength={30}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-950/40 border border-red-500/30 rounded-xl p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || pin.length !== 6 || !name.trim()}
            className="btn-gradient w-full py-4 text-lg flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <span>Đang kết nối...</span>
            ) : (
              <>
                <SystemIcon name="device" className="w-5 h-5 shrink-0 text-white" />
                <span>Vào phòng ngay</span>
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
