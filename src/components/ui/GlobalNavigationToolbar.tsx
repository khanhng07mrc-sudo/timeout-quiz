"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import FloatingLegalButton from "./FloatingLegalButton";
import GlobalSettingsModal from "./GlobalSettingsModal";

export default function GlobalNavigationToolbar() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInsideIframe, setIsInsideIframe] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsInsideIframe(window.self !== window.top);
    }
  }, []);

  // Tuyệt đối không hiển thị đè trong iframe hoặc các trang có thanh điều khiển chuyên biệt
  // (/admin/sandbox và /display đã có nút Cài đặt & Pháp lý chuyên biệt ở góc dưới bên trái)
  const isSandbox = pathname?.startsWith("/admin/sandbox");
  const isDisplay = pathname?.startsWith("/display");

  if (isInsideIframe || isSandbox || isDisplay) return null;

  return (
    <>
      {/* Top-Right Compact Actions */}
      <div className="fixed top-3 right-4 z-40 print:hidden select-none flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#12162a]/90 hover:bg-[#1c2242] border border-purple-500/30 hover:border-purple-400 text-xs text-slate-300 hover:text-white shadow-xl shadow-black/60 backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          title="Mở Cài đặt hệ thống (Âm thanh, Đồ họa, Ngôn ngữ, F11)"
        >
          <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <svg className="w-2.5 h-2.5 group-hover:rotate-45 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          <span className="font-semibold text-[11px] tracking-wide text-slate-300 group-hover:text-purple-200">
            Cài đặt
          </span>
        </button>

        <FloatingLegalButton />
      </div>

      {/* Global Settings Modal */}
      <GlobalSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
