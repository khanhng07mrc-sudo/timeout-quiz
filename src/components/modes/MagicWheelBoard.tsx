"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MagicWheelState, MagicWheelOperationMode, TeamState } from "@/types";
import {
  VIETNAMESE_ALPHABET,
  normalizeVietnameseBaseLetter,
  isVietnameseVowel,
  applyToneToVietnameseVowel,
  extractToneFromVietnameseChar,
  VietnameseToneMark,
} from "@/lib/game-engine/magic-wheel";
import { soundManager } from "@/lib/sound-manager";
import { formatVietnameseText, VietnameseInputMethod } from "@/lib/vietnamese-ime";

/**
 * 3-Phase Physics Speed Curve for 15s - 21s Authentic Spin:
 * - 0s to 3s: Smooth sinusoidal acceleration from 0 to V_max
 * - 3s to 10s: Constant MAXIMUM velocity V_max (FASTEST PHASE)
 * - 10s to T: Smooth cubic friction deceleration to 0 at T
 * Returns normalized progress in [0, 1].
 */
function evaluateThreePhaseWheelProgress(elapsedMs: number, totalDurationMs: number): number {
  if (elapsedMs <= 0) return 0;
  if (elapsedMs >= totalDurationMs) return 1;

  const t = elapsedMs / 1000;
  const T = Math.max(14, totalDurationMs / 1000);
  const t1 = 3.0;
  const t2 = Math.min(10.0, T - 2.5);

  const D1 = 0.5 * t1;
  const D2 = t2 - t1;
  const D3 = (T - t2) / 3;
  const D_total = D1 + D2 + D3;

  if (t < t1) {
    const d = 0.5 * (t - (t1 / Math.PI) * Math.sin((Math.PI * t) / t1));
    return Math.max(0, Math.min(1, d / D_total));
  } else if (t < t2) {
    const d = D1 + (t - t1);
    return Math.max(0, Math.min(1, d / D_total));
  } else {
    const u = (t - t2) / (T - t2);
    const uClamped = Math.max(0, Math.min(1, u));
    const dDecel = ((T - t2) * (1 - Math.pow(1 - uClamped, 3))) / 3;
    const d = D1 + D2 + dDecel;
    return Math.max(0, Math.min(1, d / D_total));
  }
}

export interface MagicWheelBoardProps {
  magicWheelState?: MagicWheelState;
  wheelState?: MagicWheelState;
  teams: TeamState[];
  myTeamId?: string;
  isHost?: boolean;
  isDisplay?: boolean;
  isMyTurn?: boolean;
  onSpin?: (power: number) => void;
  onGuessLetter?: (letter: string) => void;
  onSolvePuzzle?: (answer: string) => void;
  onMysteryDecide?: (openMystery: boolean) => void;
  onSelectRewardCard?: (reward: any) => void;
  onTradeDecide?: (trade: boolean, boxIndex?: number) => void;
  onLuckyPick?: (index: number) => void;
  onAdvanceRound?: () => void;
  onOverrideTurn?: (teamId: string) => void;
  onPassTurn?: () => void;
  onQuickRevealLetter?: () => void;
  onRevealAll?: () => void;
  onTossUpStart?: () => void;
  onTossUpBuzz?: (teamId?: string) => void;
  onTossUpRevealTick?: (index?: number) => void;
  onExpressDecide?: (rideExpress: boolean) => void;
  onStealSwapDecide?: (action: "STEAL_50" | "SWAP_LEADER" | "STEAL_HALF" | "SWAP_SCORE", targetTeamId?: string) => void;
  onSpecialChooseOrder?: (order: "SPIN_FIRST" | "SOLVE_FIRST") => void;
  onSpecialPickLetters?: (letters: string[]) => void;
  onSetOperationMode?: (mode: MagicWheelOperationMode) => void;
  onJudgeSolve?: (isCorrect: boolean) => void;
  onNextRound?: () => void;
  onOpenBoard?: () => void;
}

interface RewardCardItem {
  type: "POINTS" | "FREE_SPIN" | "JACKPOT_LETTER";
  points?: number;
  label: string;
  icon: string;
}

