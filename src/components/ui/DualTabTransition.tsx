"use client";

import React, { useState, useEffect, useRef } from "react";

interface DualTabTransitionProps {
  tabKey: string | number;
  children: React.ReactNode;
  durationOut?: number; // ms, default 160ms (ẩn cũ)
  className?: string;
}

/**
 * DualTabTransition - Transition kép khi đổi Tab (Ẩn cũ - Hiện mới)
 * 1. Khi tabKey thay đổi: Tab cũ được gắn animate-tab-exit (mờ dần và thu nhỏ nhẹ nhàng) trong durationOut ms.
 * 2. Ngay sau đó: Tab mới xuất hiện với animate-tab-enter (nở nhẹ từ 0.97 lên 1 và hiện rõ).
 * 3. Nếu dữ liệu bên trong cùng một tab cập nhật: Render tức thì, không gián đoạn.
 */
export default function DualTabTransition({
  tabKey,
  children,
  durationOut = 160,
  className = "",
}: DualTabTransitionProps) {
  const [displayedKey, setDisplayedKey] = useState(tabKey);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [isExiting, setIsExiting] = useState(false);
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (tabKey !== displayedKey) {
      // Bắt đầu pha 1: Ẩn tab cũ
      setIsExiting(true);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);

      exitTimeoutRef.current = setTimeout(() => {
        // Bắt đầu pha 2: Chuyển sang tab mới và Hiện mới
        setDisplayedKey(tabKey);
        setDisplayedChildren(children);
        setIsExiting(false);
      }, durationOut);
    } else {
      // Cập nhật nội dung trong cùng tab hiện tại
      setDisplayedChildren(children);
    }

    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, [tabKey, children, displayedKey, durationOut]);

  return (
    <div
      key={String(displayedKey)}
      className={`${className} ${
        isExiting ? "animate-tab-exit" : "animate-tab-enter"
      }`}
    >
      {displayedChildren}
    </div>
  );
}
