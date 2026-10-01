"use client";

import { useEffect, useState } from "react";
import { offlineStorage } from "@/lib/offline-storage";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

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

    const handleOnline = async () => {
      setIsOnline(true);
      setSyncNotice("🟢 Đã khôi phục kết nối mạng! Đang kiểm tra đồng bộ...");
      setIsSyncing(true);
      try {
        const res = await offlineStorage.syncPendingWithServer();
        if (res.synced > 0) {
          setSyncNotice(`✅ Đã tự động đồng bộ ${res.synced} bộ đề lên máy chủ!`);
        } else {
          setSyncNotice(null);
        }
      } catch {
        setSyncNotice(null);
      } finally {
        setIsSyncing(false);
        setTimeout(() => setSyncNotice(null), 5000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncNotice(null);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    setSyncNotice("Đang đồng bộ...");
    try {
      const res = await offlineStorage.syncPendingWithServer();
      if (res.synced > 0) {
        setSyncNotice(`✅ Đã đồng bộ thành công ${res.synced} bộ đề!`);
      } else {
        setSyncNotice("Tất cả bộ đề đã được đồng bộ mới nhất.");
      }
    } catch {
      setSyncNotice("⚠️ Đồng bộ thất bại. Vui lòng thử lại sau.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncNotice(null), 4000);
    }
  };

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

      {syncNotice && (
        <div className="bg-emerald-600/95 text-white px-4 py-2 text-xs sm:text-sm font-bold flex items-center justify-between shadow-lg sticky top-0 z-50 backdrop-blur animate-slide-up">
          <div className="flex items-center gap-2">
            <span>{syncNotice}</span>
          </div>
          {isOnline && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="text-xs px-2.5 py-1 rounded bg-black/20 hover:bg-black/40 text-white font-bold transition disabled:opacity-50"
            >
              {isSyncing ? "Đang đồng bộ..." : "Đồng bộ ngay"}
            </button>
          )}
        </div>
      )}
    </>
  );
}
