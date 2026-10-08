"use client";

import React, { useState, useEffect } from "react";

interface SmoothLoadedProps {
  isLoading: boolean;
  loader?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  zoom?: boolean; // if true, uses animate-loaded-zoom instead of animate-loaded-reveal
}

/**
 * SmoothLoaded - Tự động kích hoạt hiệu ứng fade và micro-zoom mượt mà ngay sau khi loading hoàn tất.
 * Giúp loại bỏ hoàn toàn hiện tượng giao diện bị "bật bụp" hoặc giật cục khi dữ liệu vừa tải xong.
 */
export default function SmoothLoaded({
  isLoading,
  loader,
  children,
  className = "",
  zoom = false,
}: SmoothLoadedProps) {
  const [hasLoadedOnce, setHasLoadedOnce] = useState(!isLoading);

  useEffect(() => {
    if (!isLoading && !hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
  }, [isLoading, hasLoadedOnce]);

  if (isLoading) {
    return loader ? <>{loader}</> : null;
  }

  const animationClass = zoom ? "animate-loaded-zoom" : "animate-loaded-reveal";

  return (
    <div className={`${animationClass} ${className}`}>
      {children}
    </div>
  );
}
