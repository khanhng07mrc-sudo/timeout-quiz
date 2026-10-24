"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTranslation, SUPPORTED_LANGUAGES, Language } from "@/lib/i18n";

interface LanguageSelectorProps {
  variant?: "header" | "footer" | "compact";
  className?: string;
}

export default function LanguageSelector({ variant = "header", className = "" }: LanguageSelectorProps) {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 rounded-xl transition cursor-pointer ${
          variant === "footer"
            ? "px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-300"
            : variant === "compact"
            ? "p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300"
            : "px-3 py-2 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/80 text-xs font-semibold text-slate-200 shadow-md backdrop-blur-md"
        }`}
        title="Chuyển đổi ngôn ngữ / Switch Language"
      >
        <span className="text-base leading-none">{currentLang.flag}</span>
        <span className="hidden sm:inline-block font-medium">{currentLang.name}</span>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 sm:bottom-auto sm:top-full sm:mt-2 w-48 rounded-2xl bg-[#101426] border border-slate-700/80 shadow-2xl shadow-black/80 z-50 py-2 backdrop-blur-xl animate-scale-in">
          <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Chọn Ngôn Ngữ / Language
          </div>

          <div className="py-1">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition cursor-pointer text-left ${
                  language === lang.code
                    ? "bg-cyan-500/15 text-cyan-300 font-bold"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span>{lang.name}</span>
                </div>
                {language === lang.code && (
                  <span className="text-cyan-400 font-bold text-xs">✓</span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-1 pt-2 border-t border-slate-800 px-3 py-1 text-[10px] text-slate-400 leading-snug">
            💡 <em>Magic Wheel hiện hỗ trợ chuyên sâu 2 luật: 🇻🇳 Việt &amp; 🇬🇧 Anh.</em>
          </div>
        </div>
      )}
    </div>
  );
}
