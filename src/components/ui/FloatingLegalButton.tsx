"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function FloatingLegalButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"PRIVACY" | "TERMS">("PRIVACY");

  return (
    <>
      {/* Legal Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#12162a]/90 hover:bg-[#1c2242] border border-cyan-500/30 hover:border-cyan-400 text-xs text-slate-300 hover:text-white shadow-xl shadow-black/60 backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
        title="Xem nhanh Chính sách bảo mật & Điều khoản sử dụng"
      >
        <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </span>
        <span className="font-semibold text-[11px] tracking-wide text-slate-300 group-hover:text-cyan-200">
          Pháp lý
        </span>
      </button>

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
            <div className="flex border-b border-slate-800 bg-[#0a0d18] px-4 pt-2 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("PRIVACY")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
                  activeTab === "PRIVACY"
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                🔒 Chính sách bảo mật
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("TERMS")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
                  activeTab === "TERMS"
                    ? "border-purple-400 text-purple-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                📜 Điều khoản sử dụng
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed font-sans custom-scrollbar">
              {activeTab === "PRIVACY" ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-200">
                    <p className="font-semibold mb-1">🛡️ Bảo mật thông tin thí sinh & phòng thi:</p>
                    <p className="text-[11px] text-cyan-300/80">
                      Quizorra cam kết bảo vệ toàn vẹn dữ liệu cá nhân, điểm số và kết quả các vòng thi theo chuẩn bảo mật ứng dụng thi đấu hiện đại.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-[13px] mb-1">1. Dữ liệu thu thập</h4>
                    <p>Hệ thống chỉ lưu trữ tên hiển thị (Nickname), định danh phòng thi và lịch sử điểm số trong phiên đấu trực tiếp để phục vụ tính điểm theo thời gian thực.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-[13px] mb-1">2. Cơ chế lưu trữ Offline Sandbox</h4>
                    <p>Trong chế độ Thử nghiệm Độc lập (Offline Sandbox), 100% dữ liệu bộ đề và lịch sử quay nón được lưu trữ trực tiếp trên thiết bị (Local Storage / IndexedDB), không truyền tải ra ngoài máy tính của bạn.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-[13px] mb-1">3. Mã hóa & Phiên làm việc</h4>
                    <p>Mọi kết nối phòng thi trực tuyến đều được mã hóa bằng TLS/HTTPS và WebSocket bảo mật, chống can thiệp hoặc gian lận điểm số giữa chừng.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-purple-200">
                    <p className="font-semibold mb-1">⚖️ Thỏa thuận sử dụng Quizorra Studio:</p>
                    <p className="text-[11px] text-purple-300/80">
                      Bằng việc tham gia hoặc điều hành phòng thi đấu, người dùng đồng ý tuân thủ các quy tắc công bằng và điều khoản của nền tảng.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-[13px] mb-1">1. Tính công bằng trong thi đấu</h4>
                    <p>Nghiêm cấm các hành vi sử dụng công cụ gian lận tự động (auto-buzz, script can thiệp điểm số). Hệ thống có cơ chế kiểm tra nhịp nhấn chuông và khóa quyền đối với các hành vi bất thường.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-[13px] mb-1">2. Bản quyền nội dung câu đố</h4>
                    <p>Bộ đề do người dùng tự tạo hoặc nhập từ file thuộc quyền sở hữu của người tạo. Quizorra cung cấp công cụ lưu trữ và mô phỏng giao diện trường quay phục vụ giáo dục và giải trí lành mạnh.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-[13px] mb-1">3. Quyền của Quản trò (Host / Admin)</h4>
                    <p>Quản trò có quyền tối cao trong việc bắt đầu trận đấu, sửa điểm số khi có khiếu nại, dừng vòng thi hoặc kích hoạt câu hỏi phụ (Tie-Breaker).</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-[#12162a]/90 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
              <span>Phiên bản 2.5 (Cyber Edition)</span>
              <div className="flex items-center gap-3">
                <Link href="/privacy" className="text-cyan-400 hover:underline" onClick={() => setIsOpen(false)}>
                  Chi tiết bảo mật ↗
                </Link>
                <Link href="/terms" className="text-purple-400 hover:underline" onClick={() => setIsOpen(false)}>
                  Điều khoản đầy đủ ↗
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
