"use client";

import React, { useId, useLayoutEffect, useRef, useState } from "react";
import { toPoly, toSvgPath, type ArrowShell } from "./v3Geometry";

/**
 * Renders a design-pixel stage scaled uniformly to its container width.
 * Everything inside is laid out in the shell's own pixel space, so geometry never
 * gets stretched (no preserveAspectRatio="none").
 */
export function V3ScaledStage({
  designW,
  designH,
  maxScale = 1.15,
  className = "",
  children,
}: {
  designW: number;
  designH: number;
  maxScale?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / designW);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [designW]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: designW * maxScale,
        height: designH * scale,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: designW,
          height: designH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export const V3_COLORS = {
  navy: "#0a2358",
  navyDeep: "#071b47",
  line: "#d1d5db",
  cyanA: "#1ab0ff",
  cyanB: "#0a84ff",
};

/**
 * ECONOVA 2.0s master timeline (hexagon expands from the centre while the navy chevrons
 * and cyan wings glide out to the edges, content fades in last).
 */
const SHELL_CSS = `
@keyframes v3a-wing-l {
  0%   { transform: translateX(var(--v3a-dc)); opacity: 0; }
  14%  { opacity: 1; }
  45%  { transform: translateX(var(--v3a-dc)); opacity: 1; }
  100% { transform: translateX(0); opacity: 1; }
}
@keyframes v3a-wing-r {
  0%   { transform: translateX(calc(var(--v3a-dc) * -1)); opacity: 0; }
  14%  { opacity: 1; }
  45%  { transform: translateX(calc(var(--v3a-dc) * -1)); opacity: 1; }
  100% { transform: translateX(0); opacity: 1; }
}
@keyframes v3a-body {
  0%, 44%  { clip-path: inset(0 calc(50% - 45px) 0 calc(50% - 45px)); opacity: 0; }
  45%      { clip-path: inset(0 calc(50% - 45px) 0 calc(50% - 45px)); opacity: 1; }
  100%     { clip-path: inset(0 0 0 0); opacity: 1; }
}
@keyframes v3a-content {
  0%, 65% { opacity: 0; }
  100%    { opacity: 1; }
}
@keyframes v3a-swap {
  0%   { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}
.v3a-run .v3a-l { animation: v3a-wing-l 2s forwards cubic-bezier(0.4, 0, 0.2, 1); }
.v3a-run .v3a-r { animation: v3a-wing-r 2s forwards cubic-bezier(0.4, 0, 0.2, 1); }
.v3a-run .v3a-body { animation: v3a-body 2s forwards cubic-bezier(0.4, 0, 0.2, 1); }
.v3a-run .v3a-content { animation: v3a-content 2s forwards; }
.v3a-swap { animation: v3a-swap 0.45s ease-out both; }
@keyframes v3a-buzz {
  from { filter: brightness(1) drop-shadow(0 0 3px rgba(255,40,40,0.7)); }
  to   { filter: brightness(1.28) drop-shadow(0 0 12px rgba(255,60,60,1)); }
}
.v3a-buzz { animation: v3a-buzz 0.3s infinite alternate; }
`;

export interface V3ArrowShellProps {
  shell: ArrowShell;
  /** Play the 2.0s Econova entrance timeline. */
  animate?: boolean;
  /** SVG nodes drawn inside the hexagon (cells, tabs, bands, dividers). */
  bodySvg?: React.ReactNode;
  /** Gradient used to fill the hexagon (left → right). */
  bodyStops?: [string, string, string];
  /** HTML overlay in shell pixel coordinates. Clipped to the hexagon. */
  children?: React.ReactNode;
  /** Extra HTML drawn above the hexagon clip (not clipped). */
  overlay?: React.ReactNode;
  maxScale?: number;
  className?: string;
  /** Skip the white outline of the hexagon (when bodySvg draws its own). */
  hideOutline?: boolean;
}

export function V3ArrowShell({
  shell,
  animate = false,
  bodySvg,
  bodyStops = ["#071b47", "#0a2f6e", "#0b3d92"],
  children,
  overlay,
  maxScale,
  className = "",
  hideOutline = false,
}: V3ArrowShellProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { canvasW, H } = shell;
  const hexPath = toSvgPath(shell.bgPts);
  const cssVars = { ["--v3a-dc" as string]: `${canvasW / 2 - shell.cThick}px` } as React.CSSProperties;

  return (
    <V3ScaledStage designW={canvasW} designH={H} maxScale={maxScale} className={className}>
      <style>{SHELL_CSS}</style>
      <div
        className={animate ? "v3a-run" : "v3a-static"}
        style={{ position: "relative", width: canvasW, height: H, ...cssVars }}
      >
        {/* Back layer: cyan wings + navy chevrons (generated from the same points as the hexagon) */}
        <svg
          width={canvasW}
          height={H}
          viewBox={`0 0 ${canvasW} ${H}`}
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          <defs>
            <linearGradient id={`${uid}-cyan`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={V3_COLORS.cyanA} />
              <stop offset="100%" stopColor={V3_COLORS.cyanB} />
            </linearGradient>
            <linearGradient id={`${uid}-cyan-r`} x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor={V3_COLORS.cyanA} />
              <stop offset="100%" stopColor={V3_COLORS.cyanB} />
            </linearGradient>
          </defs>
          <g className="v3a-l">
            <path d={toSvgPath(shell.alcPts)} fill={`url(#${uid}-cyan)`} />
            <path
              d={toSvgPath(shell.alnPts)}
              fill={V3_COLORS.navy}
              stroke={V3_COLORS.line}
              strokeWidth={1.5}
              strokeLinejoin="miter"
            />
          </g>
          <g className="v3a-r">
            <path d={toSvgPath(shell.arcPts)} fill={`url(#${uid}-cyan-r)`} />
            <path
              d={toSvgPath(shell.arnPts)}
              fill={V3_COLORS.navy}
              stroke={V3_COLORS.line}
              strokeWidth={1.5}
              strokeLinejoin="miter"
            />
          </g>
        </svg>

        {/* Hexagon body (expands from the centre) */}
        <div className="v3a-body" style={{ position: "absolute", inset: 0 }}>
          <svg
            width={canvasW}
            height={H}
            viewBox={`0 0 ${canvasW} ${H}`}
            style={{ position: "absolute", inset: 0, overflow: "visible" }}
          >
            <defs>
              <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={bodyStops[0]} />
                <stop offset="55%" stopColor={bodyStops[1]} />
                <stop offset="100%" stopColor={bodyStops[2]} />
              </linearGradient>
            </defs>
            <path d={hexPath} fill={`url(#${uid}-body)`} />
            {bodySvg}
            {!hideOutline && (
              <path d={hexPath} fill="none" stroke={V3_COLORS.line} strokeWidth={2} strokeLinejoin="miter" />
            )}
          </svg>

          <div
            className="v3a-content"
            style={{
              position: "absolute",
              inset: 0,
              clipPath: `polygon(${toPoly(shell.bgPts)})`,
            }}
          >
            {children}
          </div>
        </div>

        {overlay && <div className="v3a-content" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{overlay}</div>}
      </div>
    </V3ScaledStage>
  );
}
