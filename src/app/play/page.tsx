"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function JoinPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || !name.trim()) {
      setError("Vui lòng nhập đầy đủ mã phòng và tên");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/rooms/${pin.trim()}/validate`);
      if (!res.ok) {
        setError("Mã phòng không tồn tại hoặc phòng đã kết thúc");
        setLoading(false);
        return;
      }
      // Store name in session storage
      sessionStorage.setItem("playerName", name.trim());
      router.push(`/play/${pin.trim()}`);
    } catch {
      setError("Lỗi kết nối. Thử lại sau.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
            ← Về trang chủ
          </Link>
          <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Tham gia phòng
          </h1>
        </div>

        <form onSubmit={handleJoin} className="glass rounded-2xl p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Mã phòng (PIN)</label>
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="w-full px-4 py-3 rounded-xl bg-input border border-border text-center text-2xl font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={6}
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tên của bạn</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 30))}
              placeholder="Nhập tên hiển thị..."
              className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={30}
            />
          </div>

          {error && (
            <div className="text-destructive text-sm text-center bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || pin.length !== 6 || !name.trim()}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang kết nối..." : "🎮 Vào phòng"}
          </button>
        </form>
      </div>
    </main>
  );
}
