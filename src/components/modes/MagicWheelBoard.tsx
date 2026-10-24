"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MagicWheelState, MagicWheelOperationMode, TeamState, MagicWheelSector, MagicWheelPuzzle } from "@/types";
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
  isPuzzleFullyRevealed,
  evaluateThreePhaseWheelProgress,
  stripVietnameseToneKeepBase,
  CrosswordWordItem,
  validateCrosswordLayout,
  validateCrosswordSolve,
} from "@/lib/game-engine/magic-wheel";
import { formatCategoryByEdition } from "@/lib/game-engine/magic-wheel-categories";
import { soundManager } from "@/lib/sound-manager";
import { formatVietnameseText, VietnameseInputMethod } from "@/lib/vietnamese-ime";
import dynamic from "next/dynamic";

const WheelStudio3DScene = dynamic(() => import("./WheelStudio3DScene"), { ssr: false });


export function getCleanPuzzleCategoryOrClue(puzzle?: { category?: string; clue?: string; description?: string; hint?: string } | null): string {
  if (!puzzle) return "";
  const rawCat = (puzzle.category || puzzle.hint || "").trim();
  const cleanCat = rawCat
    .replace(/^[⭐✨⚡💡]+\s*/g, "")
    .replace(/^(chủ\s*đề|category|gợi\s*ý|clue|hint)[\s:]+/gi, "")
    .trim();

  if (cleanCat && !/^(tổng\s*hợp|general)$/i.test(cleanCat)) {
    return cleanCat.toUpperCase();
  }

  const rawClue = (puzzle.clue || puzzle.description || "").trim();
  const cleanClue = rawClue
    .replace(/^[⭐✨⚡💡]+\s*/g, "")
    .replace(/^(chủ\s*đề|category|gợi\s*ý|clue|hint)[\s:]+/gi, "")
    .replace(/\s*\(\s*\d+\s*(ký\s*tự|chữ\s*cái|chữ|letters|chars?)\s*\)/gi, "")
    .trim();

  return cleanClue || cleanCat || "";
}

export function formatTeamLabel(rawName?: string): string {
  if (!rawName) return "Đội chơi";
  const trimmed = rawName.trim();
  if (/^Đội\s+/i.test(trimmed)) {
    return trimmed;
  }
  return `Đội ${trimmed}`;
}


