import React from "react";
import {
  Sun,
  Crown,
  Shield,
  Heart,
  Swords,
  Skull,
  Sparkles,
  Compass,
  Scale,
  Moon,
  Gift,
  Wind,
  Zap,
  Bomb,
  DoorClosed,
  DoorOpen,
  Coins,
  Trophy,
  Bird,
  Flame,
  Eye,
  Dice5,
  RotateCcw,
} from "lucide-react";

export interface MinigameSvgIconProps {
  nameOrEmoji?: string;
  className?: string;
  size?: number;
  glow?: boolean;
}

/**
 * Maps legacy emoji tokens and archetype keys to crisp, glowing vector SVG icons.
 * Prevents OS-dependent emoji glitches, black-and-white rendering, or blurry pixelation.
 */
export function MinigameSvgIcon({
  nameOrEmoji = "✨",
  className = "w-6 h-6",
  size,
  glow = true,
}: MinigameSvgIconProps) {
  const s = size ? { width: size, height: size } : undefined;
  const raw = (nameOrEmoji || "").trim();

  // 1. Sun / The Sun / 2x
  if (raw === "☀️" || raw === "THE_SUN" || raw.includes("Mặt Trời")) {
    return <Sun className={`text-amber-300 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(251, 191, 36, 0.7))" : undefined }} />;
  }

  // 2. Crown / The Emperor
  if (raw === "👑" || raw === "THE_EMPEROR" || raw.includes("Hoàng Đế") || raw.includes("Vương Miện")) {
    return <Crown className={`text-yellow-400 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(250, 204, 21, 0.7))" : undefined }} />;
  }

  // 3. Shield
  if (raw === "🛡️" || raw === "SHIELD" || raw.includes("Khiên")) {
    return <Shield className={`text-sky-400 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(56, 189, 248, 0.7))" : undefined }} />;
  }

  // 4. Heart / Strength
  if (raw === "❤️" || raw === "STRENGTH" || raw.includes("Tim") || raw.includes("Sức Mạnh")) {
    return <Heart className={`text-rose-500 fill-rose-500 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(244, 63, 94, 0.8))" : undefined }} />;
  }

  // 5. Swords / Steal / The Chariot / The Knight (old)
  if (raw === "🗡️" || raw === "⚔️" || raw === "THE_CHARIOT" || raw.includes("Cướp") || raw.includes("Chiến Xa") || raw.includes("Đạo Tặc")) {
    return <Swords className={`text-rose-400 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(251, 113, 133, 0.7))" : undefined }} />;
  }

  // 6. Skull / Death
  if (raw === "💀" || raw === "THE_DEATH" || raw === "DEATH" || raw.includes("Thần Chết") || raw.includes("SUDDEN")) {
    return <Skull className={`text-purple-400 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(192, 132, 252, 0.7))" : undefined }} />;
  }

  // 7. Joker / The Fool / Neutral
  if (raw === "🃏" || raw === "THE_FOOL" || raw.includes("Kẻ Khờ") || raw.includes("Chàng Khờ")) {
    return <Sparkles className={`text-violet-300 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(196, 181, 253, 0.7))" : undefined }} />;
  }

  // 8. Wheel of Fortune / Compass
  if (raw === "🎡" || raw === "WHEEL_OF_FORTUNE" || raw.includes("Vòng Quay") || raw.includes("Bánh Xe")) {
    return <Compass className={`text-cyan-300 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(103, 232, 249, 0.7))" : undefined }} />;
  }

  // 9. Tarot / Crystal / High Priestess
  if (raw === "🔮" || raw === "THE_HIGH_PRIESTESS" || raw.includes("Nữ Tu") || raw.includes("Tarot")) {
    return <Sparkles className={`text-indigo-300 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(165, 180, 252, 0.7))" : undefined }} />;
  }

  // 10. Scale / Temperance
  if (raw === "⚖️" || raw === "TEMPERANCE" || raw.includes("Tiết Độ")) {
    return <Scale className={`text-amber-300 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(252, 211, 77, 0.7))" : undefined }} />;
  }

  // 11. Dark Moon / The Devil
  if (raw === "🌑" || raw === "THE_DEVIL" || raw.includes("Ác Quỷ") || raw.includes("Bom Tối") || raw.includes("Bom Hắc Ám")) {
    return <Moon className={`text-purple-400 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(192, 132, 252, 0.7))" : undefined }} />;
  }

  // 12. Gift / Charity Bomb / The Hanged Man
  if (raw === "🎁" || raw === "THE_HANGED_MAN" || raw.includes("Treo Ngược") || raw.includes("Bom Tặng") || raw.includes("Từ Thiện")) {
    return <Gift className={`text-amber-400 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(251, 191, 36, 0.7))" : undefined }} />;
  }

  // 13. Smoke / Wind / The Knight (Smoke)
  if (raw === "💨" || raw === "BOMB_SMOKE" || raw.includes("Bom Khói") || raw.includes("Khói")) {
    return <Wind className={`text-slate-300 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 5px rgba(203, 213, 225, 0.6))" : undefined }} />;
  }

  // 14. Lightning / The Tower
  if (raw === "⚡" || raw === "THE_TOWER" || raw.includes("Tháp")) {
    return <Zap className={`text-yellow-400 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(250, 204, 21, 0.8))" : undefined }} />;
  }

  // 15. Dove / Escape Safe / The Peace
  if (raw === "🕊️" || raw === "THE_PEACE" || raw === "ESCAPE_SAFE" || raw.includes("Thoát Hiểm") || raw.includes("Bình Yên")) {
    return <Bird className={`text-emerald-300 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(110, 231, 183, 0.8))" : undefined }} />;
  }

  // 16. Bomb / Explosion
  if (raw === "💣" || raw === "💥" || raw.includes("BOM")) {
    return <Bomb className={`text-rose-500 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(244, 63, 94, 0.8))" : undefined }} />;
  }

  // 17. Door
  if (raw === "🚪" || raw.includes("CỬA") || raw.includes("Cửa")) {
    return <DoorOpen className={`text-amber-400 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(251, 191, 36, 0.7))" : undefined }} />;
  }

  // 18. Coins / Money
  if (raw === "💰" || raw === "🪙" || raw.includes("TIỀN") || raw.includes("BẢO TOÀN") || raw.includes("HŨ")) {
    return <Coins className={`text-amber-300 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(252, 211, 77, 0.7))" : undefined }} />;
  }

  // 19. Trophy
  if (raw === "🏆" || raw.includes("THƯỞNG")) {
    return <Trophy className={`text-yellow-400 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(250, 204, 21, 0.7))" : undefined }} />;
  }

  // 20. Peek / Eye
  if (raw === "👁️" || raw.includes("Soi")) {
    return <Eye className={`text-teal-300 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(94, 234, 212, 0.7))" : undefined }} />;
  }

  // 21. Dice
  if (raw === "🎲") {
    return <Dice5 className={`text-amber-400 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 6px rgba(251, 191, 36, 0.7))" : undefined }} />;
  }

  // Fallback
  return <Sparkles className={`text-amber-300 ${className}`} style={{ ...s, filter: glow ? "drop-shadow(0 0 5px rgba(252, 211, 77, 0.6))" : undefined }} />;
}
