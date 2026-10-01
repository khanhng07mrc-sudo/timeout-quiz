"use client";

import { useEffect, useState, createContext, useContext } from "react";
import BrandLogo from "@/components/ui/BrandLogo";
import SystemIcon from "@/components/ui/SystemIcon";

interface AdminAuthContextType {
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAuthenticated: false,
  logout: async () => {},
});

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/auth");
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(!!data.authenticated);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Vui lòng nhập mật khẩu quản trị");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.token) {
          localStorage.setItem("admin_token", data.token);
          sessionStorage.setItem("admin_token", data.token);
        }
        setIsAuthenticated(true);
        setPassword("");
      } else {
        setError(data.error || "Mật khẩu không chính xác");
      }
    } catch {
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_token");
    setIsAuthenticated(false);
  };

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c16]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Đang kiểm tra bảo mật...</p>
        </div>
      </div>
    );
  }

  // Locked: Passcode prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#0b0c16] relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[250px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10 animate-slide-up">
          <div className="text-center mb-8 flex flex-col items-center">
            <div className="mb-4">
              <BrandLogo variant="compact" size="lg" subText="SECURITY SHIELD" href="/" />
            </div>
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-3 text-purple-400 shadow-lg glow-purple">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-white">Khu Vực Quản Trị Bảo Mật</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xs">
              Nhập Mật khẩu Quản trị (Admin Master Passcode) để truy cập hệ thống
            </p>
          </div>

          <form onSubmit={handleLogin} className="quiz-card p-6 sm:p-8 space-y-5 border border-purple-500/30 shadow-2xl">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Mật khẩu Quản trị viên
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập Passcode..."
                  className="input-box w-full py-3.5 pl-4 pr-11 text-base font-mono text-white placeholder:text-slate-600 focus:border-purple-400"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 transition"
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold text-center animate-bounce-in">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="btn-gradient w-full py-3.5 text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <span>Đang xác thực...</span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Mở khóa Quản trị</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1.5"
            >
              <SystemIcon name="home" className="w-3.5 h-3.5" />
              <span>Quay lại trang chủ thí sinh</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated: true, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
