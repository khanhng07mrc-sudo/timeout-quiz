"use client";

import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // 1. Register Service Worker for offline PWA
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          console.log("[PWA] Service Worker registered successfully");
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });
    }

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
      {!isOnline && (
        <div className="bg-amber-600/90 text-black px-4 py-2 text-xs sm:text-sm font-bold flex items-center justify-between shadow-lg sticky top-0 z-50 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-base animate-pulse">⚡</span>
            <span>
              <strong>Chế độ Ngoại tuyến (Offline):</strong> Bạn đang mất kết nối Internet. Sandbox và Tạo bộ đề vẫn hoạt động bình thường trên máy!
            </span>
          </div>
          <span className="text-[11px] bg-black/20 text-black px-2 py-0.5 rounded-full shrink-0 hidden sm:inline-block font-mono">
            PWA Offline Ready
          </span>
        </div>
      )}
    </>
  );
}
