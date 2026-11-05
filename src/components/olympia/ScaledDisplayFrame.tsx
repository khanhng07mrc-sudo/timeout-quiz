"use client";

import React, { useEffect, useRef, useState } from "react";

const STAGE_W = 1920;
const STAGE_H = 1080;

/**
 * Nhúng màn hình chiếu Olympia ở khung chuẩn Full HD 1920×1080 (16:9) rồi tự thu/phóng vừa khít khung chứa
 * (letterbox) — tránh việc iframe nhỏ bị nén/méo bố cục và sai breakpoint responsive.
 */
export const ScaledDisplayFrame = React.memo(function ScaledDisplayFrame({
  src,
  title = "Display Viewport",
  allow = "autoplay *; fullscreen *; camera; microphone; display-capture",
  iframeRef,
  className = "",
  onLoad,
  isSandbox = false,
}: {
  src: string;
  title?: string;
  allow?: string;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  className?: string;
  onLoad?: () => void;
  isSandbox?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.5);

  const effectiveSrc = React.useMemo(() => {
    if (!isSandbox) return src;
    if (src.includes("perf=light") || src.includes("sandbox=1")) return src;
    const sep = src.includes("?") ? "&" : "?";
    return `${src}${sep}sandbox=1&perf=light`;
  }, [src, isSandbox]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) return;
      setScale(Math.min(w / STAGE_W, h / STAGE_H));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      ref={boxRef}
      className={`relative w-full h-full overflow-hidden bg-black flex items-center justify-center ${className}`}
    >
      <div
        style={{ width: STAGE_W * scale, height: STAGE_H * scale, willChange: "transform" }}
        className="relative shrink-0 overflow-hidden"
      >
        <iframe
          ref={iframeRef}
          src={effectiveSrc}
          title={title}
          allow={allow}
          onLoad={onLoad}
          className="absolute top-0 left-0 border-0 bg-black"
          style={{
            width: STAGE_W,
            height: STAGE_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            willChange: "transform",
          }}
        />
      </div>
    </div>
  );
});

export default ScaledDisplayFrame;
