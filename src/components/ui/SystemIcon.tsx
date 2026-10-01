"use client";

import React from "react";

export type SystemIconName =
  | "dashboard"
  | "quiz_bank"
  | "create_room"
  | "rooms"
  | "sandbox"
  | "display"
  | "home"
  | "logout"
  | "device"
  | "mc"
  | "individual"
  | "team"
  | "trophy"
  | "play"
  | "pause"
  | "next"
  | "trash"
  | "sound_on"
  | "sound_off"
  | "settings";

interface Props {
  name: SystemIconName;
  className?: string;
  size?: number;
}

export default function SystemIcon({ name, className = "w-5 h-5", size }: Props) {
  const sizeStyle = size ? { width: size, height: size } : undefined;

  switch (name) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <rect x="3" y="3" width="7" height="9" rx="2" fill="#818cf8" fillOpacity="0.8" stroke="#c084fc" strokeWidth="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="2" fill="#38bdf8" fillOpacity="0.6" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="2" fill="#818cf8" fillOpacity="0.8" stroke="#c084fc" strokeWidth="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="2" fill="#38bdf8" fillOpacity="0.6" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="6.5" cy="7.5" r="1" fill="#ffffff" />
          <circle cx="17.5" cy="16.5" r="1" fill="#ffffff" />
        </svg>
      );

    case "quiz_bank":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <path d="M4 19.5C4 18.12 5.12 17 6.5 17H20V4H6.5C5.12 4 4 5.12 4 6.5V19.5Z" fill="#38bdf8" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M4 19.5C4 18.12 5.12 17 6.5 17H20" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M6.5 4V17" stroke="#c084fc" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M9 8H16" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9 11.5H14" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="17.5" cy="11.5" r="1" fill="#facc15" />
        </svg>
      );

    case "create_room":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <rect x="3" y="3" width="18" height="18" rx="6" fill="#a855f7" fillOpacity="0.25" stroke="#a855f7" strokeWidth="1.8" />
          <line x1="12" y1="7.5" x2="12" y2="16.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="7.5" y1="12" x2="16.5" y2="12" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="18" cy="6" r="1.5" fill="#facc15" />
        </svg>
      );

    case "rooms":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <rect x="3" y="4" width="18" height="17" rx="3" stroke="#34d399" strokeWidth="1.6" strokeOpacity="0.5" />
          <path d="M6 20V5.5C6 4.67 6.67 4 7.5 4H14.5C15.33 4 16 4.67 16 5.5V20H6Z" fill="#10b981" fillOpacity="0.35" stroke="#10b981" strokeWidth="1.6" />
          <circle cx="13.5" cy="12.5" r="1.2" fill="#facc15" />
          <path d="M16 11L19.5 12.5L16 14" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "sandbox":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <path d="M9 3H15M10 3V8.5L5.5 17.5C4.8 18.9 5.8 20.5 7.4 20.5H16.6C18.2 20.5 19.2 18.9 18.5 17.5L14 8.5V3" stroke="#4ade80" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 16C9 14.5 11 16.5 13 15C15 13.5 16 15 17 16L16.6 19.5C16.3 20 15.6 20.5 15 20.5H9C8.4 20.5 7.7 20 7.4 19.5L7 16Z" fill="#4ade80" fillOpacity="0.45" />
          <circle cx="10" cy="18" r="1" fill="#ffffff" />
          <circle cx="14" cy="17" r="1.5" fill="#facc15" />
          <circle cx="12" cy="11" r="0.8" fill="#4ade80" />
        </svg>
      );

    case "display":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <rect x="2.5" y="4" width="19" height="13" rx="3" fill="#38bdf8" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1.6" />
          <path d="M8.5 20.5H15.5M12 17V20.5" stroke="#818cf8" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8 9.5L11.5 12L8 14.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="13.5" y1="14" x2="16.5" y2="14" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="18.5" cy="7" r="1" fill="#facc15" />
        </svg>
      );

    case "home":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <path d="M3 10.5L12 3.5L21 10.5V19.5C21 20.33 20.33 21 19.5 21H4.5C3.67 21 3 20.33 3 19.5V10.5Z" fill="#c084fc" fillOpacity="0.25" stroke="#c084fc" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9.5 21V13.5H14.5V21" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="8.5" r="1.5" fill="#facc15" />
        </svg>
      );

    case "logout":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <path d="M9 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H9" stroke="#f87171" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 17L21 12L16 7" stroke="#f87171" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="21" y1="12" x2="9" y2="12" stroke="#f87171" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );

    case "device":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} style={sizeStyle}>
          <rect x="7" y="2" width="18" height="28" rx="5" fill="#18182f" stroke="#818cf8" strokeWidth="2" />
          <rect x="13" y="4.5" width="6" height="1.5" rx="0.75" fill="#818cf8" />
          <circle cx="16" cy="26.5" r="1.8" fill="#38bdf8" />
          <rect x="10" y="8" width="12" height="15" rx="2" fill="#818cf8" fillOpacity="0.25" />
          <path d="M13 15.5L15 17.5L19 13.5" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="25" cy="5" r="1.5" fill="#facc15" />
        </svg>
      );

    case "mc":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} style={sizeStyle}>
          <rect x="11" y="3" width="10" height="15" rx="5" fill="#0284c7" stroke="#a5f3fc" strokeWidth="1.8" />
          <line x1="11" y1="9" x2="21" y2="9" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.7" />
          <line x1="11" y1="13" x2="21" y2="13" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.7" />
          <path d="M7 13C7 18 11 22 16 22C21 22 25 18 25 13" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="22" x2="16" y2="28" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="11" y1="28" x2="21" y2="28" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M4 10C3 12 3 14 4 16" stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M28 10C29 12 29 14 28 16" stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case "individual":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} style={sizeStyle}>
          <circle cx="16" cy="10" r="6" fill="#18182f" stroke="#c084fc" strokeWidth="2" />
          <path d="M12 10H20" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
          <path d="M7 26C7 21 11 19 16 19C21 19 25 21 25 26" fill="#18182f" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="23" r="1.5" fill="#facc15" />
        </svg>
      );

    case "team":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} style={sizeStyle}>
          <circle cx="10" cy="11" r="4" fill="#18182f" stroke="#c084fc" strokeWidth="1.6" />
          <path d="M4 24C4 20 7 18 10 18C12 18 13.5 19 14.5 20.5" stroke="#c084fc" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="22" cy="11" r="4" fill="#18182f" stroke="#c084fc" strokeWidth="1.6" />
          <path d="M17.5 20.5C18.5 19 20 18 22 18C25 18 28 20 28 24" stroke="#c084fc" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="16" cy="9" r="5" fill="#18182f" stroke="#38bdf8" strokeWidth="2" />
          <path d="M13 9H19" stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8 27C8 22 11.5 20 16 20C20.5 20 24 22 24 27" fill="#18182f" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "trophy":
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} style={sizeStyle}>
          <path d="M9 5H23V14C23 18.5 19.5 21 16 21C12.5 21 9 18.5 9 14V5Z" fill="#facc15" stroke="#78350f" strokeWidth="1.6" />
          <path d="M9 8H6C4.5 8 4 9.5 4 11C4 14 7 15 9 15" stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M23 8H26C27.5 8 28 9.5 28 11C28 14 25 15 23 15" stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M14.5 21H17.5V25H14.5V21Z" fill="#facc15" stroke="#78350f" strokeWidth="1.2" />
          <rect x="10" y="25" width="12" height="4" rx="1.5" fill="#78350f" stroke="#facc15" strokeWidth="1.4" />
          <circle cx="16" cy="11" r="1.5" fill="#ffffff" />
        </svg>
      );

    case "play":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <polygon points="6,4 20,12 6,20" fill="#4ade80" stroke="#22c55e" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );

    case "pause":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <rect x="6" y="5" width="4" height="14" rx="1.5" fill="#facc15" stroke="#eab308" strokeWidth="1.2" />
          <rect x="14" y="5" width="4" height="14" rx="1.5" fill="#facc15" stroke="#eab308" strokeWidth="1.2" />
        </svg>
      );

    case "next":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <path d="M5 5L12 12L5 19" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 5L19 12L12 19" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "trash":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <path d="M4 7H20M10 11V17M14 11V17M5 7L6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19L19 7M9 7V4C9 3.45 9.45 3 10 3H14C14.55 3 15 3.45 15 4V7" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "sound_on":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <path d="M11 5L6 9H2V15H6L11 19V5Z" fill="#38bdf8" fillOpacity="0.4" stroke="#38bdf8" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M15.5 8.5C16.8 9.8 17.5 11.5 17.5 13C17.5 14.5 16.8 16.2 15.5 17.5" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M19 5.5C21.2 7.7 22.5 10.3 22.5 13C22.5 15.7 21.2 18.3 19 20.5" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case "sound_off":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <path d="M11 5L6 9H2V15H6L11 19V5Z" fill="#f87171" fillOpacity="0.3" stroke="#f87171" strokeWidth="1.8" strokeLinejoin="round" />
          <line x1="22" y1="9" x2="16" y2="15" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="9" x2="22" y2="15" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "settings":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} style={sizeStyle}>
          <circle cx="12" cy="12" r="3" stroke="#818cf8" strokeWidth="2" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="#818cf8" strokeWidth="1.6" />
        </svg>
      );

    default:
      return null;
  }
}
