"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  MAGIC_WHEEL_CATEGORIES,
  MagicWheelCategoryDef,
  getBilingualCategoryLabel,
} from "@/lib/game-engine/magic-wheel-categories";

interface BilingualCategoryPickerProps {
  value: string;
  onChange: (category: string) => void;
  edition?: "VIETNAMESE" | "ENGLISH";
  disabled?: boolean;
}

export function BilingualCategoryPicker({
  value,
  onChange,
  edition = "VIETNAMESE",
  disabled = false,
}: BilingualCategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return MAGIC_WHEEL_CATEGORIES;
    const q = search.toLowerCase();
    return MAGIC_WHEEL_CATEGORIES.filter(
      (c) => c.en.toLowerCase().includes(q) || c.vi.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSelect = (cat: MagicWheelCategoryDef) => {
    const chosenName = edition === "ENGLISH" ? cat.en : cat.vi;
    onChange(chosenName);
    setIsCustomMode(false);
    setIsOpen(false);
    setSearch("");
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
      setIsCustomMode(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full text-left" ref={dropdownRef}>
      {isCustomMode ? (
        <div className="flex items-center gap-1.5 w-full">
          <input
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCustomSubmit();
              if (e.key === "Escape") setIsCustomMode(false);
            }}
            placeholder="Nhập tên chủ đề tùy ý..."
            autoFocus
            className="flex-1 px-3 py-1.5 rounded-lg bg-black/60 border border-amber-400/50 text-amber-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <button
            type="button"
            onClick={handleCustomSubmit}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
          >
            Lưu
          </button>
          <button
            type="button"
            onClick={() => setIsCustomMode(false)}
            className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs font-bold transition select-none ${
            disabled
              ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
              : "bg-black/50 hover:bg-black/70 text-amber-200 border-amber-400/40 shadow cursor-pointer"
          }`}
        >
          <span className="truncate">
            ⭐ {value || (edition === "ENGLISH" ? "Select Category..." : "Chọn danh mục...")}
          </span>
          <span className="text-amber-400/80 text-[10px] ml-2 shrink-0">▼</span>
        </button>
      )}

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 w-full sm:w-80 max-h-72 bg-slate-950/95 backdrop-blur-xl border border-amber-400/50 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.85)] z-50 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="p-2 border-b border-white/10 bg-slate-900/60 flex items-center gap-2">
            <span className="text-xs text-amber-400">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm danh mục (Anh / Việt)..."
              autoFocus
              className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Custom Typing Action */}
          <button
            type="button"
            onClick={() => {
              setIsCustomMode(true);
              setCustomValue(value || "");
              setIsOpen(false);
            }}
            className="px-3 py-2 text-left text-xs font-black text-cyan-300 hover:bg-cyan-500/20 border-b border-white/10 flex items-center gap-2 transition cursor-pointer"
          >
            <span>✏️</span>
            <span>[+] Nhập chủ đề tùy ý khác...</span>
          </button>

          {/* Category List */}
          <div className="overflow-y-auto flex-1 divide-y divide-white/5 scrollbar-thin scrollbar-thumb-amber-500/30">
            {filteredCategories.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                Không tìm thấy danh mục phù hợp. Hãy bấm &quot;Nhập chủ đề tùy ý&quot; ở trên.
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const isSelected =
                  value === cat.en || value === cat.vi || value === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelect(cat)}
                    className={`w-full px-3 py-2 text-left transition flex flex-col gap-0.5 cursor-pointer ${
                      isSelected
                        ? "bg-amber-500/25 text-amber-200 font-black border-l-4 border-amber-400"
                        : "hover:bg-white/10 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-300">
                        {cat.en}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {cat.group}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-300">
                      {cat.vi}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