export interface MagicWheelBoardProps {
  magicWheelState?: MagicWheelState;
  wheelState?: MagicWheelState;
  displayLayoutMode?: "AUTO" | "STACKED" | "FOCUS_WHEEL" | "FOCUS_BOARD";
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
  onUseFreeSpin?: (use: boolean) => void;
  onLuckyPick?: (index: number) => void;
  onAdvanceRound?: () => void;
  onOverrideTurn?: (teamId: string) => void;
  onPassTurn?: () => void;
  onQuickRevealLetter?: () => void;
  onRevealAll?: () => void;
  onTossUpStart?: () => void;
  onTossUpBuzz?: (teamId?: string) => void;
  onTossUpRevealTick?: (index?: number) => void;
  onTossUpSkip?: () => void;
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
  onSetTemporaryText?: (text: string) => void;
  onClearTemporaryText?: () => void;
  onSetDisplayLayout?: (layout: "AUTO" | "STACKED" | "FOCUS_WHEEL" | "FOCUS_BOARD") => void;
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
  edition = "VIETNAMESE",
  compact = false,
}: {
  secretPhrase: string;
  revealedIndices: Set<number>;
  onSubmit: (finalAnswer: string) => void;
  onCancel?: () => void;
  submitLabel?: string;
  continuousMode?: boolean;
  attemptLog?: string[];
  edition?: "VIETNAMESE" | "ENGLISH";
  compact?: boolean;
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
      // BUG-10 FIX: Dùng targetChar (có dấu đầy đủ) thay vì baseChar (mất dấu thanh)
      if (s.isRevealedVowel) return s.targetChar;
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
      e.stopPropagation();
      if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === "function") {
        (document.activeElement as HTMLElement).blur();
      }
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

  const effectiveImeMethod = edition === "ENGLISH" ? "OFF" : imeMethod;

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

    if (edition === "ENGLISH" || effectiveImeMethod === "OFF") {
      const lastKey = rawVal.slice(-1).toUpperCase();
      setCharValues((prev) => {
        const next = [...prev];
        next[slotIdx] = lastKey;
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
        const formatted = formatVietnameseText(rawVal, imeMethod);
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
    const formatted = edition === "ENGLISH" || effectiveImeMethod === "OFF" ? text : formatVietnameseText(text, effectiveImeMethod);
    setRawLineInput(formatted);
    const upper = formatted.toUpperCase();
    setCharValues(() => {
      const next = slots.map((s) => {
        if (s.isSpace) return " ";
        if (s.isLockedConsonant) return s.baseChar;
        // BUG-10 FIX: Reset về targetChar (có đủ dấu) thay vì baseChar (mất dấu)
        if (s.isRevealedVowel) return s.targetChar;
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
    <div className={compact ? "space-y-1.5" : "space-y-3.5"}>
      {/* ── Primary Full-Phrase Vietnamese Input ── */}
      <div className={`space-y-1.5 ${compact ? "p-2 sm:p-2.5 rounded-xl" : "p-3 sm:p-4 rounded-2xl"} bg-[#080d1a] border-2 border-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.15)]`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className={`${compact ? "text-xs" : "text-xs sm:text-sm"} font-black text-amber-300 flex items-center gap-2`}>
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
              e.stopPropagation();
              if (e.currentTarget && typeof e.currentTarget.blur === "function") {
                e.currentTarget.blur();
              }
              handleTriggerSubmit();
            }
          }}
          placeholder="Nhập trực tiếp cả cụm từ đầy đủ dấu thanh tại đây (VD: THĂNG LONG HÀ NỘI)..."
          className={`w-full ${compact ? "px-3 py-2 text-xs sm:text-sm" : "px-4 py-3 text-sm sm:text-base"} rounded-xl bg-black/80 border-2 border-amber-400 text-white font-black focus:outline-none focus:ring-4 focus:ring-amber-400/30 uppercase tracking-widest shadow-inner placeholder:text-slate-500 placeholder:font-normal placeholder:tracking-normal`}
        />
        <div className={`flex items-center justify-between ${compact ? "text-[10px]" : "text-[11px]"} text-slate-400 pt-0.5`}>
          <span>💡 Các chữ cái bạn gõ sẽ tự động đồng bộ lên các ô chữ bên dưới.</span>
          <span>Bấm <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-amber-300 font-mono font-bold">Enter ↵</kbd> để chốt</span>
        </div>
      </div>

      {/* Guided Legend (hidden in compact mode) */}
      {!compact && (
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
      )}

      {/* Interactive Character Slots Grouped by Word */}
      <div className={`flex flex-wrap items-center justify-center ${compact ? "gap-x-2.5 gap-y-1.5 p-2 rounded-xl" : "gap-x-4 gap-y-2.5 p-3 rounded-2xl"} bg-[#07111e] border border-white/15 shadow-inner`}>
        {words.map((wordSlots, wIdx) => (
          <div key={wIdx} className="flex items-center gap-1">
            {wordSlots.map((slot) => {
              const val = charValues[slot.index] || "";
              const isFocused = focusedSlotIdx === slot.index;
              const slotBoxDim = compact ? "w-6 h-8 sm:w-7 sm:h-9 text-xs" : "w-8 h-10 sm:w-9 sm:h-11 text-sm sm:text-base";

              if (slot.isLockedConsonant) {
                return (
                  <div
                    key={slot.index}
                    className={`${slotBoxDim} rounded-lg bg-emerald-950/80 border-2 border-emerald-500/50 text-emerald-200 font-black flex flex-col items-center justify-center select-none shadow`}
                    title="Phụ âm đã mở sẵn"
                  >
                    <span>{slot.baseChar}</span>
                    <span className="text-[6px] text-emerald-400/80 font-normal">KHÓA</span>
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
                  className={`${slotBoxDim} rounded-lg text-center font-black uppercase transition-all focus:outline-none ${
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
      <div className={`${compact ? "p-1.5 rounded-lg" : "p-2.5 rounded-xl"} bg-amber-950/40 border border-amber-400/30 flex flex-wrap items-center justify-between gap-1.5`}>
        <span className={`${compact ? "text-[10px]" : "text-[11px]"} font-bold text-amber-200`}>
          🎶 Hoặc chọn nhanh dấu thanh cho ô nguyên âm đang click:
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {TONE_BUTTONS.map((tb) => (
            <button
              key={tb.tone}
              type="button"
              disabled={!canApplyToneToFocused}
              onClick={() => {
                if (focusedSlotIdx !== null) applyToneAtSlot(focusedSlotIdx, tb.tone);
              }}
              className={`${compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"} rounded-lg font-black transition ${
                canApplyToneToFocused
                  ? "bg-amber-400/20 hover:bg-amber-400 text-amber-200 hover:text-slate-950 border border-amber-400/50 cursor-pointer"
                  : "bg-white/5 text-slate-500 border border-white/10 opacity-40 cursor-not-allowed"
              }`}
            >
              {tb.label} <span className="opacity-70 text-[8px]">[{tb.keyHint}]</span>
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

/**
 * Hộp thoại giải Ô Chữ Liên Kết hỗ trợ 2 Tab:
 * - Tab 1: Nhập nhanh danh sách từ (phân tách DUY NHẤT bằng dấu phẩy ',', nghiêm cấm từ nối như 'và', 'and', 'với', '&').
 * - Tab 2: Điền trực quan vào lưới ô chữ 4x14 (chạm vào các ô trống để điền chữ).
 */
function CrosswordSolveModalInput({
  puzzle,
  revealedIndices,
  onSubmit,
  onCancel,
  edition = "VIETNAMESE",
}: {
  puzzle: MagicWheelPuzzle;
  revealedIndices: Set<number>;
  onSubmit: (finalAnswer: string) => void;
  onCancel?: () => void;
  edition?: "VIETNAMESE" | "ENGLISH";
}) {
  const [activeTab, setActiveTab] = useState<"COMMA_LIST" | "GRID_FILL">("COMMA_LIST");
  const [commaText, setCommaText] = useState("");
  const words = useMemo(() => puzzle.crosswordWords || [], [puzzle.crosswordWords]);
  const layout = useMemo(() => validateCrosswordLayout(words), [words]);

  // Tab 2 Grid State: map of gridKey (r * 14 + c) -> character entered by player
  const [gridChars, setGridChars] = useState<Record<number, string>>({});

  // Client-side forbidden words detector for Tab 1
  const forbiddenMatch = useMemo(() => {
    const match = commaText.match(/(^|[^A-ZÀ-Ỹ0-9])(VÀ|AND|VỚI|CÙNG|KÈM|[&+])([^A-ZÀ-Ỹ0-9]|$)/i);
    return match ? match[2].toUpperCase() : null;
  }, [commaText]);

  // Extract comma tokens
  const commaTokens = useMemo(() => {
    return commaText
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  }, [commaText]);

  const handleSubmitCommaList = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!commaText.trim()) return;
    if (forbiddenMatch) {
      alert(`⚠️ Vi phạm quy tắc nghiêm ngặt: Không được dùng từ nối "${forbiddenMatch}"! Bạn chỉ được dùng dấu phẩy ',' để phân tách các từ khoá.`);
      return;
    }
    if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === "function") {
      (document.activeElement as HTMLElement).blur();
    }
    onSubmit(commaText.trim().toUpperCase());
  };

  const handleSubmitGridFill = () => {
    // Reconstruct each word from grid
    const extractedWords: string[] = [];
    for (const item of words) {
      const chars: string[] = [];
      const cleanW = (item.word || "").trim().toUpperCase();
      for (let i = 0; i < cleanW.length; i++) {
        const r = item.direction === "ACROSS" ? item.row : item.row + i;
        const c = item.direction === "ACROSS" ? item.col + i : item.col;
        const key = r * 14 + c;
        // If already revealed or user typed
        const ch = gridChars[key] || (revealedIndices.has(key) ? cleanW[i] : "");
        chars.push(ch);
      }
      extractedWords.push(chars.join(""));
    }
    onSubmit(extractedWords.join(", "));
  };

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/60 border border-amber-500/30">
        <button
          type="button"
          onClick={() => setActiveTab("COMMA_LIST")}
          className={`px-3 py-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 ${
            activeTab === "COMMA_LIST"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "text-amber-200/70 hover:bg-white/5"
          }`}
        >
          <span>✍️</span>
          <span>Tab 1: Nhập danh sách từ (Dấu phẩy)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("GRID_FILL")}
          className={`px-3 py-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 ${
            activeTab === "GRID_FILL"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "text-amber-200/70 hover:bg-white/5"
          }`}
        >
          <span>📐</span>
          <span>Tab 2: Điền trực quan vào lưới 4x14</span>
        </button>
      </div>

      {activeTab === "COMMA_LIST" && (
        <form onSubmit={handleSubmitCommaList} className="space-y-3">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1.5">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>QUY TẮC NGHIÊM NGẶT (WOF CROSSWORD RULES):</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Nhập đầy đủ <strong>{words.length} từ khoá</strong> trên bảng, phân tách <strong>DUY NHẤT bằng dấu phẩy &quot;,&quot;</strong> (thứ tự tự do).
              <br />
              <span className="text-red-400 font-bold">
                CẤM TUYỆT ĐỐI dùng các từ nối ngoài bảng (như &quot;và&quot;, &quot;and&quot;, &quot;với&quot;, &quot;&amp;&quot;).
              </span>
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-amber-200">
                Nhập các từ khoá (ngăn cách bằng dấu phẩy):
              </label>
              <span className="text-[11px] text-amber-300/80 font-mono font-bold">
                {commaTokens.length} / {words.length} từ khoá
              </span>
            </div>
            <textarea
              rows={2}
              value={commaText}
              onChange={(e) => setCommaText(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSubmitCommaList();
                }
              }}
              placeholder={
                edition === "ENGLISH"
                  ? "e.g.: PLANET, STAR, AIR (separate with commas only)"
                  : "VD: VĂN HỌC, NHO, HÀ NỘI (chỉ dùng dấu phẩy)"
              }
              className={`w-full px-3.5 py-2.5 rounded-xl bg-black/60 border text-white font-bold text-sm tracking-wider uppercase focus:outline-none transition ${
                forbiddenMatch
                  ? "border-red-500 ring-2 ring-red-500/50"
                  : "border-amber-500/40 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40"
              }`}
            />
            {forbiddenMatch && (
              <div className="mt-1.5 p-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-xs flex items-center gap-1.5 font-bold animate-pulse">
                <span>⛔</span>
                <span>
                  Phát hiện từ nối cấm &quot;{forbiddenMatch}&quot;! Bạn chỉ được dùng dấu phẩy &quot;,&quot; để phân tách.
                </span>
              </div>
            )}
          </div>

          {/* Tokens chips preview */}
          {commaTokens.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {commaTokens.map((tok, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs shadow-sm flex items-center gap-1"
                >
                  <span className="text-[10px] opacity-70">#{i + 1}</span>
                  <span>{tok}</span>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                HỦY
              </button>
            )}
            <button
              type="submit"
              disabled={commaTokens.length === 0 || Boolean(forbiddenMatch)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm tracking-wider uppercase shadow-lg hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition transform active:scale-95"
            >
              CHỐT GIẢI Ô CHỮ LIÊN KẾT ➔
            </button>
          </div>
        </form>
      )}

      {activeTab === "GRID_FILL" && (
        <div className="space-y-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs flex items-center gap-2">
            <span>💡</span>
            <span>Chạm/gõ từng chữ cái vào các ô còn trống. Điểm giao 🔗 sẽ tự động đồng bộ giữa các từ!</span>
          </div>

          {/* 4x14 Interactive Grid */}
          <div className="grid grid-rows-4 gap-1 p-2 bg-[#021307] rounded-xl border-2 border-amber-500/50 shadow-inner">
            {Array.from({ length: 4 }).map((_, rIdx) => (
              <div key={rIdx} className="grid grid-cols-14 gap-1">
                {Array.from({ length: 14 }).map((_, cIdx) => {
                  const key = rIdx * 14 + cIdx;
                  const cell = layout.cellMap.get(key);
                  const isInter = layout.intersections.some((it) => it.row === rIdx && it.col === cIdx);
                  const isAlreadyRevealed = revealedIndices.has(key);
                  const currentVal = gridChars[key] || (isAlreadyRevealed && cell ? cell.char : "");

                  if (!cell) {
                    return (
                      <div
                        key={cIdx}
                        className="w-full aspect-[4/5] rounded bg-[#0f3414]/60 border border-[#1e5824]/40"
                      />
                    );
                  }

                  if (isAlreadyRevealed) {
                    return (
                      <div
                        key={cIdx}
                        className="w-full aspect-[4/5] rounded bg-white text-slate-900 font-black text-xs sm:text-sm flex items-center justify-center shadow select-none relative"
                      >
                        <span>{cell.char}</span>
                        {isInter && (
                          <span className="absolute -top-1 -right-1 text-[8px]">🔗</span>
                        )}
                      </div>
                    );
                  }

                  return (
                    <input
                      key={cIdx}
                      type="text"
                      maxLength={1}
                      value={currentVal}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setGridChars((prev) => ({ ...prev, [key]: val }));
                      }}
                      className={`w-full aspect-[4/5] rounded font-black text-xs sm:text-sm text-center uppercase focus:outline-none transition ${
                        isInter
                          ? "bg-amber-400 text-slate-950 border-2 border-yellow-200 ring-2 ring-amber-400/50"
                          : "bg-slate-900 text-amber-200 border-2 border-amber-400/60 focus:border-white focus:bg-slate-800"
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                HỦY
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmitGridFill}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm tracking-wider uppercase shadow-lg hover:brightness-110 cursor-pointer transition transform active:scale-95"
            >
              LẤY TỪ TRÊN LƯỚI &amp; CHỐT ĐÁP ÁN ➔
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface HostessTVStageProps {
  pose: "IDLE" | "GESTURE" | "WALKING" | "TOUCHING";
  facing?: "LEFT" | "RIGHT";
  activeRow?: number;
  className?: string;
}

function HostessTVStage({ pose, facing = "RIGHT", activeRow = 1, className = "" }: HostessTVStageProps) {
  const isTouching = pose === "TOUCHING";
  const isGesture = pose === "GESTURE";
  const isWalking = pose === "WALKING";

  // Reach/lift elevation when gesturing towards active row
  const touchRowLift = [12, 6, 0, -4][activeRow] ?? 0;

  return (
    <div className={`relative flex flex-col items-center justify-end select-none pointer-events-none ${className}`}>
      <style>{`
        @keyframes hostessBreathe {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.008) translateY(-1.5px); }
        }
        @keyframes hostessCatwalkWalk {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-4px) rotate(0.6deg); }
          50% { transform: translateY(0); }
          75% { transform: translateY(-4px) rotate(-0.6deg); }
        }
        @keyframes hostessHaloPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.35); opacity: 1; }
        }
      `}</style>

      {/* Hostess Standing Character Container */}
      <div
        className="relative z-10 flex flex-col items-center"
        style={{
          transform: isTouching
            ? `scale(1.04) translateY(-${6 + touchRowLift}px) scaleX(${facing === "LEFT" ? -1 : 1})`
            : isGesture
            ? `scale(1.02) translateY(-3px) scaleX(${facing === "LEFT" ? -1 : 1})`
            : isWalking
            ? `scale(1.01) scaleX(${facing === "LEFT" ? -1 : 1})`
            : `scale(1) translateY(0px) scaleX(${facing === "LEFT" ? -1 : 1})`,
          transition: "transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Soft cyan/gold studio spotlight flare at pointing hand when gesturing towards board */}
        {(isTouching || isGesture) && (
          <div
            className="absolute z-40 w-5 h-5 rounded-full bg-cyan-300/90 blur-[1px] shadow-[0_0_25px_#06b6d4,0_0_40px_#fde047] pointer-events-none"
            style={{
              top: `${16 + activeRow * 12}px`,
              right: "-6px",
              animation: "hostessHaloPulse 1.2s infinite ease-in-out",
            }}
          />
        )}

        {/* Model Photographic Cutout (Full-Body Vietnamese Gameshow Hostess) */}
        <div
          className="relative w-20 sm:w-24 md:w-28 lg:w-32 h-44 sm:h-52 md:h-60 lg:h-68 drop-shadow-[0_15px_30px_rgba(0,0,0,0.95)]"
          style={{
            animation: isWalking
              ? "hostessCatwalkWalk 0.7s infinite ease-in-out"
              : "hostessBreathe 4s infinite ease-in-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/magic-wheel/hostess_fullbody.png"
            alt="Người mẫu Chiếc Nón Kỳ Diệu"
            className="w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />
        </div>

        {/* Studio Floor Contact Shadow under Heels */}
        <div
          className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-16 sm:w-20 md:w-24 h-2.5 rounded-full blur-[2px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 60%, transparent 80%)",
          }}
        />
      </div>
    </div>
  );
}


function NeedlePointerSvg() {
  return (
    <svg viewBox="0 0 44 48" className="w-full h-full">
      <defs>
        <linearGradient id="mwChromeNeedleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#e2e8f0" />
          <stop offset="60%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        {/* Red lacquer pointer blade: authentic VTV3 Chiếc Nón Kỳ Diệu needle */}
        <linearGradient id="mwNeedleFacetLeft" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="45%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <linearGradient id="mwNeedleFacetRight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="55%" stopColor="#b91c1c" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
      </defs>
      {/* Sleek crimson needle blade pointing cleanly into the pegs */}
      <path d="M22 39 L11 8 Q22 13 22 8 Z" fill="url(#mwNeedleFacetLeft)" stroke="#fca5a5" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M22 39 L33 8 Q22 13 22 8 Z" fill="url(#mwNeedleFacetRight)" stroke="#991b1b" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M22 38 L22 10" stroke="url(#mwChromeNeedleGrad)" strokeWidth="2.8" strokeLinecap="round" />
      {/* Chrome & gold pivot collar */}
      <circle cx="22" cy="11" r="5.5" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.8" />
      <circle cx="22" cy="11" r="3.6" fill="url(#mwChromeNeedleGrad)" />
      <circle cx="20.6" cy="9.6" r="1.2" fill="#ffffff" />
    </svg>
  );
}

function WheelDiscSvg({
  sectors,
  selectedSector,
  selectedSectorIndex,
  isSpinning,
}: {
  sectors: MagicWheelSector[];
  selectedSector?: MagicWheelSector;
  selectedSectorIndex?: number;
  isSpinning?: boolean;
}) {
  return (
    <svg viewBox="0 0 440 440" className="w-full h-full select-none">
      <defs>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@700;800;900&family=Merriweather:wght@900&display=swap');
          .gameshow-font {
            font-family: 'Roboto Slab', 'Merriweather', serif;
            font-weight: 900;
          }
        `}</style>
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

        {/* ── 3D CONICAL SLOPE SHADING (Độ dốc hình nón từ tâm cao xuống vành ngoài) ── */}
        <radialGradient id="wheelConicalSlope3D" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.36" />
          <stop offset="30%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="88%" stopColor="#ffffff" stopOpacity="0.00" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
        </radialGradient>

        {/* ── STUDIO OVERHEAD KEY-LIGHT (Ánh đèn sân khấu chuyên nghiệp rọi sáng trong) ── */}
        <radialGradient id="wheelStudioSpotlight" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.34" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="75%" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.05" />
        </radialGradient>

        {/* ── 3D WEDGE BEVEL RIBS: Gờ Ngăn Ô Kim Loại Nổi Khối (Cạnh Phản Quang & Đổ Bóng) ── */}
        <linearGradient id="wedgeRibHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* ── INTEGRATED 3D GOLD RIM & BEZEL COLLAR (Perfect Vector Alignment) ── */}
      <circle cx="220" cy="220" r="211" fill="none" stroke="url(#goldRimGrad3D)" strokeWidth="16" />
      <circle cx="220" cy="220" r="219" fill="none" stroke="#78350f" strokeWidth="2" />
      <circle cx="220" cy="220" r="203" fill="none" stroke="#451a03" strokeWidth="2.5" />
      <circle cx="220" cy="220" r="201" fill="none" stroke="#fef08a" strokeWidth="1" strokeDasharray="3 4" opacity="0.65" />

      {sectors.map((sec, idx) => {
        const segCount = sectors.length || 24;
        const degPerSeg = 360 / segCount;
        const theta1 = (idx * degPerSeg * Math.PI) / 180;
        const theta2 = ((idx + 1) * degPerSeg * Math.PI) / 180;
        const r = 201;
        const cx = 220;
        const cy = 220;
        const x1 = cx + r * Math.sin(theta1);
        const y1 = cy - r * Math.cos(theta1);
        const x2 = cx + r * Math.sin(theta2);
        const y2 = cy - r * Math.cos(theta2);
        const midDeg = (idx + 0.5) * degPerSeg;

        const rPeg = 194;
        const pegX = cx + rPeg * Math.sin(theta1);
        const pegY = cy - rPeg * Math.cos(theta1);

        const isWinningSector =
          !isSpinning &&
          (selectedSectorIndex !== undefined
            ? selectedSectorIndex === idx
            : selectedSector !== undefined && sectors.indexOf(selectedSector) === idx);
        const cleanLabel = sec.label.replace(/[,.]/g, "");
        const isNumeric = sec.type === "POINTS" || /^\$?\d+$/.test(cleanLabel.trim());
        const digits = isNumeric ? cleanLabel.trim().split("") : [];
        const numCount = digits.length;
        const charStep = numCount >= 5 ? 14 : numCount >= 4 ? 15.5 : 18.5;
        const outerRimStartY = cy - 180;

        const specialLabel = cleanLabel;
        const specialFontSize =
          specialLabel.length > 10 ? "9.5" : specialLabel.length > 8 ? "10.5" : "12";
        const textOuterStartY = cy - 182;

        const isTextDark = sec.textColor === "#000000" || sec.textColor === "#78350f" || sec.textColor === "#451a03";
        const textFill = isWinningSector ? "#fef08a" : sec.textColor || "#ffffff";
        const textStroke = isWinningSector ? "#000000" : isTextDark ? "#ffffff" : "#000000";
        const textStrokeWidth = isTextDark ? "0.8" : "1.0";

        // Vòng 5: Ô 25.000 điểm KẸP GIỮA HAI Ô MẤT ĐIỂM (Sandwich Wedge)
        if (sec.isSandwich) {
          const a0 = theta1;
          const a1 = theta1 + 0.25 * (theta2 - theta1);
          const a2 = theta1 + 0.75 * (theta2 - theta1);
          const a3 = theta2;

          const subX1_0 = cx + r * Math.sin(a0);
          const subY1_0 = cy - r * Math.cos(a0);
          const subX1_1 = cx + r * Math.sin(a1);
          const subY1_1 = cy - r * Math.cos(a1);

          const subX2_1 = cx + r * Math.sin(a2);
          const subY2_1 = cy - r * Math.cos(a2);
          const subX2_2 = cx + r * Math.sin(a3);
          const subY2_2 = cy - r * Math.cos(a3);

          const midLeftDeg = (idx + 0.125) * degPerSeg;
          const midRightDeg = (idx + 0.875) * degPerSeg;

          return (
            <g key={sec.id}>
              {/* Left Sub-Slice: 25% MẤT ĐIỂM */}
              <path
                d={`M ${cx} ${cy} L ${subX1_0} ${subY1_0} A ${r} ${r} 0 0 1 ${subX1_1} ${subY1_1} Z`}
                fill="#000000"
                stroke="#fbbf24"
                strokeWidth="0.8"
                strokeOpacity={0.8}
              />
              {/* Center Sub-Slice: 50% 25.000 ĐIỂM */}
              <path
                d={`M ${cx} ${cy} L ${subX1_1} ${subY1_1} A ${r} ${r} 0 0 1 ${subX2_1} ${subY2_1} Z`}
                fill={isWinningSector ? "#4c1d95" : "#059669"}
                stroke={isWinningSector ? "#fbbf24" : "#ffffff"}
                strokeWidth={isWinningSector ? "3.5" : "1.2"}
                strokeOpacity={isWinningSector ? 1 : 0.6}
                filter={isWinningSector ? "url(#winningSliceGlow)" : undefined}
              />
              {/* Right Sub-Slice: 25% MẤT ĐIỂM */}
              <path
                d={`M ${cx} ${cy} L ${subX2_1} ${subY2_1} A ${r} ${r} 0 0 1 ${subX2_2} ${subY2_2} Z`}
                fill="#000000"
                stroke="#fbbf24"
                strokeWidth="0.8"
                strokeOpacity={0.8}
              />

              {/* Text: Left MẤT */}
              <g transform={`rotate(${midLeftDeg} ${cx} ${cy})`}>
                <g transform={`rotate(90 ${cx} ${textOuterStartY})`}>
                  <text
                    x={cx}
                    y={textOuterStartY}
                    textAnchor="start"
                    fontSize="8"
                    fontWeight="900"
                    fill="#ef4444"
                    stroke="#000000"
                    strokeWidth="0.8"
                    style={{ paintOrder: "stroke fill", fontFamily: "'Roboto Slab', 'Merriweather', serif" }}
                    dominantBaseline="central"
                    className="gameshow-font select-none pointer-events-none tracking-tighter uppercase"
                  >
                    MẤT
                  </text>
                </g>
              </g>

              {/* Text: Center 25000 Digits */}
              <g transform={`rotate(${midDeg} ${cx} ${cy})`}>
                <circle cx={cx} cy={cy - 192} r="1.3" fill="#ffffff" opacity="0.9" />
                <g className="gameshow-font select-none pointer-events-none">
                  {["2", "5", "0", "0", "0"].map((digit, dIdx) => (
                    <text
                      key={dIdx}
                      x={cx}
                      y={outerRimStartY + dIdx * 14}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="14"
                      fontWeight="900"
                      fill={isWinningSector ? "#fef08a" : "#ffffff"}
                      stroke="#000000"
                      strokeWidth="1.2"
                      style={{ paintOrder: "stroke fill", fontFamily: "'Roboto Slab', 'Merriweather', serif" }}
                      className="gameshow-font select-none pointer-events-none"
                    >
                      {digit}
                    </text>
                  ))}
                </g>
                <circle cx={cx} cy={cy - 56} r="1.1" fill="#ffffff" opacity="0.6" />
              </g>

              {/* Text: Right ĐIỂM */}
              <g transform={`rotate(${midRightDeg} ${cx} ${cy})`}>
                <g transform={`rotate(90 ${cx} ${textOuterStartY})`}>
                  <text
                    x={cx}
                    y={textOuterStartY}
                    textAnchor="start"
                    fontSize="8"
                    fontWeight="900"
                    fill="#ef4444"
                    stroke="#000000"
                    strokeWidth="0.8"
                    style={{ paintOrder: "stroke fill", fontFamily: "'Roboto Slab', 'Merriweather', serif" }}
                    dominantBaseline="central"
                    className="gameshow-font select-none pointer-events-none tracking-tighter uppercase"
                  >
                    ĐIỂM
                  </text>
                </g>
              </g>

              {/* Chrome Detent Peg */}
              <g transform={`rotate(${idx * degPerSeg} ${pegX} ${pegY})`}>
                <ellipse cx={pegX + 1.5} cy={pegY + 1.8} rx="3.8" ry="2" fill="#000000" opacity="0.65" />
                <ellipse cx={pegX} cy={pegY} rx="3.6" ry="2.2" fill="url(#chromeCollarGrad)" stroke="#0f172a" strokeWidth="0.5" />
                <rect x={pegX - 1.8} y={pegY - 8.5} width="3.6" height="8.5" rx="1.8" fill="url(#chromeStemGrad)" stroke="#1e293b" strokeWidth="0.5" />
                <circle cx={pegX} cy={pegY - 8.5} r="3.6" fill="url(#chromeCapGrad)" stroke="#1e293b" strokeWidth="0.6" />
                <circle cx={pegX - 1.1} cy={pegY - 9.8} r="1" fill="#ffffff" opacity="0.95" />
              </g>
            </g>
          );
        }

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

            {/* ── 3D Wedge Bevel Ribs: Cạnh Đổ Bóng & Cạnh Phản Quang Kim Loại Tạo Độ Dày Cơ Học ── */}
            <line
              x1={cx}
              y1={cy}
              x2={x1}
              y2={y1}
              stroke="#000000"
              strokeWidth="1.6"
              strokeOpacity="0.55"
            />
            <line
              x1={cx}
              y1={cy}
              x2={x1}
              y2={y1}
              stroke="url(#wedgeRibHighlight)"
              strokeWidth="0.8"
              strokeOpacity="0.75"
            />

            <g transform={`rotate(${midDeg} ${cx} ${cy})`}>
              <circle cx={cx} cy={cy - 192} r="1.3" fill={sec.textColor || "#ffffff"} opacity="0.85" />

              {isNumeric ? (
                <g className="gameshow-font select-none pointer-events-none">
                  {digits.map((digit: string, dIdx: number) => (
                    <text
                      key={dIdx}
                      x={cx}
                      y={outerRimStartY + dIdx * charStep}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={numCount >= 5 ? "13.5" : numCount >= 4 ? "14.5" : "17"}
                      fontWeight="900"
                      fill={textFill}
                      stroke={textStroke}
                      strokeWidth={textStrokeWidth}
                      style={{ paintOrder: "stroke fill", fontFamily: "'Roboto Slab', 'Merriweather', serif" }}
                      className="gameshow-font select-none pointer-events-none"
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
                    style={{ paintOrder: "stroke fill", fontFamily: "'Roboto Slab', 'Merriweather', serif", letterSpacing: "0.5px" }}
                    dominantBaseline="central"
                    className="gameshow-font select-none pointer-events-none uppercase"
                  >
                    {specialLabel}
                  </text>
                </g>
              )}

              <circle cx={cx} cy={cy - 56} r="1.1" fill={sec.textColor || "#ffffff"} opacity="0.5" />
            </g>

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

      {/* ── 3D CONICAL SLOPE SHADING & STUDIO LIGHTING OVERLAYS (Dốc xuống từ tâm ra) ── */}
      <circle cx="220" cy="220" r="201" fill="url(#wheelConicalSlope3D)" pointerEvents="none" />
      <circle cx="220" cy="220" r="201" fill="url(#wheelStudioSpotlight)" pointerEvents="none" />
      {/* ── AMBIENT OCCLUSION RIM SHADOW & GOLD BEZEL ACCENT ── */}
      <circle cx="220" cy="220" r="201" fill="none" stroke="#000000" strokeWidth="8" opacity="0.32" pointerEvents="none" />
      <circle cx="220" cy="220" r="197" fill="none" stroke="#fef08a" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.4" pointerEvents="none" />
      <circle cx="220" cy="220" r="190" fill="none" stroke="#fde68a" strokeWidth="0.7" strokeDasharray="3 4" opacity="0.4" pointerEvents="none" />

      {/* ── BÓNG ĐỔ NỔI CAO CỦA TRỤC XOAY TRUNG TÂM (Elevated Hub Shadow Ring) ── */}
      <circle cx="220" cy="224" r="52" fill="#000000" opacity="0.55" pointerEvents="none" />

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
  );
}

/** Bệ 3D kim loại bạc-xanh nâng vòng quay lên, viền LED */
function WheelMachine3DBase({ isSpinning, children }: { isSpinning: boolean; children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col items-center justify-center" style={{ filter: "drop-shadow(0 20px 40px rgba(14,165,233,0.25))" }}>
      {/* Children = vòng quay */}
      <div className="relative z-10">{children}</div>

      {/* LED Ring viền bệ */}
      <div
        className={`relative w-[88%] mt-[-6px] z-20 overflow-visible flex items-center justify-center`}
        style={{ height: "18px" }}
      >
        <div
          className="w-full rounded-full"
          style={{
            height: "10px",
            background: "linear-gradient(90deg, #d97706 0%, #f59e0b 20%, #fef08a 40%, #fbbf24 60%, #b45309 80%, #d97706 100%)",
            boxShadow: isSpinning
              ? "0 0 20px rgba(245,158,11,0.9), 0 0 40px rgba(217,119,6,0.6), 0 0 8px rgba(254,240,138,0.8)"
              : "0 0 10px rgba(245,158,11,0.5), 0 0 20px rgba(217,119,6,0.3)",
            animation: isSpinning ? "ledChase 0.6s linear infinite" : "ledPulse 3s ease-in-out infinite",
            borderRadius: "9999px",
          }}
        />
      </div>

      {/* Pedestal cylinder - top face (ellipse) */}
      <div
        className="relative z-10"
        style={{
          width: "85%",
          height: "12px",
          background: "radial-gradient(ellipse at 40% 30%, #fef08a, #fbbf24, #b45309 70%, #451a03 100%)",
          borderRadius: "50%",
          boxShadow: "0 4px 16px rgba(69,26,3,0.7), inset 0 2px 4px rgba(255,255,255,0.4)",
          marginTop: "-1px",
        }}
      />
      {/* Pedestal cylinder - side face */}
      <div
        style={{
          width: "80%",
          height: "32px",
          background: "linear-gradient(180deg, #b45309 0%, #1e293b 35%, #0f172a 65%, #020617 100%)",
          borderRadius: "0 0 40% 40% / 0 0 80% 80%",
          boxShadow: "0 8px 24px rgba(0,0,0,0.8), inset 2px 0 6px rgba(245,158,11,0.2), inset -2px 0 6px rgba(245,158,11,0.1)",
          position: "relative",
          zIndex: 9,
        }}
      >
        {/* Horizontal accent line on pedestal */}
        <div style={{
          position: "absolute",
          top: "40%",
          left: "8%",
          right: "8%",
          height: "2px",
          background: "linear-gradient(90deg, transparent, #fbbf24, #fef08a, #fbbf24, transparent)",
          opacity: 0.8,
          borderRadius: "1px",
        }} />
      </div>

      {/* Pedestal base — wider foot */}
      <div
        style={{
          width: "88%",
          height: "10px",
          background: "linear-gradient(180deg, #1e3a5f 0%, #0c1a35 50%, #030a1a 100%)",
          borderRadius: "0 0 50% 50% / 0 0 100% 100%",
          boxShadow: "0 6px 20px rgba(0,0,0,0.9)",
          zIndex: 8,
          position: "relative",
        }}
      />

      {/* CSS keyframes for LED animations (injected inline as style tag) */}
      <style>{`
        @keyframes ledChase {
          0% { filter: hue-rotate(0deg) brightness(1.3); }
          50% { filter: hue-rotate(30deg) brightness(1.8); }
          100% { filter: hue-rotate(0deg) brightness(1.3); }
        }
        @keyframes ledPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/** Bục đội 3D với màn hình LED, dùng CSS perspective */
function TeamPodium3D({
  team,
  roundScore,
  isTurn,
  isCompact,
  side,
  edition,
  strikes,
}: {
  team: { id: string; name: string; color?: string; score?: number };
  roundScore: number;
  isTurn: boolean;
  isCompact: boolean;
  side: "left" | "right";
  edition: string;
  strikes: number;
}) {
  const tiltDeg = side === "left" ? 8 : -8;
  const totalScore = (team.score || 0) + roundScore;
  const scoreStr = edition === "ENGLISH"
    ? `$${totalScore.toLocaleString("en-US")}`
    : `${totalScore.toLocaleString()}đ`;
  const roundStr = roundScore > 0
    ? (edition === "ENGLISH" ? `+$${roundScore.toLocaleString("en-US")}` : `+${roundScore.toLocaleString()}đ`)
    : null;

  const screenBg = isTurn
    ? "linear-gradient(135deg, #0c2a5e 0%, #0e3a7a 40%, #0a1f4a 100%)"
    : "linear-gradient(135deg, #0a0f1d 0%, #0f172a 60%, #070c18 100%)";
  const borderColor = isTurn ? "#38bdf8" : "#1e40af";
  const glowColor = isTurn ? "rgba(56,189,248,0.6)" : "rgba(30,64,175,0.25)";

  return (
    <div
      style={{
        perspective: "400px",
        perspectiveOrigin: side === "left" ? "80% 50%" : "20% 50%",
      }}
    >
      <div
        style={{
          transform: `rotateY(${tiltDeg}deg)`,
          transformStyle: "preserve-3d",
          transition: "all 0.3s ease",
        }}
      >
        {/* LED Screen */}
        <div
          style={{
            background: screenBg,
            border: `2px solid ${borderColor}`,
            borderRadius: "10px",
            boxShadow: `0 0 ${isTurn ? "18px" : "8px"} ${glowColor}, inset 0 1px 3px rgba(255,255,255,0.07)`,
            padding: isCompact ? "4px 6px" : "6px 10px",
            minWidth: isCompact ? "70px" : "90px",
            maxWidth: isCompact ? "100px" : "130px",
            animation: isTurn ? "podiumPulse 1.5s ease-in-out infinite" : undefined,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Scanline overlay */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)",
            pointerEvents: "none",
            borderRadius: "8px",
          }} />
          {/* Team dot + name */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
            <div style={{
              width: isCompact ? "6px" : "8px",
              height: isCompact ? "6px" : "8px",
              borderRadius: "50%",
              background: team.color || "#6366f1",
              boxShadow: `0 0 6px ${team.color || "#6366f1"}`,
              flexShrink: 0,
            }} />
            <span style={{
              color: isTurn ? "#bae6fd" : "#94a3b8",
              fontSize: isCompact ? "9px" : "11px",
              fontWeight: 900,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: isCompact ? "70px" : "100px",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              fontFamily: "monospace",
            }}>{team.name}</span>
          </div>
          {/* Score */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", flexWrap: "wrap" }}>
            {roundStr && (
              <span style={{
                color: "#34d399",
                fontSize: isCompact ? "8px" : "10px",
                fontWeight: 700,
                fontFamily: "monospace",
              }}>{roundStr}</span>
            )}
            <span style={{
              color: isTurn ? "#fde68a" : "#f59e0b",
              fontSize: isCompact ? "11px" : "14px",
              fontWeight: 900,
              fontFamily: "monospace",
              lineHeight: 1,
            }}>{scoreStr}</span>
          </div>
          {/* Strike indicators */}
          {strikes > 0 && (
            <div style={{ color: "#f87171", fontSize: "8px", marginTop: "1px", fontFamily: "monospace" }}>
              {"✕".repeat(Math.min(3, strikes))}
            </div>
          )}
        </div>
        {/* Podium base */}
        <div style={{
          height: isCompact ? "8px" : "10px",
          background: "linear-gradient(180deg, #1d4ed8 0%, #1e3a5f 50%, #0c1a35 100%)",
          borderRadius: "0 0 6px 6px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
          marginTop: "-1px",
        }} />
      </div>
      <style>{`
        @keyframes podiumPulse {
          0%, 100% { box-shadow: 0 0 18px rgba(56,189,248,0.6), inset 0 1px 3px rgba(255,255,255,0.07); }
          50% { box-shadow: 0 0 30px rgba(56,189,248,0.9), 0 0 50px rgba(14,165,233,0.4), inset 0 1px 3px rgba(255,255,255,0.1); }
        }
      `}</style>
    </div>
  );
}

function InteractiveWheelRig({
  variant,
  size = "normal",
  wheelRef,
  needleRef,
  clientWheelAngle,
  effectiveIsSpinning,
  sectors,
  selectedSector,
  selectedSectorIndex,
}: {
  variant: "DISPLAY_360" | "PLAYER_INVERTED" | "HOST_HALF";
  size?: "normal" | "large";
  wheelRef: React.RefObject<HTMLDivElement | null>;
  needleRef: React.RefObject<HTMLDivElement | null>;
  clientWheelAngle: number;
  effectiveIsSpinning: boolean;
  sectors: MagicWheelSector[];
  selectedSector?: MagicWheelSector;
  selectedSectorIndex?: number;
}) {
  if (variant === "DISPLAY_360") {
    const isLarge = size === "large";
    const dimClasses = isLarge
      ? "w-[280px] h-[280px] sm:w-[380px] sm:h-[380px] md:w-[480px] md:h-[480px] lg:w-[580px] lg:h-[580px] xl:w-[680px] xl:h-[680px] max-h-[72vh] max-w-[72vh]"
      : "h-full max-h-[min(38vh,260px)] sm:max-h-[38vh] max-w-full aspect-square";
    const borderClasses = isLarge
      ? "border-[6px] sm:border-[8px] md:border-[10px] border-[#d97706]"
      : "border-[3px] sm:border-[4px] md:border-[5px] border-[#d97706]";
    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative select-none min-h-0 pt-2 pb-1">
        <div
          className={`${dimClasses} aspect-square relative select-none flex items-center justify-center shrink-0 transition-all duration-700 ease-in-out`}
        >
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
            <NeedlePointerSvg />
          </div>
          <div className="absolute -inset-3 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.95)_45%,rgba(15,8,30,0.7)_70%,transparent_85%)] blur-md pointer-events-none -z-10" />
          <div className={`absolute inset-0 aspect-square rounded-full ${borderClasses} shadow-[0_16px_40px_rgba(0,0,0,0.9),0_0_35px_rgba(245,158,11,0.45),inset_0_2px_4px_rgba(254,240,138,0.9),inset_0_-3px_8px_rgba(69,26,3,0.95)] pointer-events-none z-20`}>
            <div className="w-full h-full rounded-full border border-amber-950/70 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)]" />
          </div>
          <div
            ref={wheelRef}
            className="w-full h-full aspect-square rounded-full overflow-hidden shadow-2xl relative"
            style={{
              transform: `rotate(${clientWheelAngle}deg)`,
              willChange: effectiveIsSpinning ? "transform" : undefined,
              transformStyle: "preserve-3d",
            }}
          >
            <WheelDiscSvg
              sectors={sectors}
              selectedSector={selectedSector}
              selectedSectorIndex={selectedSectorIndex}
              isSpinning={effectiveIsSpinning}
            />
          </div>
        </div>
        {selectedSector && (
          <div className="mt-1 px-2.5 py-0.5 rounded-full bg-black/85 border border-amber-400/50 text-[10px] font-black text-amber-200 flex items-center gap-1 shadow-md shrink-0">
            <span className="text-amber-400">🎯</span>
            <span>Ô quay: {selectedSector.label}</span>
          </div>
        )}
      </div>
    );
  }

  if (variant === "PLAYER_INVERTED") {
    return (
      <div className="w-full flex flex-col items-center justify-center relative select-none shrink-0">
        <div className="w-full max-w-[320px] h-[115px] sm:h-[130px] relative select-none flex items-start justify-center overflow-hidden">
          <div className="w-[230px] h-[230px] sm:w-[260px] sm:h-[260px] -top-[115px] sm:-top-[130px] relative select-none flex items-center justify-center shrink-0">
            <div className="absolute -inset-4 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.95)_45%,rgba(15,8,30,0.7)_70%,transparent_85%)] blur-md pointer-events-none -z-10" />
            <div className="absolute inset-0 aspect-square rounded-full border-[8px] sm:border-[10px] border-[#d97706] shadow-[0_16px_40px_rgba(0,0,0,0.9),0_0_35px_rgba(245,158,11,0.45),inset_0_2px_4px_rgba(254,240,138,0.9),inset_0_-3px_8px_rgba(69,26,3,0.95)] pointer-events-none z-20">
              <div className="w-full h-full rounded-full border border-amber-950/70 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)]" />
            </div>
            <div
              ref={wheelRef}
              className="w-full h-full aspect-square rounded-full overflow-hidden shadow-2xl relative"
              style={{
                transform: `rotate(${clientWheelAngle + 180}deg)`,
                willChange: effectiveIsSpinning ? "transform" : undefined,
              }}
            >
              <WheelDiscSvg
                sectors={sectors}
                selectedSector={selectedSector}
                selectedSectorIndex={selectedSectorIndex}
                isSpinning={effectiveIsSpinning}
              />
            </div>
            <div
              ref={needleRef}
              className="absolute bottom-[-16px] sm:bottom-[-18px] left-1/2 -translate-x-1/2 w-[11.4%] aspect-[44/48] z-30 pointer-events-none"
              style={{
                transformOrigin: "50% 22.92%",
                transform: "rotate(180deg) scale(1.06) translateZ(0)",
                filter: "drop-shadow(0px -4px 8px rgba(0,0,0,0.85))",
                willChange: "transform",
              }}
            >
              <NeedlePointerSvg />
            </div>
          </div>
        </div>
        {selectedSector && (
          <div className="mt-0.5 px-2.5 py-0.5 rounded-full bg-black/85 border border-amber-400/50 text-[10px] font-black text-amber-200 flex items-center gap-1 shadow-md z-30">
            <span className="text-amber-400">🎯</span>
            <span>Ô quay: {selectedSector.label}</span>
          </div>
        )}
      </div>
    );
  }

  // Host Half
  return (
    <div className="w-full flex flex-col items-center justify-center relative select-none">
      <div className="w-[240px] h-[145px] sm:w-[290px] sm:h-[175px] relative select-none flex items-start justify-center overflow-hidden">
        <div className="w-[240px] h-[240px] sm:w-[290px] sm:h-[290px] relative select-none flex items-center justify-center shrink-0">
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
            <NeedlePointerSvg />
          </div>
          <div className="absolute -inset-4 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.95)_45%,rgba(15,8,30,0.7)_70%,transparent_85%)] blur-md pointer-events-none -z-10" />
          <div className="absolute inset-0 aspect-square rounded-full border-[10px] sm:border-[12px] border-[#d97706] shadow-[0_16px_40px_rgba(0,0,0,0.9),0_0_35px_rgba(245,158,11,0.45),inset_0_2px_4px_rgba(254,240,138,0.9),inset_0_-3px_8px_rgba(69,26,3,0.95)] pointer-events-none z-20">
            <div className="w-full h-full rounded-full border border-amber-950/70 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)]" />
          </div>
          <div
            ref={wheelRef}
            className="w-full h-full aspect-square rounded-full overflow-hidden shadow-2xl relative"
            style={{
              transform: `rotate(${clientWheelAngle}deg)`,
              willChange: effectiveIsSpinning ? "transform" : undefined,
            }}
          >
            <WheelDiscSvg
              sectors={sectors}
              selectedSector={selectedSector}
              selectedSectorIndex={selectedSectorIndex}
              isSpinning={effectiveIsSpinning}
            />
          </div>
        </div>
      </div>
      {selectedSector && (
        <div className="mt-1 px-3 py-0.5 rounded-full bg-black/70 border border-amber-400/50 text-[11px] font-black text-amber-200 flex items-center gap-1.5 shadow-md">
          <span className="text-amber-400">🎯</span>
          <span>Ô quay: {selectedSector.label}</span>
        </div>
      )}
    </div>
  );
}

export default function MagicWheelBoard({
  magicWheelState,
  wheelState,
  displayLayoutMode,
  onSetDisplayLayout,
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
  onUseFreeSpin,
  onLuckyPick,
  onAdvanceRound,
  onOverrideTurn,
  onPassTurn,
  onTossUpStart,
  onTossUpBuzz,
  onTossUpRevealTick,
  onTossUpSkip,
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
  onSetTemporaryText,
  onClearTemporaryText,
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
    mustSpinOnly = false,
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
    temporaryDisplayText,
    temporaryDisplayActive,
  } = activeState;

  const isTempActive = Boolean(temporaryDisplayActive && temporaryDisplayText);

  const [solveModalOpen, setSolveModalOpen] = useState<boolean>(false);
  const [buyVowelModalOpen, setBuyVowelModalOpen] = useState<boolean>(false);
  const [tempTextModalOpen, setTempTextModalOpen] = useState<boolean>(false);
  const [tempTextInput, setTempTextInput] = useState<string>("");
  const [guessedLetterWarning, setGuessedLetterWarning] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<{ text: string; isSuccess: boolean } | null>(null);
  const prevActionMsgRef = useRef<string>("");

  useEffect(() => {
    if (lastActionMessage && lastActionMessage !== prevActionMsgRef.current) {
      prevActionMsgRef.current = lastActionMessage;
      const isSuccess =
        lastActionMessage.includes("Có ") ||
        lastActionMessage.includes("Tuyệt vời") ||
        lastActionMessage.includes("🎉") ||
        lastActionMessage.includes("chính xác");
      const isMiss =
        lastActionMessage.includes("Không có") ||
        lastActionMessage.includes("Trật") ||
        lastActionMessage.includes("TRẬT ĐƯỜNG RAY") ||
        lastActionMessage.includes("❌");

      if (isSuccess || isMiss) {
        setActionToast({ text: lastActionMessage, isSuccess });
        const timer = setTimeout(() => {
          setActionToast(null);
        }, 3500);
        return () => clearTimeout(timer);
      }
    }
  }, [lastActionMessage]);
  const [specialPickedSet, setSpecialPickedSet] = useState<string[]>([]);
  const [specialRemainingSec, setSpecialRemainingSec] = useState<number>(40);
  const [tossUpRemainingSec, setTossUpRemainingSec] = useState<number>(0);
  const [isBoardShaking, setIsBoardShaking] = useState<boolean>(false);
  const [isLocallyBuzzed, setIsLocallyBuzzed] = useState<boolean>(false);
  const [is16x9Letterbox, setIs16x9Letterbox] = useState<boolean>(false);
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

  const [animRevealedIndices, setAnimRevealedIndices] = useState<Set<number>>(
    new Set(currentPuzzle?.revealedIndices || [])
  );

  // BUG-07 FIX: Sync animRevealedIndices khi server gửi state mới (sau reconnect hoặc round recap)
  // Trong suốt trận đấu trực tiếp (Toss-Up & Vòng chính), choreography kiểm soát hoàn toàn việc highlight -> mở chữ
  const hasInitializedAnimRef = useRef(false);
  useEffect(() => {
    if (!currentPuzzle?.revealedIndices) return;
    if (phase === "ROUND_RECAP") {
      setAnimRevealedIndices(new Set(currentPuzzle.revealedIndices));
      return;
    }
    // Chỉ sync 1 lần lúc mount / reconnect nếu có chữ đã mở sẵn trước đó và không phải toss-up
    if (!hasInitializedAnimRef.current) {
      hasInitializedAnimRef.current = true;
      const isTossUp = roundStage === "TOSS_UP_1" || roundStage === "TOSS_UP_2";
      if (!isTossUp && currentPuzzle.revealedIndices.length > 0) {
        setAnimRevealedIndices(new Set(currentPuzzle.revealedIndices));
        prevServerRevealedRef.current = [...currentPuzzle.revealedIndices];
      }
    }
  }, [currentPuzzle?.revealedIndices, phase, roundStage]);

  const isSubmittingTossUpAnswerRef = useRef<boolean>(false);
  const lastTossUpSubmitTimeRef = useRef<number>(0);

  const handleSafeSolvePuzzle = useCallback(
    (ans: string) => {
      isSubmittingTossUpAnswerRef.current = true;
      lastTossUpSubmitTimeRef.current = Date.now();
      lastBuzzedPhaseRef.current = `${currentRound}_locked`;
      onSolvePuzzle?.(ans);
      setTimeout(() => {
        isSubmittingTossUpAnswerRef.current = false;
      }, 2500);
    },
    [currentRound, onSolvePuzzle]
  );

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
      }, 400);
      return () => clearTimeout(fallbackTimer);
    }
  }, [isLocallyBuzzed, phase]);

  const handleTriggerTossUpBuzz = useCallback(
    (targetTeamId?: string) => {
      if (isSubmittingTossUpAnswerRef.current || (Date.now() - lastTossUpSubmitTimeRef.current < 2500)) return;
      const hasFirstLetterRevealed =
        (animRevealedIndices.size >= 1) ||
        ((currentPuzzle?.revealedIndices?.length || 0) >= 1) ||
        ((activeState?.currentPuzzle?.revealedIndices?.length || 0) >= 1);
      if (!hasFirstLetterRevealed) return;
      if (hasBuzzedRef.current || phase === "TOSS_UP_BUZZED") return;
      hasBuzzedRef.current = true;
      setIsLocallyBuzzed(true);
      const buzzId = targetTeamId || myTeamId || currentTurnTeamId || teams[0]?.id;
      onTossUpBuzz?.(buzzId);
    },
    [animRevealedIndices.size, currentPuzzle?.revealedIndices?.length, activeState?.currentPuzzle?.revealedIndices?.length, phase, myTeamId, currentTurnTeamId, teams, onTossUpBuzz]
  );

  const isCurrentTeamEliminated = roundEliminatedTeamIds.includes(currentTurnTeamId);
  const isTossUpRound = roundStage === "TOSS_UP_1" || roundStage === "TOSS_UP_2";
  const isPlayer = !isDisplay && !isHost;
  const effDisplayLayoutMode: "AUTO" | "STACKED" | "FOCUS_WHEEL" | "FOCUS_BOARD" =
    displayLayoutMode || activeState.displayLayoutMode || "STACKED";

  const isIframe = typeof window !== "undefined" && window.self !== window.top;
  const isInsideSandbox =
    typeof window !== "undefined" &&
    (isIframe ||
      window.location.search.includes("sandbox=1") ||
      window.location.pathname.includes("/sandbox"));
  // Audio rule: Trong Sandbox, màn hình Display là nguồn phát âm thanh TV Studio chính duy nhất.
  // Khung Player và Host parent tắt âm thanh mặc định để triệt tiêu tiếng vọng và lặp 2x-3x.
  const canPlayBoardAudio = isInsideSandbox ? Boolean(isDisplay) : true;

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

  // Virtual Camera Cut System (only during spinning in Display view)
  const [camAngle, setCamAngle] = useState(0);
  const [localDisplayMode, setLocalDisplayMode] = useState<"AUTO" | "FOCUS_BOARD">("AUTO");
  const camTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // BUG-18 FIX: Reset power về 65 khi bắt đầu lượt quay mới (tránh tiếp tục từ giá trị cũ)
  useEffect(() => {
    if (phase === "SPIN_WAITING" || phase === "SPECIAL_SPIN_WAITING") {
      setOscillatingPower(65);
    }
  }, [phase, currentRound]);

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
  const initialWheelRestingAngle = (360 - 0.5 * (360 / (sectors?.length || 24))) % 360;
  const wheelPrevAngleRef = useRef<number>(initialWheelRestingAngle);
  const lastSnapTimeRef = useRef<number>(0);
  const isSpinningRafRunningRef = useRef<boolean>(false);
  const targetAngleRef = useRef<number>(0);
  const [clientWheelAngle, setClientWheelAngle] = useState<number>(initialWheelRestingAngle);
  const [isWheelZoomedIn, setIsWheelZoomedIn] = useState<boolean>(false);
  const [wheelZoomDurationMs, setWheelZoomDurationMs] = useState<number>(7000);
  const [localIsSpinning, setLocalIsSpinning] = useState<boolean>(false);
  const effectiveIsSpinning = Boolean(isSpinning || localIsSpinning);
  useEffect(() => {
    if (isSpinning) {
      setLocalIsSpinning(false);
    }
  }, [isSpinning]);

  // Camera auto-cut during spin (Display view only) — 4 góc quay truyền hình kèm Dynamic Zoom chuẩn VTV3
  // Chuỗi: CAM 5 (Cận thí sinh 3s) -> CAM 2 (Đại cảnh 4s) -> CAM 3 (Bảng chữ 4s) -> CAM 4 (Cận nón 5s)
  useEffect(() => {
    if (!isDisplay || !effectiveIsSpinning) {
      if (effectiveBoardStage === "BLANK_PHRASE" || effectiveBoardStage === "READY_CLUE") {
        setCamAngle(3);
      }
      if (camTimerRef.current) clearTimeout(camTimerRef.current);
      return;
    }

    // Giai đoạn 1 (0s - 3s): CAM 5 (Cận người chơi thực hiện lượt)
    setCamAngle(5);

    const t1 = setTimeout(() => {
      // Giai đoạn 2 (3s - 7s): CAM 2 (Đại cảnh sân khấu lướt vào)
      setCamAngle(2);

      const t2 = setTimeout(() => {
        // Giai đoạn 3 (7s - 11s): CAM 3 (Bảng ô chữ chính tâm kèm Lower-Third)
        setCamAngle(3);

        const t3 = setTimeout(() => {
          // Giai đoạn 4 (11s - 16s): CAM 4 (Cận cảnh nón trôi chậm và dừng chuẩn xác)
          setCamAngle(4);
        }, 4000);

        camTimerRef.current = t3;
      }, 4000);

      camTimerRef.current = t2;
    }, 3000);

    camTimerRef.current = t1;

    return () => {
      if (camTimerRef.current) clearTimeout(camTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDisplay, effectiveIsSpinning]);

  // ── TV Board Staged Appearance Sequence ───────────────────────────────────
  const [boardStage, setBoardStage] = useState<"EMPTY_56" | "BLANK_PHRASE" | "READY_CLUE">("EMPTY_56");
    // Khi MC chủ động đóng bảng (EMPTY_56), giữ nguyên bảng đóng 56 ô xanh ngọc bích,
  // tuyệt đối không chớp nháy đề của vòng tiếp theo cho đến khi mở vòng mới!
  const isActivelyPlaying = Boolean(
    (phase === "TOSS_UP_RUNNING" || phase === "TOSS_UP_REVEALING" || phase === "TOSS_UP_BUZZED" || phase === "ACTION_INPUT" || phase === "SPINNING")
    && currentPuzzle?.secretPhrase
    && animRevealedIndices.size > 0
  );
  const effectiveBoardStage: "EMPTY_56" | "BLANK_PHRASE" | "READY_CLUE" =
    (activeState.boardStage === "EMPTY_56" || boardStage === "EMPTY_56") && !isActivelyPlaying
      ? "EMPTY_56"
      : isTempActive || isActivelyPlaying ? "READY_CLUE" : (activeState.boardStage || boardStage);

  const prevBoardStageRef = useRef<string>(activeState.boardStage || "EMPTY_56");
  useEffect(() => {
    const curStage = activeState.boardStage || "EMPTY_56";
    if (prevBoardStageRef.current === "EMPTY_56" && curStage === "BLANK_PHRASE") {
      if (canPlayBoardAudio) {
        soundManager.playMagicWheelBoardOpen();
      }
      setCamAngle(3);
    }
    prevBoardStageRef.current = curStage;
    setBoardStage(curStage);
  }, [currentRound, activeState.boardStage, canPlayBoardAudio]);

  const handleOpenBoard = useCallback(() => {
    if (canPlayBoardAudio) soundManager.playMagicWheelBoardOpen();
    setBoardStage("BLANK_PHRASE");
    setCamAngle(3);
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

    // 🔀 CROSSWORD / Ô CHỮ LIÊN KẾT: Tọa độ được cấu hình trực tiếp từ danh sách từ khóa
    if (!isTempActive && currentPuzzle?.puzzleType === "CROSSWORD" && currentPuzzle.crosswordWords && currentPuzzle.crosswordWords.length > 0) {
      currentPuzzle.crosswordWords.forEach((item) => {
        const cleanW = (item.word || "").toUpperCase();
        for (let i = 0; i < cleanW.length; i++) {
          const r = item.direction === "DOWN" ? item.row + i : item.row;
          const c = item.direction === "ACROSS" ? item.col + i : item.col;
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
            const gridKey = r * COLS + c;
            map[gridKey] = { col: c, row: r, char: cleanW[i] };
          }
        }
      });
      return map;
    }

    const phrase = (isTempActive ? temporaryDisplayText || "" : currentPuzzle?.secretPhrase || "").toUpperCase();
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
  }, [currentPuzzle?.secretPhrase, currentPuzzle?.puzzleType, currentPuzzle?.crosswordWords, isTempActive, temporaryDisplayText]);

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

  // ── Virtual Hostess ("Người Mẫu") Sân Khấu Liền Mạch & Di Chuyển Thong Thả ─────
  const [hostessSide, setHostessSide] = useState<"LEFT" | "RIGHT">("LEFT");
  const hostessSideRef = useRef<"LEFT" | "RIGHT">("LEFT");
  const [hostessXPercent, setHostessXPercent] = useState<number>(6); // 6% = Vị trí an toàn ở Cánh Gà Trái (Stage Left, trọn vẹn 100% không bị xén)
  const hostessXPercentRef = useRef<number>(6);
  hostessXPercentRef.current = hostessXPercent;
  const [hostessFacing, setHostessFacing] = useState<"LEFT" | "RIGHT">("RIGHT");
  const [hostessPose, setHostessPose] = useState<"IDLE" | "GESTURE" | "WALKING" | "TOUCHING">("IDLE");
  const [hostessActiveRow, setHostessActiveRow] = useState<number>(1);
  const [hostessWalkDurationMs, setHostessWalkDurationMs] = useState<number>(1400);

  const [highlightedIndices, setHighlightedIndices] = useState<Set<number>>(new Set());
  const [justPoppedIndices, setJustPoppedIndices] = useState<Set<number>>(new Set());
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

    const roundPuzzleKey = `${currentRound}_${roundStage}_${currentPuzzle?.id || ""}_${currentPuzzle?.secretPhrase || ""}`;
  const prevRoundPuzzleKeyRef = useRef<string>(roundPuzzleKey);

  // Reset revealed state when puzzle or round changes (Đảm bảo TOSS_UP_2 luôn được reset sạch sẽ để kích hoạt highlight ô đầu)
  useEffect(() => {
    if (roundPuzzleKey !== prevRoundPuzzleKeyRef.current) {
      prevRoundPuzzleKeyRef.current = roundPuzzleKey;
      clearChoreographyTimers();
      const isTossUp = roundStage === "TOSS_UP_1" || roundStage === "TOSS_UP_2";
      const initialSet = isTossUp ? new Set<number>() : new Set(currentPuzzle?.revealedIndices || []);
      prevServerRevealedRef.current = isTossUp ? [] : [...(currentPuzzle?.revealedIndices || [])];
      setHighlightedIndices(new Set());
      setAnimRevealedIndices(initialSet);
      animRevealedIndicesRef.current = new Set(initialSet);
      setHostessPose("IDLE");
      setHostessXPercent(hostessSideRef.current === "LEFT" ? 6 : 94);
    }
  }, [roundPuzzleKey, roundStage, currentPuzzle?.revealedIndices, clearChoreographyTimers]);

  // Sequential Highlight (highlight.mp3) -> Hostess Intelligent Reveal (letter_open.mp3)
  useEffect(() => {
    if (isTempActive) {
      clearChoreographyTimers();
      setHighlightedIndices(new Set());
      setHostessPose("IDLE");
      setHostessXPercent(hostessSideRef.current === "LEFT" ? 6 : 94);
      return;
    }

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

    // In Toss-Up running mode:
    // QUY TẮC CỦA NGƯỜI DÙNG:
    // 1. Chỉ highlight chữ đầu tiên của vòng đoán nhanh, VÀ PHẢI CÓ ĐỘNG TÁC TAY TỪ NGƯỜI MẪU.
    // 2. Tất cả các chữ tiếp theo (từ chữ thứ 2 trở đi): TUYỆT ĐỐI KHÔNG HIGHLIGHT XANH, tự động bung ra trực tiếp (zoom punch)!
    if (roundStage === "TOSS_UP_1" || roundStage === "TOSS_UP_2") {
      newLetters.forEach((tileIdx) => {
        if (animRevealedIndicesRef.current.has(tileIdx)) return;

        if (!tossUpFirstTileDoneRef.current) {
          // ── CHỮ ĐẦU TIÊN CỦA TOSS-UP: Bật highlight xanh + Người mẫu catwalk bước tới giơ tay chạm lật! ──
          tossUpFirstTileDoneRef.current = true;

          // 1. Bật highlight xanh cho duy nhất chữ đầu tiên
          setHighlightedIndices(new Set([tileIdx]));
          if (canPlayBoardAudio) soundManager.playMagicWheelMark();

          // 2. Tính tọa độ ô chữ
          const pos = cellPositionsMap[tileIdx] || { col: 6, row: 1 };
          const tileCol = pos.col;
          const tileRow = pos.row;

          const prevX = hostessXPercentRef.current;
          const prevCol = (prevX / 100) * 14;
          const colDist = Math.abs(tileCol - prevCol);
          const standSide = colDist <= 4 ? hostessSideRef.current : (hostessSideRef.current === "LEFT" ? "RIGHT" : "LEFT");
          hostessSideRef.current = standSide;

          const tileCenterPercent = ((tileCol + 0.5) / 14) * 100;
          const targetPercent = standSide === "LEFT"
            ? Math.max(6, tileCenterPercent - 9)
            : Math.min(94, tileCenterPercent + 9);

          const walkTime = colDist <= 4 ? 600 : 900;
          const touchTime = 500;

          // Người mẫu bước tới ô
          const tWalk = setTimeout(() => {
            setHostessPose("WALKING");
            setHostessFacing(standSide === "LEFT" ? "RIGHT" : "LEFT");
            setHostessActiveRow(tileRow);
            setHostessWalkDurationMs(walkTime);
            setHostessXPercent(targetPercent);
            hostessXPercentRef.current = targetPercent;
          }, 200);
          activeTimersRef.current.push(tWalk);

          // Tới nơi: Người mẫu giơ tay chạm ô chữ
          const tTouch = setTimeout(() => {
            setHostessPose("TOUCHING");
            setHostessFacing(standSide === "LEFT" ? "RIGHT" : "LEFT");
            setHostessActiveRow(tileRow);

            // Khoảnh khắc chạm: tắt highlight xanh, BUNG CHỮ zoom punch!
            const tRev = setTimeout(() => {
              setHighlightedIndices((prev) => {
                const next = new Set(prev);
                next.delete(tileIdx);
                return next;
              });
              setAnimRevealedIndices((prev) => new Set([...prev, tileIdx]));
              animRevealedIndicesRef.current.add(tileIdx);
              triggerTilePop(tileIdx);
              if (canPlayBoardAudio) soundManager.playMagicWheelLetterReveal();
            }, 180);
            activeTimersRef.current.push(tRev);
          }, 200 + walkTime);
          activeTimersRef.current.push(tTouch);

          // Sau khi chạm xong: Người mẫu catwalk bước dứt khoát về 1 trong 2 bên cánh bảng (6% hoặc 94%)
          const finishSide = targetPercent < 50 ? "LEFT" : "RIGHT";
          const finishTargetX = finishSide === "LEFT" ? 6 : 94;
          const tFinish = setTimeout(() => {
            setHostessPose("WALKING");
            setHostessFacing(finishSide === "LEFT" ? "RIGHT" : "LEFT");
            setHostessWalkDurationMs(750);
            setHostessXPercent(finishTargetX);
            hostessXPercentRef.current = finishTargetX;

            const tIdle = setTimeout(() => {
              setHostessPose("IDLE");
            }, 750);
            activeTimersRef.current.push(tIdle);
          }, 200 + walkTime + touchTime + 200);
          activeTimersRef.current.push(tFinish);

        } else {
          // ── TẤT CẢ CÁC CHỮ TIẾP THEO CỦA TOSS-UP: KHÔNG HIGHLIGHT XANH, BUNG TRỰC TIẾP ZOOM PUNCH! ──
          setAnimRevealedIndices((prev) => new Set([...prev, tileIdx]));
          animRevealedIndicesRef.current.add(tileIdx);
          triggerTilePop(tileIdx);
          if (canPlayBoardAudio) soundManager.playMagicWheelLetterReveal();
        }
      });
      return;
    }

    // ── VÒNG CHÍNH 1..N & VÒNG ĐẶC BIỆT ──
    // Quy tắc:
    // 1. Highlight LẦN LƯỢT các ô đúng với khoảng cách đúng 0.5s (500ms) mỗi chữ.
    // 2. Sau khi tất cả các ô sáng xanh xong, Người mẫu catwalk bước tới từng ô chạm tay vào để bung chữ (zoom punch).
    // 3. Kết thúc mở chữ, Người mẫu catwalk dịch hẳn ra 1 trong 2 bên cánh bảng (6% hoặc 94%) rồi mới đứng IDLE!
    const sortedTiles = [...newLetters].sort((a, b) => {
      const posA = cellPositionsMap[a] || { col: 0, row: 0 };
      const posB = cellPositionsMap[b] || { col: 0, row: 0 };
      if (posA.col !== posB.col) return posA.col - posB.col;
      return posA.row - posB.row;
    });

    // Bước 1: Highlight LẦN LƯỢT các ô đúng với khoảng cách 0.5s mỗi chữ
    sortedTiles.forEach((tileIdx, sIdx) => {
      const tHl = setTimeout(() => {
        setHighlightedIndices((prev) => new Set([...prev, tileIdx]));
        if (canPlayBoardAudio) soundManager.playMagicWheelMark();
      }, sIdx * 500); // 0.5s mỗi chữ!
      activeTimersRef.current.push(tHl);
    });

    // Bước 2: Sau khi tất cả các ô đã sáng xanh xong: Người mẫu mới catwalk bước tới từng ô chạm tay vào
    const allHighlightedDelay = sortedTiles.length * 500 + 200;
    let currentStepDelay = allHighlightedDelay;

    sortedTiles.forEach((tileIdx) => {
      const pos = cellPositionsMap[tileIdx] || { col: 6, row: 1 };
      const tileCol = pos.col;
      const tileRow = pos.row;

      const prevX = hostessXPercentRef.current;
      const prevCol = (prevX / 100) * 14;
      const colDist = Math.abs(tileCol - prevCol);

      let standSide: "LEFT" | "RIGHT";
      if (colDist <= 4) {
        standSide = hostessSideRef.current;
      } else {
        standSide = hostessSideRef.current === "LEFT" ? "RIGHT" : "LEFT";
      }
      hostessSideRef.current = standSide;

      const tileCenterPercent = ((tileCol + 0.5) / 14) * 100;
      const targetPercent = standSide === "LEFT"
        ? Math.max(6, tileCenterPercent - 9)
        : Math.min(94, tileCenterPercent + 9);

      const walkTime = colDist <= 4 ? 600 : 950;
      const touchTime = 450;

      // Bước 2a: Người mẫu Catwalk bước tới ô
      const tWalk = setTimeout(() => {
        setHostessPose("WALKING");
        setHostessFacing(standSide === "LEFT" ? "RIGHT" : "LEFT");
        setHostessActiveRow(tileRow);
        setHostessWalkDurationMs(walkTime);
        setHostessXPercent(targetPercent);
        hostessXPercentRef.current = targetPercent;
      }, currentStepDelay);
      activeTimersRef.current.push(tWalk);

      currentStepDelay += walkTime;

      // Bước 2b: Người mẫu tới nơi -> đưa tay chạm vào ô chữ
      const tTouch = setTimeout(() => {
        setHostessPose("TOUCHING");
        setHostessFacing(standSide === "LEFT" ? "RIGHT" : "LEFT");
        setHostessActiveRow(tileRow);

        // KHOẢNH KHẮC CHẠM TAY: Ô chữ tắt highlight xanh và ZOOM LỘ CHỮ CÁI
        const tRevealLetter = setTimeout(() => {
          setHighlightedIndices((prev) => {
            const next = new Set(prev);
            next.delete(tileIdx);
            return next;
          });
          setAnimRevealedIndices((prev) => new Set([...prev, tileIdx]));
          triggerTilePop(tileIdx);
          if (canPlayBoardAudio) soundManager.playMagicWheelLetterReveal();
        }, 180);
        activeTimersRef.current.push(tRevealLetter);
      }, currentStepDelay);
      activeTimersRef.current.push(tTouch);

      currentStepDelay += touchTime;
    });

    // Bước 3: Kết thúc toàn bộ các ô chữ: Người mẫu catwalk di chuyển dứt khoát ra một trong hai bên cánh bảng (6% hoặc 94%), tuyệt đối không đứng giữa bảng che chữ!
    const finishSide = hostessXPercentRef.current < 50 ? "LEFT" : "RIGHT";
    const finishTargetX = finishSide === "LEFT" ? 6 : 94;
    const tWalkSide = setTimeout(() => {
      setHostessPose("WALKING");
      setHostessFacing(finishSide === "LEFT" ? "RIGHT" : "LEFT");
      setHostessWalkDurationMs(750);
      setHostessXPercent(finishTargetX);
      hostessXPercentRef.current = finishTargetX;

      const tIdle = setTimeout(() => {
        setHostessPose("IDLE");
      }, 750);
      activeTimersRef.current.push(tIdle);
    }, currentStepDelay + 200);
    activeTimersRef.current.push(tWalkSide);

    const tFinish = setTimeout(() => {
      setHostessPose("IDLE");
    }, currentStepDelay + 250 + 800);
    activeTimersRef.current.push(tFinish);
  }, [currentPuzzle?.revealedIndices, phase, roundStage, cellPositionsMap, clearChoreographyTimers, triggerTilePop]);

  // ── Toss-Up 1 & 2 Special Choreography Effect ─────────────────────────────
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

  // Stable refs to prevent tearing down the 0.75s interval on every letter reveal
  const animRevealedIndicesRef = useRef<Set<number>>(animRevealedIndices);
  animRevealedIndicesRef.current = animRevealedIndices;
  const currentPuzzleRef = useRef(currentPuzzle);
  currentPuzzleRef.current = currentPuzzle;

  // Tuyệt đối không tự động mở bảng khi vào vòng Toss-Up hoặc bất kỳ vòng nào - chỉ mở khi Admin/MC bấm nút
  useEffect(() => {
    if (effectiveBoardStage === "EMPTY_56") {
      setAnimRevealedIndices(new Set());
    }
  }, [effectiveBoardStage]);

  // ── Audio Engine Hooks ───────────────────────────────────────────────────
  const prevIsSpinning = useRef<boolean>(false);
  const hasPlayedLandingAudioRef = useRef<boolean>(false);

  const playSectorLandingAudio = useCallback((sector?: MagicWheelSector) => {
    if (!canPlayBoardAudio) return;
    soundManager.stopMagicWheelSpin();

    let targetSec =
      sector ||
      (activeState.selectedSectorIndex !== undefined ? sectors[activeState.selectedSectorIndex] : undefined) ||
      selectedSector;

    if (!targetSec && sectors && sectors.length > 0) {
      const segAngle = 360 / sectors.length;
      const normalizedTarget = ((targetAngleRef.current % 360) + 360) % 360;
      const calcIdx = Math.floor(((360 - (normalizedTarget % 360)) % 360) / segAngle);
      targetSec = sectors[calcIdx] || sectors[0];
    }

    if (!targetSec) {
      soundManager.playWheelStopChime();
      return;
    }

    const sType = targetSec.type;
    const oType = targetSec.overlayType;
    const isEnglish = edition === "ENGLISH";

    // Ô điểm số / tiền thưởng: Phát tiếng chime dừng chuẩn xác, tuyệt đối không chạy vào âm thanh ô chức năng cũ
    if (sType === "POINTS") {
      soundManager.playWheelStopChime();
      return;
    }

    // Bản Anh: Các ô đặc biệt như FREE_PLAY, WILD_CARD không có file audio VTV3 tiếng Việt
    if (isEnglish && (sType === "FREE_PLAY" || sType === "WILD_CARD" || oType === "WILD_CARD")) {
      soundManager.playWheelStopChime();
      return;
    }

    // 1. Ô MẤT ĐIỂM (Bankrupt)
    if (sType === "BANKRUPT") {
      soundManager.playMagicWheelBankrupt();
      return;
    }

    // 2. Ô MẤT LƯỢT (Lose Turn)
    if (sType === "LOSE_TURN") {
      soundManager.playMagicWheelLoseTurn();
      return;
    }

    // 3. Ô CHIA ĐÔI (Halve points)
    if (sType === "HALF") {
      soundManager.playMagicWheelHalve();
      return;
    }

    // 4. Ô NHÂN ĐÔI / NHÂN BA (Double / Triple)
    if (sType === "DOUBLE" || sType === "TRIPLE" || oType === "TRIPLE") {
      soundManager.playMagicWheelDouble();
      return;
    }

    // 5. Ô MAY MẮN / THÊM LƯỢT / EXPRESS / JACKPOT / FREE SPIN TOKEN
    if (
      sType === "LUCKY" ||
      sType === "EXTRA_TURN" ||
      sType === "EXPRESS" ||
      sType === "JACKPOT" ||
      oType === "FREE_SPIN" ||
      oType === "EXPRESS" ||
      oType === "JACKPOT"
    ) {
      soundManager.playMagicWheelLucky();
      return;
    }

    // 6. Ô PHẦN THƯỞNG / THẺ QUÀ / PHONG BÌ
    if (
      sType === "PRIZE" ||
      sType === "BONUS_ENVELOPE" ||
      sType === "SPECIAL_ENVELOPE" ||
      oType === "PRIZE" ||
      oType === "SPECIAL_ENVELOPE"
    ) {
      soundManager.playMagicWheelReward();
      return;
    }

    // 7. Ô BÍ MẬT / ĐỐI ĐẦU / HOÁN ĐỔI (Mystery / Steal Swap)
    if (
      sType === "MYSTERY" ||
      sType === "STEAL_SWAP" ||
      oType === "MYSTERY" ||
      oType === "STEAL_SWAP"
    ) {
      soundManager.playMagicWheelMystery();
      return;
    }

    // 8. Ô điểm số thông thường (100, 200, 300, 500, 1000, 2000, v.v.)
    soundManager.playWheelStopChime();
  }, [canPlayBoardAudio, selectedSector, activeState.selectedSectorIndex, sectors, edition]);

  useEffect(() => {
    if (isSpinning && !prevIsSpinning.current) {
      hasPlayedLandingAudioRef.current = false;
      if (canPlayBoardAudio) soundManager.playMagicWheelSpin();
    } else if (!isSpinning && prevIsSpinning.current) {
      if (canPlayBoardAudio && !hasPlayedLandingAudioRef.current) {
        hasPlayedLandingAudioRef.current = true;
        playSectorLandingAudio();
      }
    }
    prevIsSpinning.current = Boolean(isSpinning);
  }, [isSpinning, canPlayBoardAudio, playSectorLandingAudio]);

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

  const lastBuzzedPhaseRef = useRef<string | null>(null);
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
        // Âm thanh mở đáp án giải thành công được kích hoạt duy nhất tại lastSolveFeedback (line 2190) để triệt tiêu dội âm
      } else if (phase === "ACTION_INPUT" || phase === "SPECIAL_SOLVING") {
        soundManager.playMagicWheelThinking();
      } else if (phase === "TRADE_CHOICE") {
        soundManager.playMagicWheelTrade();
      } else if (phase === "TOSS_UP_BUZZED") {
        if (!isSubmittingTossUpAnswerRef.current && (Date.now() - lastTossUpSubmitTimeRef.current > 2500) && lastBuzzedPhaseRef.current !== `${currentRound}_${tossUpBuzzedTeamId || currentTurnTeamId}`) {
          lastBuzzedPhaseRef.current = `${currentRound}_${tossUpBuzzedTeamId || currentTurnTeamId}`;
          soundManager.playMagicWheelBuzzSolve();
        }
      }
    }
    if (phase !== "TOSS_UP_BUZZED") {
      if (phase !== "ROUND_RECAP") {
        lastBuzzedPhaseRef.current = null;
      }
    }
    prevPhase.current = phase;
  }, [phase, canPlayBoardAudio, currentRound, tossUpBuzzedTeamId, currentTurnTeamId]);

  // ── 3D Wheel Animation Loop (RequestAnimationFrame) ──────────────────────
  useEffect(() => {
    const sLen = sectors.length || 24;
    const segAngle = 360 / sLen;
    const deadCenterRestingAngle = (360 - 0.5 * segAngle) % 360;
    const target =
      targetRotationDegrees === undefined || targetRotationDegrees === null || targetRotationDegrees === 0
        ? deadCenterRestingAngle
        : targetRotationDegrees;
    // Cả Display và Player đều dùng kim 12h chuẩn 360° đồng bộ 1:1, góc bù bằng 0
    const angleOffset = 0;

    if (!effectiveIsSpinning) {
      isSpinningRafRunningRef.current = false;
      wheelPrevAngleRef.current = target;
      setClientWheelAngle(target);
      if (wheelRef.current) wheelRef.current.style.transform = `rotate(${target + angleOffset}deg)`;
      setIsWheelZoomedIn(false);
      setWheelZoomDurationMs(800);
      lastSnapTimeRef.current = 0;
      if (needleRef.current) needleRef.current.style.transform = `rotate(${angleOffset}deg) scale(1.06) translateZ(0)`;
      soundManager.stopWheelSpinMusic(150);
      return;
    }

    // If an animation is already actively running, update the target angle seamlessly without tearing down the RAF!
    if (isSpinningRafRunningRef.current) {
      if (target !== undefined && target !== null && target > wheelPrevAngleRef.current) {
        targetAngleRef.current = target;
      }
      return;
    }

    if (target === undefined || target === null || target <= wheelPrevAngleRef.current) {
      // Đợi góc quay chính thức từ server, không dùng góc giả lập 2160° để triệt tiêu hoàn toàn giật khựng
      return;
    }

    isSpinningRafRunningRef.current = true;
    hasPlayedLandingAudioRef.current = false;
    const startAngle = wheelPrevAngleRef.current;
    targetAngleRef.current = target;

    const durationMs = 18000 + Math.round(((activeState.spinPower || 65) / 100) * 4000);
    const startTime = performance.now();
    let lastPegIndex = Math.floor(startAngle / segAngle);
    let lastTickAudioTime = 0;
    let rafId = 0;
    let zoomStartTimer: ReturnType<typeof setTimeout> | null = null;

    lastSnapTimeRef.current = 0;
    if (wheelRef.current) wheelRef.current.style.transform = `rotate(${startAngle + angleOffset}deg)`;
    if (needleRef.current) needleRef.current.style.transform = `rotate(${angleOffset}deg) scale(1.06) translateZ(0)`;

    if (canPlayBoardAudio) soundManager.playWheelPegTick(0.05);

    setIsWheelZoomedIn(false);
    setWheelZoomDurationMs(800);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const rawProgress = Math.min(1, Math.max(0, elapsed / durationMs));
      const threePhaseProgress = evaluateThreePhaseWheelProgress(elapsed, durationMs);
      const currentLiveAngle = startAngle + (targetAngleRef.current - startAngle) * threePhaseProgress;

      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${currentLiveAngle + angleOffset}deg)`;
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
        // Wheel turns clockwise ->
        // At 12h: rim moves left-to-right -> peg pushes needle tip to the RIGHT (-deg in CSS)
        // At 6h (isPlayer): rim moves right-to-left -> peg pushes upward needle tip to the LEFT (-deg in CSS from 180deg)
        // Chuẩn hóa 3 trạng thái kim nón theo sơ đồ cơ học:
        // Trạng thái 1 & 2: Chốt tiến tới sườn kim và đẩy mũi kim lệch sang phải cực đại (hướng -X trong CSS)
        // Trạng thái 3: Ngay khi chốt thoát, kim bật nảy đàn hồi ngược lại và dao động tắt dần về 0°
        const pegDeflectionSign = -1.0;
        const contactWindowEx = 4.2;
        if (pegDistToSnap <= contactWindowEx) {
          // Chốt kim loại ĐANG TIẾP XÚC và uốn cong kim 2D - không được tự hồi về 0
          const contactProgress = 1.0 - (pegDistToSnap / contactWindowEx);
          needleAngle = pegDeflectionSign * 22.0 * Math.pow(contactProgress, 1.2);
        } else if (lastSnapTimeRef.current > 0) {
          // Chốt ĐÃ THỰC SỰ RỜI ĐẦU KIM -> Bật nảy đàn hồi tắt dần
          const dt = (now - lastSnapTimeRef.current) / 1000;
          if (dt < 0.16) {
            needleAngle = pegDeflectionSign * 22.0 * Math.exp(-22.0 * dt) * Math.cos(50.0 * dt);
          } else {
            needleAngle = 0;
          }
        } else {
          needleAngle = 0;
        }
      }

      if (needleRef.current) {
        needleRef.current.style.transform = `rotate(${needleAngle + angleOffset}deg) scale(1.06) translateZ(0)`;
      }

      if (rawProgress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        isSpinningRafRunningRef.current = false;
        setLocalIsSpinning(false);
        const finalTarget = targetAngleRef.current;
        if (wheelRef.current) {
          wheelRef.current.style.transform = `rotate(${finalTarget + angleOffset}deg)`;
        }
        setClientWheelAngle(finalTarget);
        wheelPrevAngleRef.current = finalTarget;
        if (needleRef.current) {
          needleRef.current.style.transform = `rotate(${angleOffset}deg) scale(1.06) translateZ(0)`;
        }
        if (canPlayBoardAudio && !hasPlayedLandingAudioRef.current) {
          hasPlayedLandingAudioRef.current = true;
          playSectorLandingAudio();
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
  }, [effectiveIsSpinning, targetRotationDegrees, activeState.spinPower, sectors.length, canPlayBoardAudio, isPlayer, playSectorLandingAudio]);

  const activeTeam = isTossUpRound
    ? (tossUpBuzzedTeamId ? teams.find((t) => t.id === tossUpBuzzedTeamId) : undefined)
    : teams.find((t) => t.id === currentTurnTeamId);

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

  const isRoundSolvedOrEnded =
    phase === "ROUND_RECAP" ||
    Boolean(
      currentPuzzle?.secretPhrase &&
      currentPuzzle?.revealedIndices &&
      isPuzzleFullyRevealed(currentPuzzle.secretPhrase, currentPuzzle.revealedIndices) &&
      phase !== "TOSS_UP_BUZZED" &&
      phase !== "ACTION_INPUT"
    );
  const isBetweenRounds = isRoundSolvedOrEnded || effectiveBoardStage === "EMPTY_56";

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

    if (isTempActive) {
      Object.entries(cellPositionsMap).forEach(([origIdxStr, pos]) => {
        const origIdx = Number(origIdxStr);
        matrix[pos.row][pos.col] = {
          char: pos.char,
          displayChar: pos.char,
          isLetter: true,
          isRevealed: true,
          isHighlighted: false,
          originalIndex: origIdx,
          seqIndex: 0,
        };
      });
      return matrix;
    }

    if (!currentPuzzle || (!currentPuzzle.secretPhrase && (!currentPuzzle.crosswordWords || currentPuzzle.crosswordWords.length === 0))) {
      return matrix;
    }

    Object.entries(cellPositionsMap).forEach(([origIdxStr, pos]) => {
      const origIdx = Number(origIdxStr);
      const isLetter = isVietnameseAlphabetLetter(pos.char);
      // Digits (0-9) and special characters (like '-') are revealed immediately when opening the board without requiring players to guess!
      const isNonLetterSymbol = !isLetter && pos.char.trim().length > 0;
      const isAutoRevealed = !isLetter;
      const isRev = (isNonLetterSymbol || isAutoRevealed || animRevealedIndices.has(origIdx)) && !highlightedIndices.has(origIdx);
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
  }, [currentPuzzle, cellPositionsMap, animRevealedIndices, highlightedIndices, phase, isTempActive]);

  const totalActiveTiles = useMemo(() => {
    let count = 0;
    gridMatrix.forEach((row) => {
      row.forEach((cell) => {
        if (cell) count++;
      });
    });
    return count;
  }, [gridMatrix]);

  // ── Staggered Wave Animation for Board Opening (Column left-to-right, row below delayed) ──
  const [openedBlankCellKeys, setOpenedBlankCellKeys] = useState<Set<string>>(() => {
    return (activeState.boardStage || boardStage) === "READY_CLUE" ? new Set(["ALL"]) : new Set();
  });

  useEffect(() => {
    if (effectiveBoardStage === "EMPTY_56") {
      setOpenedBlankCellKeys(new Set());
      return;
    }
    if (effectiveBoardStage === "READY_CLUE") {
      setOpenedBlankCellKeys(new Set(["ALL"]));
      return;
    }
    if (effectiveBoardStage === "BLANK_PHRASE") {
      setOpenedBlankCellKeys(new Set());
      const timers: NodeJS.Timeout[] = [];
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          if (gridMatrix[r]?.[c]) {
            const delayMs = c * 60 + r * 25;
            const t = setTimeout(() => {
              setOpenedBlankCellKeys((prev) => new Set(prev).add(`${r}_${c}`));
            }, delayMs);
            timers.push(t);
          }
        }
      }
      return () => {
        timers.forEach((t) => clearTimeout(t));
      };
    }
  }, [effectiveBoardStage, gridMatrix]);

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



  // ── 1. MODALS (Solve, Buy Vowel, Temp Text) ──
  const renderModals = () => (
    <>
      {solveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl p-5 rounded-2xl bg-[#121829] border-2 border-amber-400/60 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentPuzzle?.puzzleType === "CROSSWORD" ? "🔀" : "🎯"}</span>
                <div>
                  <h4 className="font-black text-base text-amber-300">
                    {currentPuzzle?.puzzleType === "CROSSWORD"
                      ? "GIẢI Ô CHỮ LIÊN KẾT / TUNG HOÀNH"
                      : "GIẢI Ô CHỮ BÍ MẬT — CHÍNH XÁC TỪNG DẤU THANH ĐIỆU"}
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    {currentPuzzle?.puzzleType === "CROSSWORD"
                      ? "Nhập tất cả các từ trong ô chữ cách nhau bằng dấu phẩy (thứ tự tùy ý). TUYỆT ĐỐI không dùng từ nối (và, and, với...)!"
                      : "Các phụ âm đã mở trên bảng được giữ cố định. Hãy chọn dấu thanh cho các nguyên âm đã mở và điền các chữ cái còn thiếu!"}
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

            {currentPuzzle?.puzzleType === "CROSSWORD" ? (
              <CrosswordSolveModalInput
                puzzle={currentPuzzle}
                revealedIndices={animRevealedIndices}
                onCancel={() => setSolveModalOpen(false)}
                onSubmit={(finalAnswer) => {
                  onSolvePuzzle?.(finalAnswer);
                  setSolveModalOpen(false);
                }}
                edition={edition}
              />
            ) : (
              <SmartPuzzlePhraseInput
                secretPhrase={currentPuzzle?.secretPhrase || ""}
                revealedIndices={animRevealedIndices}
                onCancel={() => setSolveModalOpen(false)}
                onSubmit={(finalAnswer) => {
                  onSolvePuzzle?.(finalAnswer);
                  setSolveModalOpen(false);
                }}
                edition={edition}
              />
            )}
          </div>
        </div>
      )}

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

      {tempTextModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg p-5 rounded-2xl bg-[#121829] border-2 border-purple-400/60 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✍️</span>
                <div>
                  <h4 className="font-black text-base text-purple-300">
                    CÀI ĐẶT CHỮ HIỂN THỊ TẠM THỜI
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Hiển thị thông điệp tùy chọn trực tiếp lên 56 ô chữ (14 cột × 4 hàng)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTempTextModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nội dung hiển thị (tối đa 56 ký tự):
                </label>
                <textarea
                  value={tempTextInput}
                  onChange={(e) => setTempTextInput(e.target.value.toUpperCase().slice(0, 56))}
                  rows={2}
                  placeholder="Nhập nội dung cần hiển thị trên bảng ô chữ..."
                  className="w-full p-3 rounded-xl bg-slate-900 border border-purple-500/40 text-purple-200 font-black tracking-wider text-sm focus:outline-none focus:border-purple-400 resize-none uppercase"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                  <span>
                    Độ dài: <strong className="text-purple-300">{tempTextInput.length}/56</strong> ký tự
                  </span>
                  <span>
                    Tự động căn đều trên khung 14 cột × 4 hàng
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                  Mẫu thông điệp có sẵn:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    "CHÚC MỪNG CHIẾN THẮNG",
                    "VÒNG TIẾP THEO SẮP BẮT ĐẦU",
                    "GIẢI LAO NGHỈ TAY",
                    "XIN CẢM ƠN NHÀ TÀI TRỢ",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTempTextInput(preset)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-purple-900/40 border border-white/10 hover:border-purple-400/50 text-slate-200 hover:text-purple-200 text-xs font-semibold text-left transition truncate cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <div>
                {temporaryDisplayActive && onClearTemporaryText && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearTemporaryText();
                      setTempTextModalOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-400/50 text-rose-200 text-xs font-bold transition cursor-pointer"
                  >
                    🗑️ Xóa chữ trên bảng
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTempTextModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={!tempTextInput.trim()}
                  onClick={() => {
                    if (!tempTextInput.trim()) return;
                    onSetTemporaryText?.(tempTextInput.trim());
                    setTempTextModalOpen(false);
                  }}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black shadow-lg transition cursor-pointer ${
                    tempTextInput.trim()
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:brightness-110 active:scale-95"
                      : "bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed"
                  }`}
                >
                  ✨ Hiển thị lên bảng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ── 2. COMPACT SINGLE ROW SCOREBAR ──
  const renderCompactSingleRowScorebar = () => (
    <div className="w-full flex items-center justify-center gap-1.5 sm:gap-2.5 py-1 px-2 bg-black/60 rounded-xl border border-white/10 shrink-0">
      {teams.map((t) => {
        const rScore = roundScores?.[t.id] || 0;
        const isTurn = isTossUpRound
          ? (phase === "TOSS_UP_BUZZED" && Boolean(tossUpBuzzedTeamId) && t.id === tossUpBuzzedTeamId)
          : (t.id === currentTurnTeamId);
        const strikes = activeState.consecutiveWrongGuesses?.[t.id] ?? activeState.wrongGuessesCount?.[t.id] ?? 0;
        const isEliminated = roundEliminatedTeamIds.includes(t.id) || (activeState.disqualifiedTeamIdsInRound || []).includes(t.id);
        return (
          <div
            key={t.id}
            className={`flex-1 min-w-0 max-w-[220px] px-2 py-1 rounded-lg border text-xs font-bold transition flex items-center justify-between gap-1.5 ${
              isTurn
                ? "bg-amber-400/20 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/50"
                : isEliminated
                ? "bg-red-950/20 border-red-500/30 text-rose-300 opacity-60"
                : "bg-black/40 border-white/10 text-slate-200"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow" style={{ background: t.color || "#6366f1" }} />
              <span className="truncate text-[11px]">{t.name}</span>
              {strikes > 0 && edition !== "ENGLISH" && (
                <span className="text-rose-400 font-mono text-[9px]">{"✕".repeat(Math.min(3, strikes))}</span>
              )}
              {(activeState.wildCardsCount?.[t.id] || 0) > 0 ? (
                <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1 rounded font-bold" title="1 Wild Card">
                  🃏
                </span>
              ) : null}
              {(freeSpinCount?.[t.id] || 0) > 0 ? (
                <span className="text-[9px] text-sky-300 font-bold" title="Thẻ thêm lượt">
                  🎟️{freeSpinCount[t.id]}
                </span>
              ) : null}
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono font-black text-amber-300 text-xs">
                {edition === "ENGLISH" ? `$${((t.score || 0) + rScore).toLocaleString("en-US")}` : `${((t.score || 0) + rScore).toLocaleString()}đ`}
              </span>
              <span className="text-[9px] text-emerald-400 block font-mono">
                +{edition === "ENGLISH" ? `$${rScore.toLocaleString("en-US")}` : `${rScore.toLocaleString()}đ`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── 3. 56-TILE BOARD MATRIX RENDERER ──
  const renderBoardGridMatrix = (isDisplayMode = false) => (
    <div className={`w-full flex flex-col items-center bg-gradient-to-b from-[#0e2a14] via-[#091f0e] to-[#051408] ${isDisplayMode ? "p-1 sm:p-1.5 max-w-4xl" : "p-2 sm:p-2.5 w-full max-w-6xl"} rounded-2xl border-4 border-[#1b4e22] shadow-[0_0_30px_rgba(22,101,52,0.3)] relative overflow-visible shrink-0`}>
      {!isDisplayMode && !isTempActive && (
        <div className="mb-1.5 px-3.5 py-0.5 rounded-full bg-black/60 border border-amber-400/40 text-amber-300 font-black text-xs sm:text-sm uppercase tracking-widest shadow">
          {effectiveBoardStage === "EMPTY_56" ? (
            isHost ? (
              <span>⭐ BẢNG Ô CHỮ SẴN SÀNG — BẤM NÚT MC ĐỂ MỞ ⭐</span>
            ) : (
              <span className="animate-pulse">⏳ Chờ Quản trò/MC mở ô chữ...</span>
            )
          ) : (
            <span>⭐ CHỦ ĐỀ: {currentPuzzle?.category || "TỔNG HỢP"} ⭐</span>
          )}
        </div>
      )}

      <div className={`w-full ${isDisplayMode ? "max-w-4xl px-1 sm:px-2 md:px-4" : "max-w-full px-0.5 sm:px-1 md:px-2"} flex flex-col items-center relative py-0.5`}>
        {/* Stage Proscenium: Cánh Gà Trái + Bảng 56 Ô + Cánh Gà Phải */}
        <div className="w-full flex items-stretch justify-center gap-1.5 sm:gap-2 md:gap-3 relative">
          {/* Trụ Tháp 3D Cánh Trái - Nơi Người Mẫu Đứng Trực Tiếp Vững Chãi */}
          {(isDisplayMode || showHostess) && (
            <div className={`hidden md:flex flex-col items-center justify-end ${isDisplayMode ? "w-20 sm:w-24 md:w-28 lg:w-32" : "w-16 sm:w-20"} shrink-0 relative py-1 select-none pointer-events-none`}>
            {/* Tower Machine Hardware (VU-Meters & Vents) */}
            <div 
              className="absolute inset-x-0 top-1 bottom-4 rounded-2xl bg-gradient-to-b from-[#142018] via-[#09150c] to-[#040a05] border-2 border-amber-500/60 p-2 flex flex-col items-center justify-between overflow-hidden ring-1 ring-yellow-400/40"
              style={{
                boxShadow: "inset 0 3px 6px rgba(255,255,255,0.12), inset -4px 0 10px rgba(0,0,0,0.8), 0 20px 40px rgba(0,0,0,0.95)",
              }}
            >
              {/* Khe tản nhiệt cơ khí & đèn tín hiệu studio */}
              <div className="w-full flex items-center justify-between px-1.5 pt-0.5 opacity-70">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" />
                <div className="h-0.5 w-10 sm:w-14 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse" />
              </div>

              {/* Dàn đèn LED cột dọc VU-Meter phát sáng đồng bộ */}
              <div className="my-auto flex flex-col items-center gap-1.5 py-2 w-full">
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-10 sm:w-14 h-1.5 rounded-sm bg-gradient-to-r from-emerald-500 via-yellow-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] opacity-80"
                    style={{ animation: `pulse ${1.1 + i * 0.15}s infinite ease-in-out` }}
                  />
                ))}
              </div>
            </div>

            {/* NGƯỜI MẪU ĐỨNG NGUYÊN VẸN TRÊN BỤC VÀNG CÁNH TRÁI */}
            {showHostess && (
              <div className="relative z-30 mb-[-4px] flex flex-col items-center pointer-events-none">
                <HostessTVStage
                  pose={hostessPose}
                  facing={hostessFacing}
                  activeRow={hostessActiveRow}
                />
              </div>
            )}

            {/* Bục tròn 3D mạ vàng vươn nhẹ phía trước dành cho Người Mẫu */}
            <div className="w-20 sm:w-24 h-7 rounded-full border-2 border-amber-400 bg-gradient-to-b from-amber-400 via-amber-700 to-amber-950 shadow-[0_6px_16px_rgba(0,0,0,0.9),0_0_20px_rgba(245,158,11,0.5)] flex items-center justify-center relative z-20">
              <div className="w-14 sm:w-18 h-3 rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 border border-yellow-100/80 shadow-inner" />
            </div>
          </div>
          )}

          {/* Bảng Video Wall Trung Tâm */}
          <div className="flex-1 min-w-0 w-full max-w-6xl">
            <div className={`w-full ${isDisplayMode ? "p-1 sm:p-1.5" : "p-2 sm:p-2.5"} rounded-xl bg-gradient-to-b from-[#021307] via-[#041d0b] to-[#010b04] border-2 sm:border-4 border-amber-500/80 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_35px_rgba(245,158,11,0.3)] ring-2 ring-yellow-400/40`}>
              <div className="w-full grid grid-rows-4 gap-0.5 sm:gap-1">
            {gridMatrix.map((row, rIdx) => (
              <div
                key={rIdx}
                className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-0.5 sm:gap-1 w-full items-center justify-items-center"
              >
                {row.map((cell, cIdx) => {
                  const isCutOpen =
                    isTempActive ||
                    effectiveBoardStage === "READY_CLUE" ||
                    openedBlankCellKeys.has("ALL") ||
                    openedBlankCellKeys.has(`${rIdx}_${cIdx}`);

                  if (!cell || (!isTempActive && effectiveBoardStage === "EMPTY_56") || !isCutOpen) {
                    return (
                      <div
                        key={cIdx}
                        className="w-full aspect-[4/5] sm:aspect-[5/6] min-h-0 min-w-0 rounded bg-[#0f3414] border border-[#1e5824] flex items-center justify-center shadow-inner opacity-80 select-none"
                      >
                        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-[#2a7a33] opacity-60 fill-current">
                          <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                        </svg>
                      </div>
                    );
                  }

                  const isLuckyGreen = phase === "LUCKY_PICK" && luckyGreenSelectedIdx === cell.originalIndex;
                  const isPopping = justPoppedIndices.has(cell.originalIndex);
                  const isJustCut = effectiveBoardStage === "BLANK_PHRASE" && openedBlankCellKeys.has(`${rIdx}_${cIdx}`);
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
                      className={`w-full aspect-[4/5] sm:aspect-[5/6] min-h-0 min-w-0 rounded font-black flex items-center justify-center select-none ${
                        isJustCut ? "animate-vtv3-tile-cut" : ""
                      } ${
                        cell.isHighlighted
                          ? "bg-gradient-to-tr from-emerald-600 via-green-500 to-emerald-400 text-transparent border-2 border-green-200 scale-105 shadow-[0_0_35px_#22c55e,0_0_20px_#10b981] animate-pulse z-20"
                          : isPopping
                          ? "bg-white text-[#0f172a] border-2 border-yellow-300 shadow-[0_0_35px_#f59e0b] animate-vtv3-tile-pop z-30"
                          : isLuckyGreen
                          ? "bg-gradient-to-tr from-emerald-500 via-green-400 to-emerald-300 text-emerald-950 border-2 border-emerald-200 scale-110 shadow-[0_0_25px_#10b981] animate-pulse cursor-pointer z-10"
                          : cell.isRevealed
                          ? "bg-white text-[#0f172a] shadow-[0_4px_12px_rgba(255,255,255,0.45)] border-2 border-white scale-100"
                          : phase === "LUCKY_PICK"
                          ? "bg-gradient-to-br from-amber-300 via-yellow-300 to-amber-400 text-amber-950 border-2 border-yellow-200 animate-pulse shadow-[0_0_15px_#f59e0b] cursor-pointer hover:scale-105"
                          : "bg-white text-transparent border-2 border-slate-200 shadow-md"
                      }`}
                      style={{
                        fontFamily: "'SFU Helvetica Condensed', 'Roboto Condensed', 'Helvetica Condensed', sans-serif",
                        fontWeight: 900,
                      }}
                    >
                      <span className={`font-black tracking-tight leading-none ${isDisplayMode ? (isTossUpRound ? "text-xs sm:text-base md:text-xl lg:text-2xl" : "text-[11px] sm:text-sm md:text-lg lg:text-xl") : (isTossUpRound ? "text-base sm:text-xl md:text-2xl lg:text-3xl" : "text-xs sm:text-base md:text-xl lg:text-2xl")}`}>
                        {cell.isHighlighted ? "" : cell.isRevealed ? cell.displayChar : isLuckyGreen ? "✓" : phase === "LUCKY_PICK" ? "🍀" : "?"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trụ Tháp 3D Cánh Phải - Đối Xứng Cơ Khí Studio (Chỉ hiển thị trên Display, trên Host/MC ẩn hoàn toàn để tối đa hóa chiều rộng) */}
      {isDisplayMode && (
        <div className="hidden md:flex flex-col items-center justify-between w-20 sm:w-24 md:w-28 lg:w-32 shrink-0 relative py-1 select-none pointer-events-none">
        <div 
          className="w-full h-full rounded-2xl bg-gradient-to-b from-[#142018] via-[#09150c] to-[#040a05] border-2 border-amber-500/60 p-2 flex flex-col items-center justify-between relative overflow-hidden ring-1 ring-yellow-400/40"
          style={{
            boxShadow: "inset 0 3px 6px rgba(255,255,255,0.12), inset 4px 0 10px rgba(0,0,0,0.8), 0 20px 40px rgba(0,0,0,0.95)",
          }}
        >
          {/* Khe tản nhiệt cơ khí & đèn tín hiệu studio */}
          <div className="w-full flex items-center justify-between px-1.5 pt-0.5 opacity-70">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse" />
            <div className="h-0.5 w-10 sm:w-14 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" />
          </div>

          {/* Dàn đèn LED cột dọc VU-Meter phát sáng đồng bộ */}
          <div className="my-auto flex flex-col items-center gap-1.5 py-2 w-full">
            {[...Array(8)].map((_, i) => (
              <div 
                key={i} 
                className="w-10 sm:w-14 h-1.5 rounded-sm bg-gradient-to-r from-emerald-500 via-yellow-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] opacity-80"
                style={{ animation: `pulse ${1.1 + (7 - i) * 0.15}s infinite ease-in-out` }}
              />
            ))}
          </div>

          {/* Bục tròn 3D mạ vàng đối xứng */}
          <div className="w-20 sm:w-24 h-7 rounded-full border-2 border-amber-400 bg-gradient-to-b from-amber-400 via-amber-700 to-amber-950 shadow-[0_6px_16px_rgba(0,0,0,0.9),0_0_20px_rgba(245,158,11,0.5)] flex items-center justify-center transform translate-y-0.5">
            <div className="w-14 sm:w-18 h-3 rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 border border-yellow-100/80 shadow-inner" />
          </div>
        </div>
      </div>
      )}
    </div>

    {/* Runway & Hostess */}
    <div className="relative w-full h-7 sm:h-9 -mt-1.5 z-20 flex flex-col justify-end">
          <div
            className="absolute inset-0 rounded-b-2xl overflow-hidden border-t-2 border-amber-600/70"
            style={{
              background: "linear-gradient(180deg, #2b180d 0%, #1a0d06 60%, #0d0603 100%)",
              boxShadow: "inset 0 10px 25px rgba(0,0,0,0.9), 0 10px 25px rgba(0,0,0,0.7)",
            }}
          />
          <div className="relative z-10 w-full h-1.5 bg-gradient-to-r from-amber-700 via-yellow-400 to-amber-700 shadow-[0_0_15px_rgba(245,158,11,0.6)] flex items-center justify-around px-4">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-200 shadow-[0_0_8px_#fde047]" />
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-200 shadow-[0_0_8px_#fde047]" />
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-200 shadow-[0_0_8px_#fde047]" />
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-200 shadow-[0_0_8px_#fde047]" />
          </div>
        </div>

        {/* Lower-Third Chyron */}
        {!isTempActive && (
          <div className="w-full mt-1 sm:mt-1.5 z-20 flex flex-col items-start drop-shadow-2xl">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-t-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-[10px] sm:text-xs uppercase tracking-wider shadow border-t border-x border-amber-300">
              <span className="text-amber-900">⭐</span>
              <span>
                {getCleanPuzzleCategoryOrClue(currentPuzzle)}
              </span>
              {currentPuzzle?.puzzleType === "CROSSWORD" && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-violet-950/90 text-violet-200 border border-violet-400 text-[10px] font-black tracking-wider uppercase animate-pulse shadow-sm">
                  🔀 {edition === "ENGLISH" ? "CROSSWORD" : "Ô CHỮ LIÊN KẾT"}
                </span>
              )}
              {/SAME[\s_-]*LETTER|CÙNG CHỮ CÁI ĐẦU/i.test(currentPuzzle?.category || "") && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-indigo-950/90 text-indigo-200 border border-indigo-400 text-[10px] font-black tracking-wider uppercase animate-pulse shadow-sm">
                  ✨ {activeState.sameLetterBonusAwarded ? `SAME LETTER [${activeState.sameLetterChar || ""}] +$1,000` : "SAME LETTER BONUS +$1,000"}
                </span>
              )}
            </div>
            <div className={`w-full ${isDisplayMode ? "px-2.5 py-1" : "px-3.5 py-1.5"} rounded-b-xl rounded-tr-xl bg-black/90 border border-amber-400/40 flex items-center justify-between gap-2.5 text-slate-100 font-bold text-xs sm:text-sm shadow-2xl`}>
              <p className="leading-tight flex-1 whitespace-normal break-words text-[11px] sm:text-xs md:text-sm line-clamp-3">
                {effectiveBoardStage === "READY_CLUE"
                  ? currentPuzzle?.clue || "Lắng nghe gợi ý từ MC và đoán các chữ cái!"
                  : "Bảng ô chữ đang chuẩn bị..."}
              </p>
              {currentPuzzle?.puzzleType === "CROSSWORD" && currentPuzzle.crosswordWords ? (
                <span className="shrink-0 px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 font-mono font-black text-[10px] sm:text-xs border border-amber-400/30 whitespace-nowrap">
                  {currentPuzzle.crosswordWords.length} {edition === "ENGLISH" ? "WORDS" : "TỪ KHÓA"}
                </span>
              ) : (
                currentPuzzle?.secretPhrase && effectiveBoardStage !== "EMPTY_56" && (
                  <span className="shrink-0 px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 font-mono font-black text-[10px] sm:text-xs border border-amber-400/30 whitespace-nowrap">
                    {currentPuzzle.secretPhrase.replace(/\s+/g, "").length} {edition === "ENGLISH" ? "LETTERS" : "KÝ TỰ"}
                  </span>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── 4. CONTESTANT VIEW (isPlayer = true): ZERO-SCROLL, 3 FIXED ZONES ──
  const renderPlayerView = () => (
    <div className="w-full h-full max-h-[100dvh] flex flex-col justify-between p-2 sm:p-3 select-none overflow-hidden box-border bg-gradient-to-b from-[#060b18] via-[#091224] to-[#040710] text-white">
      {/* ZONE 1: TOP — Inverted Half-Wheel + Category & Secret Phrase strip */}
      <div className="flex flex-col items-center w-full shrink-0">
        <div className="w-full flex items-center justify-between px-2 py-0.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black text-amber-300">
              {stageBadgeLabel} · Màn {currentRound}/{maxRounds}
            </span>
            {mainRoundNumber === 4 && roundStage === "MAIN" && jackpotPool && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-cyan-500/20 text-cyan-200 border border-cyan-400/50">
                💎 {(jackpotPool).toLocaleString()}đ
              </span>
            )}
            {speedUpBellActive && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/30 text-rose-200 border border-rose-400 animate-bounce">
                🔔 TĂNG TỐC
              </span>
            )}
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            isTossUpRound
              ? tossUpBuzzedTeamId
                ? isMyTurn
                  ? "bg-emerald-400 text-slate-950 font-black animate-pulse"
                  : "bg-white/10 text-slate-300"
                : "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black animate-pulse"
              : effectiveIsMyTurn
              ? "bg-amber-400 text-slate-950 font-black animate-pulse"
              : "bg-white/10 text-slate-300"
          }`}>
            {isTossUpRound
              ? tossUpBuzzedTeamId
                ? isMyTurn
                  ? "🔔 BẠN ĐÃ BẤM CHUÔNG!"
                  : `Đã bấm: ${formatTeamLabel(currentTurnTeamName)}`
                : "⚡ TRANH BẤM CHUÔNG"
              : effectiveIsMyTurn
              ? "✨ ĐẾN LƯỢT BẠN"
              : `Lượt: ${formatTeamLabel(currentTurnTeamName)}`}
          </span>
        </div>

        {/* Full 360° Circular 2D Wheel Disc for Contestant Machine: Thay thế nửa vòng quay bằng vòng tròn 2D đầy đủ, kim 12h khớp 1:1 tránh lỗi lệch kim */}
        {!(isTossUpRound && phase === "TOSS_UP_BUZZED") && (
          <div className="w-full flex flex-col items-center justify-center p-1 sm:p-2 overflow-visible shrink-0">
            <InteractiveWheelRig
              variant="DISPLAY_360"
              size="normal"
              wheelRef={wheelRef}
              needleRef={needleRef}
              clientWheelAngle={clientWheelAngle}
              effectiveIsSpinning={effectiveIsSpinning}
              sectors={sectors}
              selectedSector={selectedSector}
              selectedSectorIndex={activeState.selectedSectorIndex}
            />
          </div>
        )}

        {/* Compact Phrase Strip */}
        <div className="w-full mt-1 px-3 py-1 rounded-xl bg-black/60 border border-amber-400/30 flex flex-col items-center gap-0.5 shadow-inner shrink-0">
          <div className="flex items-center justify-between w-full text-[11px] font-bold">
            <span className="text-amber-300 uppercase font-black">{getCleanPuzzleCategoryOrClue(currentPuzzle)}</span>
            <span className="text-slate-400 font-mono text-[10px]">
              {currentPuzzle?.secretPhrase?.replace(/\s+/g, "").length || 0} {edition === "ENGLISH" ? "LETTERS" : "KÝ TỰ"}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1 py-0.5 max-h-12 overflow-hidden">
            {currentPuzzle?.secretPhrase ? (() => {
              // BUG-19 FIX: Tính offset một lần bên ngoài thay vì tính lại trong mỗi iteration
              const words = currentPuzzle.secretPhrase.split(" ");
              const wordOffsets: number[] = [];
              let runningOffset = 0;
              for (const w of words) {
                wordOffsets.push(runningOffset);
                runningOffset += w.length + 1; // +1 for space
              }
              return words.map((word, wIdx) => {
                const offset = wordOffsets[wIdx];
                return (
                  <div key={wIdx} className="flex items-center gap-0.5 sm:gap-1 mr-1.5">
                    {word.split("").map((ch, cIdx) => {
                      const absIdx = offset + cIdx;
                      const isRevealed = animRevealedIndices.has(absIdx) || phase === "ROUND_RECAP";
                      return (
                        <div
                          key={cIdx}
                          className={`w-5 h-7 sm:w-6 sm:h-8 rounded font-black text-xs sm:text-sm flex items-center justify-center border shadow-sm ${
                            isRevealed
                              ? "bg-white text-slate-950 border-amber-300 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                              : "bg-emerald-950/80 border-emerald-500/40 text-emerald-300/40"
                          }`}
                        >
                          {isRevealed ? ch : ""}
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })() : (
              <span className="text-xs text-slate-400 italic">Đang chờ câu đố...</span>
            )}
          </div>
        </div>
      </div>

      {/* ZONE 2: MIDDLE — Varies by Round Stage */}
      <div className="w-full flex-1 flex flex-col justify-center min-h-0 my-1 overflow-hidden">
        {isTossUpRound ? (
          phase === "TOSS_UP_BUZZED" ? (
            /* Khi đã có đội bấm chuông: Toàn màn hình gõ từ, không bị ép 2 cột */
            <div className="w-full flex-1 flex flex-col justify-center min-h-0 max-w-2xl mx-auto overflow-hidden">
              {!isHost && myTeamId && tossUpBuzzedTeamId && myTeamId !== tossUpBuzzedTeamId && !isInsideSandbox ? (
                <div className="p-4 text-center rounded-2xl bg-black/60 border border-white/10 text-sm font-bold text-slate-300 flex flex-col items-center justify-center gap-2 shadow-xl">
                  <span className="text-2xl animate-pulse">⏳</span>
                  <span>Đang chờ <span className="text-amber-400 font-black">{formatTeamLabel(tossUpBuzzedTeamName || "Đối thủ")}</span> gõ câu trả lời...</span>
                </div>
              ) : (
                <div className="p-2 sm:p-2.5 rounded-2xl bg-black/70 border border-amber-400/50 space-y-1.5 flex flex-col min-h-0 overflow-hidden shadow-2xl">
                  <div className="flex items-center justify-between pb-1 border-b border-amber-400/30 shrink-0">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                      🔔 {formatTeamLabel(tossUpBuzzedTeamName || currentTurnTeamName)} ĐANG TRẢ LỜI ĐOÁN NHANH:
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 shrink-0">
                      ĐÃ BẤM CHUÔNG!
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <SmartPuzzlePhraseInput
                      secretPhrase={currentPuzzle?.secretPhrase || ""}
                      revealedIndices={animRevealedIndices}
                      onSubmit={handleSafeSolvePuzzle}
                      submitLabel="CHỐT ĐÁP ÁN ĐOÁN NHANH ➔"
                      edition={edition}
                      compact={true}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (() => {
            const hasFirstLetterRevealed = (animRevealedIndices.size >= 1) || ((currentPuzzle?.revealedIndices?.length || 0) >= 1);
            const isBuzzedAlready = isLocallyBuzzed || Boolean(tossUpBuzzedTeamId);
            return (
              /* Vòng Đoán Nhanh: Nút chuông bên trái, Vùng hướng dẫn bên phải */
              <div className="w-full grid grid-cols-1 sm:grid-cols-12 gap-3 items-center h-full max-h-full">
                <div className="sm:col-span-5 flex flex-col items-center justify-center p-2">
                  <div className="relative flex flex-col items-center justify-center">
                    {hasFirstLetterRevealed && !isBuzzedAlready && (
                      <div className="absolute inset-0 rounded-full bg-red-600/35 blur-xl animate-ping pointer-events-none" />
                    )}
                    <div
                      className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full p-2.5 flex items-center justify-center transition-all duration-300 ${
                        !hasFirstLetterRevealed
                          ? "bg-gradient-to-b from-stone-700 via-stone-800 to-stone-900 border-4 border-stone-600 shadow-lg opacity-60 cursor-not-allowed"
                          : isBuzzedAlready
                          ? "bg-gradient-to-b from-emerald-600 via-teal-700 to-emerald-900 border-4 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.7)]"
                          : "bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-700 border-4 border-yellow-300 shadow-[0_15px_35px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.6)] cursor-pointer"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!hasFirstLetterRevealed || isBuzzedAlready}
                        onClick={(e) => {
                          e.preventDefault();
                          if (!hasFirstLetterRevealed || isBuzzedAlready) return;
                          handleTriggerTossUpBuzz();
                        }}
                        className={`w-full h-full rounded-full flex flex-col items-center justify-center transition-all select-none touch-manipulation focus:outline-none ${
                          !hasFirstLetterRevealed
                            ? "bg-gradient-to-b from-neutral-800 to-neutral-900 border-2 border-neutral-700 text-neutral-400 cursor-not-allowed"
                            : isBuzzedAlready
                            ? "bg-gradient-to-b from-emerald-500 to-teal-700 border-2 border-emerald-300 text-white shadow-inner cursor-not-allowed scale-95"
                            : "bg-gradient-to-b from-rose-500 via-red-600 to-red-800 active:from-red-700 active:to-red-900 active:scale-90 border-2 border-red-300 text-white shadow-[inset_0_6px_12px_rgba(255,255,255,0.5),0_10px_25px_rgba(220,38,38,0.8)] hover:brightness-110 active:shadow-inner cursor-pointer"
                        }`}
                      >
                        <span className="text-3xl sm:text-4xl filter drop-shadow">
                          {!hasFirstLetterRevealed ? "🔒" : isBuzzedAlready ? "✅" : "🔔"}
                        </span>
                        <span className="mt-1 font-black text-xs sm:text-sm tracking-wider uppercase drop-shadow text-center px-1">
                          {!hasFirstLetterRevealed
                            ? "CHỜ MỞ CHỮ"
                            : isBuzzedAlready
                            ? "ĐÃ BẤM!"
                            : "BẤM CHUÔNG!"}
                        </span>
                        {hasFirstLetterRevealed && !isBuzzedAlready && (
                          <span className="text-[10px] text-amber-200/90 font-mono font-bold mt-0.5 tracking-tight">
                            [SPACE / ENTER]
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-7 flex flex-col justify-center p-2">
                  <div className="p-4 text-center rounded-2xl bg-black/40 border border-white/10 text-xs font-bold text-amber-200/90 flex flex-col items-center justify-center gap-2">
                    <span className="text-xl">
                      {!hasFirstLetterRevealed ? "⏳" : "⚡"}
                    </span>
                    <span>
                      {!hasFirstLetterRevealed
                        ? "Chờ chữ cái đầu tiên bắt đầu mở để kích hoạt chuông bấm!"
                        : "Chuông đã mở! Hãy đập tay vào nút bên trái hoặc bấm phím Space/Enter ngay khi biết đáp án!"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()
        ) : roundStage === "SPECIAL_FINAL" ? (
          /* Vòng Đặc Biệt / Chung Kết */
          <div className="p-3 rounded-2xl bg-gradient-to-b from-amber-950/70 via-purple-950/80 to-slate-950 border border-amber-400/60 space-y-2.5">
            <div className="flex items-center justify-between border-b border-amber-400/30 pb-1.5">
              <span className="font-black text-xs text-amber-300 uppercase">
                👑 VÒNG ĐẶC BIỆT — Quán quân: {formatTeamLabel(currentTurnTeamName)}
              </span>
              <span className="text-[10px] font-bold text-amber-200">
                {edition === "ENGLISH" ? "Mở sẵn R,S,T,L,N,E · Chọn 3 Phụ + 1 Nguyên · 40s" : `Chọn ${specialAllowedLettersCount} chữ · 30s suy nghĩ + 10s giải`}
              </span>
            </div>

            {phase === "SPECIAL_ORDER_CHOICE" && (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => onSpecialChooseOrder?.("SPIN_FIRST")} className="p-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 cursor-pointer">
                  🎡 QUAY THƯỞNG TRƯỚC
                </button>
                <button type="button" onClick={() => onSpecialChooseOrder?.("SOLVE_FIRST")} className="p-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-cyan-500 to-blue-600 text-white cursor-pointer">
                  🧩 GIẢI Ô CHỮ TRƯỚC
                </button>
              </div>
            )}

            {phase === "SPECIAL_SPIN_WAITING" && (
              <button
                type="button"
                disabled={effectiveIsSpinning}
                onClick={() => {
                  if (effectiveIsSpinning) return;
                  if (canPlayBoardAudio) soundManager.playMagicWheelSpin();
                  hasPlayedLandingAudioRef.current = false;
                  setLocalIsSpinning(true);
                  onSpin?.(oscillatingPower);
                }}
                className="w-full py-2.5 rounded-xl font-black text-xs text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 cursor-pointer"
              >
                ✦ QUAY PHONG BÌ ĐẶC BIỆT ({oscillatingPower}%) ✦
              </button>
            )}

            {phase === "SPECIAL_SOLVING" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-amber-400/40">
                  <span className="text-xs font-black text-amber-300">
                    ⏱️ THỜI GIAN: Còn {specialRemainingSec}s!
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-mono font-black text-xs">
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
                  edition={edition}
                />
              </div>
            )}
          </div>
        ) : (
          /* Vòng Chơi Chính: Nút chuông LOẠI BỎ, Hàng lệnh + Bàn phím (hoặc Thẻ quà thay thế) */
          <div className="w-full flex-1 flex flex-col justify-center gap-2 min-h-0 my-1 overflow-hidden">
            {/* Hàng nút lệnh */}
            {phase === "SPIN_WAITING" &&
             effectiveBoardStage === "READY_CLUE" &&
             !effectiveIsSpinning &&
             !isSpinning &&
             !mustSolveWithTones &&
             !speedUpBellActive && (
              <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-1.5 shrink-0">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1 text-amber-300 text-[11px]">
                    ⚡ LỰC QUAY: {oscillatingPower}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">Nhấn chốt để quay ngay</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-75 shadow-lg"
                    style={{ width: `${oscillatingPower}%` }}
                  />
                </div>
                {(() => {
                  const isMyTurnToSpin = isHost || (myTeamId ? myTeamId === currentTurnTeamId : effectiveIsMyTurn);
                  if (canInteract && isMyTurnToSpin) {
                    return (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isMyTurnToSpin || effectiveIsSpinning || isCurrentTeamEliminated || isNoMoreConsonants) return;
                            if (canPlayBoardAudio) soundManager.playMagicWheelSpin();
                            hasPlayedLandingAudioRef.current = false;
                            setLocalIsSpinning(true);
                            onSpin?.(oscillatingPower);
                          }}
                          disabled={!isMyTurnToSpin || effectiveIsSpinning || Boolean(actionToast) || isCurrentTeamEliminated || isNoMoreConsonants}
                          className={`flex-1 py-2 rounded-xl font-black text-xs text-white transition shadow cursor-pointer ${
                            isCurrentTeamEliminated
                              ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                              : isNoMoreConsonants
                              ? "bg-slate-850 text-amber-400/80 border border-amber-500/40 cursor-not-allowed opacity-75"
                              : "bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:brightness-110 active:scale-98"
                          }`}
                        >
                          {isCurrentTeamEliminated
                            ? "⛔ HẾT LƯỢT"
                            : isNoMoreConsonants
                            ? "🚫 HẾT PHỤ ÂM"
                            : `✦ QUAY NÓN (${oscillatingPower}%) ✦`}
                        </button>
                        {edition === "ENGLISH" && subMode === "WORD_PUZZLE" && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!isMyTurnToSpin) return;
                              setBuyVowelModalOpen(true);
                            }}
                            disabled={
                              !isMyTurnToSpin ||
                              isSpinning ||
                              isCurrentTeamEliminated ||
                              ((roundScores?.[currentTurnTeamId] || 0) < 250)
                            }
                            className={`px-3 py-2 rounded-xl font-black text-xs whitespace-nowrap shadow transition ${
                              !isMyTurnToSpin
                                ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50"
                                : "bg-gradient-to-r from-amber-600 to-orange-700 text-amber-100 hover:brightness-110 active:scale-98 cursor-pointer"
                            }`}
                          >
                            🛒 MUA NGUYÊN ÂM (250đ)
                          </button>
                        )}
                        {subMode === "WORD_PUZZLE" && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!isMyTurnToSpin) return;
                              setSolveModalOpen(true);
                            }}
                            disabled={!isMyTurnToSpin || isSpinning || isSolveForbiddenInRound3 || isCurrentTeamEliminated}
                            className={`px-3 py-2 rounded-xl font-black text-xs whitespace-nowrap shadow transition ${
                              !isMyTurnToSpin
                                ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50"
                                : "text-black bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 active:scale-98 cursor-pointer"
                            }`}
                          >
                            🎯 GIẢI Ô CHỮ
                          </button>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div className="text-center py-1 text-xs text-amber-300/80 italic font-medium">
                      ⏳ Đang chờ {formatTeamLabel(currentTurnTeamName)} quay nón hoặc giải ô chữ...
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Bàn phím chữ cái hoặc Thẻ quà tặng thay thế tạm thời */}
            <div className="flex-1 flex flex-col justify-center min-h-0 overflow-hidden">
              {phase === "REWARD_CHOICE" ? (
                /* 20 Lá thăm bí mật thay thế tạm thời vùng chọn chữ */
                <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-b from-amber-950/80 via-slate-900/90 to-amber-950/80 border-2 border-amber-400/50 shadow-xl space-y-1.5">
                  <div className="flex items-center justify-between border-b border-amber-400/30 pb-1">
                    <span className="font-black text-xs text-amber-300 uppercase">
                      🎁 Ô PHẦN THƯỞNG: 20 LÁ THĂM BÍ MẬT (CHỌN 1 LÁ)
                    </span>
                    <span className="text-[10px] text-amber-200/80">
                      {pickedRewardCardIdx !== null ? "Đang mở quà..." : "Chạm vào 1 lá thăm"}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 max-h-[min(42vh,260px)] overflow-y-auto pr-0.5">
                    {rewardCards.map((card, idx) => {
                      const isRevealed = pickedRewardCardIdx === idx;
                      const isOtherPicked = pickedRewardCardIdx !== null && pickedRewardCardIdx !== idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={pickedRewardCardIdx !== null || !canInteract}
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
                          className={`aspect-[4/3] sm:aspect-square rounded-lg flex flex-col items-center justify-center p-0.5 font-black text-center transition-all duration-300 select-none min-h-0 ${
                            isRevealed
                              ? "bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-400 text-amber-950 border-2 border-yellow-100 scale-105 shadow-[0_0_20px_#f59e0b] z-10"
                              : isOtherPicked
                              ? "bg-black/30 border border-white/5 opacity-40 cursor-not-allowed"
                              : "bg-gradient-to-b from-amber-900/60 to-purple-950/80 border border-amber-400/40 hover:scale-105 active:scale-95 text-amber-200 shadow cursor-pointer"
                          }`}
                        >
                          {isRevealed ? (
                            <>
                              <span className="text-sm sm:text-base leading-none">{card.icon}</span>
                              <span className="text-[8px] sm:text-[9px] font-black leading-none mt-0.5 truncate max-w-full px-0.5">{card.label}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs opacity-80 leading-none">✉️</span>
                              <span className="text-[9px] sm:text-[10px] font-black text-amber-300 mt-0.5 leading-none">#{idx + 1}</span>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : phase === "MYSTERY_CHOICE" ? (
                <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-500/40 shadow space-y-2">
                  <span className="font-black text-xs text-purple-200">🔮 QUYẾT ĐỊNH Ô BÍ MẬT:</span>
                  {canInteract ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => onMysteryDecide?.(false)} className="py-2 px-3 rounded-lg font-black text-xs bg-emerald-600 text-white cursor-pointer">
                        🛡️ AN TOÀN (1.000đ/chữ)
                      </button>
                      <button type="button" onClick={() => onMysteryDecide?.(true)} className="py-2 px-3 rounded-lg font-black text-xs bg-purple-600 text-white cursor-pointer">
                        🎲 LẬT BÍ MẬT (3 Triệu / Mất điểm)
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-xs text-slate-400 italic">Đang đợi {formatTeamLabel(currentTurnTeamName)}...</div>
                  )}
                </div>
              ) : phase === "TRADE_CHOICE" ? (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 shadow space-y-2">
                  <span className="text-xs font-black text-rose-200">🎁 ĐỔI HAY KHÔNG ĐỔI? (VÒNG 3)</span>
                  {canInteract ? (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                        {[
                          { label: "🎁 Hộp #1", desc: "5.000.000đ" },
                          { label: "🎁 Hộp #2", desc: "3.000.000đ" },
                          { label: "🎁 Hộp #3", desc: "Nồi chiên" },
                          { label: "🎁 Hộp #4", desc: "Bộ nồi Inox" },
                        ].map((box, idx) => (
                          <button key={idx} type="button" onClick={() => onTradeDecide?.(true, idx)} className="p-1.5 rounded-lg border border-rose-400/40 bg-rose-500/20 text-rose-200 text-xs font-black cursor-pointer">
                            <span>{box.label}</span>
                            <span className="text-[9px] block text-rose-300 font-normal">{box.desc}</span>
                          </button>
                        ))}
                      </div>
                      <button type="button" onClick={() => onTradeDecide?.(false)} className="w-full py-1.5 rounded-lg font-black text-xs bg-cyan-600 text-white cursor-pointer">
                        🛡️ KHÔNG ĐỔI — TIẾP TỤC ĐUA Ô CHỮ ➔
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-xs text-slate-400 italic">Đang đợi {formatTeamLabel(currentTurnTeamName)}...</div>
                  )}
                </div>
              ) : phase === "FREE_SPIN_CHOICE" ? (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-400/50 space-y-2">
                  <span className="text-xs font-black text-emerald-200">🎟️ SỬ DỤNG THẺ THÊM LƯỢT?</span>
                  {canInteract ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => onUseFreeSpin?.(true)} className="py-2 px-3 rounded-lg font-black text-xs bg-emerald-500 text-white cursor-pointer">
                        🎟️ DÙNG THẺ (QUAY TIẾP)
                      </button>
                      <button type="button" onClick={() => onUseFreeSpin?.(false)} className="py-2 px-3 rounded-lg font-black text-xs bg-slate-800 text-slate-300 cursor-pointer">
                        ⏭️ GIỮ THẺ (CHUYỂN LƯỢT)
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-xs text-slate-400 italic">Đang đợi {formatTeamLabel(currentTurnTeamName)}...</div>
                  )}
                </div>
              ) : phase === "EXPRESS_CHOICE" ? (
                <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-400/50 space-y-2">
                  <span className="text-xs font-black text-amber-200">⚡ LÊN TÀU TỐC ĐỘ (1.000đ/chữ)?</span>
                  {canInteract && (
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => onExpressDecide?.(true)} className="py-2 px-3 rounded-lg font-black text-xs bg-amber-400 text-slate-950 cursor-pointer">
                        ⚡ LÊN TÀU
                      </button>
                      <button type="button" onClick={() => onExpressDecide?.(false)} className="py-2 px-3 rounded-lg font-black text-xs bg-slate-700 text-white cursor-pointer">
                        🛡️ DỪNG AN TOÀN
                      </button>
                    </div>
                  )}
                </div>
              ) : phase === "STEAL_SWAP_CHOICE" ? (
                <div className="p-3 rounded-xl bg-indigo-950/70 border border-indigo-400/50 space-y-2">
                  <span className="text-xs font-black text-indigo-200">⚔️ Ô ĐỐI ĐẦU / CHUYỂN NHƯỢNG:</span>
                  {canInteract && (
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => onStealSwapDecide?.("STEAL_50")} className="py-2 px-3 rounded-lg font-black text-xs bg-rose-500 text-white cursor-pointer">
                        ⚔️ CƯỚP 50%
                      </button>
                      <button type="button" onClick={() => onStealSwapDecide?.("SWAP_LEADER")} className="py-2 px-3 rounded-lg font-black text-xs bg-cyan-500 text-white cursor-pointer">
                        🔄 ĐỔI VỚI DẪN ĐẦU
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* BÀN PHÍM CHỮ CÁI */
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-300">
                    <span>
                      {edition === "ENGLISH"
                        ? (selectedSector?.type === "FREE_PLAY" || activeState.pendingSpecialAction === "FREE_PLAY")
                          ? "🎉 FREE PLAY: Đoán tự do cả Nguyên âm MIỄN PHÍ!"
                          : "Bàn phím phụ âm tiếng Anh (Nguyên âm mua qua nút 250đ):"
                        : "Bàn phím chữ cái:"}
                    </span>
                    {guessedLetterWarning && (
                      <span className="text-amber-400 font-bold animate-pulse text-[10px]">{guessedLetterWarning}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-7 sm:grid-cols-10 gap-1">
                    {(() => {
                      const isFreePlayActive =
                        selectedSector?.type === "FREE_PLAY" || activeState.pendingSpecialAction === "FREE_PLAY";
                      const lettersList =
                        edition === "ENGLISH"
                          ? isFreePlayActive
                            ? ENGLISH_ALPHABET
                            : ENGLISH_ALPHABET.filter((l) => !isEnglishVowel(l))
                          : VIETNAMESE_ALPHABET;

                      return lettersList.map((letter) => {
                        const isGuessed = guessedLetters.includes(letter);
                        const isVowel = edition === "ENGLISH" && isEnglishVowel(letter);
                        const isCurrentTarget =
                          canInteract &&
                          (phase === "ACTION_INPUT" || expressModeActive || speedUpBellActive) &&
                          !mustSolveWithTones &&
                          !isSpinning &&
                          (isFreePlayActive || !(edition === "ENGLISH" && isVowel));

                        const handleLetterClick = () => {
                          if (isGuessed) {
                            if (blackoutGuessedLetters === false) {
                              setGuessedLetterWarning(`⚠️ Chữ "${letter}" đã có người đoán trước đó rồi!`);
                              setTimeout(() => setGuessedLetterWarning(null), 3000);
                            }
                            return;
                          }
                          if (edition === "ENGLISH" && isVowel && !isFreePlayActive) {
                            setGuessedLetterWarning("⚠️ Trong bản tiếng Anh, nguyên âm phải mua với giá 250đ!");
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
                              <span className="block text-[8px] text-emerald-400 font-normal leading-none mt-0.5">
                                FREE
                              </span>
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ZONE 3: BOTTOM — Tinh giản điểm số */}
      <div className="w-full shrink-0 pt-1 pb-1">
        {renderCompactSingleRowScorebar()}
      </div>
    </div>
  );

  // ── 5. DISPLAY VIEW (isDisplay = true): 100% THUẦN TRƯỜNG QUAY 3D VTV3 2016 (ZERO 2D BOARD) ──
  const renderDisplayView = () => {
    return (
      <div className="w-full h-screen max-h-screen overflow-hidden flex flex-col justify-between p-2 sm:p-3 pb-0 box-border bg-gradient-to-b from-[#081226] via-[#0a1733] to-[#040914] text-white select-none relative">
        {/* Overhead Volumetric Lighting Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-10 left-1/4 w-96 h-[600px] bg-gradient-to-b from-amber-400/20 via-yellow-400/5 to-transparent blur-3xl transform -rotate-12" />
          <div className="absolute -top-10 right-1/4 w-96 h-[600px] bg-gradient-to-b from-sky-400/20 via-blue-500/5 to-transparent blur-3xl transform rotate-12" />
          <div className="absolute bottom-0 inset-x-0 h-72 bg-gradient-to-t from-blue-950/30 via-slate-900/15 to-transparent blur-xl" />
        </div>

        {/* Top Header: Game Status */}
        <div className="w-full flex items-center justify-between shrink-0 mb-1 z-30">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 uppercase shadow">
              {stageBadgeLabel}
            </span>
            <span className="text-xs text-slate-300 font-bold">
              Màn {currentRound}/{maxRounds}
            </span>
            {mainRoundNumber === 4 && roundStage === "MAIN" && jackpotPool && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-200 border border-cyan-400/50">
                💎 {(jackpotPool).toLocaleString()}đ
              </span>
            )}
            {/* Nút bật/tắt Tỷ lệ 16:9 Letterbox chuẩn TV */}
            <button
              type="button"
              onClick={() => setIs16x9Letterbox((prev) => !prev)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                is16x9Letterbox
                  ? "bg-amber-500/20 text-amber-300 border-amber-400/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                  : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
              }`}
              title="Khóa tỷ lệ khung hình 16:9 chuẩn truyền hình TV"
            >
              📺 {is16x9Letterbox ? "16:9 ON" : "16:9"}
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-black/60 border border-white/10">
            <span className="w-2.5 h-2.5 rounded-full shadow animate-pulse" style={{ background: activeTeam?.color || "#ec4899" }} />
            <span className="text-xs font-bold text-slate-300">
              {isTossUpRound
                ? tossUpBuzzedTeamName ? `Đội bấm: ${tossUpBuzzedTeamName}` : "Tranh quyền bấm chuông"
                : `Đang đến lượt: ${currentTurnTeamName || "Chưa có"}`}
            </span>
          </div>
        </div>

        {/* ── 3D STUDIO STAGE & WHEEL MACHINE (WebGL Three.js) ── */}
        <div className="w-full flex-1 min-h-0 relative overflow-hidden flex items-center justify-center bg-black">
          <div
            className={`relative transition-all duration-300 ${
              is16x9Letterbox
                ? "aspect-video w-full max-h-full max-w-full shadow-2xl rounded-2xl border border-white/10 overflow-hidden"
                : "w-full h-full"
            }`}
          >
            <WheelStudio3DScene
              sectors={sectors}
              clientWheelAngle={clientWheelAngle}
              effectiveIsSpinning={effectiveIsSpinning}
              targetRotationDegrees={targetRotationDegrees}
              spinPower={activeState.spinPower || 65}
              selectedSector={selectedSector}
              teams={teams}
              roundScores={roundScores}
              currentTurnTeamId={currentTurnTeamId}
              tossUpBuzzedTeamId={tossUpBuzzedTeamId}
              isTossUpRound={isTossUpRound}
              phase={phase}
              boardStage={effectiveBoardStage}
              camAngle={camAngle}
              edition={edition}
              currentPuzzle={currentPuzzle}
              highlightedIndices={highlightedIndices}
              animRevealedIndices={animRevealedIndices}
              justPoppedIndices={justPoppedIndices}
              hostessXPercent={hostessXPercent}
              hostessPose={hostessPose}
              onCamAngleChange={(cam) => setCamAngle(cam)}
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>

        {/* Bottom: Victory Banner if ROUND_RECAP */}
        {phase === "ROUND_RECAP" && (
          <div className="w-full mt-1 p-2 rounded-xl bg-gradient-to-r from-amber-500/30 via-yellow-400/30 to-emerald-500/30 border border-amber-400 flex items-center justify-between gap-3 shrink-0 shadow-lg animate-fade-in z-30">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-xl">👑</span>
              <span className="font-black text-white text-sm sm:text-base md:text-lg tracking-wider uppercase text-center w-full">
                {currentPuzzle?.puzzleType === "CROSSWORD" && currentPuzzle.crosswordWords
                  ? currentPuzzle.crosswordWords.map((w) => w.word).join(" · ")
                  : `“${currentPuzzle?.secretPhrase}”`}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHostView = () => (
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
          55% { transform: scale(1.35); box-shadow: 0 0 28px #f59e0b, 0 0 50px rgba(245, 158, 11, 0.75); z-index: 40; }
          100% { transform: scale(1); box-shadow: 0 4px 10px rgba(255, 255, 255, 0.4); z-index: 10; }
        }
        .animate-vtv3-tile-pop {
          animation: vtv3TilePopZoom 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important;
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
                VÒNG QUAY TRÍ TUỆ
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

          {/* Host Temporary Display Text Controls */}
          {isHost && (onSetTemporaryText || onClearTemporaryText) && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTempTextModalOpen(true)}
                disabled={!isBetweenRounds}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isBetweenRounds
                    ? "bg-purple-600/30 text-purple-200 border-purple-400/50 hover:bg-purple-600/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                    : "bg-slate-800 text-slate-500 border-slate-700 opacity-50 cursor-not-allowed"
                }`}
                title={
                  isBetweenRounds
                    ? "Cài đặt chữ hiển thị thủ công tạm thời trên bảng ô chữ"
                    : "Chỉ được cài đặt chữ tạm thời giữa 2 thời điểm: sau khi công bố đáp án vòng hiện tại, trước khi mở ô chữ vòng kế tiếp"
                }
              >
                ✍️ Chữ tạm thời
              </button>
              {temporaryDisplayActive && onClearTemporaryText && (
                <button
                  type="button"
                  onClick={() => onClearTemporaryText()}
                  className="px-2 py-1 rounded-xl text-xs font-bold bg-rose-600/30 hover:bg-rose-600/50 border border-rose-400/50 text-rose-200 transition cursor-pointer shadow"
                  title="Xóa chữ hiển thị tạm thời trên bảng"
                >
                  🗑️ Xóa chữ
                </button>
              )}
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
                const isTurn = isTossUpRound
          ? (phase === "TOSS_UP_BUZZED" && Boolean(tossUpBuzzedTeamId) && t.id === tossUpBuzzedTeamId)
          : (t.id === currentTurnTeamId);
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
                      {(activeState.wildCardsCount?.[t.id] || 0) > 0 ? (
                        <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1 rounded font-bold" title="Đang nắm giữ 1 Thẻ Wild Card">
                          🃏 Wild
                        </span>
                      ) : null}
                      <span className="font-mono font-black text-amber-300 ml-auto">
                        {edition === "ENGLISH"
                          ? `$${((t.score || 0) + rScore).toLocaleString("en-US")}`
                          : `${((t.score || 0) + rScore).toLocaleString()}đ`}
                      </span>
                      {isEliminatedBySolve ? (
                        <span className="text-rose-400 text-[10px] font-bold">⛔</span>
                      ) : edition !== "ENGLISH" && strikes > 0 ? (
                        <span className="text-rose-400 font-mono text-[10px] tracking-tighter">
                          {"✕".repeat(Math.min(3, strikes))}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-end pt-0.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        {edition === "ENGLISH" ? `Round: $${rScore.toLocaleString("en-US")}` : `Vòng này: ${rScore.toLocaleString()}đ`}
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

          {isHost && (roundStage === "TOSS_UP_1" || roundStage === "TOSS_UP_2") && phase !== "ROUND_RECAP" && (
            <button
              type="button"
              onClick={() => {
                onTossUpSkip?.();
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600/80 hover:bg-rose-500 text-white border border-rose-400 transition cursor-pointer active:scale-95 shadow flex items-center gap-1 shrink-0"
              title="Bỏ qua ô chữ Đoán Nhanh nếu không có ai giải được"
            >
              <span>⏭️</span> Bỏ qua ô chữ
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
                Bảng ô chữ đang đóng (56 ô tiêu chuẩn)
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
        <div className="w-full flex flex-col items-center bg-gradient-to-b from-[#0e2a14] via-[#091f0e] to-[#051408] p-2.5 sm:p-4 rounded-2xl border-4 border-[#1b4e22] shadow-[0_0_30px_rgba(22,101,52,0.3)] relative overflow-visible">
          {/* Header Action: Category Banner OR Waiting Badge (Hidden on Display to avoid duplicate with lower-third) */}
          {!isDisplay && !isTempActive && (
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
            {/* Studio Lighting Overhead Truss with Multiple Downlight Spotlights */}
            <div className="absolute -top-6 inset-x-0 h-28 pointer-events-none flex justify-around opacity-45 z-0">
              <div className="w-48 h-36 bg-gradient-to-b from-amber-400/40 via-yellow-400/15 to-transparent blur-2xl transform -rotate-15" />
              <div className="w-64 h-40 bg-gradient-to-b from-emerald-400/30 via-emerald-500/10 to-transparent blur-2xl" />
              <div className="w-64 h-40 bg-gradient-to-b from-cyan-400/30 via-sky-500/10 to-transparent blur-2xl" />
              <div className="w-48 h-36 bg-gradient-to-b from-amber-400/40 via-yellow-400/15 to-transparent blur-2xl transform rotate-15" />
            </div>

            {/* SÂN KHẤU TRUYỀN HÌNH 3D: Cánh Gà Trái + Bảng Video Wall 56 Ô + Cánh Gà Phải + Sàn Runway Liền Mạch */}
            <div className={`w-full ${isDisplay ? "max-w-6xl px-2 sm:px-4 md:px-6" : "w-full max-w-full px-0 sm:px-1 md:px-2"} flex flex-col items-center relative z-10`}>
              {/* Proscenium Row: Left Wing - Center Board - Right Wing */}
              <div className="w-full flex items-stretch justify-center gap-1 sm:gap-2 md:gap-3 relative">
                {/* Trụ Tháp 3D Cánh Trái - Nơi Người Mẫu Đứng Trực Tiếp Vững Chãi */}
                {(isDisplay || showHostess) && (
                  <div className={`hidden md:flex flex-col items-center justify-end ${isDisplay ? "w-24 sm:w-28 md:w-32 lg:w-36" : "w-16 sm:w-20 md:w-24"} shrink-0 relative py-1 select-none pointer-events-none`}>
                    <div 
                      className="absolute inset-x-0 top-1 bottom-4 rounded-2xl bg-gradient-to-b from-[#142018] via-[#09150c] to-[#040a05] border-2 border-amber-500/60 p-2.5 flex flex-col items-center justify-between overflow-hidden ring-1 ring-yellow-400/40"
                      style={{
                        boxShadow: "inset 0 3px 6px rgba(255,255,255,0.15), inset -4px 0 10px rgba(0,0,0,0.8), 0 20px 40px rgba(0,0,0,0.95)",
                      }}
                    >
                      {/* Khe tản nhiệt cơ khí & đèn tín hiệu studio */}
                      <div className="w-full flex items-center justify-between px-2 pt-0.5 opacity-70">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" />
                        <div className="h-0.5 w-12 sm:w-16 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse" />
                      </div>

                      {/* Dàn đèn LED cột dọc VU-Meter phát sáng đồng bộ */}
                      <div className="my-auto flex flex-col items-center gap-1.5 py-2 w-full">
                        {[...Array(9)].map((_, i) => (
                          <div 
                            key={i} 
                            className="w-12 sm:w-16 h-1.5 rounded-sm bg-gradient-to-r from-emerald-500 via-yellow-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] opacity-80"
                            style={{ animation: `pulse ${1.1 + i * 0.15}s infinite ease-in-out` }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* NGƯỜI MẪU ĐỨNG NGUYÊN VẸN TRÊN BỤC VÀNG CÁNH TRÁI */}
                    {showHostess && (
                      <div className="relative z-30 mb-[-4px] flex flex-col items-center pointer-events-none">
                        <HostessTVStage
                          pose={hostessPose}
                          facing={hostessFacing}
                          activeRow={hostessActiveRow}
                        />
                      </div>
                    )}

                    {/* Bục tròn 3D mạ vàng vươn nhẹ phía trước dành cho Người Mẫu */}
                    <div className="w-22 sm:w-26 h-8 rounded-full border-2 border-amber-400 bg-gradient-to-b from-amber-400 via-amber-700 to-amber-950 shadow-[0_8px_20px_rgba(0,0,0,0.9),0_0_25px_rgba(245,158,11,0.6)] flex items-center justify-center relative z-20">
                      <div className="w-16 sm:w-20 h-3.5 rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 border border-yellow-100/80 shadow-inner" />
                    </div>
                  </div>
                )}

                {/* Bảng Video Wall 3D Trung Tâm (14 Cột Ô Chữ Hoàn Toàn Rõ Ràng) */}
                <div className="flex-1 min-w-0 w-full max-w-6xl">
                  <div className={`w-full ${isDisplay ? "p-2.5 sm:p-3.5 md:p-4" : "p-1.5 sm:p-2.5 md:p-3"} rounded-2xl bg-gradient-to-b from-[#021307] via-[#041d0b] to-[#010b04] border-4 border-amber-500/80 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_35px_rgba(245,158,11,0.3)] ring-2 ring-yellow-400/40`}>
                    <div className="w-full grid grid-rows-4 gap-1 sm:gap-1.5 md:gap-2">
                    {gridMatrix.map((row, rIdx) => (
                      <div
                        key={rIdx}
                        className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1 sm:gap-1.5 md:gap-2 w-full items-center justify-items-center"
                      >
                        {row.map((cell, cIdx) => {
                          const isCutOpen =
                            isTempActive ||
                            effectiveBoardStage === "READY_CLUE" ||
                            openedBlankCellKeys.has("ALL") ||
                            openedBlankCellKeys.has(`${rIdx}_${cIdx}`);

                          if (!cell || (!isTempActive && effectiveBoardStage === "EMPTY_56") || !isCutOpen) {
                            return (
                              <div
                                key={cIdx}
                                className="w-full aspect-[4/5] sm:aspect-[5/6] min-h-0 min-w-0 rounded bg-[#0f3414] border border-[#1e5824] flex items-center justify-center shadow-inner opacity-80 select-none"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-[#2a7a33] opacity-60 fill-current"
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
                            effectiveBoardStage === "BLANK_PHRASE" && openedBlankCellKeys.has(`${rIdx}_${cIdx}`);

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
                              className={`w-full aspect-[4/5] sm:aspect-[5/6] min-h-0 min-w-0 rounded font-black flex items-center justify-center select-none ${
                                isJustCut ? "animate-vtv3-tile-cut" : ""
                              } ${
                                isPopping
                                  ? "bg-white text-[#0f172a] border-2 border-yellow-300 shadow-[0_0_35px_#f59e0b] animate-vtv3-tile-pop z-30"
                                  : isLuckyGreen
                                  ? "bg-gradient-to-tr from-emerald-500 via-green-400 to-emerald-300 text-emerald-950 border-2 border-emerald-200 scale-110 shadow-[0_0_25px_#10b981] animate-pulse cursor-pointer z-10"
                                  : cell.isHighlighted
                                  ? "bg-gradient-to-tr from-emerald-600 via-green-500 to-emerald-400 text-transparent border-2 border-green-200 scale-105 shadow-[0_0_35px_#22c55e,0_0_20px_#10b981] animate-pulse z-20"
                                  : cell.isRevealed
                                  ? "bg-white text-[#0f172a] shadow-[0_4px_12px_rgba(255,255,255,0.45)] border-2 border-white scale-100"
                                  : phase === "LUCKY_PICK"
                                  ? "bg-gradient-to-br from-amber-300 via-yellow-300 to-amber-400 text-amber-950 border-2 border-yellow-200 animate-pulse shadow-[0_0_15px_#f59e0b] cursor-pointer hover:scale-105"
                                  : "bg-white/95 text-transparent border-2 border-slate-300 shadow-md"
                              }`}
                              style={{
                                fontFamily: "'SFU Helvetica Condensed', 'Roboto Condensed', 'Helvetica Condensed', sans-serif",
                                fontWeight: 900,
                              }}
                            >
                              <span className={`${isTossUpRound ? "text-base sm:text-xl md:text-2xl lg:text-3xl" : "text-xs sm:text-base md:text-xl lg:text-2xl"} font-black tracking-tight leading-none`}>
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
              </div>

              {/* Trụ Tháp 3D Cánh Phải - Đối Xứng Cơ Khí Studio (Chỉ hiển thị trên Display toàn màn hình, trên Host/MC ẩn đi để tối đa hóa 100% diện tích cho 14 cột ô chữ) */}
              {isDisplay && (
                <div className="hidden md:flex flex-col items-center justify-between w-24 sm:w-28 md:w-32 lg:w-36 shrink-0 relative py-1 select-none pointer-events-none">
                  <div 
                    className="w-full h-full rounded-2xl bg-gradient-to-b from-[#142018] via-[#09150c] to-[#040a05] border-2 border-amber-500/60 p-2.5 flex flex-col items-center justify-between relative overflow-hidden ring-1 ring-yellow-400/40"
                    style={{
                      boxShadow: "inset 0 3px 6px rgba(255,255,255,0.15), inset 4px 0 10px rgba(0,0,0,0.8), 0 20px 40px rgba(0,0,0,0.95)",
                    }}
                  >
                    {/* Khe tản nhiệt cơ khí & đèn tín hiệu studio */}
                    <div className="w-full flex items-center justify-between px-2 pt-0.5 opacity-70">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse" />
                      <div className="h-0.5 w-12 sm:w-16 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" />
                    </div>

                    {/* Dàn đèn LED cột dọc VU-Meter phát sáng đồng bộ */}
                    <div className="my-auto flex flex-col items-center gap-1.5 py-2 w-full">
                      {[...Array(9)].map((_, i) => (
                        <div 
                          key={i} 
                          className="w-12 sm:w-16 h-1.5 rounded-sm bg-gradient-to-r from-emerald-500 via-yellow-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] opacity-80"
                          style={{ animation: `pulse ${1.1 + (8 - i) * 0.15}s infinite ease-in-out` }}
                        />
                      ))}
                    </div>

                    {/* Bục tròn 3D mạ vàng đối xứng */}
                    <div className="w-22 sm:w-26 h-8 rounded-full border-2 border-amber-400 bg-gradient-to-b from-amber-400 via-amber-700 to-amber-950 shadow-[0_8px_20px_rgba(0,0,0,0.9),0_0_25px_rgba(245,158,11,0.6)] flex items-center justify-center transform translate-y-1">
                      <div className="w-16 sm:w-20 h-3.5 rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 border border-yellow-100/80 shadow-inner" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sàn Sân Khấu Gỗ Bóng Mahogany & Dải Đèn Chân Vàng Sang Trọng (Liền Mạch Toàn Sân Khấu) */}
            <div className="relative w-full h-8 sm:h-11 md:h-14 -mt-2 sm:-mt-2.5 z-20 flex flex-col justify-end">
                  {/* Sàn gỗ bóng phản chiếu ánh đèn vàng */}
                  <div
                    className="absolute inset-0 rounded-b-2xl overflow-hidden border-t-2 border-amber-600/70"
                    style={{
                      background: "linear-gradient(180deg, #2b180d 0%, #1a0d06 60%, #0d0603 100%)",
                      boxShadow: "inset 0 10px 25px rgba(0,0,0,0.9), 0 10px 25px rgba(0,0,0,0.7)",
                    }}
                  >
                    <div
                      className="absolute inset-x-0 top-0 h-full pointer-events-none"
                      style={{
                        background: "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.35) 0%, rgba(217,119,6,0.15) 50%, transparent 80%)",
                      }}
                    />
                  </div>

                  {/* Nẹp viền kim loại đồng thau và dàn đèn chân (Footlights) */}
                  <div className="relative z-10 w-full h-1.5 sm:h-2 bg-gradient-to-r from-amber-700 via-yellow-400 to-amber-700 shadow-[0_0_15px_rgba(245,158,11,0.6)] flex items-center justify-around px-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-200 shadow-[0_0_8px_#fde047]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-200 shadow-[0_0_8px_#fde047]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-200 shadow-[0_0_8px_#fde047]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-200 shadow-[0_0_8px_#fde047]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-200 shadow-[0_0_8px_#fde047]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-200 shadow-[0_0_8px_#fde047]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-200 shadow-[0_0_8px_#fde047]" />
                  </div>
                </div>
              </div>

            {/* ── VTV3 Broadcast Lower-Third Chyron (Dải băng truyền hình VTV3 2 tầng chuẩn) ── */}
            {!isTempActive && (
              <div className="w-full mt-3 z-20 flex flex-col items-start drop-shadow-2xl">
                {/* Tier 1: Category Badge / Chủ Đề (Gọn gàng, góc trên bên trái) */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-t-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-md border-t border-x border-amber-300">
                  <span className="text-amber-900">⭐</span>
                  <span>
                    {getCleanPuzzleCategoryOrClue(currentPuzzle)}
                  </span>
                  {currentPuzzle?.puzzleType === "CROSSWORD" && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-violet-950/90 text-violet-200 border border-violet-400 text-[10px] font-black tracking-wider uppercase animate-pulse shadow-sm">
                      🔀 {edition === "ENGLISH" ? "CROSSWORD" : "Ô CHỮ LIÊN KẾT"}
                    </span>
                  )}
                  {/SAME[\s_-]*LETTER|CÙNG CHỮ CÁI ĐẦU/i.test(currentPuzzle?.category || "") && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-indigo-950/90 text-indigo-200 border border-indigo-400 text-[10px] font-black tracking-wider uppercase animate-pulse shadow-sm">
                      ✨ {activeState.sameLetterBonusAwarded ? `SAME LETTER [${activeState.sameLetterChar || ""}] +$1,000` : "SAME LETTER BONUS +$1,000"}
                    </span>
                  )}
                </div>
                {/* Tier 2: Clue Chyron Body Full-Width (Không bị co hẹp ngang) */}
                <div className="w-full px-4 py-2.5 sm:py-3 rounded-b-2xl rounded-tr-2xl bg-black/90 border border-amber-400/40 backdrop-blur-md flex items-center justify-between gap-4 text-slate-100 font-bold text-xs sm:text-sm md:text-base shadow-2xl">
                  <p className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-relaxed flex-1">
                    {effectiveBoardStage === "READY_CLUE"
                      ? currentPuzzle?.clue || "Lắng nghe gợi ý từ MC và đoán các chữ cái!"
                      : "Bảng ô chữ đang chuẩn bị..."}
                  </p>
                  {currentPuzzle?.puzzleType === "CROSSWORD" && currentPuzzle.crosswordWords ? (
                    <span className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-400/15 text-amber-300 font-mono font-black text-xs sm:text-sm border border-amber-400/30 whitespace-nowrap shadow-inner">
                      {currentPuzzle.crosswordWords.length} {edition === "ENGLISH" ? "WORDS" : "TỪ KHÓA"}
                    </span>
                  ) : (
                    currentPuzzle?.secretPhrase && effectiveBoardStage !== "EMPTY_56" && (
                      <span className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-400/15 text-amber-300 font-mono font-black text-xs sm:text-sm border border-amber-400/30 whitespace-nowrap shadow-inner">
                        {currentPuzzle.secretPhrase.replace(/\s+/g, "").length} {edition === "ENGLISH" ? "LETTERS" : "KÝ TỰ"}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Round Victory & Full Reveal Celebration Banner */}
          {phase === "ROUND_RECAP" && (
            <div className="w-full mt-2.5 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/25 via-yellow-500/25 to-emerald-500/25 border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)] flex flex-wrap items-center justify-between gap-3 animate-slide-up">
              <div className="flex items-center gap-3">
                <span className="text-3xl sm:text-4xl animate-bounce">👑</span>
                <div>
                  <div className="flex items-center gap-2">
                    
                    {lastSolveFeedback?.teamName && (
                      <span className="font-black text-xs sm:text-sm text-amber-300">
                        🎉 {formatTeamLabel(lastSolveFeedback.teamName)} (+{(lastSolveFeedback.pointsAwarded || 0).toLocaleString()}đ)
                      </span>
                    )}
                  </div>
                  <p className="text-base sm:text-xl font-black text-white mt-1 tracking-wide">
                    {currentPuzzle?.puzzleType === "CROSSWORD" ? "CÁC TỪ KHÓA LIÊN KẾT: " : "Ô CHỮ ĐẦY ĐỦ: "}
                    &ldquo;
                    {currentPuzzle?.puzzleType === "CROSSWORD" && currentPuzzle.crosswordWords
                      ? currentPuzzle.crosswordWords.map((w) => w.word).join(" · ")
                      : currentPuzzle?.secretPhrase}
                    &rdquo;
                  </p>
                </div>
              </div>
              {isHost && (roundStage === "TOSS_UP_1" || roundStage === "TOSS_UP_2") && phase !== "ROUND_RECAP" && (
            <button
              type="button"
              onClick={() => {
                onTossUpSkip?.();
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600/80 hover:bg-rose-500 text-white border border-rose-400 transition cursor-pointer active:scale-95 shadow flex items-center gap-1 shrink-0"
              title="Bỏ qua ô chữ Đoán Nhanh nếu không có ai giải được"
            >
              <span>⏭️</span> Bỏ qua ô chữ
            </button>
          )}

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
        {/* Left Col: 3D Wheel Rig (Hidden during Toss-Up rounds 1 & 2 - Optimized 1/2 Wheel Viewport) */}
        {!isTossUpRound && (
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative p-2 bg-gradient-to-b from-black/50 via-slate-950/60 to-black/80 rounded-2xl border border-amber-500/20 shadow-xl overflow-hidden">
            <InteractiveWheelRig
              variant="HOST_HALF"
              wheelRef={wheelRef}
              needleRef={needleRef}
              clientWheelAngle={clientWheelAngle}
              effectiveIsSpinning={effectiveIsSpinning}
              sectors={sectors}
              selectedSector={selectedSector}
              selectedSectorIndex={activeState.selectedSectorIndex}
            />
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
                          ▶️ BẮT ĐẦU MỞ CHỮ NGẪU NHIÊN ({edition === "ENGLISH" ? "1.0s" : "0.75s"}/chữ)
                        </button>
                      ) : (
                        <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 animate-pulse">
                          <span>⏳</span>
                          <span>Chờ Quản trò/MC bấm mở các chữ cái... Hãy sẵn sàng bấm chuông!</span>
                        </div>
                      )
                    )}
                  </div>

                  {(phase === "TOSS_UP_RUNNING" || phase === "TOSS_UP_REVEALING" || phase === "TOSS_UP_READY") && (() => {
                    const hasFirstLetterRevealed = (animRevealedIndices.size >= 1) || ((currentPuzzle?.revealedIndices?.length || 0) >= 1);
                    const isBuzzedAlready = isLocallyBuzzed || Boolean(tossUpBuzzedTeamId);

                    return (
                      <div className="w-full flex flex-col items-center justify-center py-2 sm:py-3 space-y-2.5 select-none">
                        {/* Status Cue */}
                        <div className="text-center text-xs font-bold">
                          {!hasFirstLetterRevealed ? (
                            <span className="text-amber-300/80 animate-pulse flex items-center justify-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-amber-500/30">
                              <span>⏳</span>
                              <span>ĐANG CHỜ NGƯỜI MẪU TIẾT LỘ CHỮ CÁI ĐẦU TIÊN...</span>
                            </span>
                          ) : isBuzzedAlready ? (
                            <span className="text-emerald-300 font-black animate-pulse flex items-center justify-center gap-1.5 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-400/50">
                              <span>🔔</span>
                              <span>ĐÃ GHI NHẬN CHUÔNG! ĐANG KHÓA QUYỀN TRẢ LỜI...</span>
                            </span>
                          ) : (
                            <span className="text-amber-200 font-extrabold flex items-center justify-center gap-1.5 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-400/50">
                              <span>⚡</span>
                              <span>CHUÔNG ĐÃ MỞ! ĐẬP TAY HOẶC BẤM SPACE/ENTER NGAY!</span>
                            </span>
                          )}
                        </div>

                        {/* 3D Big Circular Arcade Dome Buzzer */}
                        <div className="relative flex items-center justify-center p-2">
                          {/* Pulsing Ambient Halo when unlocked */}
                          {hasFirstLetterRevealed && !isBuzzedAlready && (
                            <div className="absolute inset-0 rounded-full bg-red-600/35 blur-xl animate-ping pointer-events-none" />
                          )}

                          {/* Outer Gold/Metallic 3D Bezel Rim */}
                          <div
                            className={`w-44 h-44 sm:w-52 sm:h-52 rounded-full p-2.5 sm:p-3 flex items-center justify-center transition-all duration-300 ${
                              !hasFirstLetterRevealed
                                ? "bg-gradient-to-b from-stone-700 via-stone-800 to-stone-900 border-4 border-stone-600 shadow-lg opacity-60 cursor-not-allowed"
                                : isBuzzedAlready
                                ? "bg-gradient-to-b from-emerald-600 via-teal-700 to-emerald-900 border-4 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.7)]"
                                : "bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-700 border-4 border-yellow-300 shadow-[0_15px_35px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.6)] cursor-pointer"
                            }`}
                          >
                            {/* Inner 3D Red Push Dome Button */}
                            <button
                              type="button"
                              disabled={!hasFirstLetterRevealed || isBuzzedAlready}
                              onClick={(e) => {
                                e.preventDefault();
                                if (!hasFirstLetterRevealed || isBuzzedAlready) return;
                                handleTriggerTossUpBuzz();
                              }}
                              className={`w-full h-full rounded-full flex flex-col items-center justify-center transition-all select-none touch-manipulation focus:outline-none ${
                                !hasFirstLetterRevealed
                                  ? "bg-gradient-to-b from-neutral-800 to-neutral-900 border-2 border-neutral-700 text-neutral-400 cursor-not-allowed"
                                  : isBuzzedAlready
                                  ? "bg-gradient-to-b from-emerald-500 to-teal-700 border-2 border-emerald-300 text-white shadow-inner cursor-not-allowed scale-95"
                                  : "bg-gradient-to-b from-rose-500 via-red-600 to-red-800 active:from-red-700 active:to-red-900 active:scale-90 border-2 border-red-300 text-white shadow-[inset_0_6px_12px_rgba(255,255,255,0.5),0_10px_25px_rgba(220,38,38,0.8)] hover:brightness-110 active:shadow-inner cursor-pointer"
                              }`}
                            >
                              <span className="text-3xl sm:text-4xl filter drop-shadow">
                                {!hasFirstLetterRevealed ? "🔒" : isBuzzedAlready ? "✅" : "🔔"}
                              </span>
                              <span className="mt-1 font-black text-xs sm:text-sm tracking-wider uppercase drop-shadow text-center px-2">
                                {!hasFirstLetterRevealed
                                  ? "CHỜ MỞ CHỮ"
                                  : isBuzzedAlready
                                  ? "ĐÃ BẤM!"
                                  : "BẤM CHUÔNG!"}
                              </span>
                              {hasFirstLetterRevealed && !isBuzzedAlready && (
                                <span className="text-[10px] text-amber-200/90 font-mono font-bold mt-0.5 tracking-tight">
                                  [SPACE / ENTER]
                                </span>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Host quick controls for testing */}
                        {isHost && teams.length > 1 && (
                          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                            <span className="text-[10px] font-bold text-slate-400">MC chọn đội bấm chuông:</span>
                            {teams.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                disabled={!hasFirstLetterRevealed}
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (!hasFirstLetterRevealed) return;
                                  handleTriggerTossUpBuzz(t.id);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition select-none touch-manipulation ${
                                  !hasFirstLetterRevealed
                                    ? "bg-white/5 text-slate-600 border-white/5 cursor-not-allowed opacity-40"
                                    : "bg-white/10 hover:bg-amber-400 hover:text-slate-950 text-white border-white/20 cursor-pointer"
                                }`}
                              >
                                🔔 {t.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

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
                          onSubmit={handleSafeSolvePuzzle}
                          submitLabel="CHỐT ĐÁP ÁN ĐOÁN NHANH ➔"
                          edition={edition}
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
                        ? "R, S, T, L, N, E given · Pick 3 Consonants + 1 Vowel · 40s to solve" // BUG-22 FIX: English instructions in English
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
                            hasPlayedLandingAudioRef.current = false;
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
                        edition={edition}
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
                            <div className="space-y-2">
                              {edition === "ENGLISH" && mustSpinOnly && (
                                <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-bold text-center animate-pulse">
                                  <span>🎟️</span>
                                  <span>LƯỢT THÊM FREE SPIN: BẮT BUỘC PHẢI QUAY NÓN (CHƯA ĐƯỢC ĐOÁN Ô CHỮ NGAY)</span>
                                </div>
                              )}
                              <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isMyTurnToSpin || effectiveIsSpinning || isCurrentTeamEliminated || isNoMoreConsonants) return;
                                    if (canPlayBoardAudio) soundManager.playMagicWheelSpin();
                                    hasPlayedLandingAudioRef.current = false;
                                    setLocalIsSpinning(true);
                                    onSpin?.(oscillatingPower);
                                  }}
                                  disabled={!isMyTurnToSpin || effectiveIsSpinning || isCurrentTeamEliminated || isNoMoreConsonants}
                                  className={`flex-1 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm text-white transition shadow-[0_0_20px_rgba(236,72,153,0.4)] ${
                                    isCurrentTeamEliminated
                                      ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                                      : isNoMoreConsonants
                                      ? "bg-slate-850 text-amber-400/80 border border-amber-500/40 cursor-not-allowed opacity-75"
                                      : edition === "ENGLISH" && mustSpinOnly
                                      ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:brightness-110 active:scale-98 cursor-pointer ring-2 ring-emerald-400 animate-pulse"
                                      : "bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:brightness-110 active:scale-98 cursor-pointer"
                                  }`}
                                  title={isNoMoreConsonants ? "Không còn phụ âm nào trên bảng (No more consonants). Bạn chỉ có thể Mua nguyên âm hoặc Đoán ô chữ!" : undefined}
                                >
                                  {isCurrentTeamEliminated
                                    ? "⛔ ĐÃ HẾT LƯỢT VÒNG NÀY (ĐOÁN SAI Ô CHỮ)"
                                    : isNoMoreConsonants
                                    ? "🚫 HẾT PHỤ ÂM (NO MORE CONSONANTS)"
                                    : edition === "ENGLISH" && mustSpinOnly
                                    ? `🎟️ QUAY LƯỢT FREE SPIN (${oscillatingPower}%) ➔`
                                    : `✦ CHỐT LỰC & QUAY NÓN (${oscillatingPower}%) ✦`}
                                </button>
                                {edition === "ENGLISH" && subMode === "WORD_PUZZLE" && (
                                  <button
                                    type="button"
                                    onClick={() => setBuyVowelModalOpen(true)}
                                    disabled={
                                      isSpinning ||
                                      isCurrentTeamEliminated ||
                                      (edition === "ENGLISH" && mustSpinOnly) ||
                                      ((roundScores?.[currentTurnTeamId] || 0) < 250)
                                    }
                                    className={`px-3 py-2.5 rounded-xl font-black text-xs whitespace-nowrap transition shadow ${
                                      isCurrentTeamEliminated || (edition === "ENGLISH" && mustSpinOnly) || (roundScores?.[currentTurnTeamId] || 0) < 250
                                        ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                                        : "text-amber-100 bg-gradient-to-r from-amber-600 to-orange-700 hover:brightness-110 active:scale-98 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse"
                                    }`}
                                    title={
                                      edition === "ENGLISH" && mustSpinOnly
                                        ? "Bắt buộc phải quay nón trước!"
                                        : "Mua nguyên âm (A, E, I, O, U) với 250đ từ điểm vòng của đội"
                                    }
                                  >
                                    🛒 MUA NGUYÊN ÂM (250đ)
                                  </button>
                                )}
                                {subMode === "WORD_PUZZLE" && (
                                  <button
                                    type="button"
                                    onClick={() => setSolveModalOpen(true)}
                                    disabled={isSpinning || isSolveForbiddenInRound3 || isCurrentTeamEliminated || (edition === "ENGLISH" && mustSpinOnly)}
                                    className={`px-3.5 py-2.5 rounded-xl font-black text-xs whitespace-nowrap transition shadow ${
                                      isCurrentTeamEliminated || (edition === "ENGLISH" && mustSpinOnly)
                                        ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                                        : isSolveForbiddenInRound3
                                        ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                                        : "text-black bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 active:scale-98 cursor-pointer"
                                    }`}
                                    title={
                                      edition === "ENGLISH" && mustSpinOnly
                                        ? "Theo luật Free Spin: Bạn bắt buộc phải quay nón ở lượt được thêm, chưa được đoán ô chữ ngay!"
                                        : isSolveForbiddenInRound3
                                        ? edition === "ENGLISH"
                                          ? "Theo luật Vòng 3: Cần mở hết phụ âm trước khi đoán ô chữ"
                                          : "Theo luật Vòng 3: Cần mở hết từng chữ cái trước khi đoán ô chữ"
                                        : undefined
                                    }
                                  >
                                    {isCurrentTeamEliminated
                                      ? "⛔ ĐÃ HẾT QUYỀN"
                                      : edition === "ENGLISH" && mustSpinOnly
                                      ? "🔒 BẮT BUỘC QUAY"
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

                  {/* 2. Alphabet Keyboard & Solve Trigger (Thay thế tạm thời bằng Phần Thưởng khi rơi vào ô chức năng đặc biệt) */}
                  {subMode === "WORD_PUZZLE" && phase !== "REWARD_CHOICE" && phase !== "MYSTERY_CHOICE" && (
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
                            ? (selectedSector?.type === "FREE_PLAY" || activeState.pendingSpecialAction === "FREE_PLAY"
                                ? "🎉 Ô FREE PLAY: Đoán tự do bất kỳ chữ cái nào (kể cả Nguyên âm) MIỄN PHÍ 0đ!"
                                : "Bàn phím phụ âm tiếng Anh (Nguyên âm chỉ dùng qua nút Mua 250đ):")
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
                                  (selectedSector?.type === "FREE_PLAY" || activeState.pendingSpecialAction === "FREE_PLAY") ||
                                  (edition === "ENGLISH" && mustSpinOnly) ||
                                  ((roundScores?.[currentTurnTeamId] || 0) < 250)
                                }
                                className={`px-2.5 py-1 rounded-lg text-xs font-black shadow transition ${
                                  (selectedSector?.type === "FREE_PLAY" || activeState.pendingSpecialAction === "FREE_PLAY")
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 cursor-default"
                                    : isCurrentTeamEliminated || (edition === "ENGLISH" && mustSpinOnly) || (roundScores?.[currentTurnTeamId] || 0) < 250
                                    ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50"
                                    : "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-110 cursor-pointer shadow"
                                }`}
                              >
                                {(selectedSector?.type === "FREE_PLAY" || activeState.pendingSpecialAction === "FREE_PLAY")
                                  ? "✨ Free Play (Nguyên âm 0đ)"
                                  : "🛒 Mua Nguyên Âm (250đ)"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSolveModalOpen(true)}
                              disabled={isSolveForbiddenInRound3 || isCurrentTeamEliminated || (edition === "ENGLISH" && mustSpinOnly)}
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
                        {(() => {
                          const isFreePlayActive =
                            selectedSector?.type === "FREE_PLAY" || activeState.pendingSpecialAction === "FREE_PLAY";
                          const lettersList =
                            edition === "ENGLISH"
                              ? isFreePlayActive
                                ? ENGLISH_ALPHABET // Đầy đủ 26 chữ cái (cả nguyên âm) khi trúng Free Play!
                                : ENGLISH_ALPHABET.filter((l) => !isEnglishVowel(l)) // Khu phụ âm riêng biệt
                              : VIETNAMESE_ALPHABET;

                          return lettersList.map((letter) => {
                            const isGuessed = guessedLetters.includes(letter);
                            const isVowel = edition === "ENGLISH" && isEnglishVowel(letter);
                            const isCurrentTarget =
                              canInteract &&
                              (phase === "ACTION_INPUT" || expressModeActive || speedUpBellActive) &&
                              !mustSolveWithTones &&
                              !isSpinning &&
                              (isFreePlayActive || !(edition === "ENGLISH" && isVowel));

                            const handleLetterClick = () => {
                              if (isGuessed) {
                                if (blackoutGuessedLetters === false) {
                                  setGuessedLetterWarning(`⚠️ Chữ "${letter}" đã có người đoán trước đó rồi!`);
                                  setTimeout(() => setGuessedLetterWarning(null), 3000);
                                }
                                return;
                              }
                              if (edition === "ENGLISH" && isVowel && !isFreePlayActive) {
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
                                {edition === "ENGLISH" && isVowel && !isGuessed && !isFreePlayActive && (
                                  <span className="block text-[8px] text-amber-400/80 font-normal leading-none mt-0.5">
                                    250đ
                                  </span>
                                )}
                                {edition === "ENGLISH" && isVowel && !isGuessed && isFreePlayActive && (
                                  <span className="block text-[8px] text-emerald-400 font-normal leading-none mt-0.5">
                                    FREE
                                  </span>
                                )}
                              </button>
                            );
                          });
                        })()}
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
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-1.5 max-h-[min(44vh,280px)] overflow-y-auto pr-0.5">
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
                                className={`aspect-[4/3] sm:aspect-square rounded-lg flex flex-col items-center justify-center p-0.5 font-black text-center transition-all duration-300 select-none relative min-h-0 ${
                                  isRevealed
                                    ? "bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-400 text-amber-950 border-2 border-yellow-100 scale-105 shadow-[0_0_20px_#f59e0b] z-10 animate-scale-up"
                                    : isOtherPicked
                                    ? "bg-black/30 border border-white/5 opacity-40 cursor-not-allowed"
                                    : "bg-gradient-to-b from-amber-900/60 to-purple-950/80 border-2 border-amber-400/40 hover:border-amber-300 hover:scale-105 active:scale-95 text-amber-200 shadow-md cursor-pointer"
                                }`}
                              >
                                {isRevealed ? (
                                  <>
                                    <span className="text-base sm:text-lg leading-none">{card.icon}</span>
                                    <span className="text-[9px] sm:text-[10px] font-black tracking-tight leading-tight mt-0.5 truncate max-w-full px-0.5">
                                      {card.label}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-xs sm:text-sm opacity-80 leading-none">✉️</span>
                                    <span className="text-[9px] sm:text-[10px] font-black text-amber-300 mt-0.5 leading-none">
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

                  {/* 5.5. Bản Anh: Quyết định sử dụng Thẻ Free Spin (FREE_SPIN_CHOICE) */}
                  {phase === "FREE_SPIN_CHOICE" && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-slate-900 border-2 border-emerald-400/50 shadow-xl space-y-2 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl animate-bounce">🎟️</span>
                        <div>
                          <h4 className="font-black text-xs sm:text-sm text-emerald-200 uppercase tracking-wide">
                            {edition === "ENGLISH"
                              ? "USE FREE SPIN TOKEN?"
                              : "SỬ DỤNG THẺ THÊM LƯỢT?"}
                          </h4>
                          <p className="text-[11px] text-emerald-300/90 font-medium leading-relaxed">
                            {edition === "ENGLISH"
                              ? `You have ${freeSpinCount?.[currentTurnTeamId] || 1} Free Spin token(s). Use 1 token to keep control and spin again? (Notice: You must SPIN the wheel; you cannot solve the puzzle immediately).`
                              : `Đội bạn có ${freeSpinCount?.[currentTurnTeamId] || 1} Thẻ Thêm Lượt. Bạn có muốn sử dụng 1 thẻ để quay tiếp không?`}
                          </p>
                        </div>
                      </div>
                      {canInteract ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => onUseFreeSpin?.(true)}
                            className="py-2.5 px-3 rounded-lg font-black text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow cursor-pointer transition flex items-center justify-center gap-1.5 active:scale-95"
                          >
                            <span>🎟️</span>
                            <span>{edition === "ENGLISH" ? "USE FREE SPIN (SPIN AGAIN)" : "DÙNG THẺ (QUAY TIẾP)"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onUseFreeSpin?.(false)}
                            className="py-2.5 px-3 rounded-lg font-black text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 shadow cursor-pointer transition flex items-center justify-center gap-1.5 active:scale-95"
                          >
                            <span>⏭️</span>
                            <span>{edition === "ENGLISH" ? "PASS TURN (KEEP TOKEN)" : "GIỮ THẺ (CHUYỂN LƯỢT)"}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-xs text-slate-400 italic">
                          Đang đợi {formatTeamLabel(currentTurnTeamName)} quyết định...
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
                  const isTurn = isTossUpRound
          ? (phase === "TOSS_UP_BUZZED" && Boolean(tossUpBuzzedTeamId) && t.id === tossUpBuzzedTeamId)
          : (t.id === currentTurnTeamId);
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
                          {(activeState.wildCardsCount?.[t.id] || 0) > 0 ? (
                            <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1 rounded font-bold" title="Đang giữ 1 Thẻ Wild Card">
                              🃏 Wild
                            </span>
                          ) : null}
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end">
                          <span className="text-xs font-mono font-black text-amber-300">
                            {edition === "ENGLISH"
                              ? `$${((t.score || 0) + rScore).toLocaleString("en-US")}`
                              : `${((t.score || 0) + rScore).toLocaleString()}đ`}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold mt-0.5">
                            {edition === "ENGLISH" ? `Round: $${rScore.toLocaleString("en-US")}` : `Vòng này: ${rScore.toLocaleString()}đ`}
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
                        {edition === "ENGLISH" ? (
                          <span className="text-[9px] text-cyan-400/80 font-mono">Luật US (Không loại)</span>
                        ) : isEliminatedBySolve ? (
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
                <span className="text-2xl">{currentPuzzle?.puzzleType === "CROSSWORD" ? "🔀" : "🎯"}</span>
                <div>
                  <h4 className="font-black text-base text-amber-300">
                    {currentPuzzle?.puzzleType === "CROSSWORD"
                      ? "GIẢI Ô CHỮ LIÊN KẾT / TUNG HOÀNH"
                      : "GIẢI Ô CHỮ BÍ MẬT — CHÍNH XÁC TỪNG DẤU THANH ĐIỆU"}
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    {currentPuzzle?.puzzleType === "CROSSWORD"
                      ? "Nhập tất cả các từ trong ô chữ cách nhau bằng dấu phẩy (thứ tự tùy ý). TUYỆT ĐỐI không dùng từ nối (và, and, với...)!"
                      : "Các phụ âm đã mở trên bảng được giữ cố định. Hãy chọn dấu thanh cho các nguyên âm đã mở và điền các chữ cái còn thiếu!"}
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

            {currentPuzzle?.puzzleType === "CROSSWORD" ? (
              <CrosswordSolveModalInput
                puzzle={currentPuzzle}
                revealedIndices={animRevealedIndices}
                onCancel={() => setSolveModalOpen(false)}
                onSubmit={(finalAnswer) => {
                  onSolvePuzzle?.(finalAnswer);
                  setSolveModalOpen(false);
                }}
                edition={edition}
              />
            ) : (
              <SmartPuzzlePhraseInput
                secretPhrase={currentPuzzle?.secretPhrase || ""}
                revealedIndices={animRevealedIndices}
                onCancel={() => setSolveModalOpen(false)}
                onSubmit={(finalAnswer) => {
                  onSolvePuzzle?.(finalAnswer);
                  setSolveModalOpen(false);
                }}
                edition={edition}
              />
            )}
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

      {/* ── MODAL: CÀI ĐẶT CHỮ HIỂN THỊ TẠM THỜI (ADMIN / HOST) ─────────────── */}
      {tempTextModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg p-5 rounded-2xl bg-[#121829] border-2 border-purple-400/60 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✍️</span>
                <div>
                  <h4 className="font-black text-base text-purple-300">
                    CÀI ĐẶT CHỮ HIỂN THỊ TẠM THỜI
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Hiển thị thông điệp tùy chọn trực tiếp lên 56 ô chữ (14 cột × 4 hàng)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTempTextModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nội dung hiển thị (tối đa 56 ký tự):
                </label>
                <textarea
                  value={tempTextInput}
                  onChange={(e) => setTempTextInput(e.target.value.toUpperCase().slice(0, 56))}
                  rows={2}
                  placeholder="Nhập nội dung cần hiển thị trên bảng ô chữ..."
                  className="w-full p-3 rounded-xl bg-slate-900 border border-purple-500/40 text-purple-200 font-black tracking-wider text-sm focus:outline-none focus:border-purple-400 resize-none uppercase"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                  <span>
                    Độ dài: <strong className="text-purple-300">{tempTextInput.length}/56</strong> ký tự
                  </span>
                  <span>
                    Tự động căn đều trên khung 14 cột × 4 hàng
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                  Mẫu thông điệp có sẵn:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    "CHÚC MỪNG CHIẾN THẮNG",
                    "VÒNG TIẾP THEO SẮP BẮT ĐẦU",
                    "GIẢI LAO NGHỈ TAY",
                    "XIN CẢM ƠN NHÀ TÀI TRỢ",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTempTextInput(preset)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-purple-900/40 border border-white/10 hover:border-purple-400/50 text-slate-200 hover:text-purple-200 text-xs font-semibold text-left transition truncate cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <div>
                {temporaryDisplayActive && onClearTemporaryText && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearTemporaryText();
                      setTempTextModalOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-400/50 text-rose-200 text-xs font-bold transition cursor-pointer"
                  >
                    🗑️ Xóa chữ trên bảng
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTempTextModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={!tempTextInput.trim()}
                  onClick={() => {
                    if (!tempTextInput.trim()) return;
                    onSetTemporaryText?.(tempTextInput.trim());
                    setTempTextModalOpen(false);
                  }}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black shadow-lg transition cursor-pointer ${
                    tempTextInput.trim()
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:brightness-110 active:scale-95"
                      : "bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed"
                  }`}
                >
                  ✨ Hiển thị lên bảng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );


  // ── THREE-WAY VIEW DISPATCH: CONTESTANT (isPlayer), TV DISPLAY (isDisplay), HOST (isHost) ──
  if (isPlayer) {
    return (
      <>
        {renderPlayerView()}
        {renderModals()}
      </>
    );
  }

  if (isDisplay) {
    return (
      <>
        {renderDisplayView()}
        {renderModals()}
      </>
    );
  }

  return (
    <>
      {renderHostView()}
      {renderModals()}
    </>
  );
}
