"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function FloatingLegalButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"PRIVACY" | "TERMS">("PRIVACY");

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-4 right-4 z-40 print:hidden select-none">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 px-3 py-2 rounded-full bg-[#12162a]/90 hover:bg-[#1c2242] border border-cyan-500/30 hover:border-cyan-400 text-xs text-slate-300 hover:text-white shadow-xl shadow-black/60 backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          title="Xem nhanh Chính sách bảo mật & Điều khoản sử dụng"
        >
          <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </span>
          <span className="hidden sm:inline font-semibold text-[11px] tracking-wide text-slate-300 group-hover:text-cyan-200">
            Pháp lý
          </span>
        </button>
      </div>

      {/* Slide-over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full sm:max-w-md h-full sm:h-[92vh] sm:mr-4 bg-[#0d1020] border-l sm:border border-slate-700/80 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#12162a]/90">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Trung tâm pháp lý</h3>
                  <p className="text-[10px] text-slate-400">Quizorra Intellectual Arena</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 p-1.5 bg-[#151930] border-b border-slate-800 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("PRIVACY")}
                className={`py-2 rounded-xl transition cursor-pointer ${
                  activeTab === "PRIVACY"
                    ? "bg-cyan-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Chính sách bảo mật
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("TERMS")}
                className={`py-2 rounded-xl transition cursor-pointer ${
                  activeTab === "TERMS"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Điều khoản dịch vụ
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-xs text-slate-300 space-y-4 leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
              {activeTab === "PRIVACY" ? (
                <>
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-200">
                    🔒 Cam kết bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP &amp; GDPR. Không thương mại hóa dữ liệu người dùng.
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">1. Dữ liệu thu thập</h4>
                    <p className="text-slate-400">Chỉ thu thập thông tin cơ bản: Tên hiển thị, Email, Mật khẩu đã băm (Bcrypt), và dữ liệu công khai từ Google OAuth (nếu đăng nhập qua Google).</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">2. Mục đích xử lý</h4>
                    <p className="text-slate-400">Xác thực đăng nhập an toàn, lưu trữ câu hỏi cá nhân và đồng bộ điểm số trận đấu theo thời gian thực.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">3. Quyền của người dùng</h4>
                    <p className="text-slate-400">Bạn có toàn quyền truy xuất, sửa đổi, xuất dữ liệu hoặc xóa vĩnh viễn tài khoản cùng ngân hàng câu hỏi bất cứ lúc nào.</p>
                  </div>
                  <div className="pt-2">
                    <Link
                      href="/privacy"
                      onClick={() => setIsOpen(false)}
                      className="inline-block px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition"
                    >
                      Đọc toàn văn Chính sách bảo mật ➔
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200">
                    ⚖️ Thỏa thuận sử dụng và quy chuẩn hành vi công bằng trên đấu trường kiến thức Quizorra.
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">1. Tiêu chuẩn người chơi</h4>
                    <p className="text-slate-400">Chấp thuận các quy định thi đấu, tự chịu trách nhiệm bảo mật tài khoản cá nhân và mật khẩu đăng nhập.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">2. Chống gian lận</h4>
                    <p className="text-slate-400">Nghiêm cấm can thiệp kỹ thuật tự động, bot giả mạo hoặc phá hoại đường truyền WebSocket của hệ thống.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">3. Bản quyền nội dung</h4>
                    <p className="text-slate-400">Quizorra sở hữu bản quyền nền tảng; bạn giữ 100% quyền tác giả đối với nội dung ngân hàng câu hỏi do mình tạo lập.</p>
                  </div>
                  <div className="pt-2">
                    <Link
                      href="/terms"
                      onClick={() => setIsOpen(false)}
                      className="inline-block px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                    >
                      Đọc toàn văn Điều khoản dịch vụ ➔
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-[#0a0d18] text-center text-[11px] text-slate-500 shrink-0">
              © 2026 Quizorra • Hỗ trợ: privacy@quizorra.com
            </div>
          </div>
        </div>
      )}
    </>
  );
}
