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
  allow,
  iframeRef,
  className = "",
}: {
  src: string;
  title?: string;
  allow?: string;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.5);

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
      <div style={{ width: STAGE_W * scale, height: STAGE_H * scale }} className="relative shrink-0 overflow-hidden">
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          allow={allow}
          className="absolute top-0 left-0 border-0 bg-black"
          style={{
            width: STAGE_W,
            height: STAGE_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </div>
  );
});

export default ScaledDisplayFrame;
