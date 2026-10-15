"use client";

import React, { useState, useEffect, useRef } from "react";

interface DualTabTransitionProps {
  tabKey: string | number;
  children: React.ReactNode;
  durationOut?: number; // ms, default 120ms (snappy exit)
  className?: string;
}

/**
 * DualTabTransition - Transition kép khi đổi Tab (Ẩn cũ - Hiện mới)
 * 1. Khi tabKey thay đổi: Tab cũ được gắn animate-tab-exit (mờ dần và thu nhỏ nhẹ nhàng) trong durationOut ms.
 * 2. Ngay sau đó: Tab mới xuất hiện với animate-tab-enter (nở nhẹ từ 0.97 lên 1 và hiện rõ).
 * 3. Nếu dữ liệu bên trong cùng một tab cập nhật (timer ticks, score deltas): Render tức thì, không gián đoạn và không reset timeout.
 */
export default function DualTabTransition({
  tabKey,
  children,
  durationOut = 120,
  className = "",
}: DualTabTransitionProps) {
  const [displayedKey, setDisplayedKey] = useState(tabKey);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [isExiting, setIsExiting] = useState(false);
  const targetKeyRef = useRef(tabKey);
  const latestChildrenRef = useRef(children);
  latestChildrenRef.current = children;
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Chỉ trigger transition khi tabKey thực sự thay đổi
  useEffect(() => {
    targetKeyRef.current = tabKey;
    if (tabKey !== displayedKey) {
      setIsExiting(true);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);

      exitTimeoutRef.current = setTimeout(() => {
        setDisplayedKey(targetKeyRef.current);
        setDisplayedChildren(latestChildrenRef.current);
        setIsExiting(false);
      }, durationOut);
    } else {
      setDisplayedChildren(children);
    }

    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, [tabKey, displayedKey, durationOut]);

  // Luôn cập nhật displayedChildren khi đang hiển thị tab hiện tại (không trong trạng thái thoát)
  useEffect(() => {
    if (tabKey === displayedKey && !isExiting) {
      setDisplayedChildren(children);
    }
  }, [children, tabKey, displayedKey, isExiting]);

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