function generate20RewardCards(): RewardCardItem[] {
  const cards: RewardCardItem[] = [];
  const pts100to900 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
  for (let i = 0; i < 12; i++) {
    const pts = pts100to900[Math.floor(Math.random() * pts100to900.length)];
    cards.push({ type: "POINTS", points: pts, label: `+${pts}đ`, icon: "💰" });
  }
  const ptsBig = [1000, 2000];
  for (let i = 0; i < 3; i++) {
    const pts = ptsBig[Math.floor(Math.random() * ptsBig.length)];
    cards.push({ type: "POINTS", points: pts, label: `+${pts}đ`, icon: "🌟" });
  }
  for (let i = 0; i < 3; i++) {
    cards.push({ type: "FREE_SPIN", label: "THÊM LƯỢT", icon: "🎟️" });
  }
  for (let i = 0; i < 2; i++) {
    cards.push({ type: "JACKPOT_LETTER", points: 3000, label: "+3.000đ & MỞ CHỮ", icon: "👑" });
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

const TONE_BUTTONS: Array<{ tone: VietnameseToneMark; label: string; keyHint: string }> = [
  { tone: "NONE", label: "Không dấu", keyHint: "Z" },
  { tone: "SAC", label: "Sắc (´)", keyHint: "S" },
  { tone: "HUYEN", label: "Huyền (`)", keyHint: "F" },
  { tone: "HOI", label: "Hỏi (ˀ)", keyHint: "R" },
  { tone: "NGA", label: "Ngã (~)", keyHint: "X" },
  { tone: "NANG", label: "Nặng (.)", keyHint: "J" },
];

/**
 * Intelligent Telex and VNI character / tone composer for single-letter slots.
 * Supports:
 * - Telex tones: S (sắc), F (huyền), R (hỏi), X (ngã), J (nặng), Z (thanh ngang / xóa dấu)
 * - VNI tones: 1 (sắc), 2 (huyền), 3 (hỏi), 4 (ngã), 5 (nặng), 0 (thanh ngang / xóa dấu)
 * - Telex modifiers: A -> Â (aa), W -> Ă (aw), E -> Ê (ee), O -> Ô (oo), W -> Ơ (ow), W -> Ư (uw), D -> Đ (dd)
 * - VNI modifiers: 6 (^: Â, Ê, Ô), 7 (móc: Ơ, Ư), 8 (trăng: Ă), 9 (gạch: Đ)
 */
function applyTelexOrVniModifier(
  currentChar: string,
  key: string
): { modifiedChar: string; isModified: boolean } {
  if (!currentChar) return { modifiedChar: currentChar, isModified: false };
  const upperCur = currentChar.toUpperCase();
  const k = key.toUpperCase();

  // 1. Tones (Telex: S, F, R, X, J, Z | VNI: 1, 2, 3, 4, 5, 0)
  let tone: VietnameseToneMark | null = null;
  if (k === "S" || k === "1") tone = "SAC";
  else if (k === "F" || k === "2") tone = "HUYEN";
  else if (k === "R" || k === "3") tone = "HOI";
  else if (k === "X" || k === "4") tone = "NGA";
  else if (k === "J" || k === "5") tone = "NANG";
  else if (k === "Z" || k === "0") tone = "NONE";

  if (tone !== null) {
    const baseVowel = normalizeVietnameseBaseLetter(upperCur);
    if (isVietnameseVowel(baseVowel)) {
      const res = applyToneToVietnameseVowel(baseVowel, tone);
      return { modifiedChar: res, isModified: true };
    }
  }

  // 2. Vowel & Consonant base transformations (Telex & VNI)
  const currentTone = extractToneFromVietnameseChar(upperCur);
  const baseLetter = normalizeVietnameseBaseLetter(upperCur);

  let newBase: string | null = null;
  if (baseLetter === "A") {
    if (k === "A" || k === "6") newBase = "Â";
    else if (k === "W" || k === "8") newBase = "Ă";
  } else if (baseLetter === "Ă") {
    if (k === "A" || k === "6") newBase = "Â";
    else if (k === "W" || k === "8") newBase = "A"; // Toggle back
  } else if (baseLetter === "Â") {
    if (k === "A" || k === "6") newBase = "A"; // Toggle back
    else if (k === "W" || k === "8") newBase = "Ă";
  } else if (baseLetter === "E") {
    if (k === "E" || k === "6") newBase = "Ê";
  } else if (baseLetter === "Ê") {
    if (k === "E" || k === "6") newBase = "E"; // Toggle back
  } else if (baseLetter === "O") {
    if (k === "O" || k === "6") newBase = "Ô";
    else if (k === "W" || k === "7") newBase = "Ơ";
  } else if (baseLetter === "Ô") {
    if (k === "O" || k === "6") newBase = "O"; // Toggle back
    else if (k === "W" || k === "7") newBase = "Ơ";
  } else if (baseLetter === "Ơ") {
    if (k === "W" || k === "7") newBase = "O"; // Toggle back
    else if (k === "O" || k === "6") newBase = "Ô";
  } else if (baseLetter === "U") {
    if (k === "W" || k === "7") newBase = "Ư";
  } else if (baseLetter === "Ư") {
    if (k === "W" || k === "7") newBase = "U"; // Toggle back
  } else if (baseLetter === "D") {
    if (k === "D" || k === "9") newBase = "Đ";
  } else if (baseLetter === "Đ") {
    if (k === "D" || k === "9") newBase = "D"; // Toggle back
  }

  if (newBase !== null) {
    if (isVietnameseVowel(newBase)) {
      const res = applyToneToVietnameseVowel(newBase, currentTone);
      return { modifiedChar: res, isModified: true };
    }
    return { modifiedChar: newBase, isModified: true };
  }

  return { modifiedChar: upperCur, isModified: false };
}

/**
 * SmartPuzzlePhraseInput:
 * - Locks already-revealed consonants so the player doesn't retype them.
 * - For already-revealed vowels, shows the base vowel (A, Ă, Â, E, Ê, I, O, Ô, Ơ, U, Ư, Y)
 *   and allows 1-click tone mark selection or Telex key (S/F/R/X/J/Z) or direct typing!
 * - For unrevealed letters, provides editable character slots.
 * - Also includes a synchronized full-phrase text box for fast keyboard typing.
 */
function SmartPuzzlePhraseInput({
  secretPhrase,
  revealedIndices,
  onSubmit,
  onCancel,
  submitLabel = "CHỐT ĐÁP ÁN ➔",
  continuousMode = false,
  attemptLog = [],
}: {
  secretPhrase: string;
  revealedIndices: Set<number>;
  onSubmit: (finalAnswer: string) => void;
  onCancel?: () => void;
  submitLabel?: string;
  continuousMode?: boolean;
  attemptLog?: string[];
}) {
  const upperPhrase = (secretPhrase || "").toUpperCase();

  // Build slot metadata for each character in secretPhrase
  const slots = useMemo(() => {
    return Array.from(upperPhrase).map((ch, idx) => {
      const isSpace = ch === " ";
      const isRevealed = revealedIndices.has(idx);
      const baseChar = normalizeVietnameseBaseLetter(ch);
      const isVowel = isVietnameseVowel(baseChar);
      // Consonants that are already revealed are 100% fixed!
      const isLockedConsonant = !isSpace && isRevealed && !isVowel;
      // Vowels that are already revealed have their base vowel fixed, only needing tone mark!
      const isRevealedVowel = !isSpace && isRevealed && isVowel;
      return {
        index: idx,
        targetChar: ch,
        baseChar,
        isSpace,
        isRevealed,
        isVowel,
        isLockedConsonant,
        isRevealedVowel,
      };
    });
  }, [upperPhrase, revealedIndices]);

  const [charValues, setCharValues] = useState<string[]>(() =>
    slots.map((s) => {
      if (s.isSpace) return " ";
      if (s.isLockedConsonant) return s.baseChar;
      if (s.isRevealedVowel) return s.baseChar;
      return "";
    })
  );
  const [focusedSlotIdx, setFocusedSlotIdx] = useState<number | null>(null);
  const [rawLineInput, setRawLineInput] = useState<string>("");
  const [imeMethod, setImeMethod] = useState<VietnameseInputMethod>("AUTO");
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const fullLineInputRef = useRef<HTMLInputElement | null>(null);
  const isComposingRef = useRef<boolean>(false);

  // Auto-focus full-phrase input on open for immediate natural Vietnamese typing
  useEffect(() => {
    const timer = setTimeout(() => {
      fullLineInputRef.current?.focus();
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  // Sync when revealedIndices change
  useEffect(() => {
    setCharValues((prev) =>
      slots.map((s, idx) => {
        if (s.isSpace) return " ";
        if (s.isLockedConsonant) return s.baseChar;
        if (s.isRevealedVowel) {
          const cur = prev[idx] || "";
          if (cur && normalizeVietnameseBaseLetter(cur) === s.baseChar) return cur;
          return s.baseChar;
        }
        return prev[idx] || "";
      })
    );
  }, [slots]);

  const composedPhrase = useMemo(() => {
    return slots
      .map((s, idx) => {
        if (s.isSpace) return " ";
        if (s.isLockedConsonant) return s.baseChar;
        return (charValues[idx] || s.baseChar || " ").toUpperCase();
      })
      .join("");
  }, [slots, charValues]);

  const focusNextEditable = useCallback(
    (afterIdx: number) => {
      for (let i = afterIdx + 1; i < slots.length; i++) {
        if (!slots[i].isSpace && !slots[i].isLockedConsonant) {
          setFocusedSlotIdx(i);
          inputRefs.current[i]?.focus();
          return;
        }
      }
    },
    [slots]
  );

  const focusPrevEditable = useCallback(
    (beforeIdx: number) => {
      for (let i = beforeIdx - 1; i >= 0; i--) {
        if (!slots[i].isSpace && !slots[i].isLockedConsonant) {
          setFocusedSlotIdx(i);
          inputRefs.current[i]?.focus();
          return;
        }
      }
    },
    [slots]
  );

  const applyToneAtSlot = (slotIdx: number, tone: VietnameseToneMark) => {
    const slot = slots[slotIdx];
    if (!slot || slot.isSpace || slot.isLockedConsonant) return;
    const currentCh = charValues[slotIdx] || slot.baseChar;
    const baseVowel = slot.isRevealedVowel ? slot.baseChar : normalizeVietnameseBaseLetter(currentCh);
    if (!isVietnameseVowel(baseVowel)) return;
    const toned = applyToneToVietnameseVowel(baseVowel, tone);
    setCharValues((prev) => {
      const next = [...prev];
      next[slotIdx] = toned;
      return next;
    });
  };

  const handleSlotKeyDown = (slotIdx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const slot = slots[slotIdx];
    if (!slot) return;

    if (e.key === "Enter") {
      e.preventDefault();
      handleTriggerSubmit();
      return;
    }
    if (e.key === "ArrowRight" || e.key === "Tab") {
      e.preventDefault();
      focusNextEditable(slotIdx);
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusPrevEditable(slotIdx);
      return;
    }

    if (e.key === "Backspace") {
      const curVal = charValues[slotIdx] || "";
      if (!curVal || curVal.trim() === "") {
        e.preventDefault();
        focusPrevEditable(slotIdx);
        return;
      }
      setCharValues((prev) => {
        const next = [...prev];
        next[slotIdx] = slot.isRevealedVowel ? slot.baseChar : "";
        return next;
      });
      return;
    }
  };

  const handleSlotChange = (slotIdx: number, rawVal: string) => {
    const slot = slots[slotIdx];
    if (!slot || slot.isSpace || slot.isLockedConsonant) return;

    if (!rawVal) {
      setCharValues((prev) => {
        const next = [...prev];
        next[slotIdx] = slot.isRevealedVowel ? slot.baseChar : "";
        return next;
      });
      return;
    }

    const lastChar = rawVal.slice(-1).toUpperCase();
    if (slot.isRevealedVowel) {
      if (normalizeVietnameseBaseLetter(lastChar) === slot.baseChar) {
        setCharValues((prev) => {
          const next = [...prev];
          next[slotIdx] = lastChar;
          return next;
        });
      }
    } else {
      setCharValues((prev) => {
        const next = [...prev];
        next[slotIdx] = lastChar;
        return next;
      });
    }
  };

  const handleFullLineChange = (text: string) => {
    const formatted = imeMethod !== "OFF" ? formatVietnameseText(text, imeMethod) : text;
    setRawLineInput(formatted);
    const upper = formatted.toUpperCase();
    setCharValues(() => {
      const next = slots.map((s) => {
        if (s.isSpace) return " ";
        if (s.isLockedConsonant) return s.baseChar;
        if (s.isRevealedVowel) return s.baseChar;
        return "";
      });
      if (!upper) return next;

      let cursor = 0;
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        if (s.isSpace) {
          next[i] = " ";
          if (upper[cursor] === " ") cursor++;
          continue;
        }
        while (cursor < upper.length && upper[cursor] === " " && !s.isSpace) {
          cursor++;
        }
        if (cursor >= upper.length) break;
        const ch = upper[cursor];
        if (s.isLockedConsonant) {
          next[i] = s.baseChar;
          cursor++;
        } else if (s.isRevealedVowel) {
          if (normalizeVietnameseBaseLetter(ch) === s.baseChar) {
            next[i] = ch;
          }
          cursor++;
        } else {
          next[i] = ch;
          cursor++;
        }
      }
      return next;
    });
  };

  const handleTriggerSubmit = () => {
    const candidate = rawLineInput.trim() ? rawLineInput.trim() : composedPhrase.trim();
    if (!candidate) return;
    onSubmit(candidate);
    if (continuousMode) {
      setRawLineInput("");
    }
  };

  const focusedSlot = focusedSlotIdx !== null ? slots[focusedSlotIdx] : null;
  const canApplyToneToFocused =
    focusedSlot &&
    !focusedSlot.isSpace &&
    !focusedSlot.isLockedConsonant &&
    (focusedSlot.isRevealedVowel || isVietnameseVowel(charValues[focusedSlot.index] || ""));

  // Group slots into words for clean wrapping
  const words = useMemo(() => {
    const groups: Array<typeof slots> = [];
    let currentWord: typeof slots = [];
    for (const s of slots) {
      if (s.isSpace) {
        if (currentWord.length > 0) {
          groups.push(currentWord);
          currentWord = [];
        }
      } else {
        currentWord.push(s);
      }
    }
    if (currentWord.length > 0) groups.push(currentWord);
    return groups;
  }, [slots]);

  return (
    <div className="space-y-3.5">
      {/* ── Primary Full-Phrase Vietnamese Input ── */}
      <div className="space-y-2 p-3 sm:p-4 rounded-2xl bg-[#080d1a] border-2 border-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.15)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-2">
            <span>✏️ GÕ ĐÁP ÁN Ô CHỮ:</span>
          </label>
          {/* IME Input Method Selector Toolbar */}
          <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-white/10 text-[10px]">
            {(["AUTO", "TELEX", "VNI", "VIQR", "OFF"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setImeMethod(m)}
                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                  imeMethod === m
                    ? "bg-amber-400 text-slate-950 shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
                title={
                  m === "AUTO"
                    ? "Tự động nhận diện Telex / VNI / VIQR (Khuyên dùng)"
                    : m === "OFF"
                    ? "Tắt bộ gõ web (Dùng Unikey / EVKey trên máy)"
                    : `Bộ gõ ${m}`
                }
              >
                {m === "AUTO" ? "⚡ Tự động" : m === "OFF" ? "⚙️ EVKey/Unikey" : m}
              </button>
            ))}
          </div>
        </div>
        <input
          ref={fullLineInputRef}
          type="text"
          value={rawLineInput}
          onChange={(e) => handleFullLineChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleTriggerSubmit();
            }
          }}
          placeholder="Nhập trực tiếp cả cụm từ đầy đủ dấu thanh tại đây (VD: THĂNG LONG HÀ NỘI)..."
          className="w-full px-4 py-3 rounded-xl bg-black/80 border-2 border-amber-400 text-white font-black text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-amber-400/30 uppercase tracking-widest shadow-inner placeholder:text-slate-500 placeholder:font-normal placeholder:tracking-normal"
        />
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
          <span>💡 Các chữ cái bạn gõ sẽ tự động đồng bộ lên các ô chữ bên dưới.</span>
          <span>Bấm <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-amber-300 font-mono font-bold">Enter ↵</kbd> để chốt</span>
        </div>
      </div>

      {/* Guided Legend */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] bg-black/40 p-2 rounded-xl border border-white/10">
        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
          🔒 Phụ âm đã mở: Khóa sẵn
        </span>
        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
          🎵 Nguyên âm: Tự gắn dấu thanh
        </span>
        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
          ✏️ Ô chữ: Tự động điền theo từ bạn gõ
        </span>
      </div>

      {/* Interactive Character Slots Grouped by Word */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2.5 p-3 rounded-2xl bg-[#07111e] border border-white/15 shadow-inner">
        {words.map((wordSlots, wIdx) => (
          <div key={wIdx} className="flex items-center gap-1">
            {wordSlots.map((slot) => {
              const val = charValues[slot.index] || "";
              const isFocused = focusedSlotIdx === slot.index;

              if (slot.isLockedConsonant) {
                return (
                  <div
                    key={slot.index}
                    className="w-8 h-10 sm:w-9 sm:h-11 rounded-lg bg-emerald-950/80 border-2 border-emerald-500/50 text-emerald-200 font-black text-sm sm:text-base flex flex-col items-center justify-center select-none shadow"
                    title="Phụ âm đã mở sẵn"
                  >
                    <span>{slot.baseChar}</span>
                    <span className="text-[7px] text-emerald-400/80 font-normal">KHÓA</span>
                  </div>
                );
              }

              return (
                <input
                  key={slot.index}
                  ref={(el) => {
                    inputRefs.current[slot.index] = el;
                  }}
                  type="text"
                  value={val}
                  onFocus={() => setFocusedSlotIdx(slot.index)}
                  onCompositionStart={() => {
                    isComposingRef.current = true;
                  }}
                  onCompositionEnd={(e) => {
                    isComposingRef.current = false;
                    handleSlotChange(slot.index, e.currentTarget.value);
                  }}
                  onKeyDown={(e) => handleSlotKeyDown(slot.index, e)}
                  onChange={(e) => handleSlotChange(slot.index, e.target.value)}
                  placeholder={slot.isRevealedVowel ? slot.baseChar : "_"}
                  className={`w-8 h-10 sm:w-9 sm:h-11 rounded-lg text-center font-black text-sm sm:text-base uppercase transition-all focus:outline-none ${
                    slot.isRevealedVowel
                      ? isFocused
                        ? "bg-amber-400 text-slate-950 border-2 border-white shadow-[0_0_15px_#f59e0b] scale-105"
                        : "bg-amber-500/25 text-amber-200 border-2 border-amber-400/70"
                      : isFocused
                      ? "bg-cyan-400 text-slate-950 border-2 border-white shadow-[0_0_15px_#06b6d4] scale-105"
                      : "bg-slate-900 text-white border-2 border-cyan-500/50"
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* 1-Click Tone Mark Selector Bar for Vowels */}
      <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-400/30 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-amber-200">
          🎶 Hoặc chọn nhanh dấu thanh cho ô nguyên âm đang click:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {TONE_BUTTONS.map((tb) => (
            <button
              key={tb.tone}
              type="button"
              disabled={!canApplyToneToFocused}
              onClick={() => {
                if (focusedSlotIdx !== null) applyToneAtSlot(focusedSlotIdx, tb.tone);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition ${
                canApplyToneToFocused
                  ? "bg-amber-400/20 hover:bg-amber-400 text-amber-200 hover:text-slate-950 border border-amber-400/50 cursor-pointer"
                  : "bg-white/5 text-slate-500 border border-white/10 opacity-40 cursor-not-allowed"
              }`}
            >
              {tb.label} <span className="opacity-70 text-[9px]">[{tb.keyHint}]</span>
            </button>
          ))}
        </div>
      </div>

      {/* Continuous Attempt Log (Special Final Round) */}
      {continuousMode && attemptLog.length > 0 && (
        <div className="p-2 rounded-xl bg-black/40 border border-white/10 max-h-20 overflow-y-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
            Các phương án đã thử ({attemptLog.length}):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {attemptLog.map((att, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-200 text-[10px] font-mono"
              >
                {att}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-300 transition cursor-pointer"
          >
            Đóng lại
          </button>
        )}
        <button
          type="button"
          onClick={handleTriggerSubmit}
          className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-110 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition cursor-pointer"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

interface Hostess3DStudioProps {
  xPercent: number;
  activeRow: number;
  facing: "LEFT" | "RIGHT";
  pose: "IDLE" | "GESTURE" | "WALKING" | "TOUCHING";
}

function Hostess3DStudio({ xPercent, activeRow, facing, pose }: Hostess3DStudioProps) {
  const isRightSide = facing === "LEFT"; // If facing LEFT, standing on the right edge
  const isTouching = pose === "TOUCHING";
  const isGesture = pose === "GESTURE";
  const isWalking = pose === "WALKING";

  // Dynamic 3D rotation, pitch, and lean
  const rowReachAngles = [-46, -26, -6, 16];
  const armReachAngle = isTouching ? (rowReachAngles[activeRow] ?? -16) : isGesture ? -20 : 0;
  const torsoPitch = isTouching ? (activeRow === 0 ? -10 : activeRow === 1 ? -4 : 4) : 0;
  const baseRotateY = isRightSide ? -18 : 18;
  const dynamicRotateY = isTouching ? (isRightSide ? -36 : 36) : isGesture ? (isRightSide ? -24 : 24) : baseRotateY;
  const dynamicLeanZ = isTouching ? (isRightSide ? 6 : -6) : 0;

  return (
    <div
      className="absolute z-30 pointer-events-none transition-all duration-500 ease-out select-none"
      style={{
        left: `${Math.max(4.5, Math.min(95.5, xPercent))}%`,
        bottom: "6px",
        transform: "translateX(-50%)",
        perspective: "850px",
      }}
    >
      <div
        className="relative flex flex-col items-center"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateY(${dynamicRotateY}deg) rotateZ(${dynamicLeanZ}deg)`,
          transition: "transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Pulsing Sparkle Burst at index finger when touching or gesturing */}
        {(isTouching || isGesture) && (
          <div
            className="absolute z-40 text-xl sm:text-2xl animate-ping"
            style={{
              top: isTouching ? `${18 + activeRow * 16}px` : "24px",
              right: isRightSide ? "auto" : "-16px",
              left: isRightSide ? "-16px" : "auto",
              filter: "drop-shadow(0 0 10px #facc15)",
            }}
          >
            ✨
          </div>
        )}

        {/* 3D Stylized Studio Hostess Avatar with Full Slender Legs and High Heels */}
        <div className={`relative w-20 sm:w-24 md:w-28 lg:w-32 h-44 sm:h-52 md:h-60 lg:h-68 drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)] ${isWalking ? "animate-bounce" : ""}`}>
          <svg viewBox="0 0 100 215" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="hostessGownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="35%" stopColor="#e11d48" />
                <stop offset="85%" stopColor="#9f1239" />
                <stop offset="100%" stopColor="#4c0519" />
              </linearGradient>

              <linearGradient id="hostessGoldMetal" x1="0%" y1="0%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="35%" stopColor="#facc15" />
                <stop offset="70%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#854d0e" />
              </linearGradient>

              <linearGradient id="hostessSkinGrad" x1="20%" y1="0%" x2="80%" y2="100%">
                <stop offset="0%" stopColor="#fff1f2" />
                <stop offset="50%" stopColor="#ffe4e6" />
                <stop offset="100%" stopColor="#fecdd3" />
              </linearGradient>

              <linearGradient id="hostessHairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#312e81" />
                <stop offset="30%" stopColor="#1e1b4b" />
                <stop offset="75%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </linearGradient>

              <radialGradient id="hostessCheekBlush" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fb7185" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* 3D Catwalk Contact Floor Shadow */}
            <ellipse cx="50" cy="204" rx="28" ry="5.5" fill="rgba(0,0,0,0.65)" filter="blur(2.5px)" />

            {/* Back Hair Strands */}
            <path
              d="M32 26 C20 35 18 65 24 82 C32 75 68 75 76 82 C82 65 80 35 68 26 C60 14 40 14 32 26 Z"
              fill="url(#hostessHairGrad)"
            />

            {/* ── Slender Legs & High-Heeled Stiletto Pumps ── */}
            <g id="hostessLegs">
              {/* Back / Supporting Right Leg */}
              <path
                d="M52 110 C53 130 55 152 54 172 C53 182 52 192 51 198"
                stroke="url(#hostessSkinGrad)"
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
              {/* Right Gold Stiletto Pump */}
              <path
                d="M48 196 L53 199 L58 199 C59 198 56 195 53 195 Z"
                fill="url(#hostessGoldMetal)"
              />
              {/* Right Heel Spike */}
              <line x1="49" y1="196" x2="49" y2="203" stroke="url(#hostessGoldMetal)" strokeWidth="2" strokeLinecap="round" />

              {/* Front Left Shapely Leg (revealed gracefully via slit) */}
              <path
                d="M42 105 C40 125 43 148 45 168 C46 178 45 188 44 196"
                stroke="url(#hostessSkinGrad)"
                strokeWidth="7.5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Front Knee Contour */}
              <ellipse cx="44" cy="148" rx="3.5" ry="4.5" fill="url(#hostessSkinGrad)" opacity="0.9" />

              {/* Left Gold Stiletto Pump */}
              <path
                d="M39 194 L44 198 L50 198 C52 197 48 193 44 193 Z"
                fill="url(#hostessGoldMetal)"
              />
              {/* Left Shoe Sparkle */}
              <circle cx="43" cy="195" r="1.2" fill="#ffffff" />
              {/* Left Heel Spike reaching ground at y=203 */}
              <line x1="40" y1="194" x2="40" y2="203" stroke="url(#hostessGoldMetal)" strokeWidth="2.2" strokeLinecap="round" />
            </g>

            {/* Evening Gown Flowing Skirt with High Side Slit / Áo Dài Tà Xòe */}
            <path
              d="M36 78 C30 102 24 135 18 160 C32 163 48 160 52 152 C48 132 46 100 64 78 Z"
              fill="url(#hostessGownGrad)"
              stroke="#fda4af"
              strokeWidth="0.8"
            />
            {/* 3D Gown Silk Pleats */}
            <path d="M42 80 C36 105 30 135 24 158" stroke="#881337" strokeWidth="1.5" strokeOpacity="0.7" fill="none" />
            <path d="M48 78 C44 105 40 130 36 156" stroke="#f43f5e" strokeWidth="1.2" strokeOpacity="0.8" fill="none" />
            <path d="M58 80 C60 102 61 125 62 142" stroke="#4c0519" strokeWidth="1.4" strokeOpacity="0.7" fill="none" />

            {/* Golden Embroidery Trim on Skirt Slit */}
            <path d="M18 160 Q35 164 52 152" stroke="url(#hostessGoldMetal)" strokeWidth="2.5" fill="none" />
            <circle cx="51" cy="153" r="2" fill="#fef08a" />

            {/* Hourglass Bodice / Torso (with 3D lean and pitch) */}
            <g style={{ transform: `rotate(${torsoPitch}deg)`, transformOrigin: "50px 75px", transition: "transform 400ms" }}>
              <path
                d="M35 52 C35 44 42 42 50 42 C58 42 65 44 65 52 C65 62 60 76 58 78 C54 80 46 80 42 78 C40 76 35 62 35 52 Z"
                fill="url(#hostessGownGrad)"
                stroke="#fda4af"
                strokeWidth="0.7"
              />
              {/* Sweetheart Neckline Trim */}
              <path d="M38 50 Q50 56 62 50" stroke="url(#hostessGoldMetal)" strokeWidth="1.8" fill="none" />

              {/* Golden Cinched Waist Belt */}
              <rect x="40" y="74" width="20" height="5" rx="2" fill="url(#hostessGoldMetal)" />
              <rect x="48" y="73" width="4" height="7" rx="1" fill="#fff" opacity="0.8" />

              {/* Slender Neck & Diamond Choker */}
              <rect x="46" y="34" width="8" height="9" rx="3" fill="url(#hostessSkinGrad)" />
              <path d="M45 40 Q50 43 55 40" stroke="url(#hostessGoldMetal)" strokeWidth="1.6" fill="none" />
              <circle cx="50" cy="42" r="1.2" fill="#fff" />

              {/* Head / Face */}
              <ellipse cx="50" cy="27" rx="12" ry="14" fill="url(#hostessSkinGrad)" />
              {/* Cheek Blush */}
              <ellipse cx="43" cy="30" rx="3.5" ry="2" fill="url(#hostessCheekBlush)" />
              <ellipse cx="57" cy="30" rx="3.5" ry="2" fill="url(#hostessCheekBlush)" />

              {/* Elegant Eyes & Eyelashes */}
              <ellipse cx="44.5" cy="25" rx="2.2" ry="1.6" fill="#0f172a" />
              <ellipse cx="55.5" cy="25" rx="2.2" ry="1.6" fill="#0f172a" />
              <circle cx="45.2" cy="24.4" r="0.7" fill="#ffffff" />
              <circle cx="56.2" cy="24.4" r="0.7" fill="#ffffff" />
              <path d="M42 22.5 Q45 21 47.5 22.5" stroke="#1e1b4b" strokeWidth="0.9" fill="none" />
              <path d="M52.5 22.5 Q55 21 58 22.5" stroke="#1e1b4b" strokeWidth="0.9" fill="none" />

              {/* Radiant Smile with Ruby Lips */}
              <path d="M46.5 32 Q50 35.5 53.5 32" stroke="#be123c" strokeWidth="1.8" fill="none" strokeLinecap="round" />

              {/* Stylized Voluminous Hair Over Forehead & Shoulders */}
              <path
                d="M34 22 C34 10 66 10 66 22 C66 26 62 25 59 23 C53 20 47 20 41 23 C38 25 34 26 34 22 Z"
                fill="url(#hostessHairGrad)"
              />
              <path d="M34 22 C31 30 33 46 37 54 C39 48 37 32 36 24 Z" fill="url(#hostessHairGrad)" />
              <path d="M66 22 C69 30 67 46 63 54 C61 48 63 32 64 24 Z" fill="url(#hostessHairGrad)" />

              {/* Sparkling Golden Hair Tiara / Crown */}
              <polygon points="42,12 50,5 58,12 54,14 46,14" fill="url(#hostessGoldMetal)" />
              <circle cx="50" cy="8" r="1.2" fill="#ffffff" />

              {/* Rest Arm */}
              <path
                d="M35 48 C28 58 29 70 33 78"
                stroke="url(#hostessSkinGrad)"
                strokeWidth="4.8"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx="33" cy="78" r="2.4" fill="url(#hostessSkinGrad)" />

              {/* Dynamic Arm Reaching to Target Tile Row */}
              {isTouching ? (
                <g
                  style={{
                    transformOrigin: "64px 48px",
                    transform: `rotate(${armReachAngle}deg)`,
                    transition: "transform 400ms ease-out",
                  }}
                >
                  <path
                    d="M64 48 C76 42 86 32 94 18"
                    stroke="url(#hostessSkinGrad)"
                    strokeWidth="5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d="M93 19 L99 12"
                    stroke="url(#hostessSkinGrad)"
                    strokeWidth="3.2"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <circle cx="86" cy="32" r="3" fill="none" stroke="url(#hostessGoldMetal)" strokeWidth="1.5" />
                </g>
              ) : isGesture ? (
                <g style={{ transition: "all 400ms ease-out" }}>
                  <path
                    d="M64 48 C76 46 84 38 88 28"
                    stroke="url(#hostessSkinGrad)"
                    strokeWidth="4.8"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path d="M87 29 L92 24" stroke="url(#hostessSkinGrad)" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <circle cx="82" cy="40" r="2.8" fill="none" stroke="url(#hostessGoldMetal)" strokeWidth="1.5" />
                </g>
              ) : (
                <g>
                  <path
                    d="M65 48 C72 58 70 70 66 78"
                    stroke="url(#hostessSkinGrad)"
                    strokeWidth="4.8"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <circle cx="66" cy="78" r="2.4" fill="url(#hostessSkinGrad)" />
                </g>
              )}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function MagicWheelBoard({
  magicWheelState,
  wheelState,
  teams,
  myTeamId,
  isHost = false,
  isDisplay = false,
  isMyTurn,
  onSpin,
  onGuessLetter,
  onSolvePuzzle,
  onMysteryDecide,
  onSelectRewardCard,
  onTradeDecide,
  onLuckyPick,
  onAdvanceRound,
  onOverrideTurn,
  onPassTurn,
  onTossUpStart,
  onTossUpBuzz,
  onTossUpRevealTick,
  onExpressDecide,
  onStealSwapDecide,
  onSpecialChooseOrder,
  onSpecialPickLetters,
  onSetOperationMode,
  onJudgeSolve,
  onNextRound,
  onRevealAll,
  onQuickRevealLetter,
  onOpenBoard,
}: MagicWheelBoardProps) {
  const activeState = magicWheelState || wheelState;
  if (!activeState) return null;

  const {
    sectors,
    currentTurnTeamId,
    currentTurnTeamName,
    currentRound,
    maxRounds,
    roundStage = "MAIN",
    mainRoundNumber = 1,
    totalMainRounds = 3,
    operationMode = "SELF_SERVICE",
    currentPuzzle,
    isSpinning,
    targetRotationDegrees,
    selectedSector,
    guessedLetters,
    roundScores,
    phase,
    subMode,
    lastActionMessage,
    freeSpinCount,
    mustSolveWithTones = false,
    tossUpBuzzedTeamId,
    tossUpBuzzedTeamName,
    jackpotPool,
    expressModeActive = false,
    speedUpBellActive = false,
    specialAllowedLettersCount = 3,
    specialSolveEndsAt,
    specialAttemptLog = [],
    roundEliminatedTeamIds = [],
    lastSolveFeedback,
  } = activeState;

  const [solveModalOpen, setSolveModalOpen] = useState<boolean>(false);
  const [specialPickedSet, setSpecialPickedSet] = useState<string[]>([]);
  const [specialRemainingSec, setSpecialRemainingSec] = useState<number>(40);
  const [isBoardShaking, setIsBoardShaking] = useState<boolean>(false);
  const prevSolveFeedbackRef = useRef<typeof lastSolveFeedback>(undefined);

  const isCurrentTeamEliminated = roundEliminatedTeamIds.includes(currentTurnTeamId);
  const isTossUpRound = roundStage === "TOSS_UP_1" || roundStage === "TOSS_UP_2";

  const isInsideSandbox = typeof window !== "undefined" && (window.self !== window.top || window.location.search.includes("sandbox=1"));
  // All devices (Display, Contestant, Host) play game sound effects
  const canPlayBoardAudio = true;

  useEffect(() => {
    if (!lastSolveFeedback || lastSolveFeedback === prevSolveFeedbackRef.current) return;
    prevSolveFeedbackRef.current = lastSolveFeedback;

    const isCorrect = Boolean(lastSolveFeedback.isCorrect ?? lastSolveFeedback.success);
    if (isCorrect) {
      if (canPlayBoardAudio) soundManager.playMagicWheelSolveWin();
    } else {
      if (canPlayBoardAudio) soundManager.playMagicWheelWrong();
      setIsBoardShaking(true);
      const timer = setTimeout(() => setIsBoardShaking(false), 800);
      return () => clearTimeout(timer);
    }
  }, [lastSolveFeedback, canPlayBoardAudio]);

  const effectiveIsMyTurn =
    isMyTurn !== undefined
      ? isMyTurn
      : Boolean(myTeamId && (myTeamId === currentTurnTeamId || myTeamId === tossUpBuzzedTeamId));
  // In SELF_SERVICE mode, current turn player or host can act; in HOST_ASSISTED mode, host controls main board actions (though players can still buzz in Toss-Up)
  const canInteract =
    operationMode === "HOST_ASSISTED"
      ? Boolean(isHost || effectiveIsMyTurn)
      : Boolean(effectiveIsMyTurn || isHost);

  // Special Final 40s countdown (30s thinking + 10s answering)
  useEffect(() => {
    if (phase !== "SPECIAL_SOLVING" || !specialSolveEndsAt) return;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((specialSolveEndsAt - Date.now()) / 1000));
      setSpecialRemainingSec(rem);
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [phase, specialSolveEndsAt]);

  useEffect(() => {
    if (phase === "SPECIAL_PICK_LETTERS") {
      setSpecialPickedSet([]);
    }
  }, [phase, currentRound]);

  // Power bar animation for auto-oscillating effect
  const [oscillatingPower, setOscillatingPower] = useState<number>(65);
  useEffect(() => {
    if ((phase !== "SPIN_WAITING" && phase !== "SPECIAL_SPIN_WAITING") || isSpinning) return;
    let dir = 1;
    const interval = setInterval(() => {
      setOscillatingPower((prev) => {
        let next = prev + dir * 3;
        if (next >= 100) { next = 100; dir = -1; }
        if (next <= 10) { next = 10; dir = 1; }
        return next;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [phase, isSpinning]);

  // ── 3D Wheel Physics & DOM Refs ──────────────────────────────────────────
  const wheelRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const wheelPrevAngleRef = useRef<number>(0);
  const lastSnapTimeRef = useRef<number>(0);
  const [clientWheelAngle, setClientWheelAngle] = useState<number>(0);
  const [isWheelZoomedIn, setIsWheelZoomedIn] = useState<boolean>(false);
  const [wheelZoomDurationMs, setWheelZoomDurationMs] = useState<number>(7000);
  const [localIsSpinning, setLocalIsSpinning] = useState<boolean>(false);
  const effectiveIsSpinning = Boolean(isSpinning || localIsSpinning);
  useEffect(() => {
    if (isSpinning) {
      setLocalIsSpinning(false);
    }
  }, [isSpinning]);

  // ── TV Board Staged Appearance Sequence ───────────────────────────────────
  const [boardStage, setBoardStage] = useState<"EMPTY_56" | "BLANK_PHRASE" | "READY_CLUE">("EMPTY_56");
  const effectiveBoardStage: "EMPTY_56" | "BLANK_PHRASE" | "READY_CLUE" =
    activeState.boardStage || boardStage;

  const prevBoardStageRef = useRef<string>(activeState.boardStage || "EMPTY_56");
  useEffect(() => {
    const curStage = activeState.boardStage || "EMPTY_56";
    if (prevBoardStageRef.current === "EMPTY_56" && curStage === "BLANK_PHRASE") {
      if (canPlayBoardAudio) {
        soundManager.playMagicWheelBoardOpen();
      }
    }
    prevBoardStageRef.current = curStage;
    setBoardStage(curStage);
  }, [currentRound, activeState.boardStage, canPlayBoardAudio]);

  const handleOpenBoard = useCallback(() => {
    if (canPlayBoardAudio) soundManager.playMagicWheelBoardOpen();
    setBoardStage("BLANK_PHRASE");
    onOpenBoard?.();
    setTimeout(() => {
      setBoardStage("READY_CLUE");
    }, 1400);
  }, [canPlayBoardAudio, onOpenBoard]);

  // ── Ô May Mắn 2-Step Interaction State ──────────────────────────────────
  const [luckyGreenSelectedIdx, setLuckyGreenSelectedIdx] = useState<number | null>(null);
  useEffect(() => {
    if (phase !== "LUCKY_PICK") {
      setLuckyGreenSelectedIdx(null);
    }
  }, [phase]);

  // ── Ô Phần Thưởng 20 Lá Thăm Bí Mật ─────────────────────────────────────
  const [rewardCards, setRewardCards] = useState<RewardCardItem[]>([]);
  const [pickedRewardCardIdx, setPickedRewardCardIdx] = useState<number | null>(null);
  useEffect(() => {
    if (phase === "REWARD_CHOICE") {
      setRewardCards(generate20RewardCards());
      setPickedRewardCardIdx(null);
    }
  }, [phase]);

  // ── Helper: Compute 4x14 Cell Coordinates for Current Puzzle ──────────────
  const ROWS = 4;
  const COLS = 14;

  const cellPositionsMap = useMemo(() => {
    const map: Record<number, { col: number; row: number; char: string }> = {};
    const phrase = (currentPuzzle?.secretPhrase || "").toUpperCase();
    if (!phrase) return map;

    const words = phrase.split(" ");
    const rowLines: Array<Array<{ word: string; startGlobalIdx: number }>> = [[], [], [], []];
    let targetRow = 1;
    let charGlobalCounter = 0;

    for (const w of words) {
      const lineLen = rowLines[targetRow].reduce((acc, curr) => acc + curr.word.length + 1, 0);
      if (lineLen + w.length <= COLS) {
        rowLines[targetRow].push({ word: w, startGlobalIdx: charGlobalCounter });
      } else if (targetRow + 1 < ROWS) {
        targetRow++;
        rowLines[targetRow].push({ word: w, startGlobalIdx: charGlobalCounter });
      } else {
        rowLines[0].push({ word: w, startGlobalIdx: charGlobalCounter });
      }
      charGlobalCounter += w.length + 1;
    }

    rowLines.forEach((lineWords, rIdx) => {
      if (lineWords.length === 0) return;
      const totalCharsInLine = lineWords.reduce((acc, curr) => acc + curr.word.length, 0) + (lineWords.length - 1);
      let startCol = Math.max(0, Math.floor((COLS - totalCharsInLine) / 2));
      lineWords.forEach((item, wIdx) => {
        const originalIdx = item.startGlobalIdx;
        for (let c = 0; c < item.word.length; c++) {
          if (startCol < COLS) {
            map[originalIdx + c] = { col: startCol, row: rIdx, char: item.word[c] };
            startCol++;
          }
        }
        if (wIdx < lineWords.length - 1 && startCol < COLS) {
          startCol++;
        }
      });
    });

    return map;
  }, [currentPuzzle?.secretPhrase]);

  // ── Virtual Hostess ("Người Mẫu") Intelligent 1-Way Movement & Reveal ─────
  const [hostessSide, setHostessSide] = useState<"LEFT" | "RIGHT">("LEFT");
  const hostessSideRef = useRef<"LEFT" | "RIGHT">("LEFT");
  const [hostessXPercent, setHostessXPercent] = useState<number>(3.5); // 3.5% (left edge beside board) to 96.5% (right edge beside board)
  const [hostessFacing, setHostessFacing] = useState<"LEFT" | "RIGHT">("RIGHT");
  const [hostessPose, setHostessPose] = useState<"IDLE" | "GESTURE" | "WALKING" | "TOUCHING">("IDLE");
  const [hostessActiveRow, setHostessActiveRow] = useState<number>(1);

  const [highlightedIndices, setHighlightedIndices] = useState<Set<number>>(new Set());
  const [justPoppedIndices, setJustPoppedIndices] = useState<Set<number>>(new Set());
  const [animRevealedIndices, setAnimRevealedIndices] = useState<Set<number>>(
    new Set(currentPuzzle?.revealedIndices || [])
  );
  const prevServerRevealedRef = useRef<number[]>(currentPuzzle?.revealedIndices || []);
  const prevPuzzleIdRef = useRef<string | undefined>(currentPuzzle?.id);
  const activeTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const triggerTilePop = useCallback((idx: number) => {
    setJustPoppedIndices((prev) => new Set([...prev, idx]));
    const t = setTimeout(() => {
      setJustPoppedIndices((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }, 700);
    activeTimersRef.current.push(t);
  }, []);

  const clearChoreographyTimers = useCallback(() => {
    for (const t of activeTimersRef.current) {
      clearTimeout(t);
    }
    activeTimersRef.current = [];
  }, []);

  // Reset revealed state when puzzle changes
  useEffect(() => {
    if (currentPuzzle?.id !== prevPuzzleIdRef.current) {
      prevPuzzleIdRef.current = currentPuzzle?.id;
      clearChoreographyTimers();
      const initialSet = new Set(currentPuzzle?.revealedIndices || []);
      prevServerRevealedRef.current = [...(currentPuzzle?.revealedIndices || [])];
      setHighlightedIndices(new Set());
      setAnimRevealedIndices(initialSet);
      setHostessPose("IDLE");
      setHostessXPercent(hostessSideRef.current === "LEFT" ? 3.5 : 96.5);
    }
  }, [currentPuzzle?.id, currentPuzzle?.revealedIndices, clearChoreographyTimers]);

  // Sequential Highlight (highlight.mp3) -> Hostess Intelligent Reveal (letter_open.mp3)
  useEffect(() => {
    const serverRevealed = currentPuzzle?.revealedIndices || [];
    const newLetters = serverRevealed.filter((idx) => !prevServerRevealedRef.current.includes(idx));
    prevServerRevealedRef.current = [...serverRevealed];

    if (newLetters.length === 0) {
      return;
    }

    // If round recap (whole puzzle revealed at once), reveal all immediately
    if (phase === "ROUND_RECAP") {
      clearChoreographyTimers();
      setHighlightedIndices(new Set());
      setAnimRevealedIndices(new Set(serverRevealed));
      soundManager.playMagicWheelSolveWin();
      setHostessPose("GESTURE");
      const t = setTimeout(() => setHostessPose("IDLE"), 2500);
      activeTimersRef.current.push(t);
      return;
    }

    // In Toss-Up running mode, if 1 letter is revealed via tick, handle it according to Toss-Up rules
    if (roundStage === "TOSS_UP_1" || roundStage === "TOSS_UP_2") {
      newLetters.forEach((tileIdx) => {
        triggerTilePop(tileIdx);
      });
      soundManager.playMagicWheelLetterReveal();
      setAnimRevealedIndices(new Set(serverRevealed));
      return;
    }

    // Sort new letters by column (left -> right), then row (top -> bottom)
    const sortedAsc = [...newLetters].sort((a, b) => {
      const posA = cellPositionsMap[a] || { col: 0, row: 0 };
      const posB = cellPositionsMap[b] || { col: 0, row: 0 };
      if (posA.col !== posB.col) return posA.col - posB.col;
      return posA.row - posB.row;
    });

    // STEP 1: Sequential Highlight (play highlight.mp3 on each tile)
    const highlightStepMs = 430;
    sortedAsc.forEach((tileIdx, stepIdx) => {
      const t = setTimeout(() => {
        setHighlightedIndices((prev) => new Set([...prev, tileIdx]));
        soundManager.playMagicWheelMark(); // Plays /sounds/magic-wheel/highlight.mp3
      }, stepIdx * highlightStepMs);
      activeTimersRef.current.push(t);
    });

    const totalHighlightTime = sortedAsc.length * highlightStepMs + 350;

    // STEP 2: Virtual Hostess Intelligent 1-Way Movement & Tile Opening (letter_open.mp3)
    const startSide = hostessSideRef.current;
    const isNearStartSide = sortedAsc.every((idx) => {
      const col = cellPositionsMap[idx]?.col ?? 7;
      return startSide === "LEFT" ? col <= 3 : col >= 10;
    });
    const useStayAndGesture = sortedAsc.length <= 2 && isNearStartSide;

    if (useStayAndGesture) {
      // Hostess stays at her current side, turns & extends her hand gracefully
      const gestureStart = setTimeout(() => {
        setHostessFacing(startSide === "LEFT" ? "RIGHT" : "LEFT");
        setHostessPose("GESTURE");
      }, totalHighlightTime - 150);
      activeTimersRef.current.push(gestureStart);

      const revealStepMs = 420;
      sortedAsc.forEach((tileIdx, rStep) => {
        const t = setTimeout(() => {
          setHighlightedIndices((prev) => {
            const next = new Set(prev);
            next.delete(tileIdx);
            return next;
          });
          setAnimRevealedIndices((prev) => new Set([...prev, tileIdx]));
          triggerTilePop(tileIdx);
          soundManager.playMagicWheelLetterReveal(); // Plays /sounds/magic-wheel/letter_open.mp3
        }, totalHighlightTime + rStep * revealStepMs);
        activeTimersRef.current.push(t);
      });

      const finishTimer = setTimeout(() => {
        setHostessPose("IDLE");
      }, totalHighlightTime + sortedAsc.length * revealStepMs + 400);
      activeTimersRef.current.push(finishTimer);
    } else {
      // Hostess walks strictly in ONE direction from startSide to oppositeSide!
      // Never walks backward or zig-zags!
      const walkDirection = startSide === "LEFT" ? "LEFT_TO_RIGHT" : "RIGHT_TO_LEFT";
      const targetEndSide: "LEFT" | "RIGHT" = startSide === "LEFT" ? "RIGHT" : "LEFT";

      const orderedForWalk = [...sortedAsc].sort((a, b) => {
        const posA = cellPositionsMap[a] || { col: 0, row: 0 };
        const posB = cellPositionsMap[b] || { col: 0, row: 0 };
        if (posA.col !== posB.col) {
          return walkDirection === "LEFT_TO_RIGHT" ? posA.col - posB.col : posB.col - posA.col;
        }
        return posA.row - posB.row;
      });

      let elapsedWalkMs = totalHighlightTime;
      let prevCol = startSide === "LEFT" ? -1 : 14;

      orderedForWalk.forEach((tileIdx) => {
        const pos = cellPositionsMap[tileIdx] || { col: 7, row: 1 };
        const colDist = Math.abs(pos.col - prevCol);
        const travelMs = Math.max(240, colDist * 130);

        // Move hostess to column
        const moveTimer = setTimeout(() => {
          setHostessFacing(walkDirection === "LEFT_TO_RIGHT" ? "RIGHT" : "LEFT");
          setHostessPose("WALKING");
          setHostessActiveRow(pos.row);
          const colPercent = ((pos.col + 0.5) / COLS) * 100;
          setHostessXPercent(colPercent);
        }, elapsedWalkMs);
        activeTimersRef.current.push(moveTimer);

        elapsedWalkMs += travelMs;

        // Touch & open tile
        const touchTimer = setTimeout(() => {
          setHostessPose("TOUCHING");
          setHostessActiveRow(pos.row);
          setHighlightedIndices((prev) => {
            const next = new Set(prev);
            next.delete(tileIdx);
            return next;
          });
          setAnimRevealedIndices((prev) => new Set([...prev, tileIdx]));
          triggerTilePop(tileIdx);
          soundManager.playMagicWheelLetterReveal(); // Plays /sounds/magic-wheel/letter_open.mp3
        }, elapsedWalkMs);
        activeTimersRef.current.push(touchTimer);

        elapsedWalkMs += 360;
        prevCol = pos.col;
      });

      // Continue walking in the SAME direction to park at the opposite side of the board
      const finishWalkTimer = setTimeout(() => {
        setHostessPose("WALKING");
        setHostessXPercent(targetEndSide === "RIGHT" ? 96.5 : 3.5);
      }, elapsedWalkMs);
      activeTimersRef.current.push(finishWalkTimer);

      const parkTimer = setTimeout(() => {
        setHostessSide(targetEndSide);
        hostessSideRef.current = targetEndSide;
        setHostessFacing(targetEndSide === "LEFT" ? "RIGHT" : "LEFT");
        setHostessPose("IDLE");
      }, elapsedWalkMs + 550);
      activeTimersRef.current.push(parkTimer);
    }
  }, [currentPuzzle?.revealedIndices, phase, roundStage, cellPositionsMap, clearChoreographyTimers, triggerTilePop]);

  // ── Toss-Up 1 & 2 Special Choreography Effect ─────────────────────────────
  // Requirement 10:
  // "MC đặt tay lên một ô chữ bất kỳ gần họ, nó sẽ highlight, rồi một lúc ngay sau đó hiện chữ cái ở đó,
  // rồi các chữ cái khác tiếp tục hiện sau mỗi 0.5s (không qua highlight nữa). phát đúng âm thanh nữa nhé"
  const tossUpFirstTileDoneRef = useRef<boolean>(false);
  useEffect(() => {
    if (roundStage !== "TOSS_UP_1" && roundStage !== "TOSS_UP_2") {
      tossUpFirstTileDoneRef.current = false;
      return;
    }
    if (phase === "TOSS_UP_READY") {
      tossUpFirstTileDoneRef.current = false;
    }
  }, [roundStage, phase, currentRound]);

  useEffect(() => {
    if (phase !== "TOSS_UP_RUNNING" && phase !== "TOSS_UP_REVEALING") return;
    if (effectiveBoardStage === "EMPTY_56") {
      handleOpenBoard();
    }

    const phrase = currentPuzzle?.secretPhrase || "";
    if (!phrase) return;

    // Single authoritative tick driver:
    // In sandbox: only Display preview drives the ticks to avoid colliding loops.
    // In live room: Display drives if present, else Host drives.
    const isTickDriver = isInsideSandbox ? isDisplay : (isDisplay || isHost);
    if (!isTickDriver) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let firstOpenTimer: ReturnType<typeof setTimeout> | null = null;

    const getUnrevealedLetterIndices = () => {
      const currentRev = prevServerRevealedRef.current;
      const list: number[] = [];
      for (let i = 0; i < phrase.length; i++) {
        if (/[A-ZÀ-Ỹa-zà-ỹ0-9]/.test(phrase[i]) && !currentRev.includes(i) && !animRevealedIndices.has(i)) {
          list.push(i);
        }
      }
      return list;
    };

    const startRandomInterval = () => {
      intervalId = setInterval(() => {
        const unrevealed = getUnrevealedLetterIndices();
        if (unrevealed.length === 0) {
          if (intervalId) clearInterval(intervalId);
          return;
        }
        const randIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
        setAnimRevealedIndices((prev) => new Set([...prev, randIdx]));
        triggerTilePop(randIdx);
        soundManager.playMagicWheelLetterReveal(); // Plays letter_open.mp3 directly without highlight
        onTossUpRevealTick?.(randIdx);
      }, 750);
    };

    if (!tossUpFirstTileDoneRef.current && (currentPuzzle?.revealedIndices?.length || 0) === 0) {
      tossUpFirstTileDoneRef.current = true;
      const unrevealed = getUnrevealedLetterIndices();
      if (unrevealed.length > 0) {
        // Pick a tile near the current hostess/MC side
        const side = hostessSideRef.current;
        const sortedByNearSide = [...unrevealed].sort((a, b) => {
          const colA = cellPositionsMap[a]?.col ?? 7;
          const colB = cellPositionsMap[b]?.col ?? 7;
          return side === "LEFT" ? colA - colB : colB - colA;
        });
        const firstIdx = sortedByNearSide[0];
        const firstPos = cellPositionsMap[firstIdx] || { col: 2, row: 1 };

        // 1. MC/Hostess places hand on the tile near them -> tile highlights + highlight.mp3
        setHostessFacing(side === "LEFT" ? "RIGHT" : "LEFT");
        setHostessPose("TOUCHING");
        setHostessActiveRow(firstPos.row);
        setHostessXPercent(((firstPos.col + 0.5) / COLS) * 100);
        setHighlightedIndices(new Set([firstIdx]));
        soundManager.playMagicWheelMark(); // Plays highlight.mp3

        // 2. Right after waiting 1.0s (1000ms), letter appears + pop zoom + letter_open.mp3, then 0.5s random loop begins
        firstOpenTimer = setTimeout(() => {
          setHighlightedIndices(new Set());
          setAnimRevealedIndices((prev) => new Set([...prev, firstIdx]));
          triggerTilePop(firstIdx);
          soundManager.playMagicWheelLetterReveal(); // Plays letter_open.mp3
          onTossUpRevealTick?.(firstIdx);
          setHostessPose("IDLE");
          setHostessXPercent(side === "LEFT" ? 3.5 : 96.5);
          startRandomInterval();
        }, 1000);
      }
    } else {
      // Resuming after a wrong buzz: continue 0.75s random letter reveal directly
      startRandomInterval();
    }

    return () => {
      if (firstOpenTimer) clearTimeout(firstOpenTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [
    phase,
    effectiveBoardStage,
    currentPuzzle?.secretPhrase,
    currentPuzzle?.revealedIndices?.length,
    cellPositionsMap,
    animRevealedIndices,
    handleOpenBoard,
    isHost,
    isDisplay,
    isInsideSandbox,
    triggerTilePop,
    onTossUpRevealTick,
  ]);

  // ── Audio Engine Hooks ───────────────────────────────────────────────────
  const prevIsSpinning = useRef<boolean>(false);
  const prevWrongCount = useRef<number>(0);
  const prevPhase = useRef<string>(phase || "SPIN_WAITING");

  useEffect(() => {
    if (isSpinning && !prevIsSpinning.current) {
      if (canPlayBoardAudio) soundManager.playMagicWheelSpin();
    } else if (!isSpinning && prevIsSpinning.current) {
      if (canPlayBoardAudio) {
        soundManager.stopMagicWheelSpin();
        if (selectedSector) {
          if (selectedSector.type === "DOUBLE" || selectedSector.type === "TRIPLE") {
            soundManager.playMagicWheelDouble();
          } else if (selectedSector.type === "HALF") {
            soundManager.playMagicWheelHalve();
          } else if (selectedSector.type === "BANKRUPT") {
            soundManager.playMagicWheelBankrupt();
          } else if (selectedSector.type === "LOSE_TURN") {
            soundManager.playMagicWheelLoseTurn();
          } else if (
            selectedSector.type === "LUCKY" ||
            selectedSector.type === "EXTRA_TURN" ||
            selectedSector.type === "EXPRESS" ||
            selectedSector.type === "JACKPOT"
          ) {
            soundManager.playMagicWheelLucky();
          } else if (selectedSector.type === "PRIZE" || selectedSector.type === "BONUS_ENVELOPE") {
            soundManager.playMagicWheelReward();
          } else if (selectedSector.type === "MYSTERY" || selectedSector.type === "STEAL_SWAP") {
            soundManager.playMagicWheelMystery();
          } else {
            soundManager.playWheelStopChime();
          }
        }
      }
    }
    prevIsSpinning.current = Boolean(isSpinning);
  }, [isSpinning, selectedSector, canPlayBoardAudio]);

  const totalWrongGuesses = Object.values(activeState.wrongGuessesCount || {}).reduce((a, b) => a + b, 0);
  useEffect(() => {
    if (totalWrongGuesses > prevWrongCount.current) {
      if (canPlayBoardAudio) soundManager.playMagicWheelWrong();
    }
    prevWrongCount.current = totalWrongGuesses;
  }, [totalWrongGuesses, canPlayBoardAudio]);

  useEffect(() => {
    if (prevPhase.current === "ACTION_INPUT" && (phase as string) !== "ACTION_INPUT") {
      if (canPlayBoardAudio) soundManager.stopMagicWheelThinking();
    }

    if (canPlayBoardAudio) {
      if (phase === "ROUND_RECAP") {
        soundManager.playMagicWheelSolveWin();
      } else if (phase === "ACTION_INPUT" || phase === "SPECIAL_SOLVING") {
        soundManager.playMagicWheelThinking();
      } else if (phase === "TRADE_CHOICE") {
        soundManager.playMagicWheelTrade();
      } else if (phase === "TOSS_UP_BUZZED") {
        soundManager.playBuzz();
      }
    }
    prevPhase.current = phase;
  }, [phase, canPlayBoardAudio]);

  // ── 3D Wheel Animation Loop (RequestAnimationFrame) ──────────────────────
  useEffect(() => {
    const target = targetRotationDegrees;
    if (target === undefined || target === null) {
      wheelPrevAngleRef.current = 0;
      setClientWheelAngle(0);
      lastSnapTimeRef.current = 0;
      if (wheelRef.current) wheelRef.current.style.transform = "rotate(0deg)";
      if (needleRef.current) needleRef.current.style.transform = "rotate(0deg) scale(1.06) translateZ(0)";
      soundManager.stopWheelSpinMusic(150);
      return;
    }

    const startAngle = wheelPrevAngleRef.current;
    if (!effectiveIsSpinning) {
      if (target !== undefined && target !== null) {
        wheelPrevAngleRef.current = target;
        setClientWheelAngle(target);
        if (wheelRef.current) wheelRef.current.style.transform = `rotate(${target}deg)`;
      }
      setIsWheelZoomedIn(false);
      setWheelZoomDurationMs(800);
      lastSnapTimeRef.current = 0;
      if (needleRef.current) needleRef.current.style.transform = "rotate(0deg) scale(1.06) translateZ(0)";
      return;
    }

    // If local spin started before server target arrives, accelerate forward smoothly
    const effectiveTarget = (target !== undefined && target !== null && target > startAngle)
      ? target
      : startAngle + 2160;

    const durationMs = 15000 + Math.round(((activeState.spinPower || 65) / 100) * 6000);
    const segAngle = 360 / (sectors.length || 24);
    const totalDelta = effectiveTarget - startAngle;
    const startTime = performance.now();
    let lastPegIndex = Math.floor(startAngle / segAngle);
    let rafId = 0;
    let zoomStartTimer: ReturnType<typeof setTimeout> | null = null;

    lastSnapTimeRef.current = 0;
    if (wheelRef.current) wheelRef.current.style.transform = `rotate(${startAngle}deg)`;
    if (needleRef.current) needleRef.current.style.transform = "rotate(0deg) scale(1.06) translateZ(0)";

    soundManager.playWheelPegTick(0.05);

    setIsWheelZoomedIn(false);
    setWheelZoomDurationMs(7000);
    zoomStartTimer = setTimeout(() => {
      setIsWheelZoomedIn(true);
      setWheelZoomDurationMs(7000);
    }, 3000);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const rawProgress = Math.min(1, Math.max(0, elapsed / durationMs));
      const threePhaseProgress = evaluateThreePhaseWheelProgress(elapsed, durationMs);
      const currentLiveAngle = startAngle + totalDelta * threePhaseProgress;

      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${currentLiveAngle}deg)`;
      }

      const currentPegIndex = Math.floor(currentLiveAngle / segAngle);
      if (currentPegIndex > lastPegIndex) {
        lastPegIndex = currentPegIndex;
        lastSnapTimeRef.current = now;
        soundManager.playWheelPegTick(rawProgress);
      }

      let needleAngle = 0;
      if (elapsed < 60) {
        needleAngle = 0;
      } else {
        const pegDistToSnap = segAngle - (currentLiveAngle % segAngle);
        const contactWindow = 3.6;

        // Physical needle contact with oncoming chrome peg:
        // Wheel turns clockwise -> rim moves left-to-right past 12h -> peg pushes needle tip to the RIGHT (+deg)!
        if (pegDistToSnap <= contactWindow) {
          const contactProgress = 1.0 - pegDistToSnap / contactWindow;
          needleAngle = 20.0 * Math.pow(contactProgress, 1.15);
        } else if (lastSnapTimeRef.current > 0) {
          const dt = (now - lastSnapTimeRef.current) / 1000;
          if (dt < 0.085) {
            // Rebound bounce to left (-deg) with damped oscillation settling to 0
            needleAngle = -12.0 * Math.exp(-32.0 * dt) * Math.cos(50.0 * dt);
          } else {
            needleAngle = 0;
          }
        } else {
          needleAngle = 0;
        }
      }

      if (needleRef.current) {
        needleRef.current.style.transform = `rotate(${needleAngle}deg) scale(1.06) translateZ(0)`;
      }

      if (rawProgress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setLocalIsSpinning(false);
        if (wheelRef.current) {
          wheelRef.current.style.transform = `rotate(${effectiveTarget}deg)`;
        }
        setClientWheelAngle(effectiveTarget);
        wheelPrevAngleRef.current = effectiveTarget;
        if (needleRef.current) {
          needleRef.current.style.transform = "rotate(0deg) scale(1.06) translateZ(0)";
        }
      }
    };

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
      if (zoomStartTimer) clearTimeout(zoomStartTimer);
    };
  }, [effectiveIsSpinning, targetRotationDegrees, activeState.spinPower, sectors.length]);

  const activeTeam = teams.find((t) => t.id === (tossUpBuzzedTeamId || currentTurnTeamId));

  // Rule Vòng 3 check: Cấm đoán cả ô chữ khi chưa mở hết chữ
  const secretLettersOnly = (currentPuzzle?.secretPhrase || "").replace(/[^a-zA-Zà-ỹÀ-Ỹ]/g, "");
  const remainingHiddenLetters = Math.max(
    0,
    secretLettersOnly.length - (currentPuzzle?.revealedIndices?.length || 0)
  );
  const isSolveForbiddenInRound3 =
    roundStage === "MAIN" &&
    mainRoundNumber === 3 &&
    (activeState.round3ForbiddenSolveTeams || []).includes(currentTurnTeamId) &&
    remainingHiddenLetters > 0 &&
    !mustSolveWithTones;

  // ── Format 4-Row VTV3 Grid (14 columns per row) ───────────────────────────
  const gridMatrix = useMemo(() => {
    const matrix: Array<
      Array<{
        char: string;
        displayChar: string;
        isLetter: boolean;
        isRevealed: boolean;
        isHighlighted: boolean;
        originalIndex: number;
      } | null>
    > = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

    if (!currentPuzzle || !currentPuzzle.secretPhrase) {
      return matrix;
    }

    Object.entries(cellPositionsMap).forEach(([origIdxStr, pos]) => {
      const origIdx = Number(origIdxStr);
      const isRev = animRevealedIndices.has(origIdx);
      const isHl = highlightedIndices.has(origIdx);
      // CRITICAL REQUIREMENT: Show ONLY base letter without tone marks during play!
      // Full accented phrase is only shown on ROUND_RECAP after solving with exact tones.
      const displayChar =
        phase === "ROUND_RECAP" ? pos.char : normalizeVietnameseBaseLetter(pos.char);

      matrix[pos.row][pos.col] = {
        char: pos.char,
        displayChar,
        isLetter: true,
        isRevealed: isRev,
        isHighlighted: isHl,
        originalIndex: origIdx,
      };
    });

    return matrix;
  }, [currentPuzzle, cellPositionsMap, animRevealedIndices, highlightedIndices, phase]);

  // Stage Title Badge
  const stageBadgeLabel = useMemo(() => {
    if (roundStage === "TOSS_UP_1") return "⚡ VÒNG ĐOÁN NHANH 1 (+500đ)";
    if (roundStage === "TOSS_UP_2") return "⚡ VÒNG ĐOÁN NHANH 2 (+1.000đ & Quyền mở màn V1)";
    if (roundStage === "SPECIAL_FINAL") return "👑 VÒNG ĐẶC BIỆT CHUNG KẾT";
    if (mainRoundNumber === 4) return `💎 VÒNG CHÍNH 4/${totalMainRounds} (Tàu Tốc Độ & Hũ Kim Cương)`;
    if (mainRoundNumber === 5) return `⚔️ VÒNG CHÍNH 5/${totalMainRounds} (Đối Đầu & Chuyển Nhượng)`;
    if (mainRoundNumber >= 6) return `🔥 VÒNG CHÍNH ${mainRoundNumber}/${totalMainRounds} (Nhân Ba & Chuông Tăng Tốc)`;
    return `🎡 VÒNG CHÍNH ${mainRoundNumber}/${totalMainRounds}`;
  }, [roundStage, mainRoundNumber, totalMainRounds]);

  // Virtual MC Comment & Expression
  const mcReaction = useMemo(() => {
    if (mustSolveWithTones && phase !== "ROUND_RECAP") {
      return {
        emotion: "🧐",
        text:
          lastActionMessage ||
          `Tất cả chữ cái gốc trên bảng đã mở! Tuy nhiên chưa có dấu thanh — mời Đội ${currentTurnTeamName} bấm GIẢI Ô CHỮ và điền chính xác từng dấu thanh điệu!`,
      };
    }
    if (phase === "SPINNING") {
      return {
        emotion: "🤩",
        text: lastActionMessage || "Chiếc nón đang quay rất đều! Hãy cùng hồi hộp chờ xem kim dừng ở ô nào...",
      };
    }
    if (phase === "TOSS_UP_RUNNING") {
      return {
        emotion: "⚡",
        text: "Các chữ cái đang hiện ra ngẫu nhiên mỗi 0,75 giây! Ai nhìn ra từ khóa hãy bấm chuông ngay!",
      };
    }
    if (phase === "TOSS_UP_BUZZED") {
      return {
        emotion: "🔔",
        text: `Đội ${tossUpBuzzedTeamName || currentTurnTeamName} đã nhấn chuông! Mời đưa ra đáp án chính xác từng dấu thanh!`,
      };
    }
    if (phase === "SPECIAL_SOLVING") {
      return {
        emotion: "⏱️",
        text: `Đang trong ${specialRemainingSec > 10 ? "30s suy nghĩ" : "10s quyết định cuối"} (còn ${specialRemainingSec}s)! Bạn được gõ đáp án liên tục không giới hạn số lần!`,
      };
    }
    if (phase === "ROUND_RECAP") {
      return {
        emotion: "🎉",
        text: lastActionMessage || "Xin chúc mừng! Ô chữ đã được giải mã trọn vẹn với đầy đủ dấu thanh điệu!",
      };
    }
    return {
      emotion: "🎙️",
      text: lastActionMessage || `Chào mừng đến với Chiếc Nón Kỳ Diệu! (${stageBadgeLabel})`,
    };
  }, [
    mustSolveWithTones,
    phase,
    lastActionMessage,
    currentTurnTeamName,
    tossUpBuzzedTeamName,
    specialRemainingSec,
    stageBadgeLabel,
  ]);

  return (
    <div
      className={`w-full flex flex-col gap-3.5 ${
        isDisplay ? "p-3 sm:p-5" : "p-2 sm:p-3"
      } bg-gradient-to-b from-[#0a0f1d] via-[#10192e] to-[#070b14] text-white rounded-3xl border border-white/10 shadow-2xl overflow-y-auto max-h-full ${
        isBoardShaking ? "animate-shake" : ""
      }`}
    >
      {/* ── VTV3 Tile Pop Zoom Keyframe Style ── */}
      <style>{`
        @keyframes vtv3TilePopZoom {
          0% { transform: scale(1); }
          40% { transform: scale(1.35); box-shadow: 0 0 28px #f59e0b, 0 0 50px rgba(245, 158, 11, 0.75); z-index: 40; }
          100% { transform: scale(1); box-shadow: 0 4px 10px rgba(255, 255, 255, 0.4); z-index: 10; }
        }
        .animate-vtv3-tile-pop {
          animation: vtv3TilePopZoom 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
        }
      `}</style>

      {/* ── TOP HEADER: ROUND STAGE, MODE SWITCH & TURN INFO ──────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-black/40 px-3.5 py-2.5 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-pink-500/30 to-purple-600/30 border border-pink-400/30 shadow-lg text-xl sm:text-2xl">
            🎡
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-black text-base sm:text-lg text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-400 to-cyan-300">
                CHIẾC NÓN KỲ DIỆU VTV3
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {stageBadgeLabel}
              </span>
              {mainRoundNumber === 4 && roundStage === "MAIN" && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 animate-pulse">
                  💎 Hũ Kim Cương: {(jackpotPool || 1000).toLocaleString("vi-VN")}đ
                </span>
              )}
              {speedUpBellActive && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/30 text-rose-200 border border-rose-400 animate-bounce">
                  🔔 CHUÔNG TĂNG TỐC (1.500đ/chữ)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {isDisplay
                ? `Màn ${currentRound}/${maxRounds}`
                : `Màn ${currentRound}/${maxRounds} · Chữ mở trên bảng không kèm dấu thanh · Giải ô chữ cần đúng dấu thanh`}
            </p>
          </div>
        </div>

        {/* Mode Indicator + Current Turn Team Badge + Host Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dual Mode Switch for Host */}
          {isHost && onSetOperationMode && (
            <div className="flex items-center rounded-xl bg-slate-900/90 p-0.5 border border-white/15 text-[10px] font-black">
              <button
                type="button"
                onClick={() => onSetOperationMode("SELF_SERVICE")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  operationMode === "SELF_SERVICE"
                    ? "bg-cyan-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                💻 Máy tính tự chơi
              </button>
              <button
                type="button"
                onClick={() => onSetOperationMode("HOST_ASSISTED")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  operationMode === "HOST_ASSISTED"
                    ? "bg-amber-400 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🎙️ MC thao tác hộ
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-cyan-500/15 border border-white/15 shadow">
            <span
              className="w-3.5 h-3.5 rounded-full shadow-md animate-pulse shrink-0"
              style={{ background: activeTeam?.color || "#ec4899" }}
            />
            <div className="text-left">
              <span className="block text-[9px] uppercase font-bold text-slate-400">
                {roundStage === "TOSS_UP_1" || roundStage === "TOSS_UP_2"
                  ? tossUpBuzzedTeamName
                    ? "Đội bấm chuông"
                    : "Tranh quyền bấm chuông"
                  : "Đang đến lượt"}
              </span>
              <span className="block text-xs sm:text-sm font-black text-white truncate max-w-[140px]">
                {roundStage === "TOSS_UP_1" || roundStage === "TOSS_UP_2"
                  ? tossUpBuzzedTeamName || "Tất cả các đội"
                  : currentTurnTeamName || "Chưa có"}
              </span>
            </div>
          </div>

          {/* Clean Score & Strike Indicators for Display Screen */}
          {isDisplay && (
            <div className="flex flex-wrap items-center gap-2">
              {teams.map((t) => {
                const rScore = roundScores?.[t.id] || 0;
                const strikes =
                  activeState.consecutiveWrongGuesses?.[t.id] ?? activeState.wrongGuessesCount?.[t.id] ?? 0;
                const isTurn = t.id === (tossUpBuzzedTeamId || currentTurnTeamId);
                const isEliminatedBySolve = roundEliminatedTeamIds.includes(t.id);
                const isEliminatedByStrikes = (activeState.disqualifiedTeamIdsInRound || []).includes(t.id);
                const isEliminated = isEliminatedBySolve || isEliminatedByStrikes;

                return (
                  <div
                    key={t.id}
                    className={`px-3 py-1.5 rounded-xl flex items-center gap-2 border text-xs font-bold transition shadow-sm ${
                      isTurn
                        ? "bg-amber-400/20 border-amber-400 text-white shadow-[0_0_14px_rgba(245,158,11,0.35)]"
                        : isEliminated
                        ? "bg-red-950/30 border-red-500/30 text-rose-300 opacity-60"
                        : "bg-black/50 border-white/10 text-slate-200"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color || "#6366f1" }} />
                    <span className="truncate max-w-[110px]">{t.name}</span>
                    <span className="font-mono text-amber-300">+{rScore.toLocaleString()}đ</span>
                    {isEliminatedBySolve ? (
                      <span className="text-rose-400 text-[10px] font-bold">⛔</span>
                    ) : strikes > 0 ? (
                      <span className="text-rose-400 font-mono text-[10px] tracking-tighter">
                        {"✕".repeat(Math.min(3, strikes))}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {isHost && onRevealAll && phase !== "ROUND_RECAP" && (
            <button
              type="button"
              onClick={onRevealAll}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition cursor-pointer"
              title="Công bố toàn bộ đáp án ô chữ ngay lập tức"
            >
              📢 Công bố đáp án
            </button>
          )}

          {isHost && onPassTurn && roundStage === "MAIN" && (
            <button
              type="button"
              onClick={onPassTurn}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 transition cursor-pointer"
              title="Chuyển lượt cho đội kế tiếp"
            >
              🔄 Đổi lượt
            </button>
          )}

          {isHost && (onNextRound || onAdvanceRound) && (
            <button
              type="button"
              onClick={() => {
                if (onNextRound) onNextRound();
                else if (onAdvanceRound) onAdvanceRound();
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 transition cursor-pointer"
              title="Chuyển sang vòng tiếp theo"
            >
              ⏭️ Vòng sau
            </button>
          )}
        </div>
      </div>

      {/* ── MC DEDICATED CONTROL BAR: MỞ Ô CHỮ & CHỦ ĐỀ (ĐỘC LẬP, KHÔNG ĐÈ LÊN MA TRẬN Ô CHỮ) ── */}
      {isHost && effectiveBoardStage === "EMPTY_56" && (
        <div className="w-full flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/85 via-slate-900/95 to-amber-950/85 border-2 border-amber-400/60 shadow-xl">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl animate-pulse">🎙️</span>
            <div>
              <div className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wide">
                Bảng ô chữ đang đóng (56 ô xanh VTV3)
              </div>
              <div className="text-[11px] text-slate-300">
                Chỉ có Quản trò/MC mới có quyền mở câu hỏi. Nhấn nút để mở các ô chữ và công bố chủ đề cho tất cả các máy!
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenBoard}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.6)] hover:brightness-110 active:scale-95 transition cursor-pointer animate-pulse border-2 border-yellow-200 shrink-0"
          >
            ⭐ MỞ Ô CHỮ & CHỦ ĐỀ (MC) ⭐
          </button>
        </div>
      )}

      {/* ── THE ICONIC VTV3 PUZZLE BOARD GRID (4 ROWS x 14 COLS = 56 TILES) + VIRTUAL HOSTESS ─ */}
      {subMode === "WORD_PUZZLE" && (
        <div className="w-full flex flex-col items-center bg-gradient-to-b from-[#0e2a14] via-[#091f0e] to-[#051408] p-2.5 sm:p-4 rounded-2xl border-4 border-[#1b4e22] shadow-[0_0_30px_rgba(22,101,52,0.3)] relative overflow-hidden">
          {/* Header Action: Category Banner OR Waiting Badge (Hidden on Display to avoid duplicate with lower-third) */}
          {!isDisplay && (
            <div className="mb-2 px-3.5 py-1 rounded-full bg-black/60 border border-amber-400/40 text-amber-300 font-black text-xs sm:text-sm uppercase tracking-widest shadow transition-all duration-500 animate-scale-up">
              {effectiveBoardStage === "EMPTY_56" ? (
                isHost ? (
                  <span>⭐ BẢNG Ô CHỮ SẴN SÀNG — BẤM NÚT MC PHÍA TRÊN ĐỂ MỞ ⭐</span>
                ) : (
                  <span className="animate-pulse">⏳ Chờ Quản trò/MC mở ô chữ & chủ đề...</span>
                )
              ) : effectiveBoardStage === "BLANK_PHRASE" ? (
                <span className="animate-pulse">⭐ ĐANG LẬT MỞ BẢNG Ô CHỮ... ⭐</span>
              ) : (
                <span>⭐ CHỦ ĐỀ: {currentPuzzle?.category || "TỔNG HỢP"} ⭐</span>
              )}
            </div>
          )}

          {/* Mandatory Tone Solve Alert when all base letters are open (Player/Host only) */}
          {!isDisplay && mustSolveWithTones && phase !== "ROUND_RECAP" && (
            <div className="mb-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/30 via-yellow-400/30 to-amber-500/30 border-2 border-amber-300 text-amber-100 text-xs sm:text-sm font-black flex items-center gap-2 animate-pulse shadow-lg">
              <span>🔔</span>
              <span>
                ĐÃ LỘ HẾT CHỮ CÁI GỐC! Người chơi bắt buộc bấm <strong>GIẢI Ô CHỮ</strong> và điền đúng từng dấu thanh điệu để thắng!
              </span>
            </div>
          )}

          {/* Ô May Mắn MC Guide Banner (Player/Host only) */}
          {!isDisplay && phase === "LUCKY_PICK" && (
            <div className="mb-2 px-3 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-400/50 text-emerald-200 text-[11px] sm:text-xs font-bold flex items-center gap-2 animate-pulse shadow-lg">
              <span className="text-base">🍀</span>
              <span>
                <strong>Ô MAY MẮN:</strong> Click lần 1 vào ô chưa mở để chọn (highlight xanh), click lần 2 vào chính ô đó để mở chữ!
              </span>
            </div>
          )}

          {/* ── 3D Gameshow Studio Stage (Sân Khấu Catwalk VTV3 & Bảng Ô Chữ 3D) ── */}
          <div className="w-full max-w-6xl flex flex-col items-center relative py-2 px-2 sm:px-4 md:px-6">
            {/* Studio Lighting Truss & Soft Spotlights */}
            <div className="absolute -top-4 inset-x-0 h-16 pointer-events-none flex justify-around opacity-35 z-0">
              <div className="w-36 h-24 bg-gradient-to-b from-yellow-300/30 to-transparent blur-xl transform -rotate-12" />
              <div className="w-48 h-28 bg-gradient-to-b from-emerald-400/25 to-transparent blur-xl" />
              <div className="w-36 h-24 bg-gradient-to-b from-cyan-400/30 to-transparent blur-xl transform rotate-12" />
            </div>

            {/* Main Board Structure with 3D Bevel Border */}
            <div className="relative w-full z-10 flex flex-col items-center">
              {/* 14-Column 4-Row Puzzle Matrix with 3D Depth */}
              <div className="w-full p-2 sm:p-3 md:p-4 rounded-2xl bg-gradient-to-b from-[#021307] via-[#041d0b] to-[#010b04] border-4 border-[#166534] shadow-[0_15px_35px_rgba(0,0,0,0.85),0_0_30px_rgba(22,101,52,0.4)]">
                <div className="w-full grid grid-rows-4 gap-1 sm:gap-1.5 md:gap-2">
                  {gridMatrix.map((row, rIdx) => (
                    <div
                      key={rIdx}
                      className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1 sm:gap-1.5 md:gap-2 w-full items-center justify-items-center"
                    >
                      {row.map((cell, cIdx) => {
                        if (!cell || effectiveBoardStage === "EMPTY_56") {
                          return (
                            <div
                              key={cIdx}
                              className="w-full aspect-[3/4] min-h-[36px] sm:min-h-[48px] md:min-h-[60px] lg:min-h-[72px] rounded bg-[#0f3414] border border-[#1e5824] flex items-center justify-center shadow-inner opacity-80"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="w-3 h-3 sm:w-4 sm:h-4 text-[#2a7a33] opacity-60 fill-current"
                              >
                                <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                              </svg>
                            </div>
                          );
                        }

                        const isLuckyGreen =
                          phase === "LUCKY_PICK" && luckyGreenSelectedIdx === cell.originalIndex;
                        const isPopping = justPoppedIndices.has(cell.originalIndex);

                        return (
                          <div
                            key={cIdx}
                            onClick={() => {
                              if (phase === "LUCKY_PICK" && canInteract && !cell.isRevealed) {
                                if (luckyGreenSelectedIdx !== cell.originalIndex) {
                                  setLuckyGreenSelectedIdx(cell.originalIndex);
                                  soundManager.playMagicWheelMark();
                                } else {
                                  setLuckyGreenSelectedIdx(null);
                                  soundManager.playMagicWheelLetterReveal();
                                  onLuckyPick?.(cell.originalIndex);
                                }
                              }
                            }}
                            className={`w-full aspect-[3/4] min-h-[36px] sm:min-h-[48px] md:min-h-[60px] lg:min-h-[72px] rounded font-black flex items-center justify-center transition-all duration-300 select-none ${
                              isPopping
                                ? "bg-white text-[#0f172a] border-2 border-yellow-300 shadow-[0_0_35px_#f59e0b] animate-vtv3-tile-pop z-30"
                                : isLuckyGreen
                                ? "bg-gradient-to-tr from-emerald-500 via-green-400 to-emerald-300 text-emerald-950 border-2 border-emerald-200 scale-110 shadow-[0_0_25px_#10b981] animate-pulse cursor-pointer z-10"
                                : cell.isHighlighted
                                ? "bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-200 text-amber-950 border-2 border-yellow-100 scale-110 shadow-[0_0_25px_#f59e0b] animate-bounce z-10"
                                : cell.isRevealed
                                ? "bg-white text-[#0f172a] shadow-[0_4px_12px_rgba(255,255,255,0.45)] border-2 border-white scale-100"
                                : phase === "LUCKY_PICK"
                                ? "bg-gradient-to-br from-amber-300 via-yellow-300 to-amber-400 text-amber-950 border-2 border-yellow-200 animate-pulse shadow-[0_0_15px_#f59e0b] cursor-pointer hover:scale-105"
                                : "bg-white/95 text-transparent border-2 border-slate-300 shadow-md"
                            }`}
                          >
                            <span className="text-sm sm:text-lg md:text-2xl lg:text-3xl font-black tracking-tight">
                              {cell.isRevealed
                                ? cell.displayChar
                                : isLuckyGreen
                                ? "✓"
                                : cell.isHighlighted
                                ? "✨"
                                : phase === "LUCKY_PICK"
                                ? "🍀"
                                : "?"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sân Khấu Catwalk VTV3 Floor Platform (Sàn bóng có gạch lát & dải đèn LED) */}
              <div className="relative w-full h-12 sm:h-16 md:h-20 -mt-2 sm:-mt-3 z-20 flex flex-col justify-end">
                {/* 3D Catwalk Perspective Floor Plane */}
                <div
                  className="absolute inset-0 rounded-b-2xl overflow-hidden border-t border-cyan-400/30"
                  style={{
                    background: "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(2,6,23,0.98) 100%)",
                    boxShadow: "inset 0 10px 20px rgba(0,0,0,0.8)",
                  }}
                >
                  {/* Catwalk Reflective Grid Lines */}
                  <div
                    className="w-full h-full opacity-25"
                    style={{
                      backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                      backgroundSize: "40px 16px",
                    }}
                  />
                  {/* Stage Center Glow Reflection */}
                  <div className="absolute top-0 left-1/4 right-1/4 h-6 bg-gradient-to-b from-cyan-400/20 via-emerald-400/10 to-transparent blur-md pointer-events-none" />
                </div>

                {/* Front Stage Platform Neon LED Edge Strip */}
                <div className="relative z-10 w-full h-1 sm:h-1.5 bg-gradient-to-r from-cyan-500 via-amber-300 to-cyan-500 shadow-[0_0_15px_#06b6d4,0_0_25px_#f59e0b]" />

                {/* Virtual Hostess 3D Studio Character standing firmly on Catwalk Floor */}
                <Hostess3DStudio
                  xPercent={hostessXPercent}
                  activeRow={hostessActiveRow}
                  facing={hostessFacing}
                  pose={hostessPose}
                />
              </div>
            </div>

            {/* ── VTV3 Broadcast Lower-Third Chyron (Dải băng truyền hình VTV3) ── */}
            <div className="w-full mt-3 z-20">
              <div className="flex flex-col sm:flex-row items-stretch rounded-xl overflow-hidden border border-amber-400/40 shadow-2xl bg-black/85 backdrop-blur-md">
                {/* Category Pill / Chủ Đề */}
                <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black px-4 py-2 sm:py-2.5 flex items-center justify-center gap-2 uppercase tracking-wider text-xs sm:text-sm shrink-0 shadow-md">
                  <span>⭐</span>
                  <span>CHỦ ĐỀ: {currentPuzzle?.category || "TỔNG HỢP"}</span>
                </div>
                {/* Clue Chyron Body with broadcast typography shadow */}
                <div className="flex-1 px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3 text-slate-100 font-bold text-xs sm:text-sm md:text-base tracking-wide bg-gradient-to-r from-slate-950/90 via-black/95 to-slate-950/90">
                  <p className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate sm:whitespace-normal">
                    {effectiveBoardStage === "READY_CLUE"
                      ? currentPuzzle?.clue || "Lắng nghe gợi ý từ MC và đoán các chữ cái!"
                      : "Bảng ô chữ đang chuẩn bị..."}
                  </p>
                  {currentPuzzle?.secretPhrase && (
                    <span className="shrink-0 px-2 py-0.5 rounded bg-white/10 text-amber-300 font-mono text-[11px] sm:text-xs border border-white/15">
                      {currentPuzzle.secretPhrase.replace(/\s+/g, "").length} KÝ TỰ
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Round Victory & Full Reveal Celebration Banner */}
          {phase === "ROUND_RECAP" && (
            <div className="w-full mt-2.5 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/25 via-yellow-500/25 to-emerald-500/25 border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)] flex flex-wrap items-center justify-between gap-3 animate-slide-up">
              <div className="flex items-center gap-3">
                <span className="text-3xl sm:text-4xl animate-bounce">👑</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                      GIẢI MÃ THÀNH CÔNG
                    </span>
                    {lastSolveFeedback?.teamName && (
                      <span className="font-black text-xs sm:text-sm text-amber-300">
                        🎉 Đội chiến thắng: {lastSolveFeedback.teamName} (+{(lastSolveFeedback.pointsAwarded || 0).toLocaleString()}đ)
                      </span>
                    )}
                  </div>
                  <p className="text-base sm:text-xl font-black text-white mt-1 tracking-wide">
                    Ô CHỮ ĐẦY ĐỦ: &ldquo;{currentPuzzle?.secretPhrase}&rdquo;
                  </p>
                </div>
              </div>
              {isHost && (onNextRound || onAdvanceRound) && (
                <button
                  type="button"
                  onClick={() => {
                    if (onNextRound) onNextRound();
                    else if (onAdvanceRound) onAdvanceRound();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg transition active:scale-95 cursor-pointer animate-pulse shrink-0 border-2 border-yellow-200"
                >
                  ⏭️ Sang vòng tiếp theo
                </button>
              )}
            </div>
          )}

          {/* Wrong Solve Alert Banner */}
          {lastSolveFeedback && !(lastSolveFeedback.isCorrect ?? lastSolveFeedback.success) && phase !== "ROUND_RECAP" && (
            <div className="w-full mt-2.5 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-rose-950/90 via-red-900/90 to-rose-950/90 border-2 border-rose-500 text-white shadow-xl flex items-center justify-between gap-2 animate-bounce">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="text-xl">❌</span>
                <div>
                  <span className="font-black text-rose-300">
                    ĐỘI {(lastSolveFeedback.teamName || "N/A").toUpperCase()} ĐOÁN SAI:
                  </span>{" "}
                  <span className="font-mono font-bold text-white bg-black/40 px-2 py-0.5 rounded border border-rose-500/40">
                    &ldquo;{lastSolveFeedback.attemptText || lastSolveFeedback.guess || ""}&rdquo;
                  </span>
                  <span className="text-rose-200 text-xs ml-2">
                    {roundStage === "MAIN"
                      ? "(Mất lượt & hết quyền giải ô chữ trong vòng này)"
                      : "(Mất quyền đoán nhanh câu này)"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── WHEEL & STUDIO CONTROL SECTION ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left Col: 3D Wheel Rig (Hidden during Toss-Up rounds 1 & 2) */}
        {!isTossUpRound && (
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative p-2 bg-black/25 rounded-2xl border border-white/5">
            <div
              className="w-[240px] h-[240px] sm:w-[290px] sm:h-[290px] relative transition-transform select-none flex items-center justify-center"
            style={{
              transformOrigin: "50% 0%",
              transform: isWheelZoomedIn ? "scale(1.45) translateY(38px)" : "scale(1.0) translateY(0)",
              transitionDuration: `${wheelZoomDurationMs}ms`,
              transitionTimingFunction: "cubic-bezier(0.25, 1, 0.4, 1)",
              willChange: "transform",
            }}
          >
            {/* Top 3D Chrome & Ruby Flipper Pointer at 12 o'clock */}
            <div
              ref={needleRef}
              className="absolute -top-[4.2%] left-1/2 -translate-x-1/2 w-[11.4%] aspect-[44/48] z-30 pointer-events-none"
              style={{
                transformOrigin: "50% 22.92%",
                transform: "rotate(0deg) scale(1.06) translateZ(0)",
                filter: "drop-shadow(0px 4px 8px rgba(0,0,0,0.85))",
                willChange: "transform",
              }}
            >
              <svg viewBox="0 0 44 48" className="w-full h-full">
                <defs>
                  <linearGradient id="mwChromeNeedleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="30%" stopColor="#e2e8f0" />
                    <stop offset="60%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#334155" />
                  </linearGradient>
                  <linearGradient id="mwNeedleFacetLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="mwNeedleFacetRight" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#d97706" />
                    <stop offset="60%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#78350f" />
                  </linearGradient>
                </defs>
                <path d="M22 45 L11 8 Q22 13 22 8 Z" fill="url(#mwNeedleFacetLeft)" stroke="#fef08a" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M22 45 L33 8 Q22 13 22 8 Z" fill="url(#mwNeedleFacetRight)" stroke="#b45309" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M22 44 L22 10" stroke="url(#mwChromeNeedleGrad)" strokeWidth="2.8" strokeLinecap="round" />
                <circle cx="22" cy="11" r="5.5" fill="#0f172a" stroke="#fef08a" strokeWidth="1.8" />
                <circle cx="22" cy="11" r="3.6" fill="url(#mwChromeNeedleGrad)" />
                <circle cx="20.6" cy="9.6" r="1.2" fill="#ffffff" />
              </svg>
            </div>

            {/* Stage Floor Shadow */}
            <div className="absolute -inset-4 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.95)_45%,rgba(15,8,30,0.7)_70%,transparent_85%)] blur-md pointer-events-none -z-10" />

            {/* Royal Gold Outer Bezel Frame */}
            <div className="absolute inset-0 aspect-square rounded-full border-[10px] sm:border-[12px] border-[#d97706] shadow-[0_16px_40px_rgba(0,0,0,0.9),0_0_35px_rgba(245,158,11,0.45),inset_0_2px_4px_rgba(254,240,138,0.9),inset_0_-3px_8px_rgba(69,26,3,0.95)] pointer-events-none z-20">
              <div className="w-full h-full rounded-full border border-amber-950/70 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)]" />
            </div>

            {/* Spinning Wheel Body */}
            <div
              ref={wheelRef}
              className="w-full h-full aspect-square rounded-full overflow-hidden shadow-2xl relative"
              style={{ transform: `rotate(${clientWheelAngle}deg)` }}
            >
              <svg viewBox="0 0 440 440" className="w-full h-full select-none">
                <defs>
                  <linearGradient id="chromeStemGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#64748b" />
                    <stop offset="30%" stopColor="#f8fafc" />
                    <stop offset="60%" stopColor="#cbd5e1" />
                    <stop offset="85%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#334155" />
                  </linearGradient>
                  <linearGradient id="chromeCollarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#cbd5e1" />
                    <stop offset="50%" stopColor="#64748b" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                  <radialGradient id="chromeCapGrad" cx="35%" cy="30%" r="65%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="35%" stopColor="#e2e8f0" />
                    <stop offset="70%" stopColor="#64748b" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </radialGradient>
                  <linearGradient id="goldRimGrad3D" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="25%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#78350f" />
                    <stop offset="75%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                  <radialGradient id="hubObsidianGrad" cx="45%" cy="40%" r="55%">
                    <stop offset="0%" stopColor="#1e1b4b" />
                    <stop offset="40%" stopColor="#0f172a" />
                    <stop offset="80%" stopColor="#020617" />
                    <stop offset="100%" stopColor="#000000" />
                  </radialGradient>
                  <filter id="hubDropShadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.85" />
                  </filter>
                  <filter id="winningSliceGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#fbbf24" floodOpacity="0.95" />
                    <feDropShadow dx="0" dy="0" stdDeviation="16" floodColor="#f59e0b" floodOpacity="0.8" />
                  </filter>
                </defs>

                {/* 24 Sectors (15 deg each) — Labels pushed close to the outer rim! */}
                {sectors.map((sec, idx) => {
                  const segCount = sectors.length || 24;
                  const degPerSeg = 360 / segCount;
                  const theta1 = (idx * degPerSeg * Math.PI) / 180;
                  const theta2 = ((idx + 1) * degPerSeg * Math.PI) / 180;
                  const r = 196;
                  const cx = 220;
                  const cy = 220;
                  const x1 = cx + r * Math.sin(theta1);
                  const y1 = cy - r * Math.cos(theta1);
                  const x2 = cx + r * Math.sin(theta2);
                  const y2 = cy - r * Math.cos(theta2);
                  const midDeg = (idx + 0.5) * degPerSeg;

                  const rPeg = 190;
                  const pegX = cx + rPeg * Math.sin(theta1);
                  const pegY = cy - rPeg * Math.cos(theta1);

                  const isWinningSector = !isSpinning && selectedSector && selectedSector.id === sec.id;
                  const isNumeric = sec.type === "POINTS" || /^\d+$/.test(sec.label.trim());
                  const digits = isNumeric ? sec.label.trim().split("") : [];
                  const numCount = digits.length;
                  // Place digits starting right near the outer rim (r = 177px) stepping inward!
                  const charStep = numCount >= 4 ? 15.5 : 18.5;
                  const outerRimStartY = cy - 177;

                  // Place text labels anchored near the outer rim (r = 180px) reading inward along the spoke!
                  const specialLabel = sec.label;
                  const specialFontSize =
                    specialLabel.length > 10 ? "9.5" : specialLabel.length > 8 ? "10.5" : "12";
                  const textOuterStartY = cy - 180;

                  return (
                    <g key={sec.id}>
                      <path
                        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                        fill={isWinningSector ? "#4c1d95" : sec.color}
                        stroke={isWinningSector ? "#fbbf24" : "#ffffff"}
                        strokeWidth={isWinningSector ? "3.5" : "1.2"}
                        strokeOpacity={isWinningSector ? 1 : 0.4}
                        filter={isWinningSector ? "url(#winningSliceGlow)" : undefined}
                      />

                      <line
                        x1={cx}
                        y1={cy}
                        x2={x1}
                        y2={y1}
                        stroke="#ffffff"
                        strokeWidth="0.6"
                        strokeOpacity="0.3"
                      />

                      {/* Wedge Content Positioned Near Outer Rim */}
                      <g transform={`rotate(${midDeg} ${cx} ${cy})`}>
                        <circle cx={cx} cy={cy - 188} r="1.3" fill={sec.textColor || "#ffffff"} opacity="0.85" />

                        {isNumeric ? (
                          <g className="font-black select-none pointer-events-none">
                            {digits.map((digit, dIdx) => (
                              <text
                                key={dIdx}
                                x={cx}
                                y={outerRimStartY + dIdx * charStep}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize={numCount >= 4 ? "14.5" : "17"}
                                fontWeight="900"
                                fill={isWinningSector ? "#fef08a" : sec.textColor || "#ffffff"}
                                stroke="#000000"
                                strokeWidth="2.0"
                                style={{ paintOrder: "stroke fill" }}
                                className="font-black select-none pointer-events-none"
                              >
                                {digit}
                              </text>
                            ))}
                          </g>
                        ) : (
                          <g transform={`rotate(90 ${cx} ${textOuterStartY})`}>
                            <text
                              x={cx}
                              y={textOuterStartY}
                              textAnchor="start"
                              fontSize={specialFontSize}
                              fontWeight="900"
                              fill={isWinningSector ? "#fef08a" : sec.textColor || "#ffffff"}
                              stroke="#000000"
                              strokeWidth="2.2"
                              style={{ paintOrder: "stroke fill" }}
                              dominantBaseline="central"
                              className="font-black select-none pointer-events-none tracking-tight uppercase"
                            >
                              {specialLabel}
                            </text>
                          </g>
                        )}

                        <circle cx={cx} cy={cy - 56} r="1.1" fill={sec.textColor || "#ffffff"} opacity="0.5" />
                      </g>

                      {/* 3D Radial Outward Chrome Peg */}
                      <g transform={`rotate(${idx * degPerSeg} ${pegX} ${pegY})`}>
                        <ellipse cx={pegX + 1.5} cy={pegY + 1.8} rx="3.8" ry="2" fill="#000000" opacity="0.65" />
                        <ellipse cx={pegX} cy={pegY} rx="3.6" ry="2.2" fill="url(#chromeCollarGrad)" stroke="#0f172a" strokeWidth="0.5" />
                        <rect x={pegX - 1.8} y={pegY - 8.5} width="3.6" height="8.5" rx="1.8" fill="url(#chromeStemGrad)" stroke="#1e293b" strokeWidth="0.5" />
                        <circle cx={pegX} cy={pegY - 8.5} r="3.6" fill="url(#chromeCapGrad)" stroke="#1e293b" strokeWidth="0.6" />
                        <circle cx={pegX - 1.1} cy={pegY - 9.8} r="1" fill="#ffffff" opacity="0.95" />
                      </g>
                    </g>
                  );
                })}

                <circle cx="220" cy="220" r="186" fill="none" stroke="#fde68a" strokeWidth="0.7" strokeDasharray="3 4" opacity="0.4" />

                {/* 3D Center Hub */}
                <g filter="url(#hubDropShadow)">
                  <circle cx="220" cy="220" r="48" fill="url(#chromeCollarGrad)" stroke="#0f172a" strokeWidth="1.5" />
                  <circle cx="220" cy="220" r="44" fill="url(#goldRimGrad3D)" stroke="#451a03" strokeWidth="1" />
                  <circle cx="220" cy="220" r="39" fill="url(#hubObsidianGrad)" stroke="#fde68a" strokeWidth="1.8" />
                  <g transform="translate(202, 202)">
                    <svg width="36" height="36" viewBox="0 0 32 32">
                      <polygon points="16,2 19,13 30,16 19,19 16,30 13,19 2,16 13,13" fill="none" stroke="#fde68a" strokeWidth="1.3" opacity="0.8" />
                      <polygon points="6,6 14,13 26,6 19,16 26,26 16,19 6,26 13,16" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.5" />
                      <circle cx="16" cy="16" r="7.5" fill="#090514" stroke="#fde68a" strokeWidth="1.6" />
                      <polygon points="16,10 18,14 22,16 18,18 16,22 14,18 10,16 14,14" fill="#fbbf24" />
                      <circle cx="16" cy="16" r="2.8" fill="url(#chromeCapGrad)" stroke="#0f172a" strokeWidth="0.5" />
                    </svg>
                  </g>
                </g>
              </svg>
            </div>
          </div>

            {selectedSector && !isSpinning && (
              <div className="mt-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/30 to-pink-500/30 border border-amber-400/50 text-amber-200 text-xs sm:text-sm font-black shadow animate-scale-up">
                🎯 Ô quay: {selectedSector.label}
              </div>
            )}
          </div>
        )}

        {/* Right Col: Studio Dashboard & Virtual MC */}
        <div className={`${isTossUpRound ? "lg:col-span-12 max-w-4xl mx-auto w-full" : "lg:col-span-7"} flex flex-col gap-3`}>
          {/* Virtual MC Card with Flexible Speech Bubble */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-900/80 to-indigo-950/70 border border-purple-500/40 shadow-lg relative overflow-hidden">
            <div className="absolute -left-4 -top-4 w-24 h-24 bg-pink-500/20 rounded-full blur-xl pointer-events-none" />

            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-0.5 shadow-xl shrink-0 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-[#0c1222] flex items-center justify-center relative overflow-hidden">
                <svg viewBox="0 0 64 64" className="w-full h-full">
                  <defs>
                    <linearGradient id="mcSuitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                    <linearGradient id="mcShirtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#e2e8f0" />
                    </linearGradient>
                    <linearGradient id="mcTieGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#991b1b" />
                    </linearGradient>
                  </defs>
                  <path d="M22 24 C22 14 42 14 42 24 C44 26 44 32 40 33 C38 27 26 27 24 33 C20 32 20 26 22 24 Z" fill="#334155" />
                  <circle cx="32" cy="27" r="10" fill="#fed7aa" />
                  <circle cx="28.5" cy="26" r="1.2" fill="#1e293b" />
                  <circle cx="35.5" cy="26" r="1.2" fill="#1e293b" />
                  <path d="M29 30 Q32 33 35 30" stroke="#9a3412" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                  <path d="M14 60 C14 42 22 39 32 39 C42 39 50 42 50 60 Z" fill="url(#mcSuitGrad)" />
                  <polygon points="32,49 26,39 38,39" fill="url(#mcShirtGrad)" />
                  <polygon points="32,42 30,48 32,56 34,48" fill="url(#mcTieGrad)" />
                  <path d="M22 41 L27 52 L23 60" stroke="#f59e0b" strokeWidth="0.8" fill="none" opacity="0.6" />
                  <path d="M42 41 L37 52 L41 60" stroke="#f59e0b" strokeWidth="0.8" fill="none" opacity="0.6" />
                  <path d="M22 25 C20 25 19 28 20 31 L26 35" stroke="#94a3b8" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                  <circle cx="26.5" cy="35" r="1.8" fill="#3b82f6" />
                </svg>
                <span className="absolute bottom-0 right-0 text-[12px] leading-none drop-shadow">
                  {mcReaction.emotion}
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] uppercase font-black tracking-wider text-pink-400">
                  🎙️ MC CHIẾC NÓN KỲ DIỆU
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                  {operationMode === "HOST_ASSISTED" ? "CHẾ ĐỘ MC HỖ TRỢ" : "TỰ ĐỘNG"}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white leading-snug">
                &ldquo;{mcReaction.text}&rdquo;
              </p>
            </div>
          </div>

          {/* Interactive Player / Host Controls */}
          {!isDisplay && (
            <div className="flex flex-col gap-3 bg-black/30 p-3 rounded-2xl border border-white/10">
              {/* ── A. TOSS-UP 1 & 2 CONTROLS ─────────────────────────────── */}
              {(roundStage === "TOSS_UP_1" || roundStage === "TOSS_UP_2") && phase !== "ROUND_RECAP" && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/70 via-indigo-950/80 to-amber-950/70 border-2 border-amber-400/50 space-y-3 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-black text-xs sm:text-sm text-amber-300 uppercase">
                        {roundStage === "TOSS_UP_1"
                          ? "⚡ VÒNG ĐOÁN NHANH 1 — Giải đúng nhận +500 điểm"
                          : "⚡ VÒNG ĐOÁN NHANH 2 — Giải đúng nhận +1.000đ & Quyền mở màn Vòng 1"}
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        MC chạm mở ô đầu tiên (highlight ➔ mở chữ), sau đó cứ 0,75s hiện ngẫu nhiên 1 chữ cái. Đội bấm chuông trả lời sai các đội (kể cả đội vừa bấm) vẫn được bấm tiếp!
                      </p>
                    </div>
                    {phase === "TOSS_UP_READY" && (
                      isHost ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (effectiveBoardStage === "EMPTY_56") handleOpenBoard();
                            onTossUpStart?.();
                          }}
                          className="px-4 py-2 rounded-xl font-black text-xs bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-lg hover:brightness-110 cursor-pointer animate-pulse"
                        >
                          ▶️ BẮT ĐẦU MỞ CHỮ NGẪU NHIÊN (0.75s/chữ)
                        </button>
                      ) : (
                        <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 animate-pulse">
                          <span>⏳</span>
                          <span>Chờ Quản trò/MC bấm mở các chữ cái... Hãy sẵn sàng bấm chuông!</span>
                        </div>
                      )
                    )}
                  </div>

                  {phase === "TOSS_UP_RUNNING" && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => onTossUpBuzz?.(myTeamId || currentTurnTeamId)}
                        className="w-full py-3.5 rounded-2xl font-black text-sm sm:text-base text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 hover:brightness-110 active:scale-98 shadow-[0_0_25px_rgba(251,191,36,0.6)] cursor-pointer transition"
                      >
                        🔔 BẤM CHUÔNG GIÀNH QUYỀN GIẢI Ô CHỮ NGAY!
                      </button>
                      {isHost && teams.length > 1 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-bold text-slate-400">MC chọn đội bấm chuông:</span>
                          {teams.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => onTossUpBuzz?.(t.id)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/10 hover:bg-amber-400 hover:text-slate-950 border border-white/20 transition cursor-pointer"
                            >
                              🔔 {t.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {phase === "TOSS_UP_BUZZED" && (
                    <div className="p-3 rounded-xl bg-black/50 border border-amber-400/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-300">
                          🔔 Đội {tossUpBuzzedTeamName || currentTurnTeamName} đang trả lời:
                        </span>
                        {isHost && onJudgeSolve && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onJudgeSolve(true)}
                              className="px-3 py-1 rounded-lg text-[11px] font-black bg-emerald-500 text-slate-950 hover:brightness-110 cursor-pointer"
                            >
                              ✓ Chấm ĐÚNG
                            </button>
                            <button
                              type="button"
                              onClick={() => onJudgeSolve(false)}
                              className="px-3 py-1 rounded-lg text-[11px] font-black bg-rose-500 text-white hover:brightness-110 cursor-pointer"
                            >
                              ✕ Chấm SAI (Mở tiếp)
                            </button>
                          </div>
                        )}
                      </div>
                      <SmartPuzzlePhraseInput
                        secretPhrase={currentPuzzle?.secretPhrase || ""}
                        revealedIndices={animRevealedIndices}
                        onSubmit={(ans) => onSolvePuzzle?.(ans)}
                        submitLabel="CHỐT ĐÁP ÁN ĐOÁN NHANH ➔"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── B. SPECIAL FINAL ROUND CONTROLS ───────────────────────── */}
              {roundStage === "SPECIAL_FINAL" && phase !== "ROUND_RECAP" && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-b from-amber-950/70 via-purple-950/80 to-slate-950 border-2 border-amber-400/60 space-y-3 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-amber-400/30 pb-2">
                    <span className="font-black text-xs sm:text-sm text-amber-300 uppercase">
                      👑 VÒNG ĐẶC BIỆT — Quán quân: {currentTurnTeamName}
                    </span>
                    <span className="text-[11px] font-bold text-amber-200">
                      Được chọn {specialAllowedLettersCount} chữ cái · 30s suy nghĩ + 10s trả lời
                    </span>
                  </div>

                  {phase === "SPECIAL_ORDER_CHOICE" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => onSpecialChooseOrder?.("SPIN_FIRST")}
                        className="p-3 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-lg hover:brightness-110 cursor-pointer transition"
                      >
                        🎡 QUAY PHẦN THƯỞNG TRƯỚC
                      </button>
                      <button
                        type="button"
                        onClick={() => onSpecialChooseOrder?.("SOLVE_FIRST")}
                        className="p-3 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:brightness-110 cursor-pointer transition"
                      >
                        🧩 GIẢI Ô CHỮ ĐẶC BIỆT TRƯỚC
                      </button>
                    </div>
                  )}

                  {phase === "SPECIAL_SPIN_WAITING" && (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-200 font-semibold">
                        Hãy bấm quay chiếc nón để xác định Phong Bì Giải Thưởng Đặc Biệt (+2.000đ đến +10.000đ):
                      </p>
                      <button
                        type="button"
                        disabled={effectiveIsSpinning}
                        onClick={() => {
                          if (effectiveIsSpinning) return;
                          soundManager.playMagicWheelSpin();
                          setLocalIsSpinning(true);
                          onSpin?.(oscillatingPower);
                        }}
                        className="w-full py-3 rounded-xl font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 hover:brightness-110 cursor-pointer shadow-lg"
                      >
                        ✦ QUAY PHONG BÌ ĐẶC BIỆT ({oscillatingPower}%) ✦
                      </button>
                    </div>
                  )}

                  {phase === "SPECIAL_PICK_LETTERS" && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-200">
                          Chọn đủ {specialAllowedLettersCount} chữ cái trợ giúp ({specialPickedSet.length}/{specialAllowedLettersCount}):
                        </span>
                        <button
                          type="button"
                          disabled={specialPickedSet.length !== specialAllowedLettersCount}
                          onClick={() => onSpecialPickLetters?.(specialPickedSet)}
                          className={`px-4 py-1.5 rounded-xl font-black text-xs transition ${
                            specialPickedSet.length === specialAllowedLettersCount
                              ? "bg-emerald-400 text-slate-950 shadow-lg cursor-pointer hover:brightness-110"
                              : "bg-white/10 text-slate-500 cursor-not-allowed"
                          }`}
                        >
                          MỞ {specialAllowedLettersCount} CHỮ CÁI & BẮT ĐẦU 40 GIÂY ➔
                        </button>
                      </div>
                      <div className="grid grid-cols-7 sm:grid-cols-10 gap-1">
                        {VIETNAMESE_ALPHABET.map((letter) => {
                          const picked = specialPickedSet.includes(letter);
                          return (
                            <button
                              key={letter}
                              type="button"
                              onClick={() => {
                                setSpecialPickedSet((prev) => {
                                  if (prev.includes(letter)) return prev.filter((x) => x !== letter);
                                  if (prev.length >= specialAllowedLettersCount) return prev;
                                  return [...prev, letter];
                                });
                              }}
                              className={`p-1.5 sm:p-2 rounded-lg font-black text-xs transition cursor-pointer ${
                                picked
                                  ? "bg-amber-400 text-slate-950 border-2 border-white scale-105 shadow"
                                  : "bg-white/10 text-slate-200 hover:bg-white/20 border border-white/15"
                              }`}
                            >
                              {letter}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {phase === "SPECIAL_SOLVING" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/50 border border-amber-400/40">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">⏱️</span>
                          <div>
                            <span className="text-xs font-black text-amber-300 block">
                              {specialRemainingSec > 10
                                ? `THỜI GIAN SUY NGHĨ: Còn ${specialRemainingSec - 10}s (+ 10s trả lời)`
                                : `THỜI GIAN TRẢ LỜI CUỐI: Còn ${specialRemainingSec}s!`}
                            </span>
                            <span className="text-[10px] text-slate-300">
                              Bạn được gõ và gửi đáp án liên tục trong cả thời gian suy nghĩ và trả lời!
                            </span>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-mono font-black text-base">
                          {specialRemainingSec}s
                        </span>
                      </div>

                      <SmartPuzzlePhraseInput
                        secretPhrase={currentPuzzle?.secretPhrase || ""}
                        revealedIndices={animRevealedIndices}
                        onSubmit={(ans) => onSolvePuzzle?.(ans)}
                        submitLabel="GỬI PHƯƠNG ÁN GIẢI Ô CHỮ ➔"
                        continuousMode={true}
                        attemptLog={specialAttemptLog}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── C. MAIN ROUNDS 1..N CONTROLS ──────────────────────────── */}
              {roundStage === "MAIN" && (
                <>
                  {/* 1. Spin Control */}
                  {phase === "SPIN_WAITING" && !mustSolveWithTones && !speedUpBellActive && (
                    <div className="space-y-2.5 p-3 rounded-xl bg-purple-950/30 border border-purple-500/30">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                        <span className="flex items-center gap-1 text-amber-300">
                          ⚡ LỰC QUAY: {oscillatingPower}% (Thời gian:{" "}
                          {((15000 + Math.round((oscillatingPower / 100) * 6000)) / 1000).toFixed(1)}s)
                        </span>
                        <span className="text-[10px] text-muted-foreground">Nhấn chốt để quay ngay</span>
                      </div>

                      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/20">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-75 shadow-lg"
                          style={{ width: `${oscillatingPower}%` }}
                        />
                      </div>

                      {canInteract ? (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (effectiveIsSpinning || isCurrentTeamEliminated) return;
                              soundManager.playMagicWheelSpin();
                              setLocalIsSpinning(true);
                              onSpin?.(oscillatingPower);
                            }}
                            disabled={effectiveIsSpinning || isCurrentTeamEliminated}
                            className={`flex-1 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm text-white transition shadow-[0_0_20px_rgba(236,72,153,0.4)] ${
                              isCurrentTeamEliminated
                                ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                                : "bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:brightness-110 active:scale-98 cursor-pointer"
                            }`}
                          >
                            {isCurrentTeamEliminated
                              ? "⛔ ĐÃ HẾT LƯỢT VÒNG NÀY (ĐOÁN SAI Ô CHỮ)"
                              : `✦ CHỐT LỰC & QUAY NÓN (${oscillatingPower}%) ✦`}
                          </button>
                          {subMode === "WORD_PUZZLE" && (
                            <button
                              type="button"
                              onClick={() => setSolveModalOpen(true)}
                              disabled={isSpinning || isSolveForbiddenInRound3 || isCurrentTeamEliminated}
                              className={`px-3.5 py-2.5 rounded-xl font-black text-xs whitespace-nowrap transition shadow ${
                                isCurrentTeamEliminated
                                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                                  : isSolveForbiddenInRound3
                                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                                  : "text-black bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 active:scale-98 cursor-pointer"
                              }`}
                            >
                              {isCurrentTeamEliminated
                                ? "⛔ ĐÃ HẾT QUYỀN"
                                : isSolveForbiddenInRound3
                                ? "🔒 CẦN MỞ HẾT"
                                : "🎯 GIẢI Ô CHỮ"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-1.5 text-xs text-slate-400 italic">
                          Đang chờ Đội {currentTurnTeamName} quay nón hoặc giải ô chữ...
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. Vietnamese Alphabet Keyboard & Solve Trigger */}
                  {subMode === "WORD_PUZZLE" && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                          {mustSolveWithTones
                            ? "🔔 Đã mở hết chữ cái gốc — Hãy bấm Giải Ô Chữ với đầy đủ dấu thanh:"
                            : expressModeActive
                            ? "⚡ TÀU TỐC ĐỘ (1.000đ/chữ — Gọi chữ liên tiếp, sai 1 chữ là Mất Điểm):"
                            : speedUpBellActive
                            ? "🔔 CHUÔNG TĂNG TỐC (1.500đ/chữ — Không cần quay nón):"
                            : "Bàn phím 29 chữ cái tiếng Việt (chỉ mở chữ cái gốc, không mở dấu thanh):"}
                        </span>
                        {canInteract && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSolveModalOpen(true)}
                              disabled={isSolveForbiddenInRound3 || isCurrentTeamEliminated}
                              className={`px-3 py-1 rounded-lg text-xs font-black shadow transition ${
                                isCurrentTeamEliminated
                                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50"
                                  : isSolveForbiddenInRound3
                                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                                  : mustSolveWithTones
                                  ? "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950 animate-bounce cursor-pointer shadow-[0_0_20px_#f59e0b]"
                                  : "bg-gradient-to-r from-yellow-500 to-amber-600 text-black cursor-pointer"
                              }`}
                            >
                              {isCurrentTeamEliminated ? "⛔ HẾT QUYỀN GIẢI" : "🎯 GIẢI Ô CHỮ (ĐIỀN DẤU THANH)"}
                            </button>
                            {isHost && onJudgeSolve && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onJudgeSolve(true)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-500 text-slate-950 hover:brightness-110 cursor-pointer"
                                  title="MC chấm thí sinh đọc đúng ô chữ"
                                >
                                  ✓ MC Chấm Đúng
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onJudgeSolve(false)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-500 text-white hover:brightness-110 cursor-pointer"
                                  title="MC chấm thí sinh đọc sai ô chữ"
                                >
                                  ✕ MC Chấm Sai
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-7 sm:grid-cols-10 gap-1">
                        {VIETNAMESE_ALPHABET.map((letter) => {
                          const isGuessed = guessedLetters.includes(letter);
                          const isCurrentTarget =
                            canInteract &&
                            (phase === "ACTION_INPUT" || expressModeActive || speedUpBellActive) &&
                            !mustSolveWithTones &&
                            !isGuessed &&
                            !isSpinning;

                          return (
                            <button
                              key={letter}
                              type="button"
                              disabled={!isCurrentTarget}
                              onClick={() => onGuessLetter?.(letter)}
                              className={`p-1.5 sm:p-2 rounded-lg font-black text-xs transition-all select-none ${
                                isGuessed
                                  ? "bg-white/5 text-slate-500 border border-white/5 opacity-40 cursor-not-allowed line-through"
                                  : isCurrentTarget
                                  ? "bg-gradient-to-b from-cyan-500/20 to-blue-600/30 hover:from-cyan-400/40 hover:to-blue-500/50 text-cyan-200 border border-cyan-400/40 shadow hover:scale-105 active:scale-95 cursor-pointer"
                                  : "bg-white/5 text-slate-300 border border-white/10 opacity-70 cursor-not-allowed"
                              }`}
                            >
                              {letter}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Ô Phần Thưởng: 20 Lá Thăm Bí Mật */}
                  {phase === "REWARD_CHOICE" && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-b from-amber-950/80 via-slate-900/90 to-amber-950/80 border-2 border-amber-400/50 shadow-2xl space-y-3">
                      <div className="flex items-center justify-between border-b border-amber-400/30 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl animate-bounce">🎁</span>
                          <div>
                            <h4 className="font-black text-xs sm:text-sm text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400 uppercase tracking-wide">
                              Ô PHẦN THƯỞNG: 20 LÁ THĂM BÍ MẬT
                            </h4>
                            <p className="text-[10px] text-amber-200/70 font-semibold">
                              60% (+100đ - +900đ) · 15% (+1.000đ/+2.000đ) · 15% (Thêm lượt 🎟️) · 10% (+3.000đ & Mở chữ)
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                          Chọn 1 trong 20 lá
                        </span>
                      </div>

                      {canInteract ? (
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
                          {rewardCards.map((card, idx) => {
                            const isRevealed = pickedRewardCardIdx === idx;
                            const isOtherPicked = pickedRewardCardIdx !== null && pickedRewardCardIdx !== idx;

                            return (
                              <button
                                key={idx}
                                type="button"
                                disabled={pickedRewardCardIdx !== null}
                                onClick={() => {
                                  if (pickedRewardCardIdx !== null) return;
                                  setPickedRewardCardIdx(idx);
                                  soundManager.playMagicWheelReward();
                                  setTimeout(() => {
                                    onSelectRewardCard?.({
                                      cardIndex: idx,
                                      rewardType: card.type,
                                      points: card.points,
                                    });
                                  }, 1200);
                                }}
                                className={`aspect-[3/4] rounded-xl flex flex-col items-center justify-center p-1 font-black text-center transition-all duration-300 select-none relative ${
                                  isRevealed
                                    ? "bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-400 text-amber-950 border-2 border-yellow-100 scale-110 shadow-[0_0_25px_#f59e0b] z-10 animate-scale-up"
                                    : isOtherPicked
                                    ? "bg-black/30 border border-white/5 opacity-40 cursor-not-allowed"
                                    : "bg-gradient-to-b from-amber-900/60 to-purple-950/80 border-2 border-amber-400/40 hover:border-amber-300 hover:scale-105 active:scale-95 text-amber-200 shadow-md cursor-pointer"
                                }`}
                              >
                                {isRevealed ? (
                                  <>
                                    <span className="text-xl sm:text-2xl">{card.icon}</span>
                                    <span className="text-[10px] sm:text-xs font-black tracking-tight leading-tight mt-0.5">
                                      {card.label}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-base sm:text-lg opacity-80">✉️</span>
                                    <span className="text-[10px] sm:text-xs font-black text-amber-300 mt-0.5">
                                      #{idx + 1}
                                    </span>
                                  </>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-3 text-xs text-amber-200 italic">
                          Đang chờ Đội {currentTurnTeamName} chọn 1 trong 20 lá thăm bí mật...
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. Vòng 2: Ô Bí Mật */}
                  {phase === "MYSTERY_CHOICE" &&
                    (() => {
                      const mysterySector = selectedSector || sectors[activeState.selectedSectorIndex ?? -1];
                      const baseVal = mysterySector?.basePoints || 100;
                      return (
                        <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-500/40 shadow space-y-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xl">🔮</span>
                            <h4 className="font-black text-xs text-purple-200">
                              QUYẾT ĐỊNH Ô BÍ MẬT (3.000đ vĩnh viễn hoặc MẤT ĐIỂM)
                            </h4>
                          </div>
                          {canInteract ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => onMysteryDecide?.(false)}
                                className="py-2 px-3 rounded-lg font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow cursor-pointer transition"
                              >
                                🛡️ KHÔNG LẬT (Nhận {baseVal}đ)
                              </button>
                              <button
                                type="button"
                                onClick={() => onMysteryDecide?.(true)}
                                className="py-2 px-3 rounded-lg font-black text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:brightness-110 shadow cursor-pointer transition"
                              >
                                🎲 LẬT Ô BÍ MẬT ➔
                              </button>
                            </div>
                          ) : (
                            <div className="text-center text-xs text-slate-400 italic">
                              Đang đợi Đội {currentTurnTeamName}...
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  {/* 5. Vòng 3: Đổi Hay Không Đổi */}
                  {phase === "TRADE_CHOICE" && (
                    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 shadow space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl">🎁</span>
                        <h4 className="font-black text-xs text-rose-200">ĐỔI HAY KHÔNG ĐỔI? (VÒNG 3)</h4>
                      </div>
                      {canInteract ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-4 gap-1.5">
                            {[0, 1, 2, 3].map((idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => onTradeDecide?.(true, idx)}
                                className="p-2 rounded-lg border border-rose-400/40 bg-rose-500/20 text-rose-200 text-xs font-black cursor-pointer hover:bg-rose-500/30 transition text-center"
                              >
                                🎁 Hộp #{idx + 1}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => onTradeDecide?.(false)}
                            className="w-full py-2 rounded-lg font-black text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow cursor-pointer transition"
                          >
                            🛡️ KHÔNG ĐỔI — TIẾP TỤC ĐUA Ô CHỮ ➔
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-xs text-slate-400 italic">
                          Đang đợi Đội {currentTurnTeamName}...
                        </div>
                      )}
                    </div>
                  )}

                  {/* 6. Vòng 4: Chuyến Tàu Tốc Độ (EXPRESS_CHOICE) */}
                  {phase === "EXPRESS_CHOICE" && (
                    <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-400/50 shadow space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl">⚡</span>
                        <h4 className="font-black text-xs text-amber-200">
                          CHUYẾN TÀU TỐC ĐỘ (VÒNG 4): Gọi chữ liên tiếp 1.000đ/chữ không cần quay nón (sai 1 chữ là Mất Điểm)!
                        </h4>
                      </div>
                      {canInteract && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => onExpressDecide?.(true)}
                            className="py-2 px-3 rounded-lg font-black text-xs bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow cursor-pointer"
                          >
                            ⚡ LÊN TÀU TỐC ĐỘ (1.000đ/chữ)
                          </button>
                          <button
                            type="button"
                            onClick={() => onExpressDecide?.(false)}
                            className="py-2 px-3 rounded-lg font-black text-xs bg-slate-700 hover:bg-slate-600 text-white shadow cursor-pointer"
                          >
                            🛡️ DỪNG AN TOÀN & QUAY NÓN TIẾP
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 7. Vòng 5: Ô Đối Đầu / Chuyển Nhượng (STEAL_SWAP_CHOICE) */}
                  {phase === "STEAL_SWAP_CHOICE" && (
                    <div className="p-3 rounded-xl bg-indigo-950/70 border border-indigo-400/50 shadow space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl">⚔️</span>
                        <h4 className="font-black text-xs text-indigo-200">
                          Ô ĐỐI ĐẦU / CHUYỂN NHƯỢNG (VÒNG 5): Chọn chiến thuật của đội bạn!
                        </h4>
                      </div>
                      {canInteract && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => onStealSwapDecide?.("STEAL_50")}
                            className="py-2 px-3 rounded-lg font-black text-xs bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow cursor-pointer"
                          >
                            ⚔️ CƯỚP 50% ĐIỂM VÒNG ĐỐI THỦ
                          </button>
                          <button
                            type="button"
                            onClick={() => onStealSwapDecide?.("SWAP_LEADER")}
                            className="py-2 px-3 rounded-lg font-black text-xs bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow cursor-pointer"
                          >
                            🔄 HOÁN ĐỔI ĐIỂM VỚI ĐỘI DẪN ĐẦU
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Compact Scoreboard (Hidden on Display screen to eliminate duplicate scoreboard) */}
          {!isDisplay && (
            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400">
                <span>🏆 BẢNG ĐIỂM ({stageBadgeLabel})</span>
                <span className="text-amber-300">Điểm vòng / Tổng điểm chung cuộc</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {teams.map((t) => {
                  const rScore = roundScores?.[t.id] || 0;
                  const freeCount = freeSpinCount?.[t.id] || 0;
                  const isTurn = t.id === (tossUpBuzzedTeamId || currentTurnTeamId);
                  const strikes =
                    activeState.consecutiveWrongGuesses?.[t.id] ?? activeState.wrongGuessesCount?.[t.id] ?? 0;
                  const isEliminatedByStrikes = (activeState.disqualifiedTeamIdsInRound || []).includes(t.id);
                  const isEliminatedBySolve = roundEliminatedTeamIds.includes(t.id);
                  const isEliminated = isEliminatedByStrikes || isEliminatedBySolve;

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (isHost && onOverrideTurn) onOverrideTurn(t.id);
                      }}
                      className={`p-2 rounded-xl flex flex-col gap-1 border transition ${
                        isHost ? "cursor-pointer hover:border-amber-300" : ""
                      } ${
                        isEliminated
                          ? "bg-red-950/20 border-red-500/30 opacity-60"
                          : isTurn
                          ? "bg-amber-500/15 border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                          : "bg-white/5 border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow"
                            style={{ background: t.color || "#6366f1" }}
                          />
                          <span className="text-xs font-bold text-white truncate">{t.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-black text-amber-300">+{rScore.toLocaleString()}đ</span>
                          <span className="text-[10px] font-mono font-bold text-cyan-300 ml-1.5">
                            ({(t.score || 0).toLocaleString()}đ)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] pt-0.5 border-t border-white/5">
                        {freeCount > 0 ? (
                          <span className="text-[9px] text-sky-300 font-semibold">🎟️ {freeCount}</span>
                        ) : (
                          <span className="text-[9px] text-slate-500">0 thẻ</span>
                        )}
                        {isEliminatedBySolve ? (
                          <span className="text-rose-400 font-bold uppercase text-[9px] flex items-center gap-1" title="Đã dùng hết 1 lượt đoán ô chữ vòng này và đoán sai">
                            <span>⛔ Hết quyền giải (Đoán sai)</span>
                            <span className="text-rose-500 font-black">✕✕✕</span>
                          </span>
                        ) : isEliminatedByStrikes ? (
                          <span className="text-rose-400 font-bold uppercase text-[9px]">⛔ Dừng vòng (3/3 X)</span>
                        ) : (
                          <div className="flex items-center gap-1" title={`Đoán sai liên tiếp: ${strikes}/3`}>
                            {[1, 2, 3].map((strikeIdx) => {
                              const isActiveStrike = strikes >= strikeIdx;
                              return (
                                <span
                                  key={strikeIdx}
                                  className={`inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-black leading-none border transition-all ${
                                    isActiveStrike
                                      ? "bg-rose-500/30 border-rose-400 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.65)] scale-105"
                                      : "bg-slate-900/70 border-slate-700/60 text-slate-600 opacity-35"
                                  }`}
                                >
                                  ✕
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: GIẢI Ô CHỮ BÍ MẬT VỚI BỘ NHẬP DẤU THANH THÔNG MINH ─────── */}
      {solveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl p-5 rounded-2xl bg-[#121829] border-2 border-amber-400/60 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <div>
                  <h4 className="font-black text-base text-amber-300">
                    GIẢI Ô CHỮ BÍ MẬT — CHÍNH XÁC TỪNG DẤU THANH ĐIỆU
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Các phụ âm đã mở trên bảng được giữ cố định. Hãy chọn dấu thanh cho các nguyên âm đã mở và điền các chữ cái còn thiếu!
                  </p>
                </div>
              </div>
              {isHost && onJudgeSolve && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSolveModalOpen(false);
                      onJudgeSolve(true);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500 text-slate-950 hover:brightness-110 cursor-pointer"
                  >
                    ✓ Chấm ĐÚNG
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSolveModalOpen(false);
                      onJudgeSolve(false);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-black bg-rose-500 text-white hover:brightness-110 cursor-pointer"
                  >
                    ✕ Chấm SAI
                  </button>
                </div>
              )}
            </div>

            <SmartPuzzlePhraseInput
              secretPhrase={currentPuzzle?.secretPhrase || ""}
              revealedIndices={animRevealedIndices}
              onCancel={() => setSolveModalOpen(false)}
              onSubmit={(finalAnswer) => {
                onSolvePuzzle?.(finalAnswer);
                setSolveModalOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
