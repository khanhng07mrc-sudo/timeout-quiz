import React from "react";
import type { AncientTarotCardKey } from "@/types";

export interface TarotIconProps {
  cardKey?: AncientTarotCardKey | string;
  size?: number;
  strokeColor?: string;
  glowColor?: string;
  className?: string;
}

/**
 * Strips any effect-spoiler parenthetical suffix from a Vietnamese card name
 * while the card is still in the pre-reveal suspense state (isRevealPending).
 * Example: "Thần Chết (Lật Kèo)" -> "Thần Chết"
 */
export function getPureArcanaNameVi(nameVi?: string): string {
  if (!nameVi) return "Ẩn Số Tarot";
  return nameVi.replace(/\s*\([^)]*\)\s*$/g, "").trim();
}

/**
 * Renders the pure SVG path/geometry contents inside a 32x32 viewBox
 * so it can be embedded either inside a standalone <svg> or nested inside the wheel's <svg>.
 */
export function renderTarotArcanaVectorNodes(
  cardKey: AncientTarotCardKey | string | undefined,
  strokeColor: string = "#fde68a"
): React.ReactNode {
  const commonProps = {
    fill: "none",
    stroke: strokeColor,
    strokeWidth: 1.65,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (cardKey) {
    case "THE_FOOL":
      // 0 - The Fool: Wanderer's Staff with Bindle, Cliff Rose & Four-Pointed Star
      return (
        <>
          <line x1="7" y1="26" x2="24" y2="7" {...commonProps} />
          <path d="M 19 12 C 23 12, 26 16, 22 20 C 18 23, 14 19, 16 15 Z" {...commonProps} />
          <circle cx="10" cy="10" r="2.2" {...commonProps} />
          <path d="M 10 5.5 L 10 14.5 M 5.5 10 L 14.5 10" {...commonProps} strokeWidth={1.3} />
          <path d="M 6 26 C 9 24, 13 25, 16 27" {...commonProps} strokeWidth={1.3} />
          <circle cx="25" cy="24" r="1.2" fill={strokeColor} />
        </>
      );

    case "THE_MAGICIAN":
      // I - The Magician: Infinity Lemniscate above Wand & Chalice
      return (
        <>
          <path
            d="M 16 10 C 13 7, 8 7, 8 10.5 C 8 14, 13 14, 16 10.5 C 19 7, 24 7, 24 10.5 C 24 14, 19 14, 16 10 Z"
            {...commonProps}
          />
          <line x1="16" y1="15" x2="16" y2="27" {...commonProps} />
          <polygon points="16,13.5 18,16.5 16,19.5 14,16.5" {...commonProps} fill={strokeColor} fillOpacity={0.2} />
          <path d="M 9 19 L 11 17 L 13 19 L 11 21 Z" {...commonProps} strokeWidth={1.2} />
          <path d="M 19 19 L 21 17 L 23 19 L 21 21 Z" {...commonProps} strokeWidth={1.2} />
        </>
      );

    case "THE_HIGH_PRIESTESS":
      // II - The High Priestess: Triple Moon Crown & Sacred Pillars
      return (
        <>
          <circle cx="16" cy="14" r="4.5" {...commonProps} />
          <path d="M 10.5 10 C 7.5 11.5, 7.5 16.5, 10.5 18" {...commonProps} />
          <path d="M 21.5 10 C 24.5 11.5, 24.5 16.5, 21.5 18" {...commonProps} />
          <line x1="6" y1="6" x2="6" y2="26" {...commonProps} strokeWidth={1.4} />
          <line x1="26" y1="6" x2="26" y2="26" {...commonProps} strokeWidth={1.4} />
          <path d="M 12 23 L 20 23 M 16 20 L 16 26" {...commonProps} strokeWidth={1.4} />
        </>
      );

    case "THE_EMPRESS":
      // III - The Empress: Venus Scepter, Celestial Tiara & Sacred Lotus
      return (
        <>
          <circle cx="16" cy="12" r="5" {...commonProps} />
          <line x1="16" y1="17" x2="16" y2="26" {...commonProps} />
          <line x1="12" y1="21.5" x2="20" y2="21.5" {...commonProps} />
          <path d="M 9 9 L 12 6 L 16 8 L 20 6 L 23 9" {...commonProps} strokeWidth={1.3} />
          <circle cx="16" cy="5" r="1" fill={strokeColor} />
          <circle cx="10.5" cy="6.5" r="0.9" fill={strokeColor} />
          <circle cx="21.5" cy="6.5" r="0.9" fill={strokeColor} />
        </>
      );

    case "THE_EMPEROR":
      // IV - The Emperor: Sovereign Astral Crown & Ram-Horned Scepter
      return (
        <>
          <polygon
            points="6,22 8,10 13,15 16,7 19,15 24,10 26,22"
            {...commonProps}
            fill={strokeColor}
            fillOpacity={0.14}
          />
          <line x1="6" y1="25" x2="26" y2="25" {...commonProps} />
          <circle cx="16" cy="5.5" r="1.2" fill={strokeColor} />
          <circle cx="8" cy="8.5" r="1" fill={strokeColor} />
          <circle cx="24" cy="8.5" r="1" fill={strokeColor} />
        </>
      );

    case "THE_HIEROPHANT":
      // V - The Hierophant: Crossed Keys of Mystery & Triple Papal Cross
      return (
        <>
          <line x1="16" y1="5" x2="16" y2="26" {...commonProps} />
          <line x1="12" y1="8" x2="20" y2="8" {...commonProps} strokeWidth={1.4} />
          <line x1="10" y1="12" x2="22" y2="12" {...commonProps} strokeWidth={1.5} />
          <circle cx="11" cy="22" r="2.8" {...commonProps} />
          <circle cx="21" cy="22" r="2.8" {...commonProps} />
          <line x1="13" y1="20" x2="21" y2="14" {...commonProps} strokeWidth={1.3} />
          <line x1="19" y1="20" x2="11" y2="14" {...commonProps} strokeWidth={1.3} />
        </>
      );

    case "THE_LOVERS":
      // VI - The Lovers: Twin Alchemical Chalices & Radiant Union Star
      return (
        <>
          <path
            d="M 16 25 C 16 25, 7 18.5, 7 12.5 C 7 9, 10 7, 13 7 C 14.8 7, 16 8.2, 16 9.8 C 16 8.2, 17.2 7, 19 7 C 22 7, 25 9, 25 12.5 C 25 18.5, 16 25, 16 25 Z"
            {...commonProps}
            fill={strokeColor}
            fillOpacity={0.12}
          />
          <path d="M 16 4 L 16 14 M 11 9 L 21 9" {...commonProps} strokeWidth={1.2} />
          <circle cx="16" cy="14" r="2" {...commonProps} />
        </>
      );

    case "THE_CHARIOT":
    case "THE_KNIGHT":
      // VII - The Chariot: Winged Celestial Wheel & Star Shield
      return (
        <>
          <circle cx="16" cy="18" r="7" {...commonProps} />
          <circle cx="16" cy="18" r="2.2" {...commonProps} />
          <line x1="16" y1="11" x2="16" y2="25" {...commonProps} strokeWidth={1.3} />
          <line x1="9" y1="18" x2="23" y2="18" {...commonProps} strokeWidth={1.3} />
          <path d="M 5 11 C 9 11, 12 8, 16 6 C 20 8, 23 11, 27 11" {...commonProps} />
          <path d="M 7 14 C 10 14, 13 12, 16 10 C 19 12, 22 14, 25 14" {...commonProps} strokeWidth={1.2} />
        </>
      );

    case "STRENGTH":
      // VIII - Strength: Infinity Lemniscate over Sacred Diamond Crest
      return (
        <>
          <path
            d="M 16 9 C 13.2 6.2, 8.5 6.2, 8.5 9.5 C 8.5 12.8, 13.2 12.8, 16 9.5 C 18.8 6.2, 23.5 6.2, 23.5 9.5 C 23.5 12.8, 18.8 12.8, 16 9 Z"
            {...commonProps}
          />
          <polygon
            points="16,14 23,20 16,27 9,20"
            {...commonProps}
            fill={strokeColor}
            fillOpacity={0.15}
          />
          <circle cx="16" cy="20.5" r="2" fill={strokeColor} />
        </>
      );

    case "THE_HERMIT":
      // IX - The Hermit: Ancient Lantern containing the Six-Pointed Star of Hermes
      return (
        <>
          <path d="M 12 8 L 20 8 L 22 13 L 20 25 L 12 25 L 10 13 Z" {...commonProps} />
          <path d="M 13 8 C 13 5, 19 5, 19 8" {...commonProps} />
          <line x1="10" y1="25" x2="22" y2="25" {...commonProps} />
          <polygon points="16,12.5 19.2,18.5 12.8,18.5" {...commonProps} strokeWidth={1.2} />
          <polygon points="16,20.5 19.2,14.5 12.8,14.5" {...commonProps} strokeWidth={1.2} />
        </>
      );

    case "WHEEL_OF_FORTUNE":
      // X - Wheel of Fortune: Eight-Spoked Alchemical Rota Wheel
      return (
        <>
          <circle cx="16" cy="16" r="10" {...commonProps} />
          <circle cx="16" cy="16" r="6" {...commonProps} strokeWidth={1.2} />
          <circle cx="16" cy="16" r="2" fill={strokeColor} />
          <line x1="16" y1="4.5" x2="16" y2="27.5" {...commonProps} strokeWidth={1.3} />
          <line x1="4.5" y1="16" x2="27.5" y2="16" {...commonProps} strokeWidth={1.3} />
          <line x1="8.2" y1="8.2" x2="23.8" y2="23.8" {...commonProps} strokeWidth={1.3} />
          <line x1="23.8" y1="8.2" x2="8.2" y2="23.8" {...commonProps} strokeWidth={1.3} />
        </>
      );

    case "JUSTICE":
      // XI - Justice: Upright Sword of Truth & Balanced Cosmic Scales
      return (
        <>
          <line x1="16" y1="5" x2="16" y2="26" {...commonProps} />
          <line x1="7" y1="11" x2="25" y2="11" {...commonProps} />
          <line x1="12" y1="26" x2="20" y2="26" {...commonProps} />
          <path d="M 7 11 L 4.5 18 L 9.5 18 Z" {...commonProps} strokeWidth={1.3} />
          <path d="M 25 11 L 22.5 18 L 27.5 18 Z" {...commonProps} strokeWidth={1.3} />
          <path d="M 4 18 C 4 20.5, 10 20.5, 10 18" {...commonProps} />
          <path d="M 22 18 C 22 20.5, 28 20.5, 28 18" {...commonProps} />
        </>
      );

    case "THE_HANGED_MAN":
      // XII - The Hanged Man: Inverted Sacred Ankh & Radiant Halo
      return (
        <>
          <line x1="7" y1="6" x2="25" y2="6" {...commonProps} />
          <line x1="16" y1="6" x2="16" y2="18" {...commonProps} />
          <line x1="11" y1="13" x2="21" y2="13" {...commonProps} />
          <circle cx="16" cy="22" r="4" {...commonProps} />
          <path d="M 10 24.5 C 12 27.5, 20 27.5, 22 24.5" {...commonProps} strokeWidth={1.1} strokeDasharray="2 2" />
        </>
      );

    case "THE_DEATH":
    case "DEATH":
      // XIII - Death: Astral Scythe & Eclipse Crescent with Mystic Rose Star
      return (
        <>
          <line x1="9" y1="26" x2="23" y2="6" {...commonProps} />
          <path
            d="M 23 6 C 14 5, 7 10, 6 17 C 11 13, 16 12, 21 12 Z"
            {...commonProps}
            fill={strokeColor}
            fillOpacity={0.18}
          />
          <circle cx="19" cy="21" r="3.2" {...commonProps} />
          <circle cx="19" cy="21" r="1" fill={strokeColor} />
        </>
      );

    case "TEMPERANCE":
      // XIV - Temperance: Alchemical Triangle in Square & Flowing Starlight Chalice
      return (
        <>
          <path d="M 10 7 L 22 7 L 18 15 L 14 15 Z" {...commonProps} />
          <line x1="16" y1="15" x2="16" y2="24" {...commonProps} />
          <line x1="11" y1="24" x2="21" y2="24" {...commonProps} />
          <path d="M 9 12 C 6 12, 6 18, 11 19" {...commonProps} strokeWidth={1.3} />
          <path d="M 23 12 C 26 12, 26 18, 21 19" {...commonProps} strokeWidth={1.3} />
          <circle cx="16" cy="10.5" r="1.2" fill={strokeColor} />
        </>
      );

    case "THE_DEVIL":
      // XV - The Devil: Esoteric Inverted Pentagram inside Astral Ring
      return (
        <>
          <circle cx="16" cy="16" r="10" {...commonProps} />
          <polygon
            points="16,25 9.5,8.5 24.5,18.5 7.5,18.5 22.5,8.5"
            {...commonProps}
            strokeWidth={1.35}
          />
        </>
      );

    case "THE_TOWER":
      // XVI - The Tower: Crowned Spire Struck by Celestial Lightning
      return (
        <>
          <path d="M 11 26 L 12.5 12 L 19.5 12 L 21 26" {...commonProps} />
          <line x1="9" y1="26" x2="23" y2="26" {...commonProps} />
          <path d="M 11.5 12 L 13 8.5 L 16 10.5 L 19 8.5 L 20.5 12" {...commonProps} strokeWidth={1.3} />
          <polyline points="24,4 17,11 21,12 13,20" {...commonProps} strokeWidth={1.8} />
        </>
      );

    case "THE_STAR":
      // XVII - The Star: Eight-Pointed Sirius Star & Twin Orbiting Stars
      return (
        <>
          <polygon
            points="16,4.5 18.4,12.2 26.5,12.2 20,16.8 22.4,24.5 16,19.8 9.6,24.5 12,16.8 5.5,12.2 13.6,12.2"
            {...commonProps}
            fill={strokeColor}
            fillOpacity={0.16}
          />
          <circle cx="16" cy="15.5" r="1.8" fill={strokeColor} />
          <circle cx="7" cy="7" r="1.1" fill={strokeColor} />
          <circle cx="25" cy="7" r="1.1" fill={strokeColor} />
        </>
      );

    case "THE_MOON":
      // XVIII - The Moon: Ornate Crescent Moon with Astral Rays & Dewdrops
      return (
        <>
          <path
            d="M 21 6.5 C 13.5 6.5, 8.5 11.8, 8.5 16 C 8.5 20.2, 13.5 25.5, 21 25.5 C 16.5 23, 14.5 19.8, 14.5 16 C 14.5 12.2, 16.5 9, 21 6.5 Z"
            {...commonProps}
            fill={strokeColor}
            fillOpacity={0.18}
          />
          <circle cx="22.5" cy="12.5" r="1.2" fill={strokeColor} />
          <circle cx="24" cy="16" r="0.9" fill={strokeColor} />
          <circle cx="22.5" cy="19.5" r="1.2" fill={strokeColor} />
        </>
      );

    case "THE_SUN":
      // XIX - The Sun: Radiant Esoteric Sol with 8 Beams & Inner Solar Core
      return (
        <>
          <circle cx="16" cy="16" r="5.5" {...commonProps} fill={strokeColor} fillOpacity={0.18} />
          <circle cx="16" cy="16" r="1.8" fill={strokeColor} />
          <line x1="16" y1="4.5" x2="16" y2="8" {...commonProps} />
          <line x1="16" y1="24" x2="16" y2="27.5" {...commonProps} />
          <line x1="4.5" y1="16" x2="8" y2="16" {...commonProps} />
          <line x1="24" y1="16" x2="27.5" y2="16" {...commonProps} />
          <line x1="7.8" y1="7.8" x2="10.4" y2="10.4" {...commonProps} />
          <line x1="21.6" y1="21.6" x2="24.2" y2="24.2" {...commonProps} />
          <line x1="24.2" y1="7.8" x2="21.6" y2="10.4" {...commonProps} />
          <line x1="10.4" y1="21.6" x2="7.8" y2="24.2" {...commonProps} />
        </>
      );

    case "JUDGEMENT":
      // XX - Judgement: Archangel's Trumpet & Cross Banner with Awakening Rays
      return (
        <>
          <path d="M 7 10 L 18 14 L 25 9 L 25 21 L 18 16 L 7 12 Z" {...commonProps} fill={strokeColor} fillOpacity={0.14} />
          <rect x="10" y="15" width="7" height="7" {...commonProps} strokeWidth={1.3} />
          <line x1="13.5" y1="15" x2="13.5" y2="22" {...commonProps} strokeWidth={1.2} />
          <line x1="10" y1="18.5" x2="17" y2="18.5" {...commonProps} strokeWidth={1.2} />
        </>
      );

    case "THE_WORLD":
      // XXI - The World: Cosmic Laurel Wreath, Axis Mundi & Four Corner Stars
      return (
        <>
          <ellipse cx="16" cy="16" rx="7" ry="10.5" {...commonProps} />
          <ellipse cx="16" cy="16" rx="10.5" ry="5.5" {...commonProps} strokeWidth={1.2} />
          <circle cx="16" cy="16" r="2.2" fill={strokeColor} />
          <circle cx="7" cy="7" r="1" fill={strokeColor} />
          <circle cx="25" cy="7" r="1" fill={strokeColor} />
          <circle cx="7" cy="25" r="1" fill={strokeColor} />
          <circle cx="25" cy="25" r="1" fill={strokeColor} />
        </>
      );

    case "THE_PEACE":
      // Survival Mode: Sacred Astral Dove & Halo
      return (
        <>
          <circle cx="16" cy="16" r="9.5" {...commonProps} strokeDasharray="2.5 2" strokeWidth={1.2} />
          <path
            d="M 8 18 C 11 13, 15 12, 18 14 C 20 10, 23 9, 25 10 C 23 13, 22 16, 20 18 C 16 21, 11 20, 8 18 Z"
            {...commonProps}
            fill={strokeColor}
            fillOpacity={0.18}
          />
          <circle cx="16" cy="9" r="1.2" fill={strokeColor} />
        </>
      );

    default:
      // Fallback: All-Seeing Esoteric Eye Star
      return (
        <>
          <path d="M 5 16 C 9 10, 23 10, 27 16 C 23 22, 9 22, 5 16 Z" {...commonProps} />
          <circle cx="16" cy="16" r="3.2" {...commonProps} />
          <circle cx="16" cy="16" r="1.2" fill={strokeColor} />
        </>
      );
  }
}

/**
 * Standalone React SVG Icon component for Tarot cards (used on Drawn Card, Modals, and Rules).
 */
export function TarotArcanaSvgIcon({
  cardKey,
  size = 64,
  strokeColor = "#fde68a",
  glowColor = "rgba(251, 191, 36, 0.65)",
  className = "",
}: TarotIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`select-none pointer-events-none ${className}`}
      style={{
        filter: `drop-shadow(0 0 8px ${glowColor})`,
      }}
    >
      {/* Subtle outer sacred circle on larger card displays */}
      {size >= 44 && (
        <>
          <circle
            cx="16"
            cy="16"
            r="14.5"
            fill="none"
            stroke={strokeColor}
            strokeOpacity={0.28}
            strokeWidth={0.75}
            strokeDasharray="2 2"
          />
          <circle
            cx="16"
            cy="16"
            r="12.8"
            fill="none"
            stroke={strokeColor}
            strokeOpacity={0.18}
            strokeWidth={0.6}
          />
        </>
      )}
      {renderTarotArcanaVectorNodes(cardKey, strokeColor)}
    </svg>
  );
}
