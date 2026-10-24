"use client";

import { useEffect, useState, createContext, useContext } from "react";
import BrandLogo from "@/components/ui/BrandLogo";
import SystemIcon from "@/components/ui/SystemIcon";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  image?: string;
}

interface AdminAuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAuthenticated: false,
  user: null,
  logout: async () => {},
  refreshUser: async () => {},
});

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Auth form state
  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER" | "MASTER_KEY">("LOGIN");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [socialNotice, setSocialNotice] = useState<string | null>(null);

  // Terms and conditions consent
  const [termsScrolledToBottom, setTermsScrolledToBottom] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setIsAuthenticated(true);
          setUser(data.user);
          return;
        }
      }
      setIsAuthenticated(false);
      setUser(null);
    } catch {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Vui lòng nhập mật khẩu");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const isMasterAttempt = !email.trim();
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          isMasterKey: isMasterAttempt,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.token) {
          localStorage.setItem("admin_token", data.token);
          sessionStorage.setItem("admin_token", data.token);
        }
        setUser(data.user);
        setIsAuthenticated(true);
        setPassword("");
      } else {
        setError(data.error || (isMasterAttempt ? "Mật khẩu Quản trị không chính xác" : "Email hoặc mật khẩu không chính xác"));
      }
    } catch {
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập Tên hiển thị");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Vui lòng nhập địa chỉ Email hợp lệ");
      return;
    }
    if (!password || password.length < 6) {
      setError("Mật khẩu phải có độ dài tối thiểu 6 ký tự");
      return;
    }
    if (!termsAccepted) {
      setError("Vui lòng cuộn xuống hết nội dung và tích chọn đồng ý Điều khoản & Chính sách");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, termsAccepted: true }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.token) {
          localStorage.setItem("admin_token", data.token);
          sessionStorage.setItem("admin_token", data.token);
        }
        setUser(data.user);
        setIsAuthenticated(true);
        setPassword("");
      } else {
        setError(data.error || "Không thể tạo tài khoản. Vui lòng kiểm tra lại thông tin.");
      }
    } catch {
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const handleMasterKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Vui lòng nhập Master Passcode");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim(), isMasterKey: true }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.token) {
          localStorage.setItem("admin_token", data.token);
          sessionStorage.setItem("admin_token", data.token);
        }
        setUser(data.user);
        setIsAuthenticated(true);
        setPassword("");
      } else {
        setError(data.error || "Master Passcode không chính xác");
      }
    } catch {
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialClick = (provider: "Google" | "Facebook") => {
    if (provider === "Google") {
      window.location.href = "/api/auth/oauth/google";
      return;
    }
    setSocialNotice(
      `Hệ thống OAuth cho ${provider} đang được chuẩn bị. Bạn có thể đăng ký tài khoản cá nhân bằng Email/Mật khẩu ngay bên dưới để sử dụng đầy đủ 100% tính năng!`
    );
    setTimeout(() => setSocialNotice(null), 7000);
  };

  const fillDemoAccount = () => {
    setEmail("demo.host@quizorra.com");
    setPassword("DemoHost@2026");
    setName("Chủ Phòng Trải Nghiệm");
    setError("");
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_token");
    setIsAuthenticated(false);
    setUser(null);
  };

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c16]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Đang kiểm tra phiên Quizorra...</p>
        </div>
      </div>
    );
  }

  // Not Authenticated: Beautiful Modal
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#0b0c16] relative overflow-hidden">
        {/* Subtle Ambient Lighting (Non-glare) */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[250px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10 animate-slide-up">
          {/* Brand Header */}
          <div className="text-center mb-6 flex flex-col items-center">
            <div className="mb-3">
              <BrandLogo variant="full" size="lg" subText="INTELLECTUAL ARENA" href="/" />
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mt-1">
              Đăng nhập hoặc tạo tài khoản để quản lý ngân hàng câu hỏi và tổ chức các trận đấu kịch tính
            </p>
          </div>

          <div className="quiz-card p-6 sm:p-8 space-y-5 border border-purple-500/30 shadow-2xl bg-[#121424]/95 backdrop-blur-md rounded-3xl">
            {/* Mode Switch Tabs (Login / Register) */}
            {authMode !== "MASTER_KEY" && (
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#1c203b] border border-[#2b315b]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("LOGIN");
                    setError("");
                  }}
                  className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                    authMode === "LOGIN"
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("REGISTER");
                    setError("");
                  }}
                  className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                    authMode === "REGISTER"
                      ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Tạo tài khoản mới
                </button>
              </div>
            )}

            {/* Social Logins */}
            {authMode !== "MASTER_KEY" && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSocialClick("Google")}
                    className="py-2.5 px-3 rounded-xl border border-[#2d335c] bg-[#171a30] hover:bg-[#1e2240] text-white text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 shadow-sm"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSocialClick("Facebook")}
                    className="py-2.5 px-3 rounded-xl border border-[#2d335c] bg-[#171a30] hover:bg-[#1e2240] text-white text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 shadow-sm"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="#1877F2" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span>Facebook</span>
                  </button>
                </div>

                {socialNotice && (
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs text-center animate-slide-up">
                    💡 {socialNotice}
                  </div>
                )}

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-[#292e54]" />
                  <span className="flex-shrink mx-3 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                    Hoặc dùng Email
                  </span>
                  <div className="flex-grow border-t border-[#292e54]" />
                </div>
              </div>
            )}

            {/* Form: LOGIN */}
            {authMode === "LOGIN" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Địa chỉ Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="input-box w-full py-3 px-4 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Mật khẩu
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      {showPassword ? "Ẩn" : "Hiện"}
                    </button>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="input-box w-full py-3 px-4 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400"
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold text-center animate-bounce-in">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gradient w-full py-3.5 text-sm sm:text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span>Đang kiểm tra...</span>
                  ) : (
                    <span>Đăng nhập vào Quizorra</span>
                  )}
                </button>
              </form>
            )}

            {/* Form: REGISTER */}
            {authMode === "REGISTER" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Họ và Tên (Tên hiển thị)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="input-box w-full py-3 px-4 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Địa chỉ Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="input-box w-full py-3 px-4 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Mật khẩu cá nhân (Tối thiểu 6 ký tự)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      {showPassword ? "Ẩn" : "Hiện"}
                    </button>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tạo mật khẩu an toàn..."
                    className="input-box w-full py-3 px-4 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400"
                    required
                    minLength={6}
                  />
                </div>

                {/* Must-Scroll Terms Viewport */}
                <div className="space-y-2 pt-1 text-left">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-300 uppercase tracking-wider">
                      Điều khoản &amp; Chính sách
                    </span>
                    <span className={`font-semibold ${termsScrolledToBottom ? "text-emerald-400" : "text-amber-400"}`}>
                      {termsScrolledToBottom ? "✓ Đã đọc hết văn bản" : "↓ Cuộn xuống đáy để mở khóa"}
                    </span>
                  </div>

                  <div
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      if (el.scrollHeight - el.scrollTop <= el.clientHeight + 8) {
                        setTermsScrolledToBottom(true);
                      }
                    }}
                    className="h-28 overflow-y-auto p-3 rounded-xl bg-black/40 border border-slate-700/80 text-[11px] text-slate-400 leading-relaxed space-y-2 select-none scrollbar-thin scrollbar-thumb-slate-700"
                  >
                    <p className="font-bold text-slate-200">1. Quy định chung &amp; Chấp thuận:</p>
                    <p>
                      Bằng việc tạo tài khoản trên Quizorra, bạn đồng ý tuân thủ toàn bộ Điều khoản dịch vụ và Chính sách bảo mật quyền riêng tư của nền tảng theo Nghị định 13/2023/NĐ-CP và các tiêu chuẩn bảo mật hiện hành.
                    </p>
                    <p className="font-bold text-slate-200">2. Quyền sở hữu &amp; Bảo vệ dữ liệu:</p>
                    <p>
                      Quizorra cam kết bảo mật thông tin cá nhân và KHÔNG BAO GIỜ thương mại hóa hoặc chia sẻ dữ liệu của bạn cho bất kỳ bên thứ ba nào. Bạn giữ toàn bộ quyền sở hữu trí tuệ đối với ngân hàng câu hỏi do mình tạo lập.
                    </p>
                    <p className="font-bold text-slate-200">3. Quy chuẩn chống gian lận:</p>
                    <p>
                      Nghiêm cấm can thiệp kỹ thuật tự động, bot giả mạo, tấn công mạng hoặc truyền tải nội dung vi phạm pháp luật. Mọi hành vi vi phạm sẽ bị khóa tài khoản vĩnh viễn.
                    </p>
                    <p className="font-bold text-slate-200">4. Xem chi tiết toàn văn bản:</p>
                    <p>
                      Bạn có thể đọc toàn văn tại{" "}
                      <a href="/terms" target="_blank" className="text-cyan-400 underline hover:text-cyan-300">Điều khoản dịch vụ</a>
                      {" "}và{" "}
                      <a href="/privacy" target="_blank" className="text-cyan-400 underline hover:text-cyan-300">Chính sách bảo mật</a>.
                    </p>
                    <p className="text-center font-bold text-emerald-400 pt-1 pb-0.5">
                      --- Hết văn bản tóm tắt ---
                    </p>
                  </div>

                  {/* Checkbox */}
                  <label className={`flex items-start gap-2.5 pt-1 text-xs select-none ${termsScrolledToBottom ? "cursor-pointer text-slate-200" : "cursor-not-allowed opacity-50 text-slate-500"}`}>
                    <input
                      type="checkbox"
                      disabled={!termsScrolledToBottom}
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-400 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span>
                      Tôi đã đọc toàn bộ và đồng ý với{" "}
                      <a href="/terms" target="_blank" className="text-cyan-400 underline hover:text-cyan-300">Điều khoản dịch vụ</a>
                      {" "}và{" "}
                      <a href="/privacy" target="_blank" className="text-cyan-400 underline hover:text-cyan-300">Chính sách bảo mật</a>
                    </span>
                  </label>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold text-center animate-bounce-in">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !termsAccepted}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white text-sm sm:text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                >
                  {loading ? (
                    <span>Đang tạo tài khoản...</span>
                  ) : (
                    <span>Tạo tài khoản Quizorra</span>
                  )}
                </button>
              </form>
            )}

            {/* Form: MASTER KEY (Bypass) */}
            {authMode === "MASTER_KEY" && (
              <form onSubmit={handleMasterKeyLogin} className="space-y-4 animate-slide-up">
                <div className="text-center p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                  🔐 <strong>Chế độ Super Admin</strong>: Dành cho quản trị viên tối cao sử dụng Master Passcode khẩn cấp.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Master Passcode Hệ Thống
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập Master Key..."
                    className="input-box w-full py-3 px-4 text-sm font-mono text-white placeholder:text-slate-600 focus:border-amber-400"
                    required
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold text-center animate-bounce-in">
                    ⚠️ {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("LOGIN");
                      setError("");
                    }}
                    className="w-1/3 py-3 rounded-xl border border-[#2d335c] text-slate-400 hover:text-white text-xs font-bold"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 disabled:opacity-50"
                  >
                    {loading ? "Đang xác thực..." : "Mở khóa Super Admin"}
                  </button>
                </div>
              </form>
            )}

            {/* Secondary links */}
            <div className="pt-2 border-t border-[#222642] flex items-center justify-between text-xs text-slate-400">
              {authMode !== "MASTER_KEY" ? (
                <>
                  <button
                    type="button"
                    onClick={fillDemoAccount}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    Điền tài khoản mẫu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("MASTER_KEY");
                      setError("");
                    }}
                    className="text-slate-500 hover:text-amber-400 transition"
                  >
                    🔑 Dùng Master Key
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <div className="mt-6 text-center space-y-2">
            <div>
              <a
                href="/"
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1.5"
              >
                <SystemIcon name="home" className="w-3.5 h-3.5" />
                <span>Quay lại trang chủ người chơi</span>
              </a>
            </div>
            <div className="flex items-center justify-center gap-3 text-[11px] text-slate-600">
              <a href="/terms" target="_blank" className="hover:text-slate-400 transition">Điều khoản dịch vụ</a>
              <span>•</span>
              <a href="/privacy" target="_blank" className="hover:text-slate-400 transition">Chính sách bảo mật</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated: true, user, logout, refreshUser: checkAuth }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
