"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MagicWheelState, MagicWheelOperationMode, TeamState } from "@/types";
import {
  VIETNAMESE_ALPHABET,
  ENGLISH_ALPHABET,
  ENGLISH_VOWELS,
  ENGLISH_CONSONANTS,
  isEnglishVowel,
  normalizeVietnameseBaseLetter,
  isVietnameseAlphabetLetter,
  isVietnameseVowel,
  applyToneToVietnameseVowel,
  extractToneFromVietnameseChar,
  VietnameseToneMark,
  hasRemainingConsonants,
  checkNoMoreConsonants,
  ENGLISH_BONUS_ROUND_GIVEN_LETTERS,
  ENGLISH_BONUS_ROUND_PICKABLE_CONSONANTS,
  ENGLISH_BONUS_ROUND_PICKABLE_VOWELS,
} from "@/lib/game-engine/magic-wheel";
import { formatCategoryByEdition } from "@/lib/game-engine/magic-wheel-categories";
import { soundManager } from "@/lib/sound-manager";
import { formatVietnameseText, VietnameseInputMethod } from "@/lib/vietnamese-ime";

export function formatTeamLabel(rawName?: string): string {
  if (!rawName) return "Đội chơi";
  const trimmed = rawName.trim();
  if (/^Đội\s+/i.test(trimmed)) {
    return trimmed;
  }
  return `Đội ${trimmed}`;
}

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
  onBuyVowel?: (vowel: string) => void;
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
  onSetEdition?: (edition: "VIETNAMESE" | "ENGLISH") => void;
  onSetEnglishPreset?: (preset: "RANDOM_MIX" | "SET_1" | "SET_2" | "SET_3") => void;
  onSetBlackoutGuessed?: (blackout: boolean) => void;
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
      const isLetter = isVietnameseAlphabetLetter(ch);
      const isSymbolOrDigit = !isSpace && !isLetter;
      const isRevealed = isSymbolOrDigit || revealedIndices.has(idx);
      const baseChar = isSymbolOrDigit ? ch : normalizeVietnameseBaseLetter(ch);
      const isVowel = isLetter && isVietnameseVowel(baseChar);
      // Consonants that are already revealed, or numbers (0-9) and non-letter symbols (like '-') are 100% fixed/locked!
      const isLockedConsonant = isSymbolOrDigit || (!isSpace && isRevealed && !isVowel);
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
  const [imeMethod, setImeMethod] = useState<VietnameseInputMethod>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("magic_wheel_ime_method");
      if (saved === "AUTO" || saved === "TELEX" || saved === "VNI" || saved === "OFF") return saved;
    }
    return "AUTO";
  });
  const updateImeMethod = (m: VietnameseInputMethod) => {
    setImeMethod(m);
    if (typeof window !== "undefined") {
      localStorage.setItem("magic_wheel_ime_method", m);
    }
  };
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
      if (e.nativeEvent.isComposing || e.keyCode === 229) {
        return;
      }
      e.preventDefault();
      handleTriggerSubmit();
      return;
    }
    if (e.key === "ArrowRight" || e.key === "Tab") {
      e.preventDefault();
      focusNextEditable(slotIdx);
      return;
    }

    // CRITICAL: DO NOT intercept ArrowLeft with focusPrevEditable!
    // When external IME (EVKey/UniKey) sends VK_LEFT internally to position caret before applying tone,
    // intercepting ArrowLeft caused focus to jump to the previous cell, pushing the accented letter into the previous cell!
    // Navigation to previous slot can be done via Shift+Tab or direct click.
    if (e.key === "ArrowLeft" && (e.altKey || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      focusPrevEditable(slotIdx);
      return;
    }

    if (e.key === "Backspace") {
      // Clear current cell only. NEVER jump focus backwards on Backspace!
      // This allows EVKey/UniKey to send synthetic backspace and insert the composed accented letter in the SAME cell.
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

    // 1. Detect if EVKey / UniKey / native IME sent an accented Vietnamese character
    const accentedMatch = rawVal.match(/[ÁÀẢÃẠẮẰẲẴẶẤẦẨẪẬÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴĐáàảãạắằẳẵặấầẩẫẬéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵđ]/gi);
    let resolvedChar = "";

    if (accentedMatch && accentedMatch.length > 0) {
      resolvedChar = accentedMatch[accentedMatch.length - 1].toUpperCase();
    } else if (rawVal.length > 1) {
      // 2. Multi-character buffer: user typed sequence (e.g. "AS", "EE", "A1", etc.)
      const curChar = charValues[slotIdx] || slot.baseChar || "";
      const lastKey = rawVal.slice(-1);
      const { modifiedChar, isModified } = applyTelexOrVniModifier(curChar, lastKey);
      if (isModified) {
        resolvedChar = modifiedChar.toUpperCase();
      } else {
        const formatted = formatVietnameseText(rawVal, imeMethod !== "OFF" ? imeMethod : "AUTO");
        resolvedChar = formatted.slice(-1).toUpperCase();
      }
    } else {
      // 3. Single keypress
      const lastKey = rawVal.toUpperCase();
      // If user typed tone/modifier key on a revealed vowel (e.g. 'S', 'F', '1', '2' on 'A')
      if (slot.isRevealedVowel) {
        const curChar = charValues[slotIdx] || slot.baseChar;
        const { modifiedChar, isModified } = applyTelexOrVniModifier(curChar, lastKey);
        if (isModified) {
          resolvedChar = modifiedChar.toUpperCase();
        } else {
          resolvedChar = lastKey;
        }
      } else {
        resolvedChar = lastKey;
      }
    }

    // 4. Validate against slot rules
    if (slot.isRevealedVowel) {
      // If it's a tone reset key (Z or 0)
      if (rawVal.slice(-1).toUpperCase() === "Z" || rawVal.slice(-1) === "0") {
        setCharValues((prev) => {
          const next = [...prev];
          next[slotIdx] = slot.baseChar;
          return next;
        });
        return;
      }
      if (normalizeVietnameseBaseLetter(resolvedChar) === slot.baseChar) {
        setCharValues((prev) => {
          const next = [...prev];
          next[slotIdx] = resolvedChar;
          return next;
        });
      }
    } else {
      setCharValues((prev) => {
        const next = [...prev];
        next[slotIdx] = resolvedChar;
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
    if (!candidate || candidate.replace(/[\s_]/g, "").length === 0) return;
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
                onClick={() => updateImeMethod(m)}
                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                  imeMethod === m
                    ? "bg-amber-400 text-slate-950 shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
                title={
                  m === "AUTO"
                    ? "Tự động nhận diện Telex / VNI / VIQR (Khuyên dùng)"
                    : m === "OFF"
                    ? "Tương thích EVKey / UniKey ngoài máy (Chống nhảy ô)"
                    : `Bộ gõ ${m}`
                }
              >
                {m === "AUTO" ? "⚡ Tự động (Telex/VNI)" : m === "OFF" ? "⚙️ EVKey/UniKey" : m}
              </button>
            ))}
          </div>
        </div>
        <input
          ref={fullLineInputRef}
          type="text"
          value={rawLineInput}
          onChange={(e) => handleFullLineChange(e.target.value)}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (e.nativeEvent.isComposing || e.keyCode === 229 || isComposingRef.current) {
                return;
              }
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
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
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
  const isRightSide = facing === "LEFT"; // If facing LEFT, standing on right edge looking left towards the board
  const isTouching = pose === "TOUCHING";
  const isGesture = pose === "GESTURE";
  const isWalking = pose === "WALKING";

  // Reach/lift elevation when touching active row (row 0 is highest)
  const touchRowLift = [12, 6, 0, -4][activeRow] ?? 0;

  return (
    <div
      className="absolute z-30 pointer-events-none transition-all duration-500 ease-out select-none"
      style={{
        left: `${Math.max(4.5, Math.min(95.5, xPercent))}%`,
        bottom: "6px",
        transform: "translateX(-50%)",
      }}
    >
      <style>{`
        @keyframes hostessWalk {
          0% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-3.5px) rotate(${isRightSide ? -1.5 : 1.5}deg); }
          50% { transform: translateY(0px) rotate(0deg); }
          75% { transform: translateY(-3.5px) rotate(${isRightSide ? 1.5 : -1.5}deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes hostessBreathe {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.008) translateY(-1.5px); }
        }
        @keyframes hostessHaloPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.35); opacity: 1; }
        }
      `}</style>
      <div
        className="relative flex flex-col items-center"
        style={{
          transform: `${isRightSide ? "scaleX(-1)" : "scaleX(1)"} ${
            isTouching
              ? `scale(1.05) translateY(-${6 + touchRowLift}px)`
              : isGesture
              ? "scale(1.03) translateY(-3px)"
              : ""
          }`,
          transition: "transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Soft cyan studio spotlight halo at pointing hand when touching/gesturing */}
        {(isTouching || isGesture) && (
          <div
            className="absolute z-40 w-4 h-4 rounded-full bg-cyan-300/90 blur-[1px] shadow-[0_0_20px_#06b6d4,0_0_35px_#38bdf8] pointer-events-none"
            style={{
              top: `${14 + activeRow * 14}px`,
              right: isRightSide ? "auto" : "-8px",
              left: isRightSide ? "-8px" : "auto",
              animation: "hostessHaloPulse 1.2s infinite ease-in-out",
            }}
          />
        )}

        {/* 3D Catwalk Contact Floor Shadow */}
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-24 sm:w-28 md:w-32 h-5 rounded-full blur-[3px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, transparent 75%)",
          }}
        />

        {/* Studio Photographic Cutout Model (Trương Ngọc Ánh in Gala Evening Gown) */}
        <div
          className="relative w-20 sm:w-24 md:w-28 lg:w-32 h-44 sm:h-52 md:h-60 lg:h-68 drop-shadow-[0_10px_20px_rgba(0,0,0,0.85)]"
          style={
            isWalking
              ? { animation: "hostessWalk 650ms infinite ease-in-out" }
              : isTouching
              ? { filter: "drop-shadow(0 0 12px rgba(6,182,212,0.45)) drop-shadow(0 12px 24px rgba(0,0,0,0.9))" }
              : { animation: "hostessBreathe 4s infinite ease-in-out" }
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/magic-wheel/hostess_truong_ngoc_anh.png"
            alt="Người mẫu mở ô chữ Chiếc Nón Kỳ Diệu"
            className="w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />
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
  onBuyVowel,
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
  onSetEdition,
  onSetEnglishPreset,
  onSetBlackoutGuessed,
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
    edition = "VIETNAMESE",
    englishPreset = "RANDOM_MIX",
    blackoutGuessedLetters = true,
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
    tossUpRevealOrder,
    tossUpStartTime,
    tossUpAnswerEndsAt,
    jackpotPool,
    expressModeActive = false,
    speedUpBellActive = false,
    specialAllowedLettersCount = 3,
    specialSolveEndsAt,
    specialAttemptLog = [],
    roundEliminatedTeamIds = [],
    lastSolveFeedback,
    specialFinalTeamId,
    specialFinalTeamName,
  } = activeState;

  const [solveModalOpen, setSolveModalOpen] = useState<boolean>(false);
  const [buyVowelModalOpen, setBuyVowelModalOpen] = useState<boolean>(false);
  const [guessedLetterWarning, setGuessedLetterWarning] = useState<string | null>(null);
  const [specialPickedSet, setSpecialPickedSet] = useState<string[]>([]);
  const [specialRemainingSec, setSpecialRemainingSec] = useState<number>(40);
  const [tossUpRemainingSec, setTossUpRemainingSec] = useState<number>(0);
  const [isBoardShaking, setIsBoardShaking] = useState<boolean>(false);
  const [isLocallyBuzzed, setIsLocallyBuzzed] = useState<boolean>(false);
  const hasBuzzedRef = useRef<boolean>(false);
  const prevSolveFeedbackKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (phase !== "TOSS_UP_BUZZED" || !tossUpAnswerEndsAt) {
      setTossUpRemainingSec(0);
      return;
    }
    const updateSec = () => {
      const rem = Math.max(0, Math.ceil((tossUpAnswerEndsAt - Date.now()) / 1000));
      setTossUpRemainingSec(rem);
    };
    updateSec();
    const interval = setInterval(updateSec, 250);
    return () => clearInterval(interval);
  }, [phase, tossUpAnswerEndsAt]);

  useEffect(() => {
    if (phase !== "TOSS_UP_BUZZED") {
      hasBuzzedRef.current = false;
      setIsLocallyBuzzed(false);
    }
  }, [phase]);

  useEffect(() => {
    if (isLocallyBuzzed && phase !== "TOSS_UP_BUZZED") {
      const fallbackTimer = setTimeout(() => {
        setIsLocallyBuzzed(false);
        hasBuzzedRef.current = false;
      }, 3500);
      return () => clearTimeout(fallbackTimer);
    }
  }, [isLocallyBuzzed, phase]);

  const handleTriggerTossUpBuzz = useCallback(
    (targetTeamId?: string) => {
      if (hasBuzzedRef.current || phase === "TOSS_UP_BUZZED") return;
      hasBuzzedRef.current = true;
      setIsLocallyBuzzed(true);
      const buzzId = targetTeamId || myTeamId || currentTurnTeamId || teams[0]?.id;
      onTossUpBuzz?.(buzzId);
    },
    [phase, myTeamId, currentTurnTeamId, teams, onTossUpBuzz]
  );

  const isCurrentTeamEliminated = roundEliminatedTeamIds.includes(currentTurnTeamId);
  const isTossUpRound = roundStage === "TOSS_UP_1" || roundStage === "TOSS_UP_2";

  const isIframe = typeof window !== "undefined" && window.self !== window.top;
  const isInsideSandbox =
    typeof window !== "undefined" &&
    (isIframe ||
      window.location.search.includes("sandbox=1") ||
      window.location.pathname.includes("/sandbox"));
  // Audio rule: In sandbox, the top dashboard window plays audio directly with user gestures. Child iframes inside sandbox don't duplicate audio.
  // In live room: All participants (Host, Display, Players) can hear audio.
  const canPlayBoardAudio = isInsideSandbox ? !isIframe : true;

  const isSolveMountedRef = useRef<boolean>(false);
  useEffect(() => {
    if (!lastSolveFeedback) {
      prevSolveFeedbackKeyRef.current = null;
      return;
    }
    const feedbackKey = `${lastSolveFeedback.timestamp || ""}_${lastSolveFeedback.guess || ""}_${Boolean(lastSolveFeedback.isCorrect ?? lastSolveFeedback.success)}`;
    if (!isSolveMountedRef.current) {
      isSolveMountedRef.current = true;
      prevSolveFeedbackKeyRef.current = feedbackKey;
      return;
    }
    if (prevSolveFeedbackKeyRef.current === feedbackKey) return;
    prevSolveFeedbackKeyRef.current = feedbackKey;

    const isStale = lastSolveFeedback.timestamp ? Date.now() - lastSolveFeedback.timestamp > 5000 : false;
    if (isStale) return;

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

  const prevTurnTeamIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentTurnTeamId) {
      prevTurnTeamIdRef.current = null;
      return;
    }
    if (prevTurnTeamIdRef.current === null) {
      prevTurnTeamIdRef.current = currentTurnTeamId;
      return;
    }
    if (prevTurnTeamIdRef.current !== currentTurnTeamId) {
      prevTurnTeamIdRef.current = currentTurnTeamId;
      if (canPlayBoardAudio && phase !== "ROUND_RECAP") {
        soundManager.playMagicWheelTurnChange();
      }
    }
  }, [currentTurnTeamId, canPlayBoardAudio, phase]);

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
  const isSpinningRafRunningRef = useRef<boolean>(false);
  const targetAngleRef = useRef<number>(0);
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
    const secretPhrase = currentPuzzle?.secretPhrase || "";
    const nonSpaceCharsCount = secretPhrase.replace(/\s+/g, "").length;
    const cutDurationMs = Math.max(1600, nonSpaceCharsCount * 125 + 600);
    setTimeout(() => {
      setBoardStage("READY_CLUE");
    }, cutDurationMs);
  }, [canPlayBoardAudio, currentPuzzle?.secretPhrase, onOpenBoard]);

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

    // Split into tokens: keep track of global character index
    const words: Array<{ word: string; startIdx: number }> = [];
    let curIdx = 0;
    const rawWords = phrase.split(" ");
    for (const w of rawWords) {
      if (w.length > 0) {
        words.push({ word: w, startIdx: curIdx });
        curIdx += w.length + 1;
      } else {
        curIdx += 1;
      }
    }

    // Allocate words to lines
    // Priority of rows: [1, 2, 0, 3] for vertical centering
    const rowLines: Array<Array<{ word: string; startGlobalIdx: number; omitSpaceBefore?: boolean }>> = [
      [],
      [],
      [],
      [],
    ];
    // Order of rows to use for visual centering: row 1, row 2, row 0, row 3
    const rowOrder = [1, 2, 0, 3];
    let rowOrderIdx = 0;
    let targetRow = rowOrder[rowOrderIdx];

    for (let i = 0; i < words.length; i++) {
      const item = words[i];
      let w = item.word;
      let startIdx = item.startIdx;

      // Handle extra-long words (> COLS)
      while (w.length > COLS) {
        const chunk = w.slice(0, COLS);
        rowLines[targetRow].push({ word: chunk, startGlobalIdx: startIdx });
        w = w.slice(COLS);
        startIdx += COLS;
        if (rowOrderIdx < rowOrder.length - 1) {
          rowOrderIdx++;
          targetRow = rowOrder[rowOrderIdx];
        }
      }

      if (w.length === 0) continue;

      // Check if word fits with standard space
      const currentChars = rowLines[targetRow].reduce(
        (acc, curr) => acc + curr.word.length + (curr.omitSpaceBefore ? 0 : 1),
        0
      );
      const neededWithSpace = rowLines[targetRow].length === 0 ? w.length : currentChars + w.length;

      if (neededWithSpace <= COLS) {
        rowLines[targetRow].push({ word: w, startGlobalIdx: startIdx });
      } else {
        // Priority: Wrap to next available row first
        if (rowOrderIdx < rowOrder.length - 1) {
          rowOrderIdx++;
          targetRow = rowOrder[rowOrderIdx];
          rowLines[targetRow].push({ word: w, startGlobalIdx: startIdx });
        } else {
          // If all 4 rows are used, attempt space compression on the last line
          const neededWithoutSpace = currentChars - (rowLines[targetRow].length > 0 ? 1 : 0) + w.length;
          if (rowLines[targetRow].length > 0 && neededWithoutSpace <= COLS) {
            rowLines[targetRow].push({ word: w, startGlobalIdx: startIdx, omitSpaceBefore: true });
          } else {
            rowLines[targetRow].push({ word: w, startGlobalIdx: startIdx });
          }
        }
      }
    }

    rowLines.forEach((lineWords, rIdx) => {
      if (lineWords.length === 0) return;
      const totalCharsInLine = lineWords.reduce((acc, curr, idx) => {
        const spaceLen = idx === 0 || curr.omitSpaceBefore ? 0 : 1;
        return acc + curr.word.length + spaceLen;
      }, 0);
      let startCol = Math.max(0, Math.floor((COLS - totalCharsInLine) / 2));
      lineWords.forEach((item, wIdx) => {
        if (wIdx > 0 && !item.omitSpaceBefore && startCol < COLS) {
          startCol++;
        }
        const originalIdx = item.startGlobalIdx;
        for (let c = 0; c < item.word.length; c++) {
          if (startCol < COLS) {
            map[originalIdx + c] = { col: startCol, row: rIdx, char: item.word[c] };
            startCol++;
          }
        }
      });
    });

    return map;
  }, [currentPuzzle?.secretPhrase]);

  // ── Show / Hide Hostess ("Người Mẫu") State (persisted to localStorage) ───
  const [showHostess, setShowHostess] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("magic_wheel_show_hostess");
      if (saved !== null) return saved === "true";
    }
    return true;
  });

  const toggleHostess = useCallback(() => {
    setShowHostess((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("magic_wheel_show_hostess", String(next));
      }
      return next;
    });
  }, []);

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
      if (canPlayBoardAudio) soundManager.playMagicWheelSolveWin();
      setHostessPose("GESTURE");
      const t = setTimeout(() => setHostessPose("IDLE"), 2500);
      activeTimersRef.current.push(t);
      return;
    }

    // In Toss-Up running mode, if 1 letter is revealed via tick, handle it according to Toss-Up rules
    if (roundStage === "TOSS_UP_1" || roundStage === "TOSS_UP_2") {
      newLetters.forEach((tileIdx) => {
        if (!animRevealedIndicesRef.current.has(tileIdx)) {
          triggerTilePop(tileIdx);
          if (canPlayBoardAudio) soundManager.playMagicWheelLetterReveal();
        }
      });
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
        if (canPlayBoardAudio) soundManager.playMagicWheelMark(); // Plays /sounds/magic-wheel/highlight.mp3
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
          if (canPlayBoardAudio) soundManager.playMagicWheelLetterReveal(); // Plays /sounds/magic-wheel/letter_open.mp3
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
          if (canPlayBoardAudio) soundManager.playMagicWheelLetterReveal(); // Plays /sounds/magic-wheel/letter_open.mp3
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
  const tossUpIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tossUpFirstTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (roundStage !== "TOSS_UP_1" && roundStage !== "TOSS_UP_2") {
      tossUpFirstTileDoneRef.current = false;
      if (tossUpIntervalRef.current) {
        clearInterval(tossUpIntervalRef.current);
        tossUpIntervalRef.current = null;
      }
      if (tossUpFirstTimerRef.current) {
        clearTimeout(tossUpFirstTimerRef.current);
        tossUpFirstTimerRef.current = null;
      }
      return;
    }
    if (phase === "TOSS_UP_READY") {
      tossUpFirstTileDoneRef.current = false;
      if (tossUpIntervalRef.current) {
        clearInterval(tossUpIntervalRef.current);
        tossUpIntervalRef.current = null;
      }
      if (tossUpFirstTimerRef.current) {
        clearTimeout(tossUpFirstTimerRef.current);
        tossUpFirstTimerRef.current = null;
      }
    }
    if (phase === "TOSS_UP_BUZZED" || phase === "ROUND_RECAP") {
      if (tossUpIntervalRef.current) {
        clearInterval(tossUpIntervalRef.current);
        tossUpIntervalRef.current = null;
      }
      if (tossUpFirstTimerRef.current) {
        clearTimeout(tossUpFirstTimerRef.current);
        tossUpFirstTimerRef.current = null;
      }
    }
  }, [roundStage, phase, currentRound]);

  // Stable refs to prevent tearing down the 0.75s interval on every letter reveal
  const animRevealedIndicesRef = useRef<Set<number>>(animRevealedIndices);
  animRevealedIndicesRef.current = animRevealedIndices;
  const currentPuzzleRef = useRef(currentPuzzle);
  currentPuzzleRef.current = currentPuzzle;

  useEffect(() => {
    if (phase !== "TOSS_UP_RUNNING" && phase !== "TOSS_UP_REVEALING") {
      if (tossUpIntervalRef.current) {
        clearInterval(tossUpIntervalRef.current);
        tossUpIntervalRef.current = null;
      }
      if (tossUpFirstTimerRef.current) {
        clearTimeout(tossUpFirstTimerRef.current);
        tossUpFirstTimerRef.current = null;
      }
      return;
    }
    if (effectiveBoardStage === "EMPTY_56") {
      handleOpenBoard();
    }

    const phrase = currentPuzzleRef.current?.secretPhrase || "";
    if (!phrase) return;

    // Authoritative tick driver:
    // In sandbox: only Host drives (display iframe has no onTossUpRevealTick or is inside iframe)
    // In live room: Host drives, or standalone Display fallback
    const isTickDriver = typeof onTossUpRevealTick === "function" && (isHost || (isDisplay && !isInsideSandbox));

    const getUnrevealedLetterIndices = () => {
      const p = currentPuzzleRef.current;
      const ph = p?.secretPhrase || "";
      const currentRev = p?.revealedIndices || [];
      const animRev = animRevealedIndicesRef.current;
      const list: number[] = [];
      for (let i = 0; i < ph.length; i++) {
        if (isVietnameseAlphabetLetter(ph[i]) && !currentRev.includes(i) && !animRev.has(i)) {
          list.push(i);
        }
      }
      return list;
    };

    const scheduleSubsequentTicks = () => {
      if (!isTickDriver) return;
      if (tossUpIntervalRef.current) clearInterval(tossUpIntervalRef.current);
      tossUpIntervalRef.current = setInterval(() => {
        const unrev = getUnrevealedLetterIndices();
        if (unrev.length === 0) {
          if (tossUpIntervalRef.current) {
            clearInterval(tossUpIntervalRef.current);
            tossUpIntervalRef.current = null;
          }
          return;
        }
        const order = tossUpRevealOrder || [];
        const nextIdx = order.find((idx) => unrev.includes(idx)) ?? unrev[0];
        onTossUpRevealTick?.(nextIdx);
      }, 750);
    };

    if (!tossUpFirstTileDoneRef.current && (currentPuzzleRef.current?.revealedIndices?.length || 0) === 0) {
      tossUpFirstTileDoneRef.current = true;
      const unrevealed = getUnrevealedLetterIndices();
      if (unrevealed.length > 0) {
        // Deterministic first tile: ALWAYS the first valid Vietnamese/Latin alphabet letter of the secret phrase!
        // Numbers (0-9) and special characters are pre-revealed and ignored here!
        const phraseFirstIdx = unrevealed.find((idx) => isVietnameseAlphabetLetter(phrase[idx]));
        const order = tossUpRevealOrder || [];
        const firstIdx = (order.length > 0 && unrevealed.includes(order[0]))
          ? order[0]
          : (phraseFirstIdx !== undefined ? phraseFirstIdx : unrevealed[0]);
        const firstPos = cellPositionsMap[firstIdx] || { col: 2, row: 1 };
        const side = hostessSideRef.current || "LEFT";

        // 1. ALL screens: MC/Hostess touches tile -> tile highlights in Cyan Neon + highlight.mp3 for 1.0s
        setHostessFacing(side === "LEFT" ? "RIGHT" : "LEFT");
        setHostessPose("TOUCHING");
        setHostessActiveRow(firstPos.row);
        setHostessXPercent(((firstPos.col + 0.5) / COLS) * 100);
        setHighlightedIndices(new Set([firstIdx]));
        if (canPlayBoardAudio) soundManager.playMagicWheelMark();

        // 2. Exactly after 1.0s (1000ms), letter appears + pop zoom + letter_open.mp3
        if (tossUpFirstTimerRef.current) clearTimeout(tossUpFirstTimerRef.current);
        tossUpFirstTimerRef.current = setTimeout(() => {
          setHighlightedIndices(new Set());
          setAnimRevealedIndices((prev) => new Set([...prev, firstIdx]));
          triggerTilePop(firstIdx);
          if (canPlayBoardAudio) soundManager.playMagicWheelLetterReveal();
          setHostessPose("IDLE");
          setHostessXPercent(side === "LEFT" ? 3.5 : 96.5);
          if (isTickDriver) {
            onTossUpRevealTick?.(firstIdx);
            scheduleSubsequentTicks();
          }
        }, 1000);
      }
    } else if (tossUpFirstTileDoneRef.current && !tossUpIntervalRef.current && isTickDriver) {
      scheduleSubsequentTicks();
    }

    return () => {
      // Keep timers active while Toss-Up is running; phase transition effect resets them
    };
  }, [
    phase,
    effectiveBoardStage,
    cellPositionsMap,
    handleOpenBoard,
    isHost,
    isDisplay,
    isInsideSandbox,
    tossUpRevealOrder,
    triggerTilePop,
  ]);

  // ── Audio Engine Hooks ───────────────────────────────────────────────────
  const prevIsSpinning = useRef<boolean>(false);

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
  const prevWrongCount = useRef<number>(totalWrongGuesses);
  const isWrongCountMountedRef = useRef<boolean>(false);
  useEffect(() => {
    if (!isWrongCountMountedRef.current) {
      isWrongCountMountedRef.current = true;
      prevWrongCount.current = totalWrongGuesses;
      return;
    }
    if (totalWrongGuesses > prevWrongCount.current) {
      if (canPlayBoardAudio) soundManager.playMagicWheelWrong();
    }
    prevWrongCount.current = totalWrongGuesses;
  }, [totalWrongGuesses, canPlayBoardAudio]);

  const prevPhase = useRef<string>(phase || "SPIN_WAITING");
  const isPhaseMountedRef = useRef<boolean>(false);
  useEffect(() => {
    if (!isPhaseMountedRef.current) {
      isPhaseMountedRef.current = true;
      prevPhase.current = phase;
      return;
    }
    if (prevPhase.current === phase) return;

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
        soundManager.playMagicWheelBuzzSolve();
      }
    }
    prevPhase.current = phase;
  }, [phase, canPlayBoardAudio]);

  // ── 3D Wheel Animation Loop (RequestAnimationFrame) ──────────────────────
  useEffect(() => {
    const target = targetRotationDegrees;
    if (target === undefined || target === null) {
      isSpinningRafRunningRef.current = false;
      wheelPrevAngleRef.current = 0;
      setClientWheelAngle(0);
      lastSnapTimeRef.current = 0;
      if (wheelRef.current) wheelRef.current.style.transform = "rotate(0deg)";
      if (needleRef.current) needleRef.current.style.transform = "translateX(-50%) rotate(0deg) scale(1.06) translateZ(0)";
      soundManager.stopWheelSpinMusic(150);
      return;
    }

    if (!effectiveIsSpinning) {
      isSpinningRafRunningRef.current = false;
      wheelPrevAngleRef.current = target;
      setClientWheelAngle(target);
      if (wheelRef.current) wheelRef.current.style.transform = `rotate(${target}deg)`;
      setIsWheelZoomedIn(false);
      setWheelZoomDurationMs(800);
      lastSnapTimeRef.current = 0;
      if (needleRef.current) needleRef.current.style.transform = "translateX(-50%) rotate(0deg) scale(1.06) translateZ(0)";
      return;
    }

    // If an animation is already actively running, update the target angle seamlessly without tearing down the RAF!
    if (isSpinningRafRunningRef.current) {
      if (target !== undefined && target !== null && target > wheelPrevAngleRef.current) {
        targetAngleRef.current = target;
      }
      return;
    }

    isSpinningRafRunningRef.current = true;
    const startAngle = wheelPrevAngleRef.current;
    const effectiveTarget = (target !== undefined && target !== null && target > startAngle)
      ? target
      : startAngle + 2160;
    targetAngleRef.current = effectiveTarget;

    const durationMs = 15000 + Math.round(((activeState.spinPower || 65) / 100) * 6000);
    const segAngle = 360 / (sectors.length || 24);
    const startTime = performance.now();
    let lastPegIndex = Math.floor(startAngle / segAngle);
    let lastTickAudioTime = 0;
    let rafId = 0;
    let zoomStartTimer: ReturnType<typeof setTimeout> | null = null;

    lastSnapTimeRef.current = 0;
    if (wheelRef.current) wheelRef.current.style.transform = `rotate(${startAngle}deg)`;
    if (needleRef.current) needleRef.current.style.transform = "translateX(-50%) rotate(0deg) scale(1.06) translateZ(0)";

    if (canPlayBoardAudio) soundManager.playWheelPegTick(0.05);

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
      const currentLiveAngle = startAngle + (targetAngleRef.current - startAngle) * threePhaseProgress;

      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${currentLiveAngle}deg)`;
      }

      const currentPegIndex = Math.floor(currentLiveAngle / segAngle);
      if (currentPegIndex > lastPegIndex) {
        lastPegIndex = currentPegIndex;
        lastSnapTimeRef.current = now;
        if (canPlayBoardAudio && now - lastTickAudioTime >= 45) {
          lastTickAudioTime = now;
          soundManager.playWheelPegTick(rawProgress);
        }
      }

      let needleAngle = 0;
      if (elapsed < 60) {
        needleAngle = 0;
      } else {
        const pegDistToSnap = segAngle - (currentLiveAngle % segAngle);
        const contactWindow = 3.6;

        // Physical needle contact with oncoming chrome peg:
        // Wheel turns clockwise -> rim moves left-to-right past 12h -> peg pushes downward needle tip to the RIGHT (-deg in CSS)!
        if (pegDistToSnap <= contactWindow) {
          const contactProgress = 1.0 - pegDistToSnap / contactWindow;
          needleAngle = -18.0 * Math.pow(contactProgress, 1.15);
        } else if (lastSnapTimeRef.current > 0) {
          const dt = (now - lastSnapTimeRef.current) / 1000;
          if (dt < 0.085) {
            // Rebound bounce to left (+deg) with damped oscillation settling to 0
            needleAngle = 10.0 * Math.exp(-32.0 * dt) * Math.cos(50.0 * dt);
          } else {
            needleAngle = 0;
          }
        } else {
          needleAngle = 0;
        }
      }

      if (needleRef.current) {
        needleRef.current.style.transform = `translateX(-50%) rotate(${needleAngle}deg) scale(1.06) translateZ(0)`;
      }

      if (rawProgress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        isSpinningRafRunningRef.current = false;
        setLocalIsSpinning(false);
        const finalTarget = targetAngleRef.current;
        if (wheelRef.current) {
          wheelRef.current.style.transform = `rotate(${finalTarget}deg)`;
        }
        setClientWheelAngle(finalTarget);
        wheelPrevAngleRef.current = finalTarget;
        if (needleRef.current) {
          needleRef.current.style.transform = "translateX(-50%) rotate(0deg) scale(1.06) translateZ(0)";
        }
      }
    };

    rafId = requestAnimationFrame(step);

    return () => {
      if (!effectiveIsSpinning) {
        cancelAnimationFrame(rafId);
        isSpinningRafRunningRef.current = false;
        if (zoomStartTimer) clearTimeout(zoomStartTimer);
      }
    };
  }, [effectiveIsSpinning, targetRotationDegrees, activeState.spinPower, sectors.length, canPlayBoardAudio]);

  const activeTeam = teams.find((t) => t.id === (tossUpBuzzedTeamId || currentTurnTeamId));

  // Kiểm tra trạng thái HẾT PHỤ ÂM (CHỈ ÁP DỤNG VỚI LUẬT ANH, TUYỆT ĐỐI KHÔNG CHỒNG CHÉO VỚI BẢN VIỆT)
  const isNoMoreConsonants =
    edition === "ENGLISH" &&
    Boolean(
      activeState.noMoreConsonants ||
      checkNoMoreConsonants(currentPuzzle?.secretPhrase || "", currentPuzzle?.revealedIndices || [], "ENGLISH")
    );

  const hasUnrevealedConsonants =
    edition === "ENGLISH" &&
    hasRemainingConsonants(currentPuzzle?.secretPhrase || "", currentPuzzle?.revealedIndices || []);

  // Rule Vòng 3 check:
  // - Bản Việt: Bắt buộc mở hết toàn bộ chữ cái (kể cả nguyên âm) cho đến ô cuối cùng mới được đoán
  // - Bản Anh: Cho phép đoán ô chữ sau khi TẤT CẢ PHỤ ÂM đã lật mở (No more consonants)!
  const secretLettersOnly = (currentPuzzle?.secretPhrase || "").replace(/[^a-zA-Zà-ỹÀ-Ỹ]/g, "");
  const remainingHiddenLetters = Math.max(
    0,
    secretLettersOnly.length - (currentPuzzle?.revealedIndices?.length || 0)
  );
  const isSolveForbiddenInRound3 =
    roundStage === "MAIN" &&
    mainRoundNumber === 3 &&
    (activeState.round3ForbiddenSolveTeams || []).includes(currentTurnTeamId) &&
    (edition === "ENGLISH" ? hasUnrevealedConsonants : remainingHiddenLetters > 0) &&
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
        seqIndex?: number;
      } | null>
    > = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

    if (!currentPuzzle || !currentPuzzle.secretPhrase) {
      return matrix;
    }

    Object.entries(cellPositionsMap).forEach(([origIdxStr, pos]) => {
      const origIdx = Number(origIdxStr);
      const isLetter = isVietnameseAlphabetLetter(pos.char);
      // Digits (0-9) and special characters (like '-') are revealed immediately when opening the board without requiring players to guess!
      const isAutoRevealed = !isLetter;
      const isRev = isAutoRevealed || animRevealedIndices.has(origIdx);
      const isHl = highlightedIndices.has(origIdx);
      // CRITICAL REQUIREMENT: Show ONLY base letter without tone marks during play!
      // Full accented phrase is only shown on ROUND_RECAP after solving with exact tones.
      // Non-letters (digits 0-9 and symbols) always show pos.char directly.
      const displayChar =
        phase === "ROUND_RECAP"
          ? pos.char
          : isLetter
          ? normalizeVietnameseBaseLetter(pos.char)
          : pos.char;

      matrix[pos.row][pos.col] = {
        char: pos.char,
        displayChar,
        isLetter,
        isRevealed: isRev,
        isHighlighted: isHl,
        originalIndex: origIdx,
        seqIndex: 0,
      };
    });

    // Assign sequential index (0..N-1) in reading order across the 4x14 grid
    let activeTileSeq = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (matrix[r][c]) {
          matrix[r][c]!.seqIndex = activeTileSeq++;
        }
      }
    }

    return matrix;
  }, [currentPuzzle, cellPositionsMap, animRevealedIndices, highlightedIndices, phase]);

  const totalActiveTiles = useMemo(() => {
    let count = 0;
    gridMatrix.forEach((row) => {
      row.forEach((cell) => {
        if (cell) count++;
      });
    });
    return count;
  }, [gridMatrix]);

  // ── Sequential Cut Animation for Board Opening (0.125s per tile) ───────────
  const [cutRevealedCount, setCutRevealedCount] = useState<number>(() => {
    return (activeState.boardStage || boardStage) === "READY_CLUE" ? 9999 : 0;
  });

  useEffect(() => {
    if (effectiveBoardStage === "EMPTY_56") {
      setCutRevealedCount(0);
      return;
    }
    if (effectiveBoardStage === "READY_CLUE") {
      setCutRevealedCount(9999);
      return;
    }
    if (effectiveBoardStage === "BLANK_PHRASE") {
      setCutRevealedCount(0);
      const timers: NodeJS.Timeout[] = [];
      const totalTiles = totalActiveTiles;
      for (let k = 0; k < totalTiles; k++) {
        const t = setTimeout(() => {
          setCutRevealedCount(k + 1);
        }, k * 125);
        timers.push(t);
      }
      return () => {
        timers.forEach((t) => clearTimeout(t));
      };
    }
  }, [effectiveBoardStage, totalActiveTiles]);

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
          `Tất cả chữ cái gốc trên bảng đã mở! Tuy nhiên chưa có dấu thanh — mời ${formatTeamLabel(currentTurnTeamName)} bấm GIẢI Ô CHỮ và điền chính xác từng dấu thanh điệu!`,
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
        text: `${formatTeamLabel(tossUpBuzzedTeamName || currentTurnTeamName)} đã nhấn chuông! Mời đưa ra đáp án chính xác từng dấu thanh!`,
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

          {/* Edition Switcher for Host */}
          {isHost && onSetEdition && (
            <div className="flex items-center rounded-xl bg-slate-900/90 p-0.5 border border-white/15 text-[10px] font-black">
              <button
                type="button"
                onClick={() => onSetEdition("VIETNAMESE")}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  edition === "VIETNAMESE"
                    ? "bg-red-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🇻🇳 Bản Việt
              </button>
              <button
                type="button"
                onClick={() => onSetEdition("ENGLISH")}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  edition === "ENGLISH"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🇺🇸 Bản Anh
              </button>
            </div>
          )}

          {/* English Puzzle Set Selector */}
          {isHost && edition === "ENGLISH" && onSetEnglishPreset && (
            <select
              value={englishPreset || "RANDOM_MIX"}
              onChange={(e) => onSetEnglishPreset(e.target.value as any)}
              className="px-2 py-1 rounded-xl bg-slate-900 border border-blue-400 text-blue-200 text-[10px] font-black cursor-pointer"
            >
              <option value="RANDOM_MIX">🎲 Bộ đề: Ngẫu nhiên</option>
              <option value="SET_1">🇻🇳 Bộ 1: Di sản & Ẩm thực VN</option>
              <option value="SET_2">🌍 Bộ 2: Kỳ quan & Pop Culture</option>
              <option value="SET_3">🧩 Bộ 3: Cụm từ Wheel kinh điển</option>
            </select>
          )}

          {/* Blackout Guessed Letters Toggle */}
          {isHost && onSetBlackoutGuessed && (
            <button
              type="button"
              onClick={() => onSetBlackoutGuessed(blackoutGuessedLetters === false)}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer border ${
                blackoutGuessedLetters !== false
                  ? "bg-slate-800 text-slate-300 border-white/20 hover:border-white/40"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
              }`}
              title="Admin/MC: Bật hoặc tắt làm mờ/gạch ngang chữ cái đã đoán"
            >
              {blackoutGuessedLetters !== false ? "⬛ Bôi đen chữ: BẬT" : "⬜ Bôi đen chữ: TẮT"}
            </button>
          )}

          {/* Virtual Hostess Toggle Button */}
          <button
            type="button"
            onClick={toggleHostess}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer border ${
              showHostess
                ? "bg-fuchsia-600/30 text-fuchsia-200 border-fuchsia-400/50 hover:bg-fuchsia-600/50 shadow-[0_0_15px_rgba(217,70,239,0.3)]"
                : "bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white"
            }`}
            title="Bật/Tắt người mẫu ảo mở ô chữ trên sân khấu"
          >
            💃 Người mẫu: {showHostess ? "BẬT" : "TẮT"}
          </button>

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
                    className={`px-3 py-1.5 rounded-xl flex flex-col justify-center border text-xs font-bold transition shadow-sm ${
                      isTurn
                        ? "bg-amber-400/20 border-amber-400 text-white shadow-[0_0_14px_rgba(245,158,11,0.35)]"
                        : isEliminated
                        ? "bg-red-950/30 border-red-500/30 text-rose-300 opacity-60"
                        : "bg-black/50 border-white/10 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color || "#6366f1" }} />
                      <span className="truncate max-w-[110px]">{t.name}</span>
                      <span className="font-mono font-black text-amber-300 ml-auto">
                        {((t.score || 0) + rScore).toLocaleString()}đ
                      </span>
                      {isEliminatedBySolve ? (
                        <span className="text-rose-400 text-[10px] font-bold">⛔</span>
                      ) : strikes > 0 ? (
                        <span className="text-rose-400 font-mono text-[10px] tracking-tighter">
                          {"✕".repeat(Math.min(3, strikes))}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-end pt-0.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        Vòng này: {rScore.toLocaleString()}đ
                      </span>
                    </div>
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

          {isHost && onJudgeSolve && phase !== "ROUND_RECAP" && (
            <button
              type="button"
              onClick={() => onJudgeSolve(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/60 shadow-[0_0_15px_rgba(244,63,94,0.4)] hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Phạt SAI ngay lập tức, phát âm thanh sai và tiếp tục chơi (hoặc chuyển lượt)"
            >
              <span>✕</span> Phạt SAI
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

          {/* Ô May Mắn MC Guide Banner (Hiển thị trên cả Host, Display và Player) */}
          {phase === "LUCKY_PICK" && (
            <div className="mb-2 px-3 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-400/50 text-emerald-200 text-[11px] sm:text-xs font-bold flex items-center gap-2 animate-pulse shadow-lg">
              <span className="text-base">🍀</span>
              <span>
                <strong>Ô MAY MẮN:</strong> Chạm/Click vào ô muốn mở (ô sẽ sáng xanh), chạm lại lần nữa để lật mở chữ!
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
                        const isCutOpen =
                          effectiveBoardStage === "READY_CLUE" ||
                          (effectiveBoardStage === "BLANK_PHRASE" && (cell?.seqIndex ?? 0) < cutRevealedCount);

                        if (!cell || effectiveBoardStage === "EMPTY_56" || !isCutOpen) {
                          return (
                            <div
                              key={cIdx}
                              className="w-full aspect-[3/4] min-h-[36px] sm:min-h-[48px] md:min-h-[60px] lg:min-h-[72px] rounded bg-[#0f3414] border border-[#1e5824] flex items-center justify-center shadow-inner opacity-80 select-none"
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
                        const isJustCut =
                          effectiveBoardStage === "BLANK_PHRASE" &&
                          cell.seqIndex === cutRevealedCount - 1;

                        const canPickLucky = phase === "LUCKY_PICK" && !cell.isRevealed && (canInteract || isDisplay || isHost);

                        return (
                          <div
                            key={cIdx}
                            onClick={() => {
                              if (canPickLucky) {
                                if (luckyGreenSelectedIdx !== cell.originalIndex) {
                                  setLuckyGreenSelectedIdx(cell.originalIndex);
                                  if (canPlayBoardAudio) soundManager.playMagicWheelMark();
                                } else {
                                  setLuckyGreenSelectedIdx(null);
                                  if (canPlayBoardAudio) soundManager.playMagicWheelLetterReveal();
                                  onLuckyPick?.(cell.originalIndex);
                                }
                              }
                            }}
                            className={`w-full aspect-[3/4] min-h-[36px] sm:min-h-[48px] md:min-h-[60px] lg:min-h-[72px] rounded font-black flex items-center justify-center select-none ${
                              isJustCut ? "animate-vtv3-tile-cut" : ""
                            } ${
                              isPopping
                                ? "bg-white text-[#0f172a] border-2 border-yellow-300 shadow-[0_0_35px_#f59e0b] animate-vtv3-tile-pop z-30"
                                : isLuckyGreen
                                ? "bg-gradient-to-tr from-emerald-500 via-green-400 to-emerald-300 text-emerald-950 border-2 border-emerald-200 scale-110 shadow-[0_0_25px_#10b981] animate-pulse cursor-pointer z-10"
                                : cell.isHighlighted
                                ? "bg-gradient-to-tr from-cyan-400 via-sky-300 to-cyan-200 text-transparent border-2 border-white scale-110 shadow-[0_0_35px_#06b6d4,0_0_15px_#38bdf8] animate-pulse z-20"
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
                                ? ""
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
                {showHostess && (
                  <Hostess3DStudio
                    xPercent={hostessXPercent}
                    activeRow={hostessActiveRow}
                    facing={hostessFacing}
                    pose={hostessPose}
                  />
                )}
              </div>
            </div>

            {/* ── VTV3 Broadcast Lower-Third Chyron (Dải băng truyền hình VTV3 2 tầng chuẩn) ── */}
            <div className="w-full mt-3 z-20 flex flex-col items-start drop-shadow-2xl">
              {/* Tier 1: Category Badge / Chủ Đề (Gọn gàng, góc trên bên trái) */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-t-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-md border-t border-x border-amber-300">
                <span className="text-amber-900">⭐</span>
                <span>
                  {edition === "ENGLISH"
                    ? `CATEGORY: ${formatCategoryByEdition(currentPuzzle?.category || "GENERAL", "ENGLISH")}`
                    : `CHỦ ĐỀ: ${effectiveBoardStage === "EMPTY_56" ? "(Chờ MC mở bảng)" : formatCategoryByEdition(currentPuzzle?.category || "TỔNG HỢP", "VIETNAMESE")}`}
                </span>
              </div>
              {/* Tier 2: Clue Chyron Body Full-Width (Không bị co hẹp ngang) */}
              <div className="w-full px-4 py-2.5 sm:py-3 rounded-b-2xl rounded-tr-2xl bg-black/90 border border-amber-400/40 backdrop-blur-md flex items-center justify-between gap-4 text-slate-100 font-bold text-xs sm:text-sm md:text-base shadow-2xl">
                <p className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-relaxed flex-1">
                  {effectiveBoardStage === "READY_CLUE"
                    ? currentPuzzle?.clue || "Lắng nghe gợi ý từ MC và đoán các chữ cái!"
                    : "Bảng ô chữ đang chuẩn bị..."}
                </p>
                {currentPuzzle?.secretPhrase && effectiveBoardStage !== "EMPTY_56" && (
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-400/15 text-amber-300 font-mono font-black text-xs sm:text-sm border border-amber-400/30 whitespace-nowrap shadow-inner">
                    {currentPuzzle.secretPhrase.replace(/\s+/g, "").length} {edition === "ENGLISH" ? "LETTERS" : "KÝ TỰ"}
                  </span>
                )}
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
                        🎉 {formatTeamLabel(lastSolveFeedback.teamName)} (+{(lastSolveFeedback.pointsAwarded || 0).toLocaleString()}đ)
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
              style={effectiveIsSpinning ? { willChange: "transform" } : { transform: `rotate(${clientWheelAngle}deg)` }}
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

                  const isTextDark = sec.textColor === "#000000" || sec.textColor === "#78350f" || sec.textColor === "#451a03";
                  const textFill = isWinningSector ? "#fef08a" : sec.textColor || "#ffffff";
                  const textStroke = isWinningSector ? "#000000" : isTextDark ? "#ffffff" : "#000000";
                  const textStrokeWidth = isTextDark ? "0.8" : "1.0";

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
                                fill={textFill}
                                stroke={textStroke}
                                strokeWidth={textStrokeWidth}
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
                              fill={textFill}
                              stroke={textStroke}
                              strokeWidth={textStrokeWidth}
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
                {isHost && onJudgeSolve && phase !== "ROUND_RECAP" && (
                  <button
                    type="button"
                    onClick={() => onJudgeSolve(false)}
                    className="ml-auto px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-500/80 hover:bg-rose-600 text-white border border-rose-400/50 shadow transition cursor-pointer active:scale-95 shrink-0"
                    title="MC bấm phạt SAI thí sinh hiện tại và chuyển lượt/tiếp tục chơi ngay lập tức"
                  >
                    ✕ MC Phạt SAI
                  </button>
                )}
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

                  {(phase === "TOSS_UP_RUNNING" || phase === "TOSS_UP_REVEALING" || phase === "TOSS_UP_READY") && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={isLocallyBuzzed || Boolean(tossUpBuzzedTeamId)}
                        onClick={(e) => {
                          e.preventDefault();
                          handleTriggerTossUpBuzz();
                        }}
                        className={`w-full py-4 rounded-2xl font-black text-sm sm:text-base transition select-none touch-manipulation cursor-pointer ${
                          isLocallyBuzzed || Boolean(tossUpBuzzedTeamId)
                            ? "bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 text-slate-950 shadow-[0_0_35px_rgba(52,211,153,0.9)] opacity-90 scale-98 ring-4 ring-emerald-200 cursor-not-allowed"
                            : "bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 text-slate-950 hover:brightness-110 active:scale-95 shadow-[0_0_25px_rgba(251,191,36,0.6)] ring-2 ring-yellow-200"
                        }`}
                      >
                        {isLocallyBuzzed || Boolean(tossUpBuzzedTeamId)
                          ? "🔔 ĐÃ GHI NHẬN TIẾNG CHUÔNG! ĐANG KHÓA QUYỀN TRẢ LỜI..."
                          : "🔔 BẤM CHUÔNG GIÀNH QUYỀN GIẢI Ô CHỮ NGAY!"}
                      </button>
                      {isHost && teams.length > 1 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-bold text-slate-400">MC chọn đội bấm chuông:</span>
                          {teams.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handleTriggerTossUpBuzz(t.id);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/10 hover:bg-amber-400 hover:text-slate-950 border border-white/20 transition cursor-pointer select-none touch-manipulation"
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-amber-300">
                            🔔 {formatTeamLabel(tossUpBuzzedTeamName || currentTurnTeamName)} đang trả lời:
                          </span>
                        </div>
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

                      {!isHost && myTeamId && tossUpBuzzedTeamId && myTeamId !== tossUpBuzzedTeamId && !isInsideSandbox ? (
                        <div className="p-4 text-center text-xs font-bold text-slate-400 italic bg-white/5 rounded-xl border border-white/10">
                          Đang chờ {formatTeamLabel(tossUpBuzzedTeamName || "đối thủ")} gõ câu trả lời...
                        </div>
                      ) : (
                        <SmartPuzzlePhraseInput
                          secretPhrase={currentPuzzle?.secretPhrase || ""}
                          revealedIndices={animRevealedIndices}
                          onSubmit={(ans) => onSolvePuzzle?.(ans)}
                          submitLabel="CHỐT ĐÁP ÁN ĐOÁN NHANH ➔"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── B. SPECIAL FINAL ROUND CONTROLS ───────────────────────── */}
              {roundStage === "SPECIAL_FINAL" && phase !== "ROUND_RECAP" && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-b from-amber-950/70 via-purple-950/80 to-slate-950 border-2 border-amber-400/60 space-y-3 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-amber-400/30 pb-2">
                    <span className="font-black text-xs sm:text-sm text-amber-300 uppercase">
                      👑 VÒNG ĐẶC BIỆT — Quán quân: {formatTeamLabel(currentTurnTeamName)}
                    </span>
                    <span className="text-[11px] font-bold text-amber-200">
                      {edition === "ENGLISH"
                        ? "Đã mở sẵn R, S, T, L, N, E · Chọn 3 Phụ âm + 1 Nguyên âm · 40s giải"
                        : `Được chọn ${specialAllowedLettersCount} chữ cái · 30s suy nghĩ + 10s trả lời`}
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

                  {phase === "SPECIAL_SPIN_WAITING" && (() => {
                    const isMySpecialTurn = isHost || (myTeamId ? myTeamId === specialFinalTeamId : effectiveIsMyTurn);
                    if (!isMySpecialTurn) {
                      return (
                        <div className="text-center py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs font-bold text-amber-300/80 italic">
                          ⏳ Đang chờ {formatTeamLabel(specialFinalTeamName || "chiến thắng")} quay nón xác định Phong Bì Đặc Biệt...
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        <p className="text-xs text-amber-200 font-semibold">
                          Hãy bấm quay chiếc nón để xác định Phong Bì Giải Thưởng Đặc Biệt (+2.000đ đến +10.000đ):
                        </p>
                        <button
                          type="button"
                          disabled={effectiveIsSpinning}
                          onClick={() => {
                            if (effectiveIsSpinning) return;
                            if (canPlayBoardAudio) soundManager.playMagicWheelSpin();
                            setLocalIsSpinning(true);
                            onSpin?.(oscillatingPower);
                          }}
                          className="w-full py-3 rounded-xl font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 hover:brightness-110 cursor-pointer shadow-lg"
                        >
                          ✦ QUAY PHONG BÌ ĐẶC BIỆT ({oscillatingPower}%) ✦
                        </button>
                      </div>
                    );
                  })()}

                  {phase === "SPECIAL_PICK_LETTERS" && (
                    <div className="space-y-3">
                      {edition === "ENGLISH" ? (
                        /* ── LUẬT ANH: Mở sẵn R, S, T, L, N, E và chọn 3 Phụ âm + 1 Nguyên âm ── */
                        <div className="space-y-2.5">
                          {/* Banner 6 chữ cái mở sẵn */}
                          <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200">
                            <span className="font-black text-xs text-amber-300">⭐ ĐÃ MỞ SẴN TRÊN BẢNG:</span>
                            {ENGLISH_BONUS_ROUND_GIVEN_LETTERS.map((ch) => (
                              <span
                                key={ch}
                                className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs shadow-md border border-white/40"
                              >
                                {ch}
                              </span>
                            ))}
                            <span className="text-[11px] text-amber-100/90 ml-auto font-medium hidden sm:inline">
                              (R, S, T, L, N, E đã được hệ thống lật mở trước)
                            </span>
                          </div>

                          {(() => {
                            const selectedCons = specialPickedSet.filter((c) => !["A", "I", "O", "U"].includes(c));
                            const selectedVows = specialPickedSet.filter((c) => ["A", "I", "O", "U"].includes(c));
                            const isReady = selectedCons.length === 3 && selectedVows.length === 1;

                            return (
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-amber-200">
                                    Chọn 3 Phụ âm ({selectedCons.length}/3) &amp; 1 Nguyên âm ({selectedVows.length}/1):
                                  </span>
                                  <button
                                    type="button"
                                    disabled={!isReady}
                                    onClick={() => onSpecialPickLetters?.(specialPickedSet)}
                                    className={`px-4 py-1.5 rounded-xl font-black text-xs transition ${
                                      isReady
                                        ? "bg-emerald-400 text-slate-950 shadow-lg cursor-pointer hover:brightness-110"
                                        : "bg-white/10 text-slate-500 cursor-not-allowed"
                                    }`}
                                  >
                                    MỞ 4 CHỮ CÁI &amp; BẮT ĐẦU 40 GIÂY ➔
                                  </button>
                                </div>

                                {/* Nhóm 1: 3 Phụ âm */}
                                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                                  <span className="text-[11px] font-black uppercase text-cyan-300 block">
                                    1. Phụ âm ({selectedCons.length}/3) — Chọn 3 chữ:
                                  </span>
                                  <div className="grid grid-cols-8 sm:grid-cols-11 gap-1">
                                    {ENGLISH_BONUS_ROUND_PICKABLE_CONSONANTS.map((letter) => {
                                      const picked = selectedCons.includes(letter);
                                      return (
                                        <button
                                          key={letter}
                                          type="button"
                                          onClick={() => {
                                            setSpecialPickedSet((prev) => {
                                              if (prev.includes(letter)) return prev.filter((x) => x !== letter);
                                              const currentCons = prev.filter((c) => !["A", "I", "O", "U"].includes(c));
                                              if (currentCons.length >= 3) return prev;
                                              return [...prev, letter];
                                            });
                                          }}
                                          className={`p-1.5 sm:p-2 rounded-lg font-black text-xs transition cursor-pointer ${
                                            picked
                                              ? "bg-cyan-400 text-slate-950 border-2 border-white scale-105 shadow"
                                              : "bg-white/10 text-slate-200 hover:bg-white/20 border border-white/15"
                                          }`}
                                        >
                                          {letter}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Nhóm 2: 1 Nguyên âm */}
                                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                                  <span className="text-[11px] font-black uppercase text-amber-300 block">
                                    2. Nguyên âm ({selectedVows.length}/1) — Chọn 1 chữ:
                                  </span>
                                  <div className="flex gap-2">
                                    {ENGLISH_BONUS_ROUND_PICKABLE_VOWELS.map((letter) => {
                                      const picked = selectedVows.includes(letter);
                                      return (
                                        <button
                                          key={letter}
                                          type="button"
                                          onClick={() => {
                                            setSpecialPickedSet((prev) => {
                                              if (prev.includes(letter)) return prev.filter((x) => x !== letter);
                                              const withoutVows = prev.filter((c) => !["A", "I", "O", "U"].includes(c));
                                              return [...withoutVows, letter];
                                            });
                                          }}
                                          className={`px-4 py-2 rounded-lg font-black text-xs transition cursor-pointer ${
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
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        /* ── LUẬT VIỆT: Giữ nguyên 100% cơ chế cũ (chọn K chữ cái tự do từ bảng tiếng Việt) ── */
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
                              MỞ {specialAllowedLettersCount} CHỮ CÁI &amp; BẮT ĐẦU 40 GIÂY ➔
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
                  {/* 1. Spin Control — Only visible when board is open (READY_CLUE), in SPIN_WAITING, and NOT yet spinning */}
                  {phase === "SPIN_WAITING" &&
                    effectiveBoardStage === "READY_CLUE" &&
                    !effectiveIsSpinning &&
                    !isSpinning &&
                    !mustSolveWithTones &&
                    !speedUpBellActive && (
                    <div className="space-y-2.5 p-3 rounded-xl bg-purple-950/30 border border-purple-500/30">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                        <span className="flex items-center gap-1 text-amber-300">
                          ⚡ LỰC QUAY: {oscillatingPower}%
                        </span>
                        <span className="text-[10px] text-muted-foreground">Nhấn chốt để quay ngay</span>
                      </div>

                      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/20">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-75 shadow-lg"
                          style={{ width: `${oscillatingPower}%` }}
                        />
                      </div>

                      {edition === "ENGLISH" && isNoMoreConsonants && (
                        <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/30 to-amber-500/20 border-2 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse text-center">
                          <span className="text-lg">🔔</span>
                          <span className="font-black text-xs sm:text-sm tracking-wide text-amber-300">NO MORE CONSONANTS!</span>
                          <span className="text-[11px] text-amber-100 font-semibold hidden sm:inline">— Hết phụ âm trên bảng! Bạn chỉ có thể Mua Nguyên Âm (250đ) hoặc Đoán Ô Chữ.</span>
                        </div>
                      )}

                      {(() => {
                        const isMyTurnToSpin = isHost || (myTeamId ? myTeamId === currentTurnTeamId : effectiveIsMyTurn);
                        if (canInteract && isMyTurnToSpin) {
                          return (
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isMyTurnToSpin || effectiveIsSpinning || isCurrentTeamEliminated || isNoMoreConsonants) return;
                                  if (canPlayBoardAudio) soundManager.playMagicWheelSpin();
                                  setLocalIsSpinning(true);
                                  onSpin?.(oscillatingPower);
                                }}
                                disabled={!isMyTurnToSpin || effectiveIsSpinning || isCurrentTeamEliminated || isNoMoreConsonants}
                                className={`flex-1 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm text-white transition shadow-[0_0_20px_rgba(236,72,153,0.4)] ${
                                  isCurrentTeamEliminated
                                    ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                                    : isNoMoreConsonants
                                    ? "bg-slate-850 text-amber-400/80 border border-amber-500/40 cursor-not-allowed opacity-75"
                                    : "bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:brightness-110 active:scale-98 cursor-pointer"
                                }`}
                                title={isNoMoreConsonants ? "Không còn phụ âm nào trên bảng (No more consonants). Bạn chỉ có thể Mua nguyên âm hoặc Đoán ô chữ!" : undefined}
                              >
                                {isCurrentTeamEliminated
                                  ? "⛔ ĐÃ HẾT LƯỢT VÒNG NÀY (ĐOÁN SAI Ô CHỮ)"
                                  : isNoMoreConsonants
                                  ? "🚫 HẾT PHỤ ÂM (NO MORE CONSONANTS)"
                                  : `✦ CHỐT LỰC & QUAY NÓN (${oscillatingPower}%) ✦`}
                              </button>
                              {edition === "ENGLISH" && subMode === "WORD_PUZZLE" && (
                                <button
                                  type="button"
                                  onClick={() => setBuyVowelModalOpen(true)}
                                  disabled={
                                    isSpinning ||
                                    isCurrentTeamEliminated ||
                                    ((roundScores?.[currentTurnTeamId] || 0) < 250)
                                  }
                                  className={`px-3 py-2.5 rounded-xl font-black text-xs whitespace-nowrap transition shadow ${
                                    isCurrentTeamEliminated || (roundScores?.[currentTurnTeamId] || 0) < 250
                                      ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                                      : "text-amber-100 bg-gradient-to-r from-amber-600 to-orange-700 hover:brightness-110 active:scale-98 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse"
                                  }`}
                                  title="Mua nguyên âm (A, E, I, O, U) với 250đ từ điểm vòng của đội"
                                >
                                  🛒 MUA NGUYÊN ÂM (250đ)
                                </button>
                              )}
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
                                  title={
                                    isSolveForbiddenInRound3
                                      ? edition === "ENGLISH"
                                        ? "Theo luật Vòng 3: Cần mở hết phụ âm trước khi đoán ô chữ"
                                        : "Theo luật Vòng 3: Cần mở hết từng chữ cái trước khi đoán ô chữ"
                                      : undefined
                                  }
                                >
                                  {isCurrentTeamEliminated
                                    ? "⛔ ĐÃ HẾT QUYỀN"
                                    : isSolveForbiddenInRound3
                                    ? "🔒 CẦN MỞ HẾT"
                                    : "🎯 GIẢI Ô CHỮ"}
                                </button>
                              )}
                              {edition === "ENGLISH" && isNoMoreConsonants && onPassTurn && (
                                <button
                                  type="button"
                                  onClick={() => onPassTurn()}
                                  className="px-3 py-2.5 rounded-xl font-bold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 transition cursor-pointer whitespace-nowrap"
                                  title="Chuyển lượt cho đội kế tiếp nếu bạn không đủ 250đ mua nguyên âm và chưa chắc chắn đáp án"
                                >
                                  ⏭️ BỎ LƯỢT
                                </button>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div className="text-center py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs font-bold text-amber-300/80 italic">
                            ⏳ Đang chờ {formatTeamLabel(currentTurnTeamName)} thực hiện lượt quay hoặc giải ô chữ...
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* 2. Alphabet Keyboard & Solve Trigger */}
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
                            : edition === "ENGLISH"
                            ? "Bàn phím 26 chữ cái tiếng Anh (Quay nón gọi Phụ âm, Mua Nguyên âm 250đ):"
                            : "Bàn phím 29 chữ cái tiếng Việt (chỉ mở chữ cái gốc, không mở dấu thanh):"}
                        </span>
                        {canInteract && (
                          <div className="flex items-center gap-1.5">
                            {edition === "ENGLISH" && (
                              <button
                                type="button"
                                onClick={() => setBuyVowelModalOpen(true)}
                                disabled={
                                  isCurrentTeamEliminated ||
                                  ((roundScores?.[currentTurnTeamId] || 0) < 250)
                                }
                                className={`px-2.5 py-1 rounded-lg text-xs font-black shadow transition ${
                                  isCurrentTeamEliminated || (roundScores?.[currentTurnTeamId] || 0) < 250
                                    ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50"
                                    : "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-110 cursor-pointer shadow"
                                }`}
                              >
                                🛒 Mua Nguyên Âm (250đ)
                              </button>
                            )}
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
                              {isCurrentTeamEliminated
                                ? "⛔ HẾT QUYỀN GIẢI"
                                : edition === "ENGLISH"
                                ? "🎯 GIẢI Ô CHỮ (SOLVE)"
                                : "🎯 GIẢI Ô CHỮ (ĐIỀN DẤU THANH)"}
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

                      {guessedLetterWarning && (
                        <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/60 text-amber-200 text-xs font-bold flex items-center justify-between gap-2 animate-bounce">
                          <span>{guessedLetterWarning}</span>
                          <button
                            type="button"
                            onClick={() => setGuessedLetterWarning(null)}
                            className="text-amber-400 hover:text-white cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-7 sm:grid-cols-10 gap-1">
                        {(edition === "ENGLISH" ? ENGLISH_ALPHABET : VIETNAMESE_ALPHABET).map((letter) => {
                          const isGuessed = guessedLetters.includes(letter);
                          const isVowel = edition === "ENGLISH" && isEnglishVowel(letter);
                          const isCurrentTarget =
                            canInteract &&
                            (phase === "ACTION_INPUT" || expressModeActive || speedUpBellActive) &&
                            !mustSolveWithTones &&
                            !isSpinning &&
                            !(edition === "ENGLISH" && isVowel);

                          const handleLetterClick = () => {
                            if (isGuessed) {
                              if (blackoutGuessedLetters === false) {
                                setGuessedLetterWarning(`⚠️ Chữ "${letter}" đã có người đoán trước đó rồi!`);
                                setTimeout(() => setGuessedLetterWarning(null), 3000);
                              }
                              return;
                            }
                            if (edition === "ENGLISH" && isVowel) {
                              setGuessedLetterWarning("⚠️ Trong bản tiếng Anh, nguyên âm (A, E, I, O, U) phải mua với giá 250đ!");
                              setTimeout(() => setGuessedLetterWarning(null), 3500);
                              return;
                            }
                            onGuessLetter?.(letter);
                          };

                          return (
                            <button
                              key={letter}
                              type="button"
                              disabled={isGuessed && blackoutGuessedLetters !== false}
                              onClick={handleLetterClick}
                              className={`p-1.5 sm:p-2 rounded-lg font-black text-xs transition-all select-none relative ${
                                isGuessed && blackoutGuessedLetters !== false
                                  ? "bg-white/5 text-slate-500 border border-white/5 opacity-40 cursor-not-allowed line-through"
                                  : isGuessed && blackoutGuessedLetters === false
                                  ? "bg-gradient-to-b from-cyan-500/20 to-blue-600/30 text-cyan-200 border border-cyan-400/40 shadow hover:scale-105 active:scale-95 cursor-pointer"
                                  : isCurrentTarget
                                  ? "bg-gradient-to-b from-cyan-500/20 to-blue-600/30 hover:from-cyan-400/40 hover:to-blue-500/50 text-cyan-200 border border-cyan-400/40 shadow hover:scale-105 active:scale-95 cursor-pointer"
                                  : isVowel
                                  ? "bg-amber-500/15 text-amber-300 border border-amber-400/30 hover:bg-amber-500/25 cursor-pointer"
                                  : "bg-white/5 text-slate-300 border border-white/10 opacity-70 cursor-not-allowed"
                              }`}
                            >
                              <span>{letter}</span>
                              {edition === "ENGLISH" && isVowel && !isGuessed && (
                                <span className="block text-[8px] text-amber-400/80 font-normal leading-none mt-0.5">
                                  250đ
                                </span>
                              )}
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
                                  if (canPlayBoardAudio) soundManager.playMagicWheelReward();
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
                          Đang chờ {formatTeamLabel(currentTurnTeamName)} chọn 1 trong 20 lá thăm bí mật...
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
                              QUYẾT ĐỊNH Ô BÍ MẬT (3.000.000đ tiền thưởng vĩnh viễn hoặc MẤT ĐIỂM)
                            </h4>
                          </div>
                          {canInteract ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => onMysteryDecide?.(false)}
                                className="py-2 px-3 rounded-lg font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow cursor-pointer transition text-center"
                              >
                                🛡️ AN TOÀN (1.000đ x số chữ đoán đúng)
                              </button>
                              <button
                                type="button"
                                onClick={() => onMysteryDecide?.(true)}
                                className="py-2 px-3 rounded-lg font-black text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:brightness-110 shadow cursor-pointer transition text-center"
                              >
                                🎲 LẬT BÍ MẬT (3 Triệu hoặc Mất Điểm)
                              </button>
                            </div>
                          ) : (
                            <div className="text-center text-xs text-slate-400 italic">
                              Đang đợi {formatTeamLabel(currentTurnTeamName)}...
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
                        <h4 className="font-black text-xs text-rose-200">
                          ĐỔI HAY KHÔNG ĐỔI? (VÒNG 3) — 2 Hộp tiền thưởng &amp; 2 Hộp quà hiện vật
                        </h4>
                      </div>
                      {canInteract ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {[
                              { label: "🎁 Hộp #1", desc: "Tiền mặt 5.000.000đ" },
                              { label: "🎁 Hộp #2", desc: "Tiền mặt 3.000.000đ" },
                              { label: "🎁 Hộp #3", desc: "Nồi chiên không dầu" },
                              { label: "🎁 Hộp #4", desc: "Bộ nồi Inox & Máy xay" },
                            ].map((box, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => onTradeDecide?.(true, idx)}
                                className="p-2 rounded-lg border border-rose-400/40 bg-rose-500/20 text-rose-200 text-xs font-black cursor-pointer hover:bg-rose-500/30 transition text-center flex flex-col items-center justify-center gap-0.5"
                              >
                                <span>{box.label}</span>
                                <span className="text-[10px] text-rose-300 font-normal opacity-90">{box.desc}</span>
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
                          Đang đợi {formatTeamLabel(currentTurnTeamName)}...
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
                <span className="text-amber-300">Tổng điểm hiện tại</span>
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
                        <div className="text-right shrink-0 flex flex-col items-end">
                          <span className="text-xs font-mono font-black text-amber-300">
                            {((t.score || 0) + rScore).toLocaleString()}đ
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold mt-0.5">
                            Vòng này: {rScore.toLocaleString()}đ
                          </span>
                          {activeState.prizeCash?.[t.id] ? (
                            <div className="text-[9px] font-mono text-emerald-400 font-bold mt-0.5" title="Tiền thưởng vĩnh viễn (không tính vào điểm xét Vòng Đặc Biệt)">
                              💰 {(activeState.prizeCash[t.id] * 1000).toLocaleString("vi-VN")}đ tiền mặt
                            </div>
                          ) : null}
                          {activeState.physicalPrizes?.[t.id]?.map((pName, pIdx) => (
                            <div key={pIdx} className="text-[9px] text-amber-300 font-semibold truncate max-w-[140px] mt-0.5" title={pName}>
                              🎁 {pName}
                            </div>
                          ))}
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

      {/* ── MODAL: MUA NGUYÊN ÂM (ENGLISH EDITION) ─────────────────────────── */}
      {buyVowelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-5 rounded-2xl bg-[#121829] border-2 border-amber-400/60 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🛒</span>
                <div>
                  <h4 className="font-black text-base text-amber-300">
                    BUY A VOWEL (MUA NGUYÊN ÂM)
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Chi phí cố định: <strong className="text-amber-400">250 điểm</strong> từ điểm vòng của đội. Chọn 1 trong 5 nguyên âm:
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBuyVowelModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2.5 py-2">
              {ENGLISH_VOWELS.map((vowel) => {
                const isGuessed = guessedLetters.includes(vowel);
                const isAffordable = (roundScores?.[currentTurnTeamId] || 0) >= 250;

                return (
                  <button
                    key={vowel}
                    type="button"
                    disabled={isGuessed || !isAffordable}
                    onClick={() => {
                      if (isGuessed || !isAffordable) return;
                      onBuyVowel?.(vowel);
                      setBuyVowelModalOpen(false);
                    }}
                    className={`py-4 rounded-xl flex flex-col items-center justify-center font-black text-lg transition-all ${
                      isGuessed
                        ? "bg-white/5 text-slate-600 border border-white/5 opacity-40 cursor-not-allowed line-through"
                        : !isAffordable
                        ? "bg-white/5 text-slate-500 border border-white/10 opacity-50 cursor-not-allowed"
                        : "bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
                    }`}
                  >
                    <span>{vowel}</span>
                    <span className="text-[9px] font-bold opacity-80 mt-1">
                      {isGuessed ? "Đã gọi" : "250đ"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-center text-[11px] text-slate-400 border-t border-white/10 pt-2.5">
              Điểm vòng hiện tại của {formatTeamLabel(currentTurnTeamName)}:{" "}
              <strong className="text-emerald-400">
                {(roundScores?.[currentTurnTeamId] || 0).toLocaleString()}đ
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
