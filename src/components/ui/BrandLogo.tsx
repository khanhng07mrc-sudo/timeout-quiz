import Link from "next/link";
import Logo3DGyroscope from "@/components/ui/Logo3DGyroscope";

interface Props {
  variant?: "full" | "compact" | "icon";
  size?: "sm" | "md" | "lg" | "xl";
  subText?: string;
  className?: string;
  href?: string;
  enable3d?: boolean;
}

export default function BrandLogo({
  variant = "compact",
  size = "md",
  subText,
  className = "",
  href,
  enable3d = true,
}: Props) {
  const logoHeights = {
    sm: "h-7",
    md: "h-9",
    lg: "h-12",
    xl: "h-16 sm:h-20",
  };

  // 1. Icon Variant: 3D Holographic Gyroscope Logo
  if (variant === "icon") {
    const iconContent = <Logo3DGyroscope size={size} className={className} />;
    if (href) {
      return (
        <Link href={href} className="inline-flex items-center hover:scale-105 transition-transform">
          {iconContent}
        </Link>
      );
    }
    return iconContent;
  }

  // 2. Full & Compact Brand Logo Lockup with 3D Depth
  const content = (
    <div
      className={`inline-flex flex-col items-center select-none ${className}`}
      style={enable3d ? { perspective: "800px" } : undefined}
    >
      <div className="flex items-center gap-2.5">
        {/* Holographic 3D Gyroscope Badge */}
        {enable3d && (
          <Logo3DGyroscope
            size={size === "xl" ? "lg" : size === "lg" ? "md" : "sm"}
            className="shrink-0"
          />
        )}

        {/* Official Brand Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/quizorra_logo.svg"
          alt="Quizorra Logo"
          className={`${logoHeights[size]} w-auto object-contain drop-shadow-[0_4px_12px_rgba(168,85,247,0.35)] select-none`}
        />
      </div>

      {subText && (
        <span className="text-[10px] sm:text-xs font-black tracking-widest text-cyan-300 uppercase mt-1.5 opacity-90 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
          {subText}
        </span>
      )}
      {variant === "full" && !subText && (
        <span className="text-[9px] sm:text-[10px] font-black tracking-wider text-purple-300 uppercase mt-1 opacity-80">
          REALTIME MULTIPLAYER ARENA
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-95 transition-opacity inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}
