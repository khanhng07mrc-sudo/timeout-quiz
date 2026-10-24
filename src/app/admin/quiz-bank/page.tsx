"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import SystemIcon from "@/components/ui/SystemIcon";
import { offlineStorage, OfflineQuizBank, OfflineQuestion } from "@/lib/offline-storage";
import {
  ParsedQuestionItem,
  validateQuestionItem,
  parseRawQuizText,
  extractTextFromDocx,
  parseExcelQuestions,
  parseCsvQuestions,
} from "@/lib/quiz-document-parser";
import QuizorraQuestionStudioModal from "@/components/admin/QuizorraQuestionStudioModal";
import { downloadMagicWheelExcelTemplate, downloadMagicWheelJsonTemplate } from "@/lib/quiz-template-generator";
import { MAGIC_WHEEL_PRESET_BANKS } from "@/lib/offline-storage";
import {
  isVietnameseAlphabetLetter,
  detectQuizBankLanguage,
  validateSameLetterPhrase,
  validateCrosswordLayout,
  generateAutoCrosswordLayout,
  CrosswordWordItem,
} from "@/lib/game-engine/magic-wheel";

function buildCrossword4x14Preview(words: CrosswordWordItem[]): {
  rows: string[][];
  intersections: Set<number>;
  isValid: boolean;
  errors: string[];
} {
  const rows: string[][] = Array.from({ length: 4 }, () => Array(14).fill(""));
  const intersections = new Set<number>();
  const validation = validateCrosswordLayout(words);

  if (validation.cellMap) {
    validation.cellMap.forEach((cell) => {
      if (cell.row >= 0 && cell.row < 4 && cell.col >= 0 && cell.col < 14) {
        rows[cell.row][cell.col] = cell.char;
      }
    });
    validation.intersections.forEach((inter) => {
      intersections.add(inter.row * 14 + inter.col);
    });
  }

  return {
    rows,
    intersections,
    isValid: validation.isValid,
    errors: validation.errors,
  };
}

function buildPuzzle4x14Preview(phrase: string): { rows: string[][]; isOverflow: boolean; oversizedWord?: string } {
  const clean = (phrase || "").trim().toUpperCase();
  const words = clean.split(/\s+/).filter(Boolean);
  const rows: string[][] = Array.from({ length: 4 }, () => Array(14).fill(""));
  if (words.length === 0) return { rows, isOverflow: false };

  let currentLine = 0;
  const lineWords: string[][] = [[], [], [], []];

  let oversizedWord: string | undefined = undefined;
  for (const w of words) {
    if (w.length > 14) {
      oversizedWord = w;
      break;
    }
    const currentLineLen = lineWords[currentLine].join(" ").length;
    const additionalLen = (currentLineLen > 0 ? 1 : 0) + w.length;
    if (currentLineLen + additionalLen <= 14) {
      lineWords[currentLine].push(w);
    } else {
      currentLine++;
      if (currentLine >= 4) {
        return { rows, isOverflow: true, oversizedWord };
      }
      lineWords[currentLine].push(w);
    }
  }

  // Center align each line on the 14-tile row
  lineWords.forEach((lWords, rIdx) => {
    const lineText = lWords.join(" ");
    if (!lineText) return;
    const startCol = Math.floor((14 - lineText.length) / 2);
    for (let c = 0; c < lineText.length; c++) {
      if (startCol + c < 14) {
        rows[rIdx][startCol + c] = lineText[c];
      }
    }
  });

  return { rows, isOverflow: false, oversizedWord };
}

interface QuestionItem {
  id?: string;
  type: string;
  content: string;
  options?: { id: string; text: string; isCorrect: boolean }[];
  answer?: string;
  points: number;
  timeLimit: number;
  hint?: string;
  mediaUrl?: string;
  mediaType?: "IMAGE" | "AUDIO" | "VIDEO";
  mediaPlaybackMode?: "AFTER_PLAY" | "PARALLEL";
  pairs?: { left: string; right: string }[];
  steps?: string[];
  allowManualGrading?: boolean;
  gradingCriteria?: string;
  puzzleType?: "STANDARD" | "CROSSWORD";
  crosswordWords?: CrosswordWordItem[];
}

interface QuizBank {
  id: string;
  title: string;
  description?: string;
  language?: "VIETNAMESE" | "ENGLISH";
  createdAt: string;
  isBuiltIn?: boolean;
  isPublic?: boolean;
  isWordPuzzle?: boolean;
  isPureWordPuzzle?: boolean;
  isPureStandard?: boolean;
  isMixed?: boolean;
  _count?: { questions: number };
}

export default function QuizBankPage() {
  const [banks, setBanks] = useState<QuizBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState<QuizBank | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [deletingBankId, setDeletingBankId] = useState<string | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);

  // New Bank Modal State
  const [showNewBankModal, setShowNewBankModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newBankCategory, setNewBankCategory] = useState<"STANDARD" | "WORD_PUZZLE">("STANDARD");
  const [newBankLanguage, setNewBankLanguage] = useState<"VIETNAMESE" | "ENGLISH">("VIETNAMESE");
  const [newBankInitMode, setNewBankInitMode] = useState<"MANUAL" | "AI_STUDIO" | "IMPORT_FILE" | "EMPTY">("MANUAL");
  const [isCreatingBank, setIsCreatingBank] = useState(false);

  // AI Generator Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiProvider, setAiProvider] = useState<"gemini" | "openai">("gemini");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiSaveKey, setAiSaveKey] = useState(true);
  const [aiTopic, setAiTopic] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState(10);
  const [aiGradeLevel, setAiGradeLevel] = useState("Trung bình / THPT");
  const [aiQuestionTypes, setAiQuestionTypes] = useState<string[]>(["MC_SINGLE"]);
  const [aiDefaultPoints, setAiDefaultPoints] = useState(10);
  const [aiDefaultTime, setAiDefaultTime] = useState(30);
  const [aiCustomPrompt, setAiCustomPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // File/Raw Text Import Modal State
  const [showFileModal, setShowFileModal] = useState(false);
  const [importMode, setImportMode] = useState<"upload" | "rawtext">("upload");
  const [rawTextContent, setRawTextContent] = useState("");
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Preview & Edit Table Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState<ParsedQuestionItem[]>([]);
  const [previewTargetMode, setPreviewTargetMode] = useState<"current" | "new">("current");
  const [previewNewBankTitle, setPreviewNewBankTitle] = useState("");
  const [previewNewBankDesc, setPreviewNewBankDesc] = useState("");
  const [isSavingPreview, setIsSavingPreview] = useState(false);
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [rebalancingIndex, setRebalancingIndex] = useState<number | null>(null);
  const [isRefiningAll, setIsRefiningAll] = useState(false);

  // Edit Bank Modal State
  const [showEditBankModal, setShowEditBankModal] = useState(false);
  const [editBankTitle, setEditBankTitle] = useState("");
  const [editBankDesc, setEditBankDesc] = useState("");
  const [editBankLanguage, setEditBankLanguage] = useState<"VIETNAMESE" | "ENGLISH">("VIETNAMESE");
  const [savingBank, setSavingBank] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // New Question Form State
  const [showNewQModal, setShowNewQModal] = useState(false);
  const [qType, setQType] = useState("MC_SINGLE");
  const [qContent, setQContent] = useState("");
  const [qPoints, setQPoints] = useState(10);
  const [qTimeLimit, setQTimeLimit] = useState(30);
  const [qHint, setQHint] = useState("");
  const [qAnswer, setQAnswer] = useState("");
  const [qRound, setQRound] = useState(1);
  const [qClueDisplayMode, setQClueDisplayMode] = useState<"CATEGORY" | "CLUE">("CLUE");
  const [qPuzzleType, setQPuzzleType] = useState<"STANDARD" | "CROSSWORD">("STANDARD");
  const [qCrosswordWords, setQCrosswordWords] = useState<CrosswordWordItem[]>([
    { id: "cw_1", word: "HOA", row: 1, col: 2, direction: "ACROSS" },
    { id: "cw_2", word: "CON", row: 0, col: 3, direction: "DOWN" },
  ]);
  const [qAllowManualGrading, setQAllowManualGrading] = useState(false);
  const [qGradingCriteria, setQGradingCriteria] = useState("");
  const [qOptions, setQOptions] = useState([
    { id: "A", text: "", isCorrect: true },
    { id: "B", text: "", isCorrect: false },
    { id: "C", text: "", isCorrect: false },
    { id: "D", text: "", isCorrect: false },
  ]);
  const [qPairs, setQPairs] = useState([
    { id: "p1", left: "", right: "" },
    { id: "p2", left: "", right: "" },
    { id: "p3", left: "", right: "" },
  ]);
  const [qSteps, setQSteps] = useState([
    { id: "step_1", text: "" },
    { id: "step_2", text: "" },
    { id: "step_3", text: "" },
  ]);
  const [qClozeBlanks, setQClozeBlanks] = useState([
    {
      blankId: 1,
      options: [
        { id: "b1_1", text: "", isCorrect: true },
        { id: "b1_2", text: "", isCorrect: false },
        { id: "b1_3", text: "", isCorrect: false },
      ],
    },
  ]);

  const [qMediaType, setQMediaType] = useState<"NONE" | "IMAGE" | "VIDEO" | "AUDIO">("NONE");
  const [qMediaUrl, setQMediaUrl] = useState("");
  const [qMediaPlaybackMode, setQMediaPlaybackMode] = useState<"AFTER_PLAY" | "PARALLEL">("AFTER_PLAY");
  const [qUploadingMedia, setQUploadingMedia] = useState(false);

  // Edit Question Modal State
  const [showEditQModal, setShowEditQModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQType, setEditQType] = useState("MC_SINGLE");
  const [editQContent, setEditQContent] = useState("");
  const [editQPoints, setEditQPoints] = useState(10);
  const [editQTimeLimit, setEditQTimeLimit] = useState(30);
  const [editQHint, setEditQHint] = useState("");
  const [editQAnswer, setEditQAnswer] = useState("");
  const [editQRound, setEditQRound] = useState(1);
  const [editQClueDisplayMode, setEditQClueDisplayMode] = useState<"CATEGORY" | "CLUE">("CLUE");
  const [editQPuzzleType, setEditQPuzzleType] = useState<"STANDARD" | "CROSSWORD">("STANDARD");
  const [editQCrosswordWords, setEditQCrosswordWords] = useState<CrosswordWordItem[]>([]);
  const [editQAllowManualGrading, setEditQAllowManualGrading] = useState(false);
  const [editQGradingCriteria, setEditQGradingCriteria] = useState("");
  const [editQOptions, setEditQOptions] = useState([
    { id: "A", text: "", isCorrect: true },
    { id: "B", text: "", isCorrect: false },
    { id: "C", text: "", isCorrect: false },
    { id: "D", text: "", isCorrect: false },
  ]);
  const [editQPairs, setEditQPairs] = useState([
    { id: "p1", left: "", right: "" },
    { id: "p2", left: "", right: "" },
    { id: "p3", left: "", right: "" },
  ]);
  const [editQSteps, setEditQSteps] = useState([
    { id: "step_1", text: "" },
    { id: "step_2", text: "" },
    { id: "step_3", text: "" },
  ]);
  const [editQClozeBlanks, setEditQClozeBlanks] = useState([
    {
      blankId: 1,
      options: [
        { id: "b1_1", text: "", isCorrect: true },
        { id: "b1_2", text: "", isCorrect: false },
        { id: "b1_3", text: "", isCorrect: false },
      ],
    },
  ]);
  const [editQMediaType, setEditQMediaType] = useState<"NONE" | "IMAGE" | "VIDEO" | "AUDIO">("NONE");
  const [editQMediaUrl, setEditQMediaUrl] = useState("");
  const [editQMediaPlaybackMode, setEditQMediaPlaybackMode] = useState<"AFTER_PLAY" | "PARALLEL">("AFTER_PLAY");
  const [editQUploadingMedia, setEditQUploadingMedia] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const handleFileUpload = async (file: File, isEdit: boolean) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    if (isEdit) setEditQUploadingMedia(true);
    else setQUploadingMedia(true);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        if (isEdit) {
          setEditQMediaUrl(data.url);
          setEditQMediaType(data.mediaType.toUpperCase());
        } else {
          setQMediaUrl(data.url);
          setQMediaType(data.mediaType.toUpperCase());
        }
      } else {
        alert(data.error || "Không thể tải tệp lên máy chủ");
      }
    } catch (err: any) {
      alert("Lỗi tải tệp: " + (err.message || String(err)));
    } finally {
      if (isEdit) setEditQUploadingMedia(false);
      else setQUploadingMedia(false);
    }
  };

  // MC Options helper
  const addOption = (isEdit: boolean) => {
    const list = isEdit ? editQOptions : qOptions;
    if (list.length >= 10) return;
    const nextLetter = String.fromCharCode(65 + list.length);
    const updated = [...list, { id: nextLetter, text: "", isCorrect: false }];
    if (isEdit) setEditQOptions(updated);
    else setQOptions(updated);
  };

  const removeOption = (idx: number, isEdit: boolean) => {
    const list = isEdit ? editQOptions : qOptions;
    if (list.length <= 2) return;
    const filtered = list.filter((_, i) => i !== idx);
    const reindexed = filtered.map((o, i) => ({ ...o, id: String.fromCharCode(65 + i) }));
    if (isEdit) setEditQOptions(reindexed);
    else setQOptions(reindexed);
  };

  // Matching Pairs helper
  const addPair = (isEdit: boolean) => {
    const list = isEdit ? editQPairs : qPairs;
    if (list.length >= 8) return;
    const updated = [...list, { id: `p${list.length + 1}`, left: "", right: "" }];
    if (isEdit) setEditQPairs(updated);
    else setQPairs(updated);
  };

  const removePair = (idx: number, isEdit: boolean) => {
    const list = isEdit ? editQPairs : qPairs;
    if (list.length <= 2) return;
    const filtered = list.filter((_, i) => i !== idx);
    const reindexed = filtered.map((p, i) => ({ ...p, id: `p${i + 1}` }));
    if (isEdit) setEditQPairs(reindexed);
    else setQPairs(reindexed);
  };

  // Drag Drop Steps helper
  const addStep = (isEdit: boolean) => {
    const list = isEdit ? editQSteps : qSteps;
    if (list.length >= 8) return;
    const updated = [...list, { id: `step_${list.length + 1}`, text: "" }];
    if (isEdit) setEditQSteps(updated);
    else setQSteps(updated);
  };

  const removeStep = (idx: number, isEdit: boolean) => {
    const list = isEdit ? editQSteps : qSteps;
    if (list.length <= 2) return;
    const filtered = list.filter((_, i) => i !== idx);
    const reindexed = filtered.map((s, i) => ({ ...s, id: `step_${i + 1}` }));
    if (isEdit) setEditQSteps(reindexed);
    else setQSteps(reindexed);
  };

  // Cloze Dropdown helper
  const addClozeBlank = (isEdit: boolean) => {
    const list = isEdit ? editQClozeBlanks : qClozeBlanks;
    if (list.length >= 6) return;
    const bId = list.length + 1;
    const updated = [
      ...list,
      {
        blankId: bId,
        options: [
          { id: `b${bId}_1`, text: "", isCorrect: true },
          { id: `b${bId}_2`, text: "", isCorrect: false },
          { id: `b${bId}_3`, text: "", isCorrect: false },
        ],
      },
    ];
    if (isEdit) setEditQClozeBlanks(updated);
    else setQClozeBlanks(updated);
  };

  const removeClozeBlank = (blankIdx: number, isEdit: boolean) => {
    const list = isEdit ? editQClozeBlanks : qClozeBlanks;
    if (list.length <= 1) return;
    const filtered = list.filter((_, i) => i !== blankIdx);
    const reindexed = filtered.map((b, i) => ({
      ...b,
      blankId: i + 1,
      options: b.options.map((o, oi) => ({ ...o, id: `b${i + 1}_${oi + 1}` })),
    }));
    if (isEdit) setEditQClozeBlanks(reindexed);
    else setQClozeBlanks(reindexed);
  };

  const addClozeOption = (blankIdx: number, isEdit: boolean) => {
    const list = isEdit ? editQClozeBlanks : qClozeBlanks;
    const blank = list[blankIdx];
    if (!blank || blank.options.length >= 6) return;
    const newOptId = `b${blank.blankId}_${blank.options.length + 1}`;
    const updated = list.map((b, bi) =>
      bi === blankIdx
        ? {
            ...b,
            options: [...b.options, { id: newOptId, text: "", isCorrect: false }],
          }
        : b
    );
    if (isEdit) setEditQClozeBlanks(updated);
    else setQClozeBlanks(updated);
  };

  const removeClozeOption = (blankIdx: number, optIdx: number, isEdit: boolean) => {
    const list = isEdit ? editQClozeBlanks : qClozeBlanks;
    const blank = list[blankIdx];
    if (!blank || blank.options.length <= 2) return;
    const filtered = blank.options.filter((_, oi) => oi !== optIdx);
    // ensure at least one correct
    const hasCorrect = filtered.some((o) => o.isCorrect);
    if (!hasCorrect && filtered.length > 0) filtered[0].isCorrect = true;
    const updated = list.map((b, bi) => (bi === blankIdx ? { ...b, options: filtered } : b));
    if (isEdit) setEditQClozeBlanks(updated);
    else setQClozeBlanks(updated);
  };

  const getAuthHeaders = (extra: Record<string, string> = {}) => {
    const token = typeof window !== "undefined" ? (localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token")) : null;
    const headers: Record<string, string> = { ...extra };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const fetchBanks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/quiz-bank?ownerId=demo-host-id", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.banks) {
          const localOnly = offlineStorage.getLocalBanks().filter((b: OfflineQuizBank) => b.isLocalOnly);
          const rawCombined = [...localOnly, ...data.banks];
          const seenIds = new Set<string>();
          const seenTitles = new Set<string>();
          const deduped: any[] = [];
          for (const b of rawCombined) {
            const normTitle = (b.title || "").trim().toLowerCase();
            if (b.id && seenIds.has(b.id)) continue;
            if (normTitle && seenTitles.has(normTitle)) continue;
            if (b.id) seenIds.add(b.id);
            if (normTitle) seenTitles.add(normTitle);
            deduped.push(b);
          }
          const combined = deduped.map((b: any) => {
            const isPureWP = b.isPureWordPuzzle ?? (
              b.id?.startsWith("bank_mw_preset") ||
              (b.questions && b.questions.length > 0 && b.questions.every((q: any) => q.type === "WORD_PUZZLE")) ||
              /vòng quay|ô chữ|magic wheel/i.test(b.title || "")
            );
            const isPureStd = b.isPureStandard ?? (
              b.questions && b.questions.length > 0 && b.questions.every((q: any) => q.type !== "WORD_PUZZLE")
            );
            const isMixed = b.isMixed ?? (
              b.questions && b.questions.length > 0 && !isPureWP && !isPureStd
            );
            return { ...b, isPureWordPuzzle: isPureWP, isPureStandard: isPureStd, isMixed };
          });
          setBanks(combined);
          if (combined.length > 0 && !selectedBank) {
            selectBank(combined[0]);
          }
          return;
        }
      }
      throw new Error("Offline or server unreachable");
    } catch {
      console.warn("[QuizBank] Loading offline banks from local storage");
      const local = offlineStorage.getLocalBanks();
      const seenIds = new Set<string>();
      const seenTitles = new Set<string>();
      const deduped: any[] = [];
      for (const b of local) {
        const normTitle = (b.title || "").trim().toLowerCase();
        if (b.id && seenIds.has(b.id)) continue;
        if (normTitle && seenTitles.has(normTitle)) continue;
        if (b.id) seenIds.add(b.id);
        if (normTitle) seenTitles.add(normTitle);
        deduped.push(b);
      }
      const combined = deduped.map((b: any) => {
        const isPureWP = b.isPureWordPuzzle ?? (
          b.id?.startsWith("bank_mw_preset") ||
          (b.questions && b.questions.length > 0 && b.questions.every((q: any) => q.type === "WORD_PUZZLE")) ||
          /vòng quay|ô chữ|magic wheel/i.test(b.title || "")
        );
        const isPureStd = b.isPureStandard ?? (
          b.questions && b.questions.length > 0 && b.questions.every((q: any) => q.type !== "WORD_PUZZLE")
        );
        const isMixed = b.isMixed ?? (
          b.questions && b.questions.length > 0 && !isPureWP && !isPureStd
        );
        return { ...b, isPureWordPuzzle: isPureWP, isPureStandard: isPureStd, isMixed };
      });
      setBanks(combined);
      if (combined.length > 0 && !selectedBank) {
        selectBank(combined[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectBank = async (bank: QuizBank) => {
    setSelectedBank(bank);
    setLoadingQuestions(true);

    const local = offlineStorage.getLocalBankById(bank.id);
    if (local && local.questions && local.questions.length > 0) {
      setQuestions(local.questions);
      setLoadingQuestions(false);
      return;
    }

    try {
      const res = await fetch(`/api/quiz-bank/${bank.id}/questions`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.questions) {
        setQuestions(data.questions);
        // Cache to local
        offlineStorage.saveLocalBank({
          ...bank,
          questions: data.questions,
          isLocalOnly: false,
          needsSync: false,
        });
      }
    } catch {
      if (local?.questions) {
        setQuestions(local.questions);
      }
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleDeleteBank = async (bank: QuizBank) => {
    if (!confirm(`Xóa bộ đề "${bank.title}" và tất cả ${bank._count?.questions ?? 0} câu hỏi? Không thể hoàn tác!`)) return;
    setDeletingBankId(bank.id);
    try {
      offlineStorage.deleteLocalBank(bank.id);
      const res = await fetch(`/api/quiz-bank/${bank.id}`, { method: "DELETE", headers: getAuthHeaders() }).catch(() => null);
      setBanks((prev) => prev.filter((b) => b.id !== bank.id));
      if (selectedBank?.id === bank.id) {
        setSelectedBank(null);
        setQuestions([]);
      }
    } catch {
      alert("Lỗi kết nối!");
    } finally {
      setDeletingBankId(null);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Xóa câu hỏi này?")) return;
    setDeletingQuestionId(questionId);
    try {
      const res = await fetch(`/api/quiz-bank/${selectedBank?.id}/questions/${questionId}`, { method: "DELETE", headers: getAuthHeaders() });
      if (res.ok) {
        setQuestions((prev) => prev.filter((q) => q.id !== questionId));
        // Update count in bank list
        setBanks((prev) => prev.map((b) => b.id === selectedBank?.id ? { ...b, _count: { questions: (b._count?.questions ?? 1) - 1 } } : b));
      } else {
        alert("Lỗi khi xóa câu hỏi!");
      }
    } catch {
      alert("Lỗi kết nối!");
    } finally {
      setDeletingQuestionId(null);
    }
  };

  const isCurrentBankWordPuzzle = Boolean(
    selectedBank?.isPureWordPuzzle ||
    selectedBank?.isWordPuzzle ||
    selectedBank?.id?.startsWith("bank_mw_preset") ||
    questions.some((q) => q.type === "WORD_PUZZLE") ||
    /chiếc nón kỳ diệu|vòng quay tri thức|ô chữ|magic wheel/i.test(selectedBank?.title || "")
  );

  const isCurrentBankStandard = Boolean(
    selectedBank?.isPureStandard ||
    questions.some((q) => q.type !== "WORD_PUZZLE")
  );

  const openNewQuestionModal = () => {
    if (isCurrentBankWordPuzzle) {
      setQType("WORD_PUZZLE");
      setQRound(questions.length + 1);
      setQHint("");
      setQAnswer("");
      setQContent("");
      setQClueDisplayMode(selectedBank?.language === "ENGLISH" ? "CATEGORY" : "CLUE");
    } else {
      if (qType === "WORD_PUZZLE") setQType("MC_SINGLE");
      setQContent("");
      setQAnswer("");
    }
    setShowNewQModal(true);
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isCreatingBank) return;

    setIsCreatingBank(true);
    const isCategoryWordPuzzle = newBankCategory === "WORD_PUZZLE";
    const finalTitle = isCategoryWordPuzzle && !/ô chữ|magic wheel|vòng quay/i.test(newTitle)
      ? `[Ô Chữ] ${newTitle.trim()}`
      : newTitle.trim();
    const finalDesc = newDesc.trim() || (isCategoryWordPuzzle ? "Bộ đề chuyên biệt Ô chữ Vòng Quay Trí Tuệ" : undefined);

    try {
      const res = await fetch("/api/quiz-bank", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          title: finalTitle,
          description: finalDesc,
          ownerId: "demo-host-id",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const createdBank: QuizBank = data.bank || {
          id: `local-${Date.now()}`,
          title: finalTitle,
          description: finalDesc,
          language: newBankLanguage,
          createdAt: new Date().toISOString(),
          isWordPuzzle: isCategoryWordPuzzle,
          isPureWordPuzzle: isCategoryWordPuzzle,
          isPureStandard: !isCategoryWordPuzzle,
          _count: { questions: 0 },
        };
        createdBank.language = newBankLanguage;

        // Cache into local storage
        offlineStorage.saveLocalBank({
          id: createdBank.id,
          title: createdBank.title,
          description: createdBank.description,
          language: newBankLanguage,
          createdAt: createdBank.createdAt,
          questions: [],
          isLocalOnly: false,
          needsSync: false,
        });

        // Optimistically put the new bank on top of the list and select it immediately
        setBanks((prev) => [createdBank, ...prev.filter((b) => b.id !== createdBank.id)]);
        setSelectedBank(createdBank);
        setQuestions([]);

        const chosenMode = newBankInitMode;
        setNewTitle("");
        setNewDesc("");
        setNewBankInitMode("MANUAL");
        setShowNewBankModal(false);

        // Seamlessly open the corresponding creation tool without extra clicks
        if (chosenMode === "MANUAL") {
          if (isCategoryWordPuzzle) {
            setQType("WORD_PUZZLE");
            setQRound(1);
          } else {
            setQType("MC_SINGLE");
          }
          setShowNewQModal(true);
        } else if (chosenMode === "AI_STUDIO") {
          setPreviewTargetMode("current");
          setShowStudioModal(true);
        } else if (chosenMode === "IMPORT_FILE") {
          setPreviewTargetMode("current");
          setShowFileModal(true);
        }
      } else {
        alert("Không thể tạo bộ đề. Vui lòng thử lại!");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi kết nối khi tạo bộ đề!");
    } finally {
      setIsCreatingBank(false);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank || !qContent.trim()) return;

    if (isCurrentBankWordPuzzle && qType !== "WORD_PUZZLE") {
      alert("Bộ đề này là 'Ô Chữ Chiếc Nón Kỳ Diệu'. Không thể thêm câu hỏi trắc nghiệm thường!");
      return;
    }
    if (isCurrentBankStandard && qType === "WORD_PUZZLE") {
      alert("Bộ đề này là 'Trắc Nghiệm Tiêu Chuẩn'. Không thể thêm câu hỏi Ô chữ Chiếc nón kỳ diệu!");
      return;
    }

    // Kiểm tra ngôn ngữ đồng bộ với setting bộ đề
    const localBankObj = offlineStorage.getLocalBankById(selectedBank.id);
    const bankLang = selectedBank.language || localBankObj?.language || detectQuizBankLanguage(selectedBank);
    const vietnameseDiacriticsRegex = /[àáảãạăắằẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẰẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ]/;
    const questionFullText = `${qContent} ${qAnswer || ""} ${qHint || ""} ${qOptions.map((o) => o.text).join(" ")}`;
    const hasVietnameseMarks = vietnameseDiacriticsRegex.test(questionFullText);

    if (bankLang === "ENGLISH" && hasVietnameseMarks) {
      const confirmAdd = confirm(
        "⚠️ CẢNH BÁO NGÔN NGỮ:\n" +
        "Bộ đề này được cài đặt ngôn ngữ là TIẾNG ANH (ENGLISH), nhưng câu hỏi bạn vừa nhập có chứa dấu Tiếng Việt!\n\n" +
        "Bạn có chắc chắn muốn tiếp tục lưu câu hỏi này không?"
      );
      if (!confirmAdd) return;
    } else if (bankLang === "VIETNAMESE" && !hasVietnameseMarks && qType === "WORD_PUZZLE" && qAnswer.trim().length > 3) {
      // Nếu là Ô chữ bản tiếng Việt mà đáp án không có dấu tiếng Việt nào
      // Nhắc nhở người soạn để tránh quên dấu thanh
      const isEnglishWords = /^[a-zA-Z\s]+$/.test(qAnswer.trim());
      if (isEnglishWords && !/^[A-Z0-9\s]+$/i.test(qContent)) {
        // Chỉ cảnh báo nhẹ
      }
    }

    const rawPoints = Math.max(10, Math.round((Number(qPoints) || 10) / 10) * 10);
    const payload: any = {
      type: qType,
      content: qContent.trim(),
      points: rawPoints,
      timeLimit: Number(qTimeLimit) || 30,
      hint: qHint.trim() || null,
      mediaUrl: qMediaType !== "NONE" && qMediaUrl.trim() ? qMediaUrl.trim() : null,
      mediaType: qMediaType !== "NONE" ? qMediaType.toLowerCase() : null,
      mediaPlaybackMode: qMediaType === "VIDEO" || qMediaType === "AUDIO" ? qMediaPlaybackMode : "AFTER_PLAY",
      allowManualGrading: qType === "FILL_BLANK" ? qAllowManualGrading : false,
      gradingCriteria: qType === "FILL_BLANK" && qAllowManualGrading && qGradingCriteria.trim() ? qGradingCriteria.trim() : null,
    };

    if (qType === "MC_SINGLE" || qType === "MC_MULTI") {
      payload.options = qOptions.filter((o) => o.text.trim() !== "");
      payload.pairs = null;
      payload.answer = null;
    } else if (qType === "TRUE_FALSE") {
      payload.options = [
        { id: "true", text: "Đúng (True)", isCorrect: qAnswer === "true" },
        { id: "false", text: "Sai (False)", isCorrect: qAnswer === "false" },
      ];
      payload.pairs = null;
      payload.answer = qAnswer;
    } else if (qType === "FILL_BLANK" || qType === "ESSAY") {
      payload.options = null;
      payload.pairs = null;
      payload.answer = qAnswer.trim();
    } else if (qType === "MATCHING") {
      payload.pairs = qPairs.filter((p) => p.left.trim() !== "" || p.right.trim() !== "");
      payload.options = null;
      payload.answer = null;
    } else if (qType === "DRAG_DROP") {
      payload.options = qSteps
        .filter((s) => s.text.trim() !== "")
        .map((s, idx) => ({ id: `step_${idx + 1}`, text: s.text.trim(), isCorrect: true }));
      payload.pairs = null;
      payload.answer = null;
    } else if (qType === "CLOZE_DROPDOWN") {
      payload.options = qClozeBlanks;
      payload.pairs = null;
      payload.answer = JSON.stringify(qClozeBlanks.map((b) => b.options.find((o) => o.isCorrect)?.id));
    } else if (qType === "WORD_PUZZLE") {
      const category = qHint.trim().toUpperCase() || "Ô CHỮ BÍ MẬT";
      if (qPuzzleType === "CROSSWORD") {
        const val = validateCrosswordLayout(qCrosswordWords);
        if (!val.isValid) {
          alert(`❌ Bố cục Ô Chữ Liên Kết chưa hợp lệ:\n- ${val.errors.join("\n- ")}`);
          return;
        }
        payload.puzzleType = "CROSSWORD";
        payload.crosswordWords = qCrosswordWords;
        payload.answer = qCrosswordWords.map((w) => w.word.trim().toUpperCase()).join(", ");
        payload.hint = category;
        payload.options = [
          { id: "round", text: String(qRound || 1), isCorrect: true },
          { id: "category", text: category, isCorrect: true },
          { id: "clueDisplayMode", text: qClueDisplayMode, isCorrect: true },
          { id: "puzzleType", text: "CROSSWORD", isCorrect: true },
          { id: "crosswordWords", text: JSON.stringify(qCrosswordWords), isCorrect: true },
        ];
        payload.pairs = null;
      } else {
        const phrase = qAnswer.trim().toUpperCase();
        if (/SAME[\s_-]*LETTER|CÙNG CHỮ CÁI ĐẦU/i.test(category)) {
          const slCheck = validateSameLetterPhrase(phrase);
          if (!slCheck.valid) {
            alert(`❌ Câu hỏi không hợp lệ:\n${slCheck.error}`);
            return;
          }
        }
        payload.puzzleType = "STANDARD";
        payload.answer = phrase;
        payload.hint = category;
        payload.options = [
          { id: "round", text: String(qRound || 1), isCorrect: true },
          { id: "category", text: category, isCorrect: true },
          { id: "clueDisplayMode", text: qClueDisplayMode, isCorrect: true },
          { id: "puzzleType", text: "STANDARD", isCorrect: true },
        ];
        payload.pairs = null;
      }
    }

    try {
      const res = await fetch(`/api/quiz-bank/${selectedBank.id}/questions`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowNewQModal(false);
        setQContent("");
        setQHint("");
        setQAnswer("");
        setQAllowManualGrading(false);
        setQGradingCriteria("");
        setQMediaUrl("");
        setQMediaType("NONE");
        setQMediaPlaybackMode("AFTER_PLAY");
        selectBank(selectedBank);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openEditBank = (bank?: QuizBank) => {
    const target = bank || selectedBank;
    if (!target) return;
    setEditBankTitle(target.title);
    setEditBankDesc(target.description || "");
    const localTarget = offlineStorage.getLocalBankById(target.id);
    const existingLang = target.language || localTarget?.language || detectQuizBankLanguage(target);
    setEditBankLanguage(existingLang);
    setShowEditBankModal(true);
  };

  const handleUpdateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank || !editBankTitle.trim()) return;
    setSavingBank(true);
    try {
      const res = await fetch(`/api/quiz-bank/${selectedBank.id}`, {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          title: editBankTitle.trim(),
          description: editBankDesc.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = data.bank;
        setSelectedBank((prev) => (prev ? { ...prev, title: updated.title, description: updated.description, language: editBankLanguage } : prev));
        setBanks((prev) =>
          prev.map((b) => (b.id === selectedBank.id ? { ...b, title: updated.title, description: updated.description, language: editBankLanguage } : b))
        );
        const local = offlineStorage.getLocalBankById(selectedBank.id);
        if (local) {
          offlineStorage.saveLocalBank({
            ...local,
            title: updated.title,
            description: updated.description,
            language: editBankLanguage,
          });
        }
        setShowEditBankModal(false);
      } else {
        alert("Lỗi khi cập nhật bộ đề!");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi kết nối!");
    } finally {
      setSavingBank(false);
    }
  };

  const openEditQuestion = (q: QuestionItem) => {
    setEditingQuestionId(q.id || null);
    setEditQType(q.type || "MC_SINGLE");
    setEditQContent(q.content || "");
    setEditQPoints(q.points || 10);
    setEditQTimeLimit(q.timeLimit || 30);
    setEditQHint(q.hint || "");
    setEditQAnswer(q.answer || "");
    setEditQAllowManualGrading(!!(q as any).allowManualGrading);
    setEditQGradingCriteria((q as any).gradingCriteria || "");

    // Media
    const mUrl = q.mediaUrl || "";
    setEditQMediaUrl(mUrl);
    if (q.mediaType) {
      const mt = q.mediaType.toUpperCase();
      setEditQMediaType(mt === "VIDEO" || mt === "AUDIO" || mt === "IMAGE" ? (mt as any) : "NONE");
    } else if (mUrl) {
      if (mUrl.match(/\.(mp4|webm)/i) || mUrl.includes("youtube.com") || mUrl.includes("youtu.be")) {
        setEditQMediaType("VIDEO");
      } else if (mUrl.match(/\.(mp3|wav|ogg)/i)) {
        setEditQMediaType("AUDIO");
      } else {
        setEditQMediaType("IMAGE");
      }
    } else {
      setEditQMediaType("NONE");
    }
    setEditQMediaPlaybackMode(((q as any).mediaPlaybackMode as any) || "AFTER_PLAY");

    // Options for MC
    if (q.options && q.options.length > 0) {
      const existing = q.options.map((opt, idx) => ({
        id: opt.id || String.fromCharCode(65 + idx),
        text: opt.text || "",
        isCorrect: !!opt.isCorrect,
      }));
      setEditQOptions(existing.length >= 2 ? existing : [
        { id: "A", text: "", isCorrect: true },
        { id: "B", text: "", isCorrect: false },
      ]);
    } else {
      setEditQOptions([
        { id: "A", text: "", isCorrect: true },
        { id: "B", text: "", isCorrect: false },
        { id: "C", text: "", isCorrect: false },
        { id: "D", text: "", isCorrect: false },
      ]);
    }

    // Matching pairs
    if (q.pairs && Array.isArray(q.pairs) && q.pairs.length > 0) {
      setEditQPairs(q.pairs.map((p: any, idx: number) => ({
        id: p.id || `p${idx + 1}`,
        left: p.left || "",
        right: p.right || "",
      })));
    } else {
      setEditQPairs([
        { id: "p1", left: "", right: "" },
        { id: "p2", left: "", right: "" },
        { id: "p3", left: "", right: "" },
      ]);
    }

    // Drag drop steps
    if (q.type === "DRAG_DROP" && q.options && q.options.length > 0) {
      setEditQSteps(q.options.map((s, idx) => ({
        id: s.id || `step_${idx + 1}`,
        text: s.text || "",
      })));
    } else {
      setEditQSteps([
        { id: "step_1", text: "" },
        { id: "step_2", text: "" },
        { id: "step_3", text: "" },
      ]);
    }

    // Cloze blanks
    if (q.type === "CLOZE_DROPDOWN" && (q as any).clozeBlanks && Array.isArray((q as any).clozeBlanks)) {
      setEditQClozeBlanks((q as any).clozeBlanks);
    } else if (q.type === "CLOZE_DROPDOWN" && q.options && Array.isArray(q.options)) {
      setEditQClozeBlanks(q.options as any);
    } else {
      setEditQClozeBlanks([
        {
          blankId: 1,
          options: [
            { id: "b1_1", text: "", isCorrect: true },
            { id: "b1_2", text: "", isCorrect: false },
            { id: "b1_3", text: "", isCorrect: false },
          ],
        },
      ]);
    }

    if (q.type === "WORD_PUZZLE") {
      setEditQType("WORD_PUZZLE");
      setEditQAnswer(q.answer || "");
      setEditQHint(q.hint || "");
      const roundOpt = q.options?.find((o: any) => o.id === "round");
      setEditQRound(roundOpt ? Number(roundOpt.text) || 1 : 1);
      const clueModeOpt = q.options?.find((o: any) => o.id === "clueDisplayMode");
      const modeVal = clueModeOpt?.text || (q as any).clueDisplayMode;
      setEditQClueDisplayMode(modeVal === "CATEGORY" ? "CATEGORY" : "CLUE");

      const pTypeOpt = q.options?.find((o: any) => o.id === "puzzleType");
      const detectedType = (q.puzzleType || pTypeOpt?.text || "STANDARD") as "STANDARD" | "CROSSWORD";
      setEditQPuzzleType(detectedType);

      const cwWordsOpt = q.options?.find((o: any) => o.id === "crosswordWords");
      let cwWords: CrosswordWordItem[] = q.crosswordWords || [];
      if ((!cwWords || cwWords.length === 0) && cwWordsOpt?.text) {
        try {
          cwWords = JSON.parse(cwWordsOpt.text);
        } catch {}
      }
      if (!cwWords || cwWords.length === 0) {
        cwWords = [
          { id: "cw_1", word: "HOA", row: 1, col: 2, direction: "ACROSS" },
          { id: "cw_2", word: "CON", row: 0, col: 3, direction: "DOWN" },
        ];
      }
      setEditQCrosswordWords(cwWords);
    }

    setShowEditQModal(true);
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank || !editingQuestionId || !editQContent.trim()) return;

    if (isCurrentBankWordPuzzle && editQType !== "WORD_PUZZLE") {
      alert("Bộ đề này là 'Ô Chữ Chiếc Nón Kỳ Diệu'. Không thể chuyển sang câu hỏi trắc nghiệm thường!");
      return;
    }
    if (isCurrentBankStandard && editQType === "WORD_PUZZLE") {
      alert("Bộ đề này là 'Trắc Nghiệm Tiêu Chuẩn'. Không thể chuyển sang câu hỏi Ô chữ!");
      return;
    }

    // Kiểm tra ngôn ngữ đồng bộ với setting bộ đề khi sửa
    const localBankObj = offlineStorage.getLocalBankById(selectedBank.id);
    const bankLang = selectedBank.language || localBankObj?.language || detectQuizBankLanguage(selectedBank);
    const vietnameseDiacriticsRegex = /[àáảãạăắằẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẰẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ]/;
    const questionFullText = `${editQContent} ${editQAnswer || ""} ${editQHint || ""} ${editQOptions.map((o) => o.text).join(" ")}`;
    const hasVietnameseMarks = vietnameseDiacriticsRegex.test(questionFullText);

    if (bankLang === "ENGLISH" && hasVietnameseMarks) {
      const confirmEdit = confirm(
        "⚠️ CẢNH BÁO NGÔN NGỮ:\n" +
        "Bộ đề này được cài đặt ngôn ngữ là TIẾNG ANH (ENGLISH), nhưng câu hỏi bạn vừa chỉnh sửa có chứa dấu Tiếng Việt!\n\n" +
        "Bạn có chắc chắn muốn lưu cập nhật câu hỏi này không?"
      );
      if (!confirmEdit) return;
    }

    setSavingQuestion(true);

    const rawPoints = Math.max(10, Math.round((Number(editQPoints) || 10) / 10) * 10);
    const payload: any = {
      type: editQType,
      content: editQContent.trim(),
      points: rawPoints,
      timeLimit: Number(editQTimeLimit) || 30,
      hint: editQHint.trim() || null,
      mediaUrl: editQMediaType !== "NONE" && editQMediaUrl.trim() ? editQMediaUrl.trim() : null,
      mediaType: editQMediaType !== "NONE" ? editQMediaType.toLowerCase() : null,
      mediaPlaybackMode: editQMediaType === "VIDEO" || editQMediaType === "AUDIO" ? editQMediaPlaybackMode : "AFTER_PLAY",
      allowManualGrading: editQType === "FILL_BLANK" ? editQAllowManualGrading : false,
      gradingCriteria: editQType === "FILL_BLANK" && editQAllowManualGrading && editQGradingCriteria.trim() ? editQGradingCriteria.trim() : null,
    };

    if (editQType === "MC_SINGLE" || editQType === "MC_MULTI") {
      payload.options = editQOptions.filter((o) => o.text.trim() !== "");
      payload.pairs = null;
      payload.answer = null;
    } else if (editQType === "TRUE_FALSE") {
      payload.options = [
        { id: "true", text: "Đúng (True)", isCorrect: editQAnswer === "true" },
        { id: "false", text: "Sai (False)", isCorrect: editQAnswer === "false" },
      ];
      payload.pairs = null;
      payload.answer = editQAnswer;
    } else if (editQType === "FILL_BLANK" || editQType === "ESSAY") {
      payload.options = null;
      payload.pairs = null;
      payload.answer = editQAnswer.trim();
    } else if (editQType === "MATCHING") {
      payload.pairs = editQPairs.filter((p) => p.left.trim() !== "" || p.right.trim() !== "");
      payload.options = null;
      payload.answer = null;
    } else if (editQType === "DRAG_DROP") {
      payload.options = editQSteps
        .filter((s) => s.text.trim() !== "")
        .map((s, idx) => ({ id: `step_${idx + 1}`, text: s.text.trim(), isCorrect: true }));
      payload.pairs = null;
      payload.answer = null;
    } else if (editQType === "CLOZE_DROPDOWN") {
      payload.options = editQClozeBlanks;
      payload.pairs = null;
      payload.answer = JSON.stringify(editQClozeBlanks.map((b) => b.options.find((o) => o.isCorrect)?.id));
    } else if (editQType === "WORD_PUZZLE") {
      const category = editQHint.trim().toUpperCase() || "Ô CHỮ BÍ MẬT";
      if (editQPuzzleType === "CROSSWORD") {
        const val = validateCrosswordLayout(editQCrosswordWords);
        if (!val.isValid) {
          alert(`❌ Bố cục Ô Chữ Liên Kết chưa hợp lệ:\n- ${val.errors.join("\n- ")}`);
          setSavingQuestion(false);
          return;
        }
        payload.puzzleType = "CROSSWORD";
        payload.crosswordWords = editQCrosswordWords;
        payload.answer = editQCrosswordWords.map((w) => w.word.trim().toUpperCase()).join(", ");
        payload.hint = category;
        payload.options = [
          { id: "round", text: String(editQRound || 1), isCorrect: true },
          { id: "category", text: category, isCorrect: true },
          { id: "clueDisplayMode", text: editQClueDisplayMode, isCorrect: true },
          { id: "puzzleType", text: "CROSSWORD", isCorrect: true },
          { id: "crosswordWords", text: JSON.stringify(editQCrosswordWords), isCorrect: true },
        ];
        payload.pairs = null;
      } else {
        const phrase = editQAnswer.trim().toUpperCase();
        if (/SAME[\s_-]*LETTER|CÙNG CHỮ CÁI ĐẦU/i.test(category)) {
          const slCheck = validateSameLetterPhrase(phrase);
          if (!slCheck.valid) {
            alert(`❌ Câu hỏi không hợp lệ:\n${slCheck.error}`);
            setSavingQuestion(false);
            return;
          }
        }
        payload.puzzleType = "STANDARD";
        payload.answer = phrase;
        payload.hint = category;
        payload.options = [
          { id: "round", text: String(editQRound || 1), isCorrect: true },
          { id: "category", text: category, isCorrect: true },
          { id: "clueDisplayMode", text: editQClueDisplayMode, isCorrect: true },
          { id: "puzzleType", text: "STANDARD", isCorrect: true },
        ];
        payload.pairs = null;
      }
    }

    try {
      const res = await fetch(`/api/quiz-bank/${selectedBank.id}/questions/${editingQuestionId}`, {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowEditQModal(false);
        setEditingQuestionId(null);
        await selectBank(selectedBank);
      } else {
        alert("Lỗi khi cập nhật câu hỏi!");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi kết nối!");
    } finally {
      setSavingQuestion(false);
    }
  };

  // Sync API Key from local storage when provider changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem(`ai_key_${aiProvider}`) || "";
      setAiApiKey(savedKey);
    }
  }, [aiProvider]);

  // Handle Generate with AI
  const handleGenerateAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) {
      setAiError("Vui lòng nhập chủ đề đề thi!");
      return;
    }
    setAiError(null);
    setIsGeneratingAi(true);

    try {
      if (aiSaveKey && aiApiKey.trim()) {
        localStorage.setItem(`ai_key_${aiProvider}`, aiApiKey.trim());
      }

      const res = await fetch("/api/quiz-bank/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          apiKey: aiApiKey.trim() || undefined,
          topic: aiTopic.trim(),
          questionCount: aiQuestionCount,
          gradeLevel: aiGradeLevel,
          questionTypes: aiQuestionTypes,
          defaultPoints: aiDefaultPoints,
          defaultTimeLimit: aiDefaultTime,
          customPrompt: aiCustomPrompt.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể tạo đề thi bằng AI");
      }

      setShowAiModal(false);
      setPreviewQuestions(data.questions || []);
      setPreviewNewBankTitle(`Bộ đề AI: ${aiTopic.trim()}`);
      setPreviewNewBankDesc(`Sinh bởi ${aiProvider.toUpperCase()} - ${aiGradeLevel} (${data.questions?.length || 0} câu)`);
      setPreviewTargetMode(selectedBank ? "current" : "new");
      setShowPreviewModal(true);
    } catch (err: any) {
      setAiError(err.message || String(err));
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Handle Question Studio Generation Success
  const handleStudioSuccess = (
    generatedQuestions: ParsedQuestionItem[],
    bankTitle: string,
    bankDesc: string
  ) => {
    setPreviewQuestions(generatedQuestions);
    setPreviewNewBankTitle(bankTitle);
    setPreviewNewBankDesc(bankDesc);
    setPreviewTargetMode(selectedBank ? "current" : "new");
    setShowPreviewModal(true);
  };

  // Handle Rebalancing a single question with AI
  const handleRebalanceQuestion = async (idx: number) => {
    const targetQ = previewQuestions[idx];
    if (!targetQ) return;
    setRebalancingIndex(idx);

    try {
      const savedProvider = (localStorage.getItem("ai_provider") as any) || "gemini";
      const savedKey = localStorage.getItem(`ai_key_${savedProvider}`) || "";

      const res = await fetch("/api/quiz-bank/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: savedProvider,
          apiKey: savedKey || undefined,
          action: "rebalance_question",
          targetQuestion: targetQ,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể cân bằng lại câu hỏi");

      if (data.question) {
        setPreviewQuestions((prev) => {
          const next = [...prev];
          next[idx] = data.question;
          return next;
        });
      }
    } catch (err: any) {
      alert("Lỗi cân bằng lại: " + (err.message || String(err)));
    } finally {
      setRebalancingIndex(null);
    }
  };

  // Handle Refining all questions with AI
  const handleRefineAllQuestions = async () => {
    if (previewQuestions.length === 0) return;
    setIsRefiningAll(true);

    try {
      const savedProvider = (localStorage.getItem("ai_provider") as any) || "gemini";
      const savedKey = localStorage.getItem(`ai_key_${savedProvider}`) || "";

      const res = await fetch("/api/quiz-bank/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: savedProvider,
          apiKey: savedKey || undefined,
          action: "refine_parsed",
          rawQuestions: previewQuestions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể hoàn thiện toàn bộ đề");

      if (data.questions && Array.isArray(data.questions)) {
        setPreviewQuestions(data.questions);
      }
    } catch (err: any) {
      alert("Lỗi hoàn thiện: " + (err.message || String(err)));
    } finally {
      setIsRefiningAll(false);
    }
  };

  // Handle Process Raw Text Paste
  const handleProcessRawText = () => {
    if (!rawTextContent.trim()) {
      setFileError("Vui lòng nhập hoặc dán nội dung văn bản đề thi!");
      return;
    }
    try {
      const parsed = parseRawQuizText(rawTextContent, 10, 30);
      if (parsed.length === 0) {
        setFileError("Không phát hiện câu hỏi nào trong văn bản. Hãy đảm bảo cú pháp có 'Câu 1:' hoặc 'A. B. C. D.'");
        return;
      }
      const wpCount = parsed.filter((q) => q.type === "WORD_PUZZLE").length;
      const stdCount = parsed.length - wpCount;
      if (wpCount > 0 && stdCount > 0) {
        setFileError("Bộ đề không hợp lệ: Văn bản chứa cả câu hỏi trắc nghiệm thường và ô chữ Chiếc Nón Kỳ Diệu. Hệ thống yêu cầu bộ đề phải 100% thuần Ô Chữ hoặc 100% thuần Trắc Nghiệm!");
        return;
      }
      if (selectedBank && isCurrentBankWordPuzzle && stdCount > 0) {
        setFileError("Bộ đề đang chọn là 'Ô Chữ Chiếc Nón Kỳ Diệu'. Nội dung nhập chứa câu hỏi trắc nghiệm thường không tương thích!");
        return;
      }
      if (selectedBank && isCurrentBankStandard && wpCount > 0) {
        setFileError("Bộ đề đang chọn là 'Trắc Nghiệm Tiêu Chuẩn'. Nội dung nhập chứa câu hỏi Ô chữ Chiếc Nón Kỳ Diệu không tương thích!");
        return;
      }
      setShowFileModal(false);
      setRawTextContent("");
      setPreviewQuestions(parsed);
      setPreviewNewBankTitle("Bộ đề trích xuất từ văn bản");
      setPreviewNewBankDesc(`Bóc tách từ văn bản thô (${parsed.length} câu)`);
      setPreviewTargetMode(selectedBank ? "current" : "new");
      setShowPreviewModal(true);
    } catch (err: any) {
      setFileError("Lỗi bóc tách: " + err.message);
    }
  };

  // Handle Process Uploaded File (.docx, .xlsx, .csv, .txt, .json)
  const handleProcessUploadedFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    setIsParsingFile(true);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let parsed: ParsedQuestionItem[] = [];

      if (ext === "docx") {
        const text = await extractTextFromDocx(file);
        parsed = parseRawQuizText(text, 10, 30);
      } else if (ext === "txt") {
        const text = await file.text();
        parsed = parseRawQuizText(text, 10, 30);
      } else if (ext === "xlsx" || ext === "xls") {
        parsed = await parseExcelQuestions(file, 10, 30);
      } else if (ext === "csv") {
        parsed = await parseCsvQuestions(file, 10, 30);
      } else if (ext === "json") {
        const text = await file.text();
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          parsed = json.map((q) => validateQuestionItem(q));
        } else if (json.questions && Array.isArray(json.questions)) {
          parsed = json.questions.map((q: any) => validateQuestionItem(q));
        }
      } else {
        throw new Error("Định dạng file không được hỗ trợ. Hãy chọn .docx, .xlsx, .csv, .txt, hoặc .json");
      }

      if (parsed.length === 0) {
        throw new Error("Không phát hiện câu hỏi hợp lệ nào trong tệp!");
      }

      const wpCount = parsed.filter((q) => q.type === "WORD_PUZZLE").length;
      const stdCount = parsed.length - wpCount;
      if (wpCount > 0 && stdCount > 0) {
        throw new Error("Bộ đề không hợp lệ: Tệp chứa cả câu hỏi trắc nghiệm thường và ô chữ Chiếc Nón Kỳ Diệu. Hệ thống yêu cầu bộ đề phải 100% thuần Ô Chữ hoặc 100% thuần Trắc Nghiệm!");
      }
      if (selectedBank && isCurrentBankWordPuzzle && stdCount > 0) {
        throw new Error("Bộ đề đang chọn là 'Ô Chữ Chiếc Nón Kỳ Diệu'. Tệp tải lên chứa câu hỏi trắc nghiệm thường không tương thích!");
      }
      if (selectedBank && isCurrentBankStandard && wpCount > 0) {
        throw new Error("Bộ đề đang chọn là 'Trắc Nghiệm Tiêu Chuẩn'. Tệp tải lên chứa câu hỏi Ô chữ Chiếc Nón Kỳ Diệu không tương thích!");
      }

      setShowFileModal(false);
      setPreviewQuestions(parsed);
      const cleanFileName = file.name.replace(/\.[^/.]+$/, "");
      setPreviewNewBankTitle(`Bộ đề từ file: ${cleanFileName}`);
      setPreviewNewBankDesc(`Nhập từ tệp ${file.name} (${parsed.length} câu)`);
      setPreviewTargetMode(selectedBank ? "current" : "new");
      setShowPreviewModal(true);
    } catch (err: any) {
      setFileError(err.message || String(err));
    } finally {
      setIsParsingFile(false);
      e.target.value = "";
    }
  };

  // Update a question in preview list
  const handleUpdatePreviewItem = (index: number, updatedPartial: Partial<ParsedQuestionItem>) => {
    setPreviewQuestions((prev) => {
      const clone = [...prev];
      const target = clone[index];
      if (!target) return prev;
      clone[index] = validateQuestionItem({ ...target, ...updatedPartial });
      return clone;
    });
  };

  // Delete a question in preview list
  const handleDeletePreviewItem = (index: number) => {
    setPreviewQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  // Add a new empty question to preview list
  const handleAddPreviewItem = () => {
    const newQ = validateQuestionItem({
      content: "",
      type: "MC_SINGLE",
      options: [
        { id: "A", text: "", isCorrect: true },
        { id: "B", text: "", isCorrect: false },
        { id: "C", text: "", isCorrect: false },
        { id: "D", text: "", isCorrect: false },
      ],
      points: 10,
      timeLimit: 30,
    });
    setPreviewQuestions((prev) => [...prev, newQ]);
  };

  // Save all preview questions to Quiz Bank
  const handleSavePreview = async () => {
    if (previewQuestions.length === 0) return;

    // Strict purity check before saving
    const wpCount = previewQuestions.filter((q) => q.type === "WORD_PUZZLE").length;
    const stdCount = previewQuestions.length - wpCount;
    if (wpCount > 0 && stdCount > 0) {
      alert("Bộ đề không hợp lệ: Không thể kết hợp câu hỏi trắc nghiệm thường và ô chữ Chiếc Nón Kỳ Diệu trong cùng một bộ đề. Vui lòng tách thành 2 file/bộ đề riêng biệt!");
      return;
    }
    if (previewTargetMode === "current" && selectedBank) {
      if (isCurrentBankWordPuzzle && stdCount > 0) {
        alert("Bộ đề hiện tại là 'Ô Chữ Chiếc Nón Kỳ Diệu'. Không thể thêm câu hỏi trắc nghiệm thường vào bộ đề này!");
        return;
      }
      if (isCurrentBankStandard && wpCount > 0) {
        alert("Bộ đề hiện tại là 'Trắc Nghiệm Tiêu Chuẩn'. Không thể thêm câu hỏi Ô chữ Chiếc Nón Kỳ Diệu vào bộ đề này!");
        return;
      }
    }

    setIsSavingPreview(true);

    try {
      let targetBankId = selectedBank?.id;

      if (previewTargetMode === "new" || !targetBankId) {
        const title = previewNewBankTitle.trim() || (wpCount > 0 ? "[Ô Chữ] Bộ đề ô chữ mới" : "Bộ đề thi mới");
        const desc = previewNewBankDesc.trim() || (wpCount > 0 ? "Bộ đề chuyên biệt Ô chữ Vòng Quay Trí Tuệ" : undefined);

        const createRes = await fetch("/api/quiz-bank", {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            title,
            description: desc,
            ownerId: "demo-host-id",
          }),
        });

        if (createRes && createRes.ok) {
          const createData = await createRes.json();
          targetBankId = createData.bank.id;
        } else {
          // Local fallback
          const newId = `bank_local_${Date.now()}`;
          const newLocalBank: OfflineQuizBank = {
            id: newId,
            title,
            description: desc,
            createdAt: new Date().toISOString(),
            isLocalOnly: true,
            questions: [],
          };
          offlineStorage.saveLocalBank(newLocalBank);
          targetBankId = newId;
        }
      }

      // Bulk upload questions
      const normalizedItems: OfflineQuestion[] = previewQuestions.map((q, idx) => ({
        id: q.id || `q_${Date.now()}_${idx}`,
        type: q.type,
        content: q.content,
        points: Math.max(10, Math.round((Number(q.points) || 10) / 10) * 10),
        timeLimit: Number(q.timeLimit) || 30,
        hint: q.hint || undefined,
        options: q.options,
        answer: q.answer || undefined,
      }));

      const res = targetBankId
        ? await fetch(`/api/quiz-bank/${targetBankId}/questions`, {
            method: "POST",
            headers: getAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(normalizedItems),
          }).catch(() => null)
        : null;

      if (res && res.ok) {
        alert(`Đã lưu thành công ${previewQuestions.length} câu hỏi vào bộ đề!`);
      } else {
        // Fallback to local storage
        if (targetBankId) {
          const currentLocal = offlineStorage.getLocalBankById(targetBankId);
          if (currentLocal) {
            const combinedQ = [...(currentLocal.questions || []), ...normalizedItems];
            offlineStorage.saveLocalBank({
              ...currentLocal,
              questions: combinedQ,
              _count: { questions: combinedQ.length },
            });
            alert(`Đã lưu ngoại tuyến thành công ${previewQuestions.length} câu hỏi!`);
          }
        }
      }

      setShowPreviewModal(false);
      await fetchBanks();
      const updatedBank = banks.find((b) => b.id === targetBankId) || selectedBank;
      if (updatedBank) selectBank(updatedBank);
    } catch (err: any) {
      alert("Lỗi khi lưu bộ đề: " + err.message);
    } finally {
      setIsSavingPreview(false);
    }
  };

  const uploadBulkQuestions = async (items: any[]) => {
    if (!selectedBank) return;
    const normalizedItems = items.map((q) => ({
      ...q,
      points: Math.max(10, Math.round((Number(q.points) || 10) / 10) * 10),
    }));
    try {
      const res = await fetch(`/api/quiz-bank/${selectedBank.id}/questions`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(normalizedItems),
      });
      if (res.ok) {
        alert(`Đã nạp thành công ${items.length} câu hỏi!`);
        selectBank(selectedBank);
      } else {
        alert("Lỗi khi import câu hỏi!");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi đường truyền kết nối");
    }
  };

  const handleImportEntireBankJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await offlineStorage.importFromJson(file);
      alert(`Đã nhập thành công bộ đề: "${imported.title}" với ${imported.questions?.length || 0} câu hỏi!`);
      const local = offlineStorage.getLocalBanks();
      setBanks(local);
      selectBank(imported as any);
    } catch (err: any) {
      alert("Không thể nhập file JSON: " + (err.message || err));
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black whitespace-nowrap">Ngân hàng câu hỏi (Quiz Bank)</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Tạo, chỉnh sửa và nhập file câu hỏi (Excel/CSV/JSON)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => {
              setPreviewTargetMode("new");
              setShowStudioModal(true);
            }}
            className="btn-3d-cyber-purple px-5 py-2.5 text-xs sm:text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <span>⚡</span>
            <span>Question Studio (Tạo đề AI & Tài liệu)</span>
          </button>
          <button
            onClick={() => {
              setPreviewTargetMode("new");
              setShowFileModal(true);
            }}
            className="px-3.5 py-2.5 rounded-xl glass border border-cyan-500/40 hover:bg-cyan-500/10 font-bold text-xs sm:text-sm text-cyan-300 transition inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <span>📂</span>
            <span>Nhập File / Text</span>
          </button>
          <label className="cursor-pointer px-4 py-2.5 rounded-xl glass border border-purple-500/40 hover:bg-purple-500/10 font-bold text-xs sm:text-sm text-purple-300 transition inline-flex items-center gap-2 whitespace-nowrap">
            <span>📥</span>
            <span>Nhập JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportEntireBankJson}
              className="hidden"
            />
          </label>
          <button
            onClick={() => {
              const loaded = offlineStorage.loadMagicWheelPresetIntoLocal();
              if (loaded) {
                const local = offlineStorage.getLocalBanks();
                setBanks(local);
                selectBank(loaded as any);
                alert("Đã nạp thành công bộ đề mẫu Vòng Quay Trí Tuệ vào danh sách!");
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Nạp ngay bộ đề mẫu Vòng Quay Trí Tuệ"
          >
            <span>🎡</span>
            <span>Nạp Đề Mẫu Vòng Quay</span>
          </button>
          <button
            onClick={() => setShowNewBankModal(true)}
            className="btn-3d-cyber-cyan px-5 py-2.5 text-xs sm:text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <SystemIcon name="create_room" className="w-4 h-4 shrink-0 text-cyan-200" />
            <span className="whitespace-nowrap font-bold">Tạo bộ đề mới</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start w-full animate-loaded-reveal">
        {/* Left Col: List of Banks */}
        {isSidebarCollapsed ? (
          <div className="w-full lg:w-14 shrink-0 flex flex-col items-center gap-3 glass rounded-2xl p-2.5 border border-border">
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="w-9 h-9 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 flex items-center justify-center transition cursor-pointer shadow-md"
              title="Mở rộng danh sách bộ đề"
            >
              ▶
            </button>
            <span className="text-[10px] font-bold text-slate-400 [writing-mode:vertical-lr] tracking-wider uppercase mt-1">
              Bộ đề ({banks.length})
            </span>
          </div>
        ) : (
          <div className="w-full lg:w-72 xl:w-80 shrink-0 glass rounded-2xl p-3.5 flex flex-col gap-3 border border-border transition-all duration-300">
            <div className="flex items-center justify-between px-1 border-b border-border/50 pb-2">
              <h2 className="font-bold text-sm sm:text-base flex items-center gap-2 text-white">
                <SystemIcon name="quiz_bank" className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Danh sách bộ đề</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold">
                  {banks.length}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                className="text-xs px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center gap-1 transition cursor-pointer"
                title="Thu gọn cột danh sách để xem câu hỏi rộng hơn"
              >
                <span>◀</span>
                <span className="hidden sm:inline text-[11px]">Thu gọn</span>
              </button>
            </div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Đang tải bộ câu hỏi...</span>
              </div>
            ) : banks.length === 0 ? (
              <p className="text-muted-foreground p-3 animate-loaded-reveal text-xs">Chưa có bộ câu hỏi nào</p>
            ) : (
              <div className="space-y-1.5 overflow-y-auto max-h-[75vh] pr-1 custom-scrollbar">
                {banks.map((b) => {
                  const isSelected = selectedBank?.id === b.id;
                  const qCount = b._count?.questions ?? ((b as any).questions?.length || 0);
                  return (
                    <div
                      key={b.id}
                      onClick={() => selectBank(b)}
                      className={`p-3 rounded-xl cursor-pointer transition border group relative ${
                        isSelected
                          ? "border-purple-500 bg-purple-600/15 shadow-md shadow-purple-950/40"
                          : "border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm leading-snug truncate ${isSelected ? "text-white" : "text-slate-200 group-hover:text-white"}`}>
                            {b.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                            <span className="font-semibold text-purple-300">{qCount} câu</span>
                            <span>•</span>
                            <span>{new Date(b.createdAt).toLocaleDateString("vi-VN")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditBank(b);
                            }}
                            className="p-1 rounded hover:bg-slate-700/60 text-slate-300 hover:text-white text-xs transition"
                            title="Sửa thông tin bộ đề"
                          >
                            ✏️
                          </button>
                          {!(b.isBuiltIn || b.id.startsWith("bank_mw_preset")) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBank(b);
                              }}
                              disabled={deletingBankId === b.id}
                              className="p-1 rounded hover:bg-rose-500/20 text-rose-400 text-xs transition flex items-center justify-center"
                              title="Xóa bộ đề"
                            >
                              {deletingBankId === b.id ? "..." : <SystemIcon name="trash" className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Right Col: Questions inside selected bank */}
        <div key={selectedBank?.id || "empty"} className="flex-1 min-w-0 w-full glass rounded-2xl p-5 sm:p-6 flex flex-col gap-4 animate-pull-from-left">
          {selectedBank ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    {isSidebarCollapsed && (
                      <button
                        onClick={() => setIsSidebarCollapsed(false)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-300 border border-slate-700 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1"
                        title="Mở danh sách bộ đề"
                      >
                        <span>▶</span>
                        <span>Danh sách đề</span>
                      </button>
                    )}
                    <h2 className="text-xl font-black">{selectedBank.title}</h2>
                    {(() => {
                      const localTarget = offlineStorage.getLocalBankById(selectedBank.id);
                      const currentLang = selectedBank.language || localTarget?.language || detectQuizBankLanguage(selectedBank);
                      return (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${
                            currentLang === "ENGLISH"
                              ? "bg-blue-500/20 text-blue-300 border-blue-400/40"
                              : "bg-red-500/20 text-red-300 border-red-400/40"
                          }`}
                          title={`Ngôn ngữ cài đặt: ${currentLang === "ENGLISH" ? "Tiếng Anh (US)" : "Tiếng Việt"}`}
                        >
                          <span>{currentLang === "ENGLISH" ? "🇺🇸" : "🇻🇳"}</span>
                          <span>{currentLang === "ENGLISH" ? "Bản Tiếng Anh" : "Bản Tiếng Việt"}</span>
                        </span>
                      );
                    })()}
                    <button
                      onClick={() => openEditBank(selectedBank)}
                      className="px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border text-xs text-purple-300 hover:text-white flex items-center gap-1 transition whitespace-nowrap"
                      title="Sửa tên, mô tả và cài đặt ngôn ngữ bộ đề"
                    >
                      <span>✏️</span>
                      <span className="whitespace-nowrap">Sửa đề</span>
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">{questions.length} câu hỏi hiện có</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setPreviewTargetMode("current");
                      setShowStudioModal(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white text-xs sm:text-sm font-black transition whitespace-nowrap inline-flex items-center gap-1.5 shadow-lg shadow-purple-500/20 cursor-pointer"
                  >
                    <span>⚡</span>
                    <span>Question Studio</span>
                  </button>
                  <button
                    onClick={() => {
                      setPreviewTargetMode("current");
                      setShowFileModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl glass border border-cyan-500/40 hover:bg-cyan-500/10 text-cyan-300 text-xs sm:text-sm font-bold transition whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>📂</span>
                    <span>Nhập File / Text</span>
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedBank) return;
                      offlineStorage.exportToJson({
                        ...selectedBank,
                        questions,
                      });
                    }}
                    className="px-3 py-2 rounded-xl glass border border-white/10 hover:bg-white/10 text-slate-300 text-xs sm:text-sm font-semibold transition whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer"
                    title="Xuất bộ đề ra file JSON để sao lưu hoặc chia sẻ ngoại tuyến"
                  >
                    <span>📤</span>
                    <span>Xuất JSON</span>
                  </button>

                  <div className="relative group inline-block">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-xl glass border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-300 text-xs sm:text-sm font-semibold transition whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer"
                      title="Tải mẫu Excel hoặc JSON cho bộ đề ô chữ Chiếc Nón Kỳ Diệu"
                    >
                      <span>📥</span>
                      <span>Tải Mẫu Đề</span>
                      <span className="text-[10px] text-emerald-400">▼</span>
                    </button>
                    <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-[#14172b] border border-white/10 rounded-xl p-1.5 shadow-2xl z-30 min-w-[210px] backdrop-blur-md">
                      <button
                        type="button"
                        onClick={downloadMagicWheelExcelTemplate}
                        className="px-3 py-2 rounded-lg text-left text-xs text-emerald-300 hover:bg-emerald-500/20 font-medium flex items-center gap-2 transition"
                      >
                        <span>📊</span>
                        <span>Mẫu Excel Ô Chữ (.xlsx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={downloadMagicWheelJsonTemplate}
                        className="px-3 py-2 rounded-lg text-left text-xs text-cyan-300 hover:bg-cyan-500/20 font-medium flex items-center gap-2 transition"
                      >
                        <span>⚙️</span>
                        <span>Mẫu JSON Ô Chữ (.json)</span>
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={openNewQuestionModal}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer"
                  >
                    + Thêm câu hỏi
                  </button>
                  <button
                    onClick={() => handleDeleteBank(selectedBank)}
                    disabled={deletingBankId === selectedBank.id}
                    className="px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/30 hover:bg-destructive/20 text-destructive text-xs sm:text-sm font-semibold transition inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    title="Xóa bộ đề này"
                  >
                    <SystemIcon name="trash" className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="whitespace-nowrap">Xóa bộ đề</span>
                  </button>
                </div>
              </div>

              {loadingQuestions ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Đang tải câu hỏi...</span>
                </div>
              ) : questions.length === 0 ? (
                <div className="py-10 px-4 text-center animate-loaded-reveal max-w-2xl mx-auto">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl shadow-inner">
                    📝
                  </div>
                  <h3 className="text-base font-bold text-foreground">Bộ đề này chưa có câu hỏi nào</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    Chọn một trong các phương thức dưới đây để bắt đầu thêm câu hỏi vào bộ đề nhanh chóng:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 text-left">
                    <button
                      type="button"
                      onClick={openNewQuestionModal}
                      className="p-4 rounded-xl border border-border/80 bg-card/60 hover:bg-card hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all text-left group cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
                          ✍️
                        </div>
                        <div className="font-semibold text-sm text-foreground group-hover:text-purple-300 transition-colors">
                          Soạn thủ công
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Tự tay tạo câu hỏi với 7 dạng thức & đính kèm video/audio/hình ảnh.
                        </p>
                      </div>
                      <span className="mt-3 text-xs font-semibold text-blue-400 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Bắt đầu soạn →
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPreviewTargetMode("current");
                        setShowStudioModal(true);
                      }}
                      className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/30 hover:border-purple-400/60 hover:shadow-lg hover:shadow-purple-500/10 transition-all text-left group cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
                          ⚡
                        </div>
                        <div className="font-semibold text-sm text-foreground group-hover:text-purple-200 transition-colors">
                          Question Studio AI
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Tạo đề tự động bằng AI, trích xuất từ tài liệu, sinh hàng loạt câu hỏi.
                        </p>
                      </div>
                      <span className="mt-3 text-xs font-semibold text-purple-300 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Khởi chạy AI →
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPreviewTargetMode("current");
                        setShowFileModal(true);
                      }}
                      className="p-4 rounded-xl border border-border/80 bg-card/60 hover:bg-card hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all text-left group cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
                          📁
                        </div>
                        <div className="font-semibold text-sm text-foreground group-hover:text-emerald-300 transition-colors">
                          Import File
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Tải lên từ file Word (.docx), Excel (.xlsx), hoặc văn bản text mẫu.
                        </p>
                      </div>
                      <span className="mt-3 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Chọn tệp tải lên →
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[65vh] animate-loaded-reveal">
                  {questions.map((q, i) => (
                    <div key={q.id || i} className="p-4 rounded-xl border border-border bg-card/40 space-y-2 relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          {q.type}
                        </span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>⏱️ {q.timeLimit}s</span>
                          <span>⭐ {q.points}đ</span>
                          {q.id && (
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                              <button
                                onClick={() => openEditQuestion(q)}
                                className="px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1 transition"
                                title="Sửa câu hỏi này"
                              >
                                <span>✏️</span>
                                <span>Sửa</span>
                              </button>
                              <button
                                onClick={() => handleDeleteQuestion(q.id!)}
                                disabled={deletingQuestionId === q.id}
                                className="p-1 rounded hover:bg-destructive/20 text-destructive text-xs transition flex items-center justify-center"
                                title="Xóa câu hỏi này"
                              >
                                {deletingQuestionId === q.id ? "..." : <SystemIcon name="trash" className="w-3.5 h-3.5 text-red-400" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="font-semibold text-foreground">
                        {i + 1}. {q.content}
                      </p>
                      {/* Multimedia Badge */}
                      {q.mediaUrl && (
                        <div className="flex items-center gap-1.5 text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg w-fit">
                          <span>
                            {q.mediaType === "VIDEO" || q.mediaUrl.match(/\.(mp4|webm)/i) || q.mediaUrl.includes("youtube.com") || q.mediaUrl.includes("youtu.be")
                              ? "🎬 Video"
                              : q.mediaType === "AUDIO" || q.mediaUrl.match(/\.(mp3|wav|ogg)/i)
                              ? "🎵 Audio"
                              : "🖼️ Hình ảnh"}
                          </span>
                          {(q.mediaType === "VIDEO" || q.mediaType === "AUDIO") && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              • {q.mediaPlaybackMode === "PARALLEL" ? "Đếm song song" : "Phát xong mới đếm"}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Options for MC & DRAG_DROP */}
                      {q.type !== "MATCHING" && q.type !== "CLOZE_DROPDOWN" && q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                          {q.options.map((opt, optIdx) => (
                            <div
                              key={opt.id || optIdx}
                              className={`p-2 rounded-lg text-xs font-medium border ${
                                q.type === "DRAG_DROP"
                                  ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                                  : opt.isCorrect
                                  ? "border-green-500/60 bg-green-500/10 text-green-300"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              <span className="font-bold mr-1">
                                {q.type === "DRAG_DROP" ? `#${optIdx + 1}.` : `${opt.id || String.fromCharCode(65 + optIdx)}.`}
                              </span>{" "}
                              {opt.text}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Matching Pairs */}
                      {q.type === "MATCHING" && q.pairs && (q.pairs as any).length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                          {(q.pairs as any[]).map((p: any, pIdx: number) => (
                            <div
                              key={p.id || pIdx}
                              className="p-2 rounded-lg text-xs font-medium border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 flex items-center justify-between"
                            >
                              <span className="font-semibold text-slate-200">{p.left}</span>
                              <span className="text-cyan-400 font-bold mx-1">⟷</span>
                              <span className="text-cyan-300">{p.right}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Cloze Dropdowns */}
                      {q.type === "CLOZE_DROPDOWN" && q.options && (q.options as any).length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {(q.options as any[]).map((blank: any, bIdx: number) => {
                            const correctOpt = blank.options?.find((o: any) => o.isCorrect);
                            return (
                              <div
                                key={blank.blankId || bIdx}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-purple-500/30 bg-purple-500/10 text-purple-200 flex items-center gap-1.5"
                              >
                                <span className="font-bold text-purple-400">[{blank.blankId || bIdx + 1}]</span>
                                <span>Đáp án: <strong className="text-green-300">{correctOpt?.text || "Chưa đặt"}</strong></span>
                                <span className="text-[10px] text-muted-foreground">({blank.options?.length || 0} lựa chọn)</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Answer for Fill in blank / Essay */}
                      {q.answer && (
                        <div className="text-xs text-cyan-300 mt-1 flex items-center gap-2">
                          <span>Đáp án chuẩn: <span className="font-mono">{q.answer}</span></span>
                          {(q as any).allowManualGrading && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold text-[10px]">
                              ✍️ MC chấm tay
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center text-muted-foreground">
              Chọn hoặc tạo một bộ câu hỏi để quản lý nội dung
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Bank */}
      {showNewBankModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateBank}
            className="glass rounded-2xl p-6 w-full max-w-lg space-y-4 border border-border shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>✨</span>
                <span>Tạo bộ câu hỏi mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewBankModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Tiêu đề bộ đề *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="VD: Kiểm tra kiến thức Khoa học tự nhiên"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Mô tả tóm tắt (không bắt buộc)
              </label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Mô tả nội dung, chủ đề hoặc mức độ khó..."
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Phân loại thể thức Bộ đề *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewBankCategory("STANDARD")}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                    newBankCategory === "STANDARD"
                      ? "border-cyan-500 bg-cyan-500/20 shadow-md shadow-cyan-500/20"
                      : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xl">🎯</span>
                  <div>
                    <p className="text-xs font-bold text-white">Trắc nghiệm Tiêu chuẩn</p>
                    <p className="text-[11px] text-slate-400">Dành cho 8 game show trắc nghiệm</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewBankCategory("WORD_PUZZLE")}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                    newBankCategory === "WORD_PUZZLE"
                      ? "border-amber-500 bg-amber-500/25 shadow-md shadow-amber-500/20"
                      : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xl">🎡</span>
                  <div>
                    <p className="text-xs font-bold text-amber-200">Ô Chữ Vòng Quay Trí Tuệ</p>
                    <p className="text-[11px] text-amber-400/80">Chuyên biệt bàn ô chữ 4x14</p>
                  </div>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {newBankCategory === "WORD_PUZZLE"
                  ? "💡 Bộ đề chuyên biệt Ô chữ Vòng Quay Trí Tuệ, tối ưu bảng ô chữ 4x14."
                  : "💡 Bộ đề trắc nghiệm chuẩn không thể kết hợp câu hỏi ô chữ Vòng Quay."}
              </p>
            </div>

            {/* Khuyến khích chọn Ngôn ngữ ngay từ khi tạo đề */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Ngôn ngữ chính của bộ đề *</span>
                <span className="text-[10px] text-amber-400 font-normal">Hệ thống sẽ gắn vào setting & cảnh báo nếu nhập sai</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setNewBankLanguage("VIETNAMESE")}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                    newBankLanguage === "VIETNAMESE"
                      ? "border-red-500 bg-red-500/20 shadow-md shadow-red-500/20 text-white"
                      : "border-slate-800 bg-slate-900/50 hover:border-slate-700 text-slate-400"
                  }`}
                >
                  <span className="text-2xl">🇻🇳</span>
                  <div>
                    <p className="text-xs font-bold text-white">Tiếng Việt (Mặc định)</p>
                    <p className="text-[10px] text-slate-400">Luật tiếng Việt có dấu thanh</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewBankLanguage("ENGLISH")}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                    newBankLanguage === "ENGLISH"
                      ? "border-blue-500 bg-blue-500/20 shadow-md shadow-blue-500/20 text-white"
                      : "border-slate-800 bg-slate-900/50 hover:border-slate-700 text-slate-400"
                  }`}
                >
                  <span className="text-2xl">🇺🇸</span>
                  <div>
                    <p className="text-xs font-bold text-blue-200">English (Tiếng Anh)</p>
                    <p className="text-[10px] text-blue-400/80">US rules, mua nguyên âm $250</p>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Bạn muốn bắt đầu như thế nào?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewBankInitMode("MANUAL")}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    newBankInitMode === "MANUAL"
                      ? "border-purple-500 bg-purple-500/20 shadow-md shadow-purple-500/20"
                      : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xl">✍️</span>
                  <div>
                    <p className="text-xs font-bold text-white">Soạn thủ công</p>
                    <p className="text-[11px] text-slate-400">Mở ngay form soạn câu hỏi</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewBankInitMode("AI_STUDIO")}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    newBankInitMode === "AI_STUDIO"
                      ? "border-cyan-500 bg-cyan-500/20 shadow-md shadow-cyan-500/20"
                      : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xl">⚡</span>
                  <div>
                    <p className="text-xs font-bold text-white">Question Studio</p>
                    <p className="text-[11px] text-slate-400">Tạo đề bằng AI & Tài liệu</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewBankInitMode("IMPORT_FILE")}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    newBankInitMode === "IMPORT_FILE"
                      ? "border-emerald-500 bg-emerald-500/20 shadow-md shadow-emerald-500/20"
                      : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xl">📁</span>
                  <div>
                    <p className="text-xs font-bold text-white">Nhập từ file</p>
                    <p className="text-[11px] text-slate-400">Word, Excel, PDF hoặc Text</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewBankInitMode("EMPTY")}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    newBankInitMode === "EMPTY"
                      ? "border-amber-500 bg-amber-500/20 shadow-md shadow-amber-500/20"
                      : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xl">📦</span>
                  <div>
                    <p className="text-xs font-bold text-white">Chỉ tạo đề trống</p>
                    <p className="text-[11px] text-slate-400">Chọn đề và thêm câu hỏi sau</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowNewBankModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-300"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isCreatingBank || !newTitle.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isCreatingBank ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  <>
                    <span>Tạo & Bắt đầu ngay</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: New Question */}
      {showNewQModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateQuestion}
            className="glass rounded-2xl p-6 w-full max-w-2xl space-y-4 border border-border my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xl font-bold">Thêm câu hỏi mới</h3>
              <button
                type="button"
                onClick={() => setShowNewQModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            {/* 1-Touch Question Type Grid */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Dạng câu hỏi *
              </label>
              {isCurrentBankWordPuzzle ? (
                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/50 flex items-center gap-3">
                  <span className="text-2xl">🎡</span>
                  <div>
                    <p className="text-sm font-bold text-purple-200">Ô chữ Vòng Quay Trí Tuệ (4 hàng x 14 ô)</p>
                    <p className="text-xs text-slate-400">Định dạng bảng chữ trường quay chuẩn 56 ô</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "MC_SINGLE", icon: "🔘", label: "Trắc nghiệm 1", sub: "1 đáp án đúng" },
                    { id: "MC_MULTI", icon: "☑️", label: "Nhiều đáp án", sub: "Chọn nhiều câu" },
                    { id: "TRUE_FALSE", icon: "⚖️", label: "Đúng / Sai", sub: "2 lựa chọn nhanh" },
                    { id: "FILL_BLANK", icon: "✍️", label: "Điền từ", sub: "Tự luận ngắn" },
                    { id: "MATCHING", icon: "🔗", label: "Nối cặp", sub: "Ghép cột A - B" },
                    { id: "DRAG_DROP", icon: "🔀", label: "Sắp xếp", sub: "Theo thứ tự" },
                    { id: "CLOZE_DROPDOWN", icon: "📑", label: "Đục lỗ", sub: "Menu thả [1],[2]" },
                  ].map((item) => {
                    const isSelected = qType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setQType(item.id)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? "bg-purple-600/30 border-purple-400 shadow-md shadow-purple-950/50 text-white"
                            : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-base">{item.icon}</span>
                          <span className="text-xs font-bold leading-tight">{item.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{item.sub}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Point & Timer Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mức điểm chuẩn hóa
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { pts: 10, time: 15, label: "10đ", sub: "15s" },
                    { pts: 20, time: 20, label: "20đ", sub: "20s" },
                    { pts: 30, time: 30, label: "30đ", sub: "30s" },
                    { pts: 40, time: 60, label: "40đ", sub: "60s" },
                  ].map((lvl) => {
                    const isSelected = qPoints === lvl.pts;
                    return (
                      <button
                        key={lvl.pts}
                        type="button"
                        onClick={() => {
                          setQPoints(lvl.pts);
                          setQTimeLimit(lvl.time);
                        }}
                        className={`py-2 px-1 rounded-xl border text-center transition cursor-pointer ${
                          isSelected
                            ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold shadow-md shadow-cyan-950/50"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="text-xs font-black">{lvl.label}</div>
                        <div className="text-[10px] text-slate-400">{lvl.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Thời gian tùy chỉnh (giây)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={qTimeLimit}
                    onChange={(e) => setQTimeLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono font-bold text-cyan-300 text-center"
                  />
                  <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">giây</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {qType === "WORD_PUZZLE" ? "Gợi ý của MC về cụm từ bí mật *" : "Nội dung câu hỏi *"}
                {qType === "CLOZE_DROPDOWN" && (
                  <span className="text-xs text-purple-400 font-normal ml-2">
                    (Dùng [1], [2], [3]... tại vị trí cần đục lỗ)
                  </span>
                )}
                {qType === "WORD_PUZZLE" && (
                  <span className="text-xs text-amber-300 font-normal ml-2">
                    (Mô tả hoặc câu hỏi gợi mở để MC đọc cho người chơi)
                  </span>
                )}
              </label>
              <textarea
                required
                value={qContent}
                onChange={(e) => setQContent(e.target.value)}
                placeholder={
                  qType === "CLOZE_DROPDOWN"
                    ? "Ví dụ: Thủ đô của Việt Nam là [1], còn trung tâm kinh tế phía Nam là [2]."
                    : qType === "WORD_PUZZLE"
                    ? "Ví dụ: Vị anh hùng áo vải cờ đào đại phá 29 vạn quân Thanh..."
                    : "Nhập nội dung câu hỏi..."
                }
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-input border border-border focus:ring-2 focus:ring-ring text-sm"
              />
            </div>

            {/* 1 & 2: Multiple Choice (MC_SINGLE / MC_MULTI) - 2 to 10 options */}
            {(qType === "MC_SINGLE" || qType === "MC_MULTI") && (
              <div className="space-y-2 p-3.5 rounded-xl border border-border bg-card/30">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
                    Các phương án lựa chọn ({qOptions.length}/10 phương án - chọn đáp án đúng)
                  </label>
                  {qOptions.length < 10 && (
                    <button
                      type="button"
                      onClick={() => addOption(false)}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      + Thêm lựa chọn ({String.fromCharCode(65 + qOptions.length)})
                    </button>
                  )}
                </div>
                <div className="space-y-2 pt-1">
                  {qOptions.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (qType === "MC_SINGLE") {
                            setQOptions(qOptions.map((o, i) => ({ ...o, isCorrect: i === idx })));
                          } else {
                            setQOptions(qOptions.map((o, i) => (i === idx ? { ...o, isCorrect: !o.isCorrect } : o)));
                          }
                        }}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black text-xs transition cursor-pointer shrink-0 ${
                          opt.isCorrect
                            ? "bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-950/50"
                            : "bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600"
                        }`}
                        title={opt.isCorrect ? "Đáp án ĐÚNG (bấm để đổi)" : "Bấm để chọn làm đáp án ĐÚNG"}
                      >
                        {String.fromCharCode(65 + idx)}
                        {opt.isCorrect && <span className="ml-0.5 text-[10px]">✓</span>}
                      </button>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const newOpts = [...qOptions];
                          newOpts[idx].text = e.target.value;
                          setQOptions(newOpts);
                        }}
                        placeholder={`Nội dung lựa chọn ${String.fromCharCode(65 + idx)}...`}
                        className={`flex-1 px-3 py-2 rounded-xl bg-slate-900 border text-sm transition ${
                          opt.isCorrect ? "border-emerald-500/50 text-white" : "border-slate-800 text-slate-200"
                        }`}
                      />
                      {qOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(idx, false)}
                          className="w-8 h-8 rounded-lg hover:bg-rose-500/20 text-rose-400 text-xs flex items-center justify-center transition shrink-0"
                          title="Xóa lựa chọn này"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3: TRUE_FALSE */}
            {qType === "TRUE_FALSE" && (
              <div className="p-3.5 rounded-xl border border-border bg-card/30">
                <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-2">
                  Đáp án đúng
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-card/60">
                    <input
                      type="radio"
                      name="new_tf_answer"
                      value="true"
                      checked={qAnswer === "true"}
                      onChange={(e) => setQAnswer(e.target.value)}
                      className="text-purple-600"
                    />
                    <span className="font-medium text-sm text-green-300">Đúng (True)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-card/60">
                    <input
                      type="radio"
                      name="new_tf_answer"
                      value="false"
                      checked={qAnswer === "false"}
                      onChange={(e) => setQAnswer(e.target.value)}
                      className="text-purple-600"
                    />
                    <span className="font-medium text-sm text-red-300">Sai (False)</span>
                  </label>
                </div>
              </div>
            )}

            {/* 4: FILL_BLANK & ESSAY (Merged) */}
            {(qType === "FILL_BLANK" || qType === "ESSAY") && (
              <div className="space-y-3 p-3.5 rounded-xl border border-border bg-card/30">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-1">
                    Các đáp án chuẩn (Phân tách nhiều cách viết bằng dấu chấm phẩy ;)
                  </label>
                  <input
                    type="text"
                    value={qAnswer}
                    onChange={(e) => setQAnswer(e.target.value)}
                    placeholder="VD: Hà Nội; Ha Noi; Hanoi; Thủ đô Hà Nội"
                    className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Hệ thống sẽ tự động so khớp không phân biệt chữ hoa, chữ thường và dấu khoảng trắng.
                  </p>
                </div>

                <div className="pt-2 border-t border-border">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={qAllowManualGrading}
                      onChange={(e) => setQAllowManualGrading(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-purple-200">
                      Cho phép MC / Quản trò chấm điểm thủ công (Manual Grading)
                    </span>
                  </label>
                  <p className="text-[11px] text-muted-foreground ml-6">
                    Bật tùy chọn này cho câu hỏi tự luận mở, đoạn văn ngắn hoặc khi cần MC linh hoạt chấm điểm tại chỗ.
                  </p>
                </div>

                {qAllowManualGrading && (
                  <div className="pt-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 mb-1">
                      📋 Tiêu chí chấm điểm / Thang điểm Rubric (Hiển thị cho MC tham khảo khi chấm)
                    </label>
                    <textarea
                      value={qGradingCriteria}
                      onChange={(e) => setQGradingCriteria(e.target.value)}
                      placeholder="VD: Ý 1 nêu được nguyên nhân (5đ); Ý 2 nêu được giải pháp khắc phục (5đ)..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl bg-input border border-amber-500/40 text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 5: MATCHING (Nối cặp tương ứng A - B) - 2 to 8 pairs */}
            {qType === "MATCHING" && (
              <div className="space-y-2 p-3.5 rounded-xl border border-border bg-card/30">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
                      Cấu hình các cặp nối A - B ({qPairs.length}/8 cặp)
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Cột trái nối với Cột phải tương ứng. Hệ thống sẽ tự động xáo trộn vế phải khi vào trận.
                    </p>
                  </div>
                  {qPairs.length < 8 && (
                    <button
                      type="button"
                      onClick={() => addPair(false)}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      + Thêm cặp #{qPairs.length + 1}
                    </button>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  {qPairs.map((p, idx) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="font-bold text-xs text-purple-300 w-6 text-center">#{idx + 1}</span>
                      <input
                        type="text"
                        value={p.left}
                        onChange={(e) => {
                          const updated = [...qPairs];
                          updated[idx].left = e.target.value;
                          setQPairs(updated);
                        }}
                        placeholder={`Vế trái (Thuật ngữ ${idx + 1})`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-input border border-border text-sm"
                      />
                      <span className="text-muted-foreground text-sm font-bold">⟷</span>
                      <input
                        type="text"
                        value={p.right}
                        onChange={(e) => {
                          const updated = [...qPairs];
                          updated[idx].right = e.target.value;
                          setQPairs(updated);
                        }}
                        placeholder={`Vế phải (Khái niệm ${idx + 1})`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-input border border-border text-sm"
                      />
                      {qPairs.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removePair(idx, false)}
                          className="p-1.5 rounded-lg hover:bg-destructive/20 text-destructive text-xs"
                          title="Xóa cặp này"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6: DRAG_DROP (Sắp xếp thứ tự các bước) - 2 to 8 steps */}
            {qType === "DRAG_DROP" && (
              <div className="space-y-2 p-3.5 rounded-xl border border-border bg-card/30">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
                      Cấu hình các bước theo đúng trình tự chuẩn ({qSteps.length}/8 bước)
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Nhập thứ tự chuẩn từ 1 đến hết. Khi bắt đầu thi, hệ thống sẽ xáo trộn ngẫu nhiên để thí sinh kéo thả xếp lại.
                    </p>
                  </div>
                  {qSteps.length < 8 && (
                    <button
                      type="button"
                      onClick={() => addStep(false)}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      + Thêm bước #{qSteps.length + 1}
                    </button>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  {qSteps.map((s, idx) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <span className="font-bold text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300 whitespace-nowrap">
                        Bước {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={s.text}
                        onChange={(e) => {
                          const updated = [...qSteps];
                          updated[idx].text = e.target.value;
                          setQSteps(updated);
                        }}
                        placeholder={`Nội dung bước ${idx + 1}...`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-input border border-border text-sm"
                      />
                      {qSteps.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeStep(idx, false)}
                          className="p-1.5 rounded-lg hover:bg-destructive/20 text-destructive text-xs"
                          title="Xóa bước này"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7: CLOZE_DROPDOWN (Đoạn văn đục lỗ menu thả xuống) */}
            {qType === "CLOZE_DROPDOWN" && (
              <div className="space-y-3 p-3.5 rounded-xl border border-border bg-card/30">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
                      Cấu hình các ô trống đục lỗ ({qClozeBlanks.length}/6 ô)
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Mỗi ô đục lỗ có danh sách các lựa chọn để thí sinh chọn từ menu thả xuống.
                    </p>
                  </div>
                  {qClozeBlanks.length < 6 && (
                    <button
                      type="button"
                      onClick={() => addClozeBlank(false)}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      + Thêm ô đục lỗ [{qClozeBlanks.length + 1}]
                    </button>
                  )}
                </div>

                <div className="space-y-3 pt-1">
                  {qClozeBlanks.map((blank, bIdx) => (
                    <div key={blank.blankId} className="p-3 rounded-lg border border-border bg-card/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-purple-300">
                          📌 Ô trống [{blank.blankId}] - Các phương án thả xuống
                        </span>
                        <div className="flex items-center gap-2">
                          {blank.options.length < 6 && (
                            <button
                              type="button"
                              onClick={() => addClozeOption(bIdx, false)}
                              className="text-[11px] text-purple-300 hover:text-purple-200 font-semibold"
                            >
                              + Thêm phương án
                            </button>
                          )}
                          {qClozeBlanks.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeClozeBlank(bIdx, false)}
                              className="text-[11px] text-destructive hover:underline"
                            >
                              Xóa ô [{blank.blankId}]
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {blank.options.map((opt, oIdx) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`cloze_correct_${bIdx}`}
                              checked={opt.isCorrect}
                              onChange={() => {
                                const updated = qClozeBlanks.map((b, bi) =>
                                  bi === bIdx
                                    ? {
                                        ...b,
                                        options: b.options.map((o, oi) => ({
                                          ...o,
                                          isCorrect: oi === oIdx,
                                        })),
                                      }
                                    : b
                                );
                                setQClozeBlanks(updated);
                              }}
                              className="w-3.5 h-3.5 text-purple-600 cursor-pointer"
                              title="Đánh dấu đây là đáp án đúng"
                            />
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const updated = qClozeBlanks.map((b, bi) =>
                                  bi === bIdx
                                    ? {
                                        ...b,
                                        options: b.options.map((o, oi) =>
                                          oi === oIdx ? { ...o, text: e.target.value } : o
                                        ),
                                      }
                                    : b
                                );
                                setQClozeBlanks(updated);
                              }}
                              placeholder={`Phương án ${oIdx + 1}${opt.isCorrect ? " (Đáp án đúng)" : ""}`}
                              className="flex-1 px-2.5 py-1 rounded bg-input border border-border text-xs"
                            />
                            {blank.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeClozeOption(bIdx, oIdx, false)}
                                className="text-destructive hover:bg-destructive/20 p-1 rounded text-xs"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 8: WORD_PUZZLE (Ô chữ Chiếc Nón Kỳ Diệu) */}
            {qType === "WORD_PUZZLE" && (
              <div className="space-y-3 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎡</span>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                        Cấu hình Ô Chữ Chiếc Nón Kỳ Diệu (Bàn 4 hàng x 14 ô)
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Hệ thống tự động canh giữa và dàn trải chữ cái trên lưới 4 hàng x 14 ô chuẩn trường quay.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400">Vòng thi:</span>
                    <select
                      value={qRound}
                      onChange={(e) => setQRound(Number(e.target.value) || 1)}
                      className="px-2.5 py-1 rounded-lg bg-black/50 border border-amber-500/40 text-amber-200 text-xs font-bold cursor-pointer"
                    >
                      <option value={1}>Vòng 1</option>
                      <option value={2}>Vòng 2</option>
                      <option value={3}>Vòng 3</option>
                      <option value={4}>Vòng 4 (Chung kết)</option>
                    </select>
                  </div>
                </div>

                {/* Bộ chọn Định dạng: Tiêu chuẩn vs Ô chữ liên kết */}
                <div>
                  <label className="block text-xs font-bold text-amber-200 mb-1">
                    Định dạng Ô Chữ (Puzzle Format)
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/50 border border-amber-500/30">
                    <button
                      type="button"
                      onClick={() => setQPuzzleType("STANDARD")}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        qPuzzleType === "STANDARD"
                          ? "bg-amber-500 text-slate-950 shadow-md"
                          : "text-amber-200/70 hover:bg-white/5"
                      }`}
                    >
                      <span>📝</span>
                      <span>Tiêu chuẩn (Hàng ngang)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQPuzzleType("CROSSWORD");
                        setQClueDisplayMode("CATEGORY"); // Tự động ưu tiên Chủ đề cho Ô Chữ Liên Kết
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        qPuzzleType === "CROSSWORD"
                          ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md ring-2 ring-yellow-300"
                          : "text-amber-200/70 hover:bg-white/5"
                      }`}
                    >
                      <span>🔀</span>
                      <span>Ô Chữ Liên Kết / Tung Hoành</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-amber-200 mb-1">
                      Chủ đề ô chữ * <span className="text-muted-foreground font-normal">(Hiển thị cho khán giả & thí sinh)</span>
                    </label>
                    <input
                      type="text"
                      value={qHint}
                      onChange={(e) => setQHint(e.target.value)}
                      placeholder="VD: DANH NHÂN LỊCH SỬ, ĐỊA DANH, THƠ CA..."
                      className="w-full px-3 py-2 rounded-lg bg-black/40 border border-amber-500/30 text-amber-100 text-sm focus:border-amber-400"
                    />
                  </div>
                  {qPuzzleType === "STANDARD" && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-amber-200">
                          Cụm từ bí mật (Đáp án) *
                        </label>
                        <span className="text-[10px] text-amber-300/80 font-mono">
                          {qAnswer.replace(/\s+/g, "").length} chữ cái
                        </span>
                      </div>
                      <input
                        type="text"
                        value={qAnswer}
                        onChange={(e) => setQAnswer(e.target.value.toUpperCase())}
                        placeholder="VD: NGUYỄN TRÃI, VỊNH HẠ LONG..."
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-amber-500/30 text-amber-100 font-bold text-sm tracking-wider uppercase focus:border-amber-400"
                      />
                      {(() => {
                        const isSameLetterCat = /SAME[\s_-]*LETTER|CÙNG CHỮ CÁI ĐẦU/i.test(qHint);
                        if (isSameLetterCat) {
                          const trimmed = qAnswer.trim();
                          if (trimmed.length === 0) {
                            return (
                              <div className="mt-2 p-2.5 rounded-lg bg-indigo-500/15 border border-indigo-500/40 text-indigo-200 text-xs flex items-start gap-2 shadow-sm animate-fadeIn">
                                <span className="text-base shrink-0">✨</span>
                                <div className="leading-relaxed">
                                  <strong className="font-bold text-indigo-300">Luật SAME LETTER (Bản Anh):</strong> Tất cả các từ phải bắt đầu bằng cùng một phụ âm (không được dùng nguyên âm A, E, I, O, U). Ký tự nối độc lập như &quot;&amp;&quot; hay &quot;-&quot; được phép đứng xen giữa. Đoán trúng chữ SAME LETTER sẽ nhận thưởng nóng <strong>+$1,000 / +1.000 điểm</strong>!
                                </div>
                              </div>
                            );
                          }
                          const slCheck = validateSameLetterPhrase(trimmed);
                          if (!slCheck.valid) {
                            return (
                              <div className="mt-2 p-2.5 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-xs flex items-start gap-2 shadow-sm animate-fadeIn">
                                <span className="text-base shrink-0">❌</span>
                                <div className="leading-relaxed">
                                  <strong className="font-bold text-red-300">Câu hỏi không hợp lệ:</strong> {slCheck.error}
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="mt-2 p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-2 shadow-sm animate-fadeIn">
                                <span className="text-base shrink-0">✅</span>
                                <div className="leading-relaxed">
                                  <strong className="font-bold text-emerald-300">SAME LETTER hợp lệ:</strong> Tất cả các từ đều bắt đầu bằng phụ âm <strong>[{slCheck.sameLetter}]</strong>. Thí sinh gọi đúng chữ <strong>[{slCheck.sameLetter}]</strong> sẽ được thưởng nóng +$1,000 / +1.000 điểm!
                                </div>
                              </div>
                            );
                          }
                        }
                        const trimmed = qAnswer.trim();
                        if (trimmed.length > 0 && !isVietnameseAlphabetLetter(trimmed[0])) {
                          return (
                            <div className="mt-2 p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2 shadow-sm animate-fadeIn">
                              <span className="text-base shrink-0">⚠️</span>
                              <div className="leading-relaxed">
                                <strong className="font-bold text-amber-200">Khuyến cáo:</strong> Từ khoá nên bắt đầu bằng chữ cái tiếng Việt. Ký tự đặc biệt hoặc số ở đầu (&quot;{trimmed[0]}&quot;) sẽ được hệ thống tự động hiển thị ngay khi mở bảng và không được tính vào lượt lật chữ đoán nhanh.
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                  {qPuzzleType === "CROSSWORD" && (
                    <div className="flex flex-col justify-center">
                      <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                        <span>ℹ️</span>
                        <span>Nhập các từ khoá đan xen vào bảng bên dưới. Khi lưu, đáp án tổng thể sẽ được hệ thống tự động tổng hợp.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chế độ hiển thị CAM 3 Lower-Third */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-amber-200">
                      Chế độ hiển thị trên màn hình trường quay (CAM 3 Lower-Third)
                    </label>
                    {qPuzzleType === "CROSSWORD" && (
                      <span className="text-[10px] text-amber-300/80">
                        ⭐ Ưu tiên Chủ đề cho Ô Chữ Liên Kết
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 p-2.5 rounded-lg bg-black/40 border border-amber-500/30">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-amber-100">
                      <input
                        type="radio"
                        name="qClueDisplayMode"
                        value="CATEGORY"
                        checked={qClueDisplayMode === "CATEGORY"}
                        onChange={() => setQClueDisplayMode("CATEGORY")}
                        className="text-amber-500 focus:ring-amber-400"
                      />
                      <span>🏷️ Ưu tiên hiện Chủ đề (Khuyến nghị cho Ô Chữ Liên Kết)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-amber-100">
                      <input
                        type="radio"
                        name="qClueDisplayMode"
                        value="CLUE"
                        checked={qClueDisplayMode === "CLUE"}
                        onChange={() => setQClueDisplayMode("CLUE")}
                        className="text-amber-500 focus:ring-amber-400"
                      />
                      <span>💡 Ưu tiên hiện Gợi ý (Gợi ý phải bao quát tất cả từ khoá)</span>
                    </label>
                  </div>
                </div>

                {/* BỘ SOẠN Ô CHỮ LIÊN KẾT (CROSSWORD BUILDER) */}
                {qPuzzleType === "CROSSWORD" && (
                  <div className="space-y-3 p-3.5 rounded-xl bg-black/60 border border-amber-500/40">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-black text-sm">🔀 DANH SÁCH TỪ KHOÁ LIÊN KẾT:</span>
                        <span className="text-[11px] text-amber-200/70">
                          ({qCrosswordWords.length} từ)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const wordsList = qCrosswordWords.map((w) => w.word).filter(Boolean);
                            if (wordsList.length < 2) {
                              alert("Vui lòng nhập ít nhất 2 từ khoá để tự động tìm giao điểm!");
                              return;
                            }
                            const autoLayout = generateAutoCrosswordLayout(wordsList);
                            setQCrosswordWords(autoLayout);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow hover:brightness-110 flex items-center gap-1 transition"
                        >
                          <span>⚡ Tự động tìm giao điểm &amp; xếp ô chữ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (qCrosswordWords.length >= 6) {
                              alert("Tối đa 6 từ khoá trong một ô chữ liên kết!");
                              return;
                            }
                            setQCrosswordWords([
                              ...qCrosswordWords,
                              {
                                id: `cw_${Date.now()}`,
                                word: "",
                                row: Math.min(3, qCrosswordWords.length),
                                col: 2,
                                direction: "ACROSS",
                              },
                            ]);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center gap-1 transition"
                        >
                          <span>+ Thêm từ</span>
                        </button>
                      </div>
                    </div>

                    {/* Words rows list */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {qCrosswordWords.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-2 rounded-lg bg-black/40 border border-amber-500/20 flex flex-wrap items-center gap-2 text-xs"
                        >
                          <span className="font-bold text-amber-300 w-6 shrink-0">#{idx + 1}</span>
                          <input
                            type="text"
                            value={item.word}
                            onChange={(e) => {
                              const next = [...qCrosswordWords];
                              next[idx] = { ...item, word: e.target.value.toUpperCase() };
                              setQCrosswordWords(next);
                            }}
                            placeholder="Nhập từ khoá..."
                            className="flex-1 min-w-[120px] px-2.5 py-1.5 rounded bg-black/60 border border-amber-500/30 text-amber-100 font-bold uppercase tracking-wider"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Chiều:</span>
                            <select
                              value={item.direction}
                              onChange={(e) => {
                                const next = [...qCrosswordWords];
                                next[idx] = { ...item, direction: e.target.value as "ACROSS" | "DOWN" };
                                setQCrosswordWords(next);
                              }}
                              className="px-2 py-1 rounded bg-black/60 border border-amber-500/30 text-amber-200 font-semibold"
                            >
                              <option value="ACROSS">Ngang (ACROSS)</option>
                              <option value="DOWN">Dọc (DOWN · max 4 ký tự)</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Hàng:</span>
                            <select
                              value={item.row}
                              onChange={(e) => {
                                const next = [...qCrosswordWords];
                                next[idx] = { ...item, row: Number(e.target.value) };
                                setQCrosswordWords(next);
                              }}
                              className="px-1.5 py-1 rounded bg-black/60 border border-amber-500/30 text-amber-200 font-semibold"
                            >
                              {[0, 1, 2, 3].map((r) => (
                                <option key={r} value={r}>Hàng {r + 1}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Cột:</span>
                            <select
                              value={item.col}
                              onChange={(e) => {
                                const next = [...qCrosswordWords];
                                next[idx] = { ...item, col: Number(e.target.value) };
                                setQCrosswordWords(next);
                              }}
                              className="px-1.5 py-1 rounded bg-black/60 border border-amber-500/30 text-amber-200 font-semibold"
                            >
                              {Array.from({ length: 14 }, (_, c) => (
                                <option key={c} value={c}>Cột {c + 1}</option>
                              ))}
                            </select>
                          </div>
                          {qCrosswordWords.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                setQCrosswordWords(qCrosswordWords.filter((_, i) => i !== idx));
                              }}
                              className="px-2 py-1 rounded text-red-400 hover:bg-red-500/20 font-bold transition"
                              title="Xóa từ này"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Live Crossword Preview 4x14 */}
                    {(() => {
                      const cwPreview = buildCrossword4x14Preview(qCrosswordWords);
                      return (
                        <div className="p-3 rounded-lg bg-black/60 border border-amber-500/30 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-amber-300 flex items-center gap-1">
                              <span>📐</span> Bản đồ 4x14 Ô Chữ Liên Kết:
                            </span>
                            {cwPreview.isValid ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <span>✓ Bố cục hợp lệ!</span>
                                <span>({cwPreview.intersections.size} điểm giao nhau 🔗)</span>
                              </span>
                            ) : (
                              <span className="text-red-400 font-bold">
                                ⚠️ Bố cục chưa hợp lệ
                              </span>
                            )}
                          </div>

                          {!cwPreview.isValid && cwPreview.errors.length > 0 && (
                            <div className="p-2 rounded bg-red-500/15 border border-red-500/40 text-red-200 text-xs space-y-0.5">
                              {cwPreview.errors.map((err, i) => (
                                <div key={i} className="flex items-start gap-1">
                                  <span>•</span>
                                  <span>{err}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-rows-4 gap-1 p-2 bg-[#0a192f] rounded-lg border border-cyan-500/30">
                            {cwPreview.rows.map((row, rIdx) => (
                              <div key={rIdx} className="grid grid-cols-14 gap-1">
                                {row.map((char, cIdx) => {
                                  const key = rIdx * 14 + cIdx;
                                  const isInter = cwPreview.intersections.has(key);
                                  const hasChar = Boolean(char && char !== " ");
                                  return (
                                    <div
                                      key={cIdx}
                                      className={`w-full aspect-square flex items-center justify-center font-black rounded-sm text-xs relative ${
                                        isInter
                                          ? "bg-amber-400 text-slate-950 ring-2 ring-yellow-200 shadow-[0_0_8px_#f59e0b] animate-pulse"
                                          : hasChar
                                          ? "bg-amber-400 text-slate-900 border border-amber-200 shadow"
                                          : "bg-[#050c18] border border-cyan-900/40 text-transparent"
                                      }`}
                                    >
                                      <span>{char || "·"}</span>
                                      {isInter && (
                                        <span className="absolute -top-1 -right-1 text-[8px]">🔗</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Standard Live Preview 4x14 Grid */}
                {qPuzzleType === "STANDARD" && (() => {
                  const preview = buildPuzzle4x14Preview(qAnswer);
                  return (
                    <div className="p-3 rounded-lg bg-black/60 border border-amber-500/30 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-amber-300 flex items-center gap-1">
                          <span>📐</span> Mô phỏng trực quan Bàn Ô Chữ (4 x 14):
                        </span>
                        {preview.oversizedWord && (
                          <span className="text-red-400 font-bold">
                            ⚠️ Từ &quot;{preview.oversizedWord}&quot; dài hơn 14 ký tự!
                          </span>
                        )}
                        {preview.isOverflow && (
                          <span className="text-red-400 font-bold">
                            ⚠️ Cụm từ bị tràn quá 4 hàng!
                          </span>
                        )}
                        {!preview.oversizedWord && !preview.isOverflow && qAnswer.trim() && (
                          <span className="text-emerald-400 font-semibold">
                            ✓ Vừa vặn hoàn hảo trên bàn 4x14
                          </span>
                        )}
                      </div>

                      <div className="grid grid-rows-4 gap-1 p-2 bg-[#0a192f] rounded-lg border border-cyan-500/30">
                        {preview.rows.map((row, rIdx) => (
                          <div key={rIdx} className="grid grid-cols-14 gap-1">
                            {row.map((char, cIdx) => (
                              <div
                                key={cIdx}
                                className={`w-full aspect-square flex items-center justify-center font-black rounded-sm text-xs ${
                                  char
                                    ? "bg-amber-400 text-slate-900 border border-amber-200 shadow"
                                    : "bg-[#050c18] border border-cyan-900/40 text-transparent"
                                }`}
                              >
                                {char || "·"}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 🎬 MULTIMEDIA ATTACHMENT SECTION (For ALL Question Types) */}
            <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎬</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                    Đính kèm Đa phương tiện (Tùy chọn)
                  </span>
                </div>
                <select
                  value={qMediaType}
                  onChange={(e) => setQMediaType(e.target.value as any)}
                  className="px-2.5 py-1 rounded-lg bg-input border border-border text-xs font-medium"
                >
                  <option value="NONE">Không có đa phương tiện</option>
                  <option value="IMAGE">🖼️ Hình ảnh minh họa</option>
                  <option value="VIDEO">🎬 Video clip (MP4 / YouTube)</option>
                  <option value="AUDIO">🎵 Âm thanh / Giọng nói (MP3 / WAV)</option>
                </select>
              </div>

              {qMediaType !== "NONE" && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={qMediaUrl}
                      onChange={(e) => setQMediaUrl(e.target.value)}
                      placeholder={
                        qMediaType === "VIDEO"
                          ? "Dán link YouTube (https://...) hoặc link file MP4 trực tiếp..."
                          : qMediaType === "AUDIO"
                          ? "Dán link audio MP3/WAV trực tiếp..."
                          : "Dán link ảnh (https://...)..."
                      }
                      className="flex-1 px-3 py-1.5 rounded-lg bg-input border border-border text-xs"
                    />
                    <label className="px-3 py-1.5 rounded-lg bg-purple-600/40 hover:bg-purple-600/60 border border-purple-500/40 text-purple-200 text-xs font-semibold cursor-pointer transition flex items-center gap-1 shrink-0">
                      <span>{qUploadingMedia ? "⏳ Đang tải..." : "📁 Tải tệp lên"}</span>
                      <input
                        type="file"
                        accept={
                          qMediaType === "VIDEO"
                            ? "video/mp4,video/webm"
                            : qMediaType === "AUDIO"
                            ? "audio/mp3,audio/wav,audio/ogg"
                            : "image/*"
                        }
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, false);
                        }}
                      />
                    </label>
                  </div>

                  {(qMediaType === "VIDEO" || qMediaType === "AUDIO") && (
                    <div className="p-3 rounded-lg bg-card/60 border border-border space-y-2">
                      <label className="block text-xs font-bold text-slate-200">
                        ⏱️ Chế độ phát & Đồng hồ đếm ngược trả lời:
                      </label>
                      <div className="space-y-1.5 text-xs">
                        <label className="flex items-start gap-2 cursor-pointer p-1.5 rounded hover:bg-purple-500/10">
                          <input
                            type="radio"
                            name="new_playback_mode"
                            value="AFTER_PLAY"
                            checked={qMediaPlaybackMode === "AFTER_PLAY"}
                            onChange={() => setQMediaPlaybackMode("AFTER_PLAY")}
                            className="mt-0.5 text-purple-600"
                          />
                          <div>
                            <span className="font-bold text-purple-200">
                              Phát xong clip mới bắt đầu đếm ngược thời gian (Chuẩn gameshow như Olympia)
                            </span>
                            <p className="text-[11px] text-muted-foreground">
                              Thí sinh tập trung lắng nghe/quan sát hết nội dung clip trước khi đồng hồ đếm ngược làm bài được kích hoạt.
                            </p>
                          </div>
                        </label>
                        <label className="flex items-start gap-2 cursor-pointer p-1.5 rounded hover:bg-purple-500/10">
                          <input
                            type="radio"
                            name="new_playback_mode"
                            value="PARALLEL"
                            checked={qMediaPlaybackMode === "PARALLEL"}
                            onChange={() => setQMediaPlaybackMode("PARALLEL")}
                            className="mt-0.5 text-purple-600"
                          />
                          <div>
                            <span className="font-bold text-cyan-200">
                              Đồng hồ đếm ngược chạy song song ngay khi clip bắt đầu phát
                            </span>
                            <p className="text-[11px] text-muted-foreground">
                              Áp dụng cho thử thách phản xạ nhanh, nhận diện đoạn nhạc hay tình huống khẩn cấp.
                            </p>
                          </div>
                        </label>
                      </div>

                      <div className="p-2 rounded bg-purple-900/30 border border-purple-500/30 text-[11px] text-purple-300 flex items-center gap-1.5">
                        <span>📡</span>
                        <span>
                          <strong>Đồng bộ qua WebSocket:</strong> Khi MC mở câu hỏi hoặc bấm Phát, video/audio phát đồng loạt trên máy chiếu và máy thí sinh; thanh tua của thí sinh bị khóa để tránh gian lận.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Media Preview */}
                  {qMediaUrl.trim() && (
                    <div className="pt-1">
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1">Xem trước tệp:</p>
                      {qMediaType === "IMAGE" && (
                        <img
                          src={qMediaUrl}
                          alt="Media preview"
                          className="max-h-40 rounded-lg object-contain border border-border bg-black/40"
                          onError={(e) => ((e.target as any).style.display = "none")}
                        />
                      )}
                      {qMediaType === "AUDIO" && (
                        <audio controls src={qMediaUrl} className="w-full h-9 rounded-lg" />
                      )}
                      {qMediaType === "VIDEO" && (
                        qMediaUrl.includes("youtube.com") || qMediaUrl.includes("youtu.be") ? (
                          <div className="aspect-video max-h-48 rounded-lg overflow-hidden border border-border">
                            <iframe
                              src={
                                qMediaUrl.includes("watch?v=")
                                  ? qMediaUrl.replace("watch?v=", "embed/")
                                  : qMediaUrl.includes("youtu.be/")
                                  ? qMediaUrl.replace("youtu.be/", "www.youtube.com/embed/")
                                  : qMediaUrl
                              }
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            />
                          </div>
                        ) : (
                          <video controls src={qMediaUrl} className="max-h-48 rounded-lg border border-border" />
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Gợi ý câu hỏi (Hint)</label>
              <input
                type="text"
                value={qHint}
                onChange={(e) => setQHint(e.target.value)}
                placeholder="Gợi ý nếu đội chơi kích hoạt trợ giúp..."
                className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowNewQModal(false)}
                className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-sm text-white"
              >
                Lưu câu hỏi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Edit Bank */}
      {showEditBankModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateBank}
            className="glass rounded-2xl p-6 w-full max-w-md space-y-4 border border-border"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">✏️ Chỉnh sửa bộ câu hỏi</h3>
              <button
                type="button"
                onClick={() => setShowEditBankModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tiêu đề bộ đề *</label>
              <input
                type="text"
                required
                value={editBankTitle}
                onChange={(e) => setEditBankTitle(e.target.value)}
                placeholder="VD: Kiểm tra kiến thức Khoa học tự nhiên"
                className="w-full px-3 py-2 rounded-xl bg-input border border-border focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mô tả tóm tắt</label>
              <textarea
                value={editBankDesc}
                onChange={(e) => setEditBankDesc(e.target.value)}
                placeholder="Mô tả nội dung, chủ đề hoặc mức độ khó..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-input border border-border focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Ngôn ngữ chính *</span>
                <span className="text-[10px] text-amber-400 font-normal">Gắn vào setting bộ đề</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditBankLanguage("VIETNAMESE")}
                  className={`px-3 py-2 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                    editBankLanguage === "VIETNAMESE"
                      ? "border-red-500 bg-red-500/20 text-white font-bold"
                      : "border-slate-800 bg-slate-900/50 text-slate-400"
                  }`}
                >
                  <span className="text-xl">🇻🇳</span>
                  <span className="text-xs">Tiếng Việt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditBankLanguage("ENGLISH")}
                  className={`px-3 py-2 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                    editBankLanguage === "ENGLISH"
                      ? "border-blue-500 bg-blue-500/20 text-blue-200 font-bold"
                      : "border-slate-800 bg-slate-900/50 text-slate-400"
                  }`}
                >
                  <span className="text-xl">🇺🇸</span>
                  <span className="text-xs">English</span>
                </button>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowEditBankModal(false)}
                className="px-4 py-2 rounded-xl border border-border hover:bg-muted"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingBank || !editBankTitle.trim()}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold transition disabled:opacity-50"
              >
                {savingBank ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Edit Question */}
      {showEditQModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleUpdateQuestion}
            className="glass rounded-2xl p-6 w-full max-w-2xl space-y-4 border border-border my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xl font-bold">✏️ Chỉnh sửa câu hỏi</h3>
              <button
                type="button"
                onClick={() => setShowEditQModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            {/* 1-Touch Question Type Grid */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Dạng câu hỏi *
              </label>
              {isCurrentBankWordPuzzle ? (
                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/50 flex items-center gap-3">
                  <span className="text-2xl">🎡</span>
                  <div>
                    <p className="text-sm font-bold text-purple-200">Ô chữ Vòng Quay Trí Tuệ (4 hàng x 14 ô)</p>
                    <p className="text-xs text-slate-400">Định dạng bảng chữ trường quay chuẩn 56 ô</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "MC_SINGLE", icon: "🔘", label: "Trắc nghiệm 1", sub: "1 đáp án đúng" },
                    { id: "MC_MULTI", icon: "☑️", label: "Nhiều đáp án", sub: "Chọn nhiều câu" },
                    { id: "TRUE_FALSE", icon: "⚖️", label: "Đúng / Sai", sub: "2 lựa chọn nhanh" },
                    { id: "FILL_BLANK", icon: "✍️", label: "Điền từ", sub: "Tự luận ngắn" },
                    { id: "MATCHING", icon: "🔗", label: "Nối cặp", sub: "Ghép cột A - B" },
                    { id: "DRAG_DROP", icon: "🔀", label: "Sắp xếp", sub: "Theo thứ tự" },
                    { id: "CLOZE_DROPDOWN", icon: "📑", label: "Đục lỗ", sub: "Menu thả [1],[2]" },
                  ].map((item) => {
                    const isSelected = editQType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setEditQType(item.id)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? "bg-purple-600/30 border-purple-400 shadow-md shadow-purple-950/50 text-white"
                            : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-base">{item.icon}</span>
                          <span className="text-xs font-bold leading-tight">{item.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{item.sub}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Point & Timer Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mức điểm chuẩn hóa
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { pts: 10, time: 15, label: "10đ", sub: "15s" },
                    { pts: 20, time: 20, label: "20đ", sub: "20s" },
                    { pts: 30, time: 30, label: "30đ", sub: "30s" },
                    { pts: 40, time: 60, label: "40đ", sub: "60s" },
                  ].map((lvl) => {
                    const isSelected = editQPoints === lvl.pts;
                    return (
                      <button
                        key={lvl.pts}
                        type="button"
                        onClick={() => {
                          setEditQPoints(lvl.pts);
                          setEditQTimeLimit(lvl.time);
                        }}
                        className={`py-2 px-1 rounded-xl border text-center transition cursor-pointer ${
                          isSelected
                            ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold shadow-md shadow-cyan-950/50"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="text-xs font-black">{lvl.label}</div>
                        <div className="text-[10px] text-slate-400">{lvl.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Thời gian tùy chỉnh (giây)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={editQTimeLimit}
                    onChange={(e) => setEditQTimeLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono font-bold text-cyan-300 text-center"
                  />
                  <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">giây</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {editQType === "WORD_PUZZLE" ? "Gợi ý của MC về cụm từ bí mật *" : "Nội dung câu hỏi *"}
                {editQType === "CLOZE_DROPDOWN" && (
                  <span className="text-xs text-purple-400 font-normal ml-2">
                    (Dùng [1], [2], [3]... tại vị trí cần đục lỗ)
                  </span>
                )}
                {editQType === "WORD_PUZZLE" && (
                  <span className="text-xs text-amber-300 font-normal ml-2">
                    (Mô tả hoặc câu hỏi gợi mở để MC đọc cho người chơi)
                  </span>
                )}
              </label>
              <textarea
                required
                value={editQContent}
                onChange={(e) => setEditQContent(e.target.value)}
                placeholder={
                  editQType === "CLOZE_DROPDOWN"
                    ? "Ví dụ: Thủ đô của Việt Nam là [1], còn trung tâm kinh tế phía Nam là [2]."
                    : editQType === "WORD_PUZZLE"
                    ? "Ví dụ: Vị anh hùng áo vải cờ đào đại phá 29 vạn quân Thanh..."
                    : "Nhập nội dung câu hỏi..."
                }
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-input border border-border focus:ring-2 focus:ring-ring text-sm"
              />
            </div>

            {/* 1 & 2: Multiple Choice (MC_SINGLE / MC_MULTI) - 2 to 10 options */}
            {(editQType === "MC_SINGLE" || editQType === "MC_MULTI") && (
              <div className="space-y-2 p-3.5 rounded-xl border border-border bg-card/30">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
                    Các phương án lựa chọn ({editQOptions.length}/10 phương án - chọn đáp án đúng)
                  </label>
                  {editQOptions.length < 10 && (
                    <button
                      type="button"
                      onClick={() => addOption(true)}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      + Thêm lựa chọn ({String.fromCharCode(65 + editQOptions.length)})
                    </button>
                  )}
                </div>
                <div className="space-y-2 pt-1">
                  {editQOptions.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (editQType === "MC_SINGLE") {
                            setEditQOptions(editQOptions.map((o, i) => ({ ...o, isCorrect: i === idx })));
                          } else {
                            setEditQOptions(editQOptions.map((o, i) => (i === idx ? { ...o, isCorrect: !o.isCorrect } : o)));
                          }
                        }}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black text-xs transition cursor-pointer shrink-0 ${
                          opt.isCorrect
                            ? "bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-950/50"
                            : "bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600"
                        }`}
                        title={opt.isCorrect ? "Đáp án ĐÚNG (bấm để đổi)" : "Bấm để chọn làm đáp án ĐÚNG"}
                      >
                        {String.fromCharCode(65 + idx)}
                        {opt.isCorrect && <span className="ml-0.5 text-[10px]">✓</span>}
                      </button>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const newOpts = [...editQOptions];
                          newOpts[idx].text = e.target.value;
                          setEditQOptions(newOpts);
                        }}
                        placeholder={`Nội dung lựa chọn ${String.fromCharCode(65 + idx)}...`}
                        className={`flex-1 px-3 py-2 rounded-xl bg-slate-900 border text-sm transition ${
                          opt.isCorrect ? "border-emerald-500/50 text-white" : "border-slate-800 text-slate-200"
                        }`}
                      />
                      {editQOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(idx, true)}
                          className="w-8 h-8 rounded-lg hover:bg-rose-500/20 text-rose-400 text-xs flex items-center justify-center transition shrink-0"
                          title="Xóa lựa chọn này"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3: TRUE_FALSE */}
            {editQType === "TRUE_FALSE" && (
              <div className="p-3.5 rounded-xl border border-border bg-card/30">
                <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-2">
                  Đáp án đúng
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-card/60">
                    <input
                      type="radio"
                      name="edit_tf_answer_val"
                      value="true"
                      checked={editQAnswer === "true"}
                      onChange={(e) => setEditQAnswer(e.target.value)}
                      className="text-purple-600"
                    />
                    <span className="font-medium text-sm text-green-300">Đúng (True)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-card/60">
                    <input
                      type="radio"
                      name="edit_tf_answer_val"
                      value="false"
                      checked={editQAnswer === "false"}
                      onChange={(e) => setEditQAnswer(e.target.value)}
                      className="text-purple-600"
                    />
                    <span className="font-medium text-sm text-red-300">Sai (False)</span>
                  </label>
                </div>
              </div>
            )}

            {/* 4: FILL_BLANK & ESSAY (Merged) */}
            {(editQType === "FILL_BLANK" || editQType === "ESSAY") && (
              <div className="space-y-3 p-3.5 rounded-xl border border-border bg-card/30">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-1">
                    Các đáp án chuẩn (Phân tách nhiều cách viết bằng dấu chấm phẩy ;)
                  </label>
                  <input
                    type="text"
                    value={editQAnswer}
                    onChange={(e) => setEditQAnswer(e.target.value)}
                    placeholder="VD: Hà Nội; Ha Noi; Hanoi; Thủ đô Hà Nội"
                    className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Hệ thống sẽ tự động so khớp không phân biệt chữ hoa, chữ thường và dấu khoảng trắng.
                  </p>
                </div>

                <div className="pt-2 border-t border-border">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editQAllowManualGrading}
                      onChange={(e) => setEditQAllowManualGrading(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-purple-200">
                      Cho phép MC / Quản trò chấm điểm thủ công (Manual Grading)
                    </span>
                  </label>
                  <p className="text-[11px] text-muted-foreground ml-6">
                    Bật tùy chọn này cho câu hỏi tự luận mở, đoạn văn ngắn hoặc khi cần MC linh hoạt chấm điểm tại chỗ.
                  </p>
                </div>

                {editQAllowManualGrading && (
                  <div className="pt-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 mb-1">
                      📋 Tiêu chí chấm điểm / Thang điểm Rubric (Hiển thị cho MC tham khảo khi chấm)
                    </label>
                    <textarea
                      value={editQGradingCriteria}
                      onChange={(e) => setEditQGradingCriteria(e.target.value)}
                      placeholder="VD: Ý 1 nêu được nguyên nhân (5đ); Ý 2 nêu được giải pháp khắc phục (5đ)..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl bg-input border border-amber-500/40 text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 5: MATCHING (Nối cặp tương ứng A - B) - 2 to 8 pairs */}
            {editQType === "MATCHING" && (
              <div className="space-y-2 p-3.5 rounded-xl border border-border bg-card/30">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
                      Cấu hình các cặp nối A - B ({editQPairs.length}/8 cặp)
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Cột trái nối với Cột phải tương ứng. Hệ thống sẽ tự động xáo trộn vế phải khi vào trận.
                    </p>
                  </div>
                  {editQPairs.length < 8 && (
                    <button
                      type="button"
                      onClick={() => addPair(true)}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      + Thêm cặp #{editQPairs.length + 1}
                    </button>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  {editQPairs.map((p, idx) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="font-bold text-xs text-purple-300 w-6 text-center">#{idx + 1}</span>
                      <input
                        type="text"
                        value={p.left}
                        onChange={(e) => {
                          const updated = [...editQPairs];
                          updated[idx].left = e.target.value;
                          setEditQPairs(updated);
                        }}
                        placeholder={`Vế trái (Thuật ngữ ${idx + 1})`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-input border border-border text-sm"
                      />
                      <span className="text-muted-foreground text-sm font-bold">⟷</span>
                      <input
                        type="text"
                        value={p.right}
                        onChange={(e) => {
                          const updated = [...editQPairs];
                          updated[idx].right = e.target.value;
                          setEditQPairs(updated);
                        }}
                        placeholder={`Vế phải (Khái niệm ${idx + 1})`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-input border border-border text-sm"
                      />
                      {editQPairs.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removePair(idx, true)}
                          className="p-1.5 rounded-lg hover:bg-destructive/20 text-destructive text-xs"
                          title="Xóa cặp này"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6: DRAG_DROP (Sắp xếp thứ tự các bước) - 2 to 8 steps */}
            {editQType === "DRAG_DROP" && (
              <div className="space-y-2 p-3.5 rounded-xl border border-border bg-card/30">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
                      Cấu hình các bước theo đúng trình tự chuẩn ({editQSteps.length}/8 bước)
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Nhập thứ tự chuẩn từ 1 đến hết. Khi bắt đầu thi, hệ thống sẽ xáo trộn ngẫu nhiên để thí sinh kéo thả xếp lại.
                    </p>
                  </div>
                  {editQSteps.length < 8 && (
                    <button
                      type="button"
                      onClick={() => addStep(true)}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      + Thêm bước #{editQSteps.length + 1}
                    </button>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  {editQSteps.map((s, idx) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <span className="font-bold text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300 whitespace-nowrap">
                        Bước {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={s.text}
                        onChange={(e) => {
                          const updated = [...editQSteps];
                          updated[idx].text = e.target.value;
                          setEditQSteps(updated);
                        }}
                        placeholder={`Nội dung bước ${idx + 1}...`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-input border border-border text-sm"
                      />
                      {editQSteps.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeStep(idx, true)}
                          className="p-1.5 rounded-lg hover:bg-destructive/20 text-destructive text-xs"
                          title="Xóa bước này"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7: CLOZE_DROPDOWN (Đoạn văn đục lỗ menu thả xuống) */}
            {editQType === "CLOZE_DROPDOWN" && (
              <div className="space-y-3 p-3.5 rounded-xl border border-border bg-card/30">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
                      Cấu hình các ô trống đục lỗ ({editQClozeBlanks.length}/6 ô)
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Mỗi ô đục lỗ có danh sách các lựa chọn để thí sinh chọn từ menu thả xuống.
                    </p>
                  </div>
                  {editQClozeBlanks.length < 6 && (
                    <button
                      type="button"
                      onClick={() => addClozeBlank(true)}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      + Thêm ô đục lỗ [{editQClozeBlanks.length + 1}]
                    </button>
                  )}
                </div>

                <div className="space-y-3 pt-1">
                  {editQClozeBlanks.map((blank, bIdx) => (
                    <div key={blank.blankId} className="p-3 rounded-lg border border-border bg-card/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-purple-300">
                          📌 Ô trống [{blank.blankId}] - Các phương án thả xuống
                        </span>
                        <div className="flex items-center gap-2">
                          {blank.options.length < 6 && (
                            <button
                              type="button"
                              onClick={() => addClozeOption(bIdx, true)}
                              className="text-[11px] text-purple-300 hover:text-purple-200 font-semibold"
                            >
                              + Thêm phương án
                            </button>
                          )}
                          {editQClozeBlanks.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeClozeBlank(bIdx, true)}
                              className="text-[11px] text-destructive hover:underline"
                            >
                              Xóa ô [{blank.blankId}]
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {blank.options.map((opt, oIdx) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`edit_cloze_correct_${bIdx}`}
                              checked={opt.isCorrect}
                              onChange={() => {
                                const updated = editQClozeBlanks.map((b, bi) =>
                                  bi === bIdx
                                    ? {
                                        ...b,
                                        options: b.options.map((o, oi) => ({
                                          ...o,
                                          isCorrect: oi === oIdx,
                                        })),
                                      }
                                    : b
                                );
                                setEditQClozeBlanks(updated);
                              }}
                              className="w-3.5 h-3.5 text-purple-600 cursor-pointer"
                              title="Đánh dấu đây là đáp án đúng"
                            />
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const updated = editQClozeBlanks.map((b, bi) =>
                                  bi === bIdx
                                    ? {
                                        ...b,
                                        options: b.options.map((o, oi) =>
                                          oi === oIdx ? { ...o, text: e.target.value } : o
                                        ),
                                      }
                                    : b
                                );
                                setEditQClozeBlanks(updated);
                              }}
                              placeholder={`Phương án ${oIdx + 1}${opt.isCorrect ? " (Đáp án đúng)" : ""}`}
                              className="flex-1 px-2.5 py-1 rounded bg-input border border-border text-xs"
                            />
                            {blank.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeClozeOption(bIdx, oIdx, true)}
                                className="text-destructive hover:bg-destructive/20 p-1 rounded text-xs"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 8: WORD_PUZZLE (Ô chữ Chiếc Nón Kỳ Diệu) */}
            {editQType === "WORD_PUZZLE" && (
              <div className="space-y-3 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎡</span>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                        Cấu hình Ô Chữ Chiếc Nón Kỳ Diệu (Bàn 4 hàng x 14 ô)
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Hệ thống tự động canh giữa và dàn trải chữ cái trên lưới 4 hàng x 14 ô chuẩn trường quay.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400">Vòng thi:</span>
                    <select
                      value={editQRound}
                      onChange={(e) => setEditQRound(Number(e.target.value) || 1)}
                      className="px-2.5 py-1 rounded-lg bg-black/50 border border-amber-500/40 text-amber-200 text-xs font-bold cursor-pointer"
                    >
                      <option value={1}>Vòng 1</option>
                      <option value={2}>Vòng 2</option>
                      <option value={3}>Vòng 3</option>
                      <option value={4}>Vòng 4 (Chung kết)</option>
                    </select>
                  </div>
                </div>

                {/* Bộ chọn Định dạng: Tiêu chuẩn vs Ô chữ liên kết */}
                <div>
                  <label className="block text-xs font-bold text-amber-200 mb-1">
                    Định dạng Ô Chữ (Puzzle Format)
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/50 border border-amber-500/30">
                    <button
                      type="button"
                      onClick={() => setEditQPuzzleType("STANDARD")}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        editQPuzzleType === "STANDARD"
                          ? "bg-amber-500 text-slate-950 shadow-md"
                          : "text-amber-200/70 hover:bg-white/5"
                      }`}
                    >
                      <span>📝</span>
                      <span>Tiêu chuẩn (Hàng ngang)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditQPuzzleType("CROSSWORD");
                        setEditQClueDisplayMode("CATEGORY"); // Tự động ưu tiên Chủ đề cho Ô Chữ Liên Kết
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        editQPuzzleType === "CROSSWORD"
                          ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md ring-2 ring-yellow-300"
                          : "text-amber-200/70 hover:bg-white/5"
                      }`}
                    >
                      <span>🔀</span>
                      <span>Ô Chữ Liên Kết / Tung Hoành</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-amber-200 mb-1">
                      Chủ đề ô chữ * <span className="text-muted-foreground font-normal">(Hiển thị cho khán giả & thí sinh)</span>
                    </label>
                    <input
                      type="text"
                      value={editQHint}
                      onChange={(e) => setEditQHint(e.target.value)}
                      placeholder="VD: DANH NHÂN LỊCH SỬ, ĐỊA DANH, THƠ CA..."
                      className="w-full px-3 py-2 rounded-lg bg-black/40 border border-amber-500/30 text-amber-100 text-sm focus:border-amber-400"
                    />
                  </div>
                  {editQPuzzleType === "STANDARD" && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-amber-200">
                          Cụm từ bí mật (Đáp án) *
                        </label>
                        <span className="text-[10px] text-amber-300/80 font-mono">
                          {editQAnswer.replace(/\s+/g, "").length} chữ cái
                        </span>
                      </div>
                      <input
                        type="text"
                        value={editQAnswer}
                        onChange={(e) => setEditQAnswer(e.target.value.toUpperCase())}
                        placeholder="VD: NGUYỄN TRÃI, VỊNH HẠ LONG..."
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-amber-500/30 text-amber-100 font-bold text-sm tracking-wider uppercase focus:border-amber-400"
                      />
                      {(() => {
                        const isSameLetterCat = /SAME[\s_-]*LETTER|CÙNG CHỮ CÁI ĐẦU/i.test(editQHint);
                        if (isSameLetterCat) {
                          const trimmed = editQAnswer.trim();
                          if (trimmed.length === 0) {
                            return (
                              <div className="mt-2 p-2.5 rounded-lg bg-indigo-500/15 border border-indigo-500/40 text-indigo-200 text-xs flex items-start gap-2 shadow-sm animate-fadeIn">
                                <span className="text-base shrink-0">✨</span>
                                <div className="leading-relaxed">
                                  <strong className="font-bold text-indigo-300">Luật SAME LETTER (Bản Anh):</strong> Tất cả các từ phải bắt đầu bằng cùng một phụ âm (không được dùng nguyên âm A, E, I, O, U). Ký tự nối độc lập như &quot;&amp;&quot; hay &quot;-&quot; được phép đứng xen giữa. Đoán trúng chữ SAME LETTER sẽ nhận thưởng nóng <strong>+$1,000 / +1.000 điểm</strong>!
                                </div>
                              </div>
                            );
                          }
                          const slCheck = validateSameLetterPhrase(trimmed);
                          if (!slCheck.valid) {
                            return (
                              <div className="mt-2 p-2.5 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-xs flex items-start gap-2 shadow-sm animate-fadeIn">
                                <span className="text-base shrink-0">❌</span>
                                <div className="leading-relaxed">
                                  <strong className="font-bold text-red-300">Câu hỏi không hợp lệ:</strong> {slCheck.error}
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="mt-2 p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-2 shadow-sm animate-fadeIn">
                                <span className="text-base shrink-0">✅</span>
                                <div className="leading-relaxed">
                                  <strong className="font-bold text-emerald-300">SAME LETTER hợp lệ:</strong> Tất cả các từ đều bắt đầu bằng phụ âm <strong>[{slCheck.sameLetter}]</strong>. Thí sinh gọi đúng chữ <strong>[{slCheck.sameLetter}]</strong> sẽ được thưởng nóng +$1,000 / +1.000 điểm!
                                </div>
                              </div>
                            );
                          }
                        }
                        const trimmed = editQAnswer.trim();
                        if (trimmed.length > 0 && !isVietnameseAlphabetLetter(trimmed[0])) {
                          return (
                            <div className="mt-2 p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2 shadow-sm animate-fadeIn">
                              <span className="text-base shrink-0">⚠️</span>
                              <div className="leading-relaxed">
                                <strong className="font-bold text-amber-200">Khuyến cáo:</strong> Từ khoá nên bắt đầu bằng chữ cái tiếng Việt. Ký tự đặc biệt hoặc số ở đầu (&quot;{trimmed[0]}&quot;) sẽ được hệ thống tự động hiển thị ngay khi mở bảng và không được tính vào lượt lật chữ đoán nhanh.
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                  {editQPuzzleType === "CROSSWORD" && (
                    <div className="flex flex-col justify-center">
                      <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                        <span>ℹ️</span>
                        <span>Nhập các từ khoá đan xen vào bảng bên dưới. Khi lưu, đáp án tổng thể sẽ được hệ thống tự động tổng hợp.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chế độ hiển thị CAM 3 Lower-Third (Edit) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-amber-200">
                      Chế độ hiển thị trên màn hình trường quay (CAM 3 Lower-Third)
                    </label>
                    {editQPuzzleType === "CROSSWORD" && (
                      <span className="text-[10px] text-amber-300/80">
                        ⭐ Ưu tiên Chủ đề cho Ô Chữ Liên Kết
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 p-2.5 rounded-lg bg-black/40 border border-amber-500/30">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-amber-100">
                      <input
                        type="radio"
                        name="editQClueDisplayMode"
                        value="CATEGORY"
                        checked={editQClueDisplayMode === "CATEGORY"}
                        onChange={() => setEditQClueDisplayMode("CATEGORY")}
                        className="text-amber-500 focus:ring-amber-400"
                      />
                      <span>🏷️ Ưu tiên hiện Chủ đề (Khuyến nghị cho Ô Chữ Liên Kết)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-amber-100">
                      <input
                        type="radio"
                        name="editQClueDisplayMode"
                        value="CLUE"
                        checked={editQClueDisplayMode === "CLUE"}
                        onChange={() => setEditQClueDisplayMode("CLUE")}
                        className="text-amber-500 focus:ring-amber-400"
                      />
                      <span>💡 Ưu tiên hiện Gợi ý (Gợi ý phải bao quát tất cả từ khoá)</span>
                    </label>
                  </div>
                </div>

                {/* BỘ SOẠN Ô CHỮ LIÊN KẾT (CROSSWORD BUILDER - EDIT) */}
                {editQPuzzleType === "CROSSWORD" && (
                  <div className="space-y-3 p-3.5 rounded-xl bg-black/60 border border-amber-500/40">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-black text-sm">🔀 DANH SÁCH TỪ KHOÁ LIÊN KẾT:</span>
                        <span className="text-[11px] text-amber-200/70">
                          ({editQCrosswordWords.length} từ)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const wordsList = editQCrosswordWords.map((w) => w.word).filter(Boolean);
                            if (wordsList.length < 2) {
                              alert("Vui lòng nhập ít nhất 2 từ khoá để tự động tìm giao điểm!");
                              return;
                            }
                            const autoLayout = generateAutoCrosswordLayout(wordsList);
                            setEditQCrosswordWords(autoLayout);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow hover:brightness-110 flex items-center gap-1 transition"
                        >
                          <span>⚡ Tự động tìm giao điểm &amp; xếp ô chữ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (editQCrosswordWords.length >= 6) {
                              alert("Tối đa 6 từ khoá trong một ô chữ liên kết!");
                              return;
                            }
                            setEditQCrosswordWords([
                              ...editQCrosswordWords,
                              {
                                id: `cw_${Date.now()}`,
                                word: "",
                                row: Math.min(3, editQCrosswordWords.length),
                                col: 2,
                                direction: "ACROSS",
                              },
                            ]);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center gap-1 transition"
                        >
                          <span>+ Thêm từ</span>
                        </button>
                      </div>
                    </div>

                    {/* Words rows list */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {editQCrosswordWords.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-2 rounded-lg bg-black/40 border border-amber-500/20 flex flex-wrap items-center gap-2 text-xs"
                        >
                          <span className="font-bold text-amber-300 w-6 shrink-0">#{idx + 1}</span>
                          <input
                            type="text"
                            value={item.word}
                            onChange={(e) => {
                              const next = [...editQCrosswordWords];
                              next[idx] = { ...item, word: e.target.value.toUpperCase() };
                              setEditQCrosswordWords(next);
                            }}
                            placeholder="Nhập từ khoá..."
                            className="flex-1 min-w-[120px] px-2.5 py-1.5 rounded bg-black/60 border border-amber-500/30 text-amber-100 font-bold uppercase tracking-wider"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Chiều:</span>
                            <select
                              value={item.direction}
                              onChange={(e) => {
                                const next = [...editQCrosswordWords];
                                next[idx] = { ...item, direction: e.target.value as "ACROSS" | "DOWN" };
                                setEditQCrosswordWords(next);
                              }}
                              className="px-2 py-1 rounded bg-black/60 border border-amber-500/30 text-amber-200 font-semibold"
                            >
                              <option value="ACROSS">Ngang (ACROSS)</option>
                              <option value="DOWN">Dọc (DOWN · max 4 ký tự)</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Hàng:</span>
                            <select
                              value={item.row}
                              onChange={(e) => {
                                const next = [...editQCrosswordWords];
                                next[idx] = { ...item, row: Number(e.target.value) };
                                setEditQCrosswordWords(next);
                              }}
                              className="px-1.5 py-1 rounded bg-black/60 border border-amber-500/30 text-amber-200 font-semibold"
                            >
                              {[0, 1, 2, 3].map((r) => (
                                <option key={r} value={r}>Hàng {r + 1}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Cột:</span>
                            <select
                              value={item.col}
                              onChange={(e) => {
                                const next = [...editQCrosswordWords];
                                next[idx] = { ...item, col: Number(e.target.value) };
                                setEditQCrosswordWords(next);
                              }}
                              className="px-1.5 py-1 rounded bg-black/60 border border-amber-500/30 text-amber-200 font-semibold"
                            >
                              {Array.from({ length: 14 }, (_, c) => (
                                <option key={c} value={c}>Cột {c + 1}</option>
                              ))}
                            </select>
                          </div>
                          {editQCrosswordWords.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditQCrosswordWords(editQCrosswordWords.filter((_, i) => i !== idx));
                              }}
                              className="px-2 py-1 rounded text-red-400 hover:bg-red-500/20 font-bold transition"
                              title="Xóa từ này"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Live Crossword Preview 4x14 */}
                    {(() => {
                      const cwPreview = buildCrossword4x14Preview(editQCrosswordWords);
                      return (
                        <div className="p-3 rounded-lg bg-black/60 border border-amber-500/30 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-amber-300 flex items-center gap-1">
                              <span>📐</span> Bản đồ 4x14 Ô Chữ Liên Kết:
                            </span>
                            {cwPreview.isValid ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <span>✓ Bố cục hợp lệ!</span>
                                <span>({cwPreview.intersections.size} điểm giao nhau 🔗)</span>
                              </span>
                            ) : (
                              <span className="text-red-400 font-bold">
                                ⚠️ Bố cục chưa hợp lệ
                              </span>
                            )}
                          </div>

                          {!cwPreview.isValid && cwPreview.errors.length > 0 && (
                            <div className="p-2 rounded bg-red-500/15 border border-red-500/40 text-red-200 text-xs space-y-0.5">
                              {cwPreview.errors.map((err, i) => (
                                <div key={i} className="flex items-start gap-1">
                                  <span>•</span>
                                  <span>{err}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-rows-4 gap-1 p-2 bg-[#0a192f] rounded-lg border border-cyan-500/30">
                            {cwPreview.rows.map((row, rIdx) => (
                              <div key={rIdx} className="grid grid-cols-14 gap-1">
                                {row.map((char, cIdx) => {
                                  const key = rIdx * 14 + cIdx;
                                  const isInter = cwPreview.intersections.has(key);
                                  const hasChar = Boolean(char && char !== " ");
                                  return (
                                    <div
                                      key={cIdx}
                                      className={`w-full aspect-square flex items-center justify-center font-black rounded-sm text-xs relative ${
                                        isInter
                                          ? "bg-amber-400 text-slate-950 ring-2 ring-yellow-200 shadow-[0_0_8px_#f59e0b] animate-pulse"
                                          : hasChar
                                          ? "bg-amber-400 text-slate-900 border border-amber-200 shadow"
                                          : "bg-[#050c18] border border-cyan-900/40 text-transparent"
                                      }`}
                                    >
                                      <span>{char || "·"}</span>
                                      {isInter && (
                                        <span className="absolute -top-1 -right-1 text-[8px]">🔗</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Standard Live Preview 4x14 Grid */}
                {editQPuzzleType === "STANDARD" && (() => {
                  const preview = buildPuzzle4x14Preview(editQAnswer);
                  return (
                    <div className="p-3 rounded-lg bg-black/60 border border-amber-500/30 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-amber-300 flex items-center gap-1">
                          <span>📐</span> Mô phỏng trực quan Bàn Ô Chữ (4 x 14):
                        </span>
                        {preview.oversizedWord && (
                          <span className="text-red-400 font-bold">
                            ⚠️ Từ &quot;{preview.oversizedWord}&quot; dài hơn 14 ký tự!
                          </span>
                        )}
                        {preview.isOverflow && (
                          <span className="text-red-400 font-bold">
                            ⚠️ Cụm từ bị tràn quá 4 hàng!
                          </span>
                        )}
                        {!preview.oversizedWord && !preview.isOverflow && editQAnswer.trim() && (
                          <span className="text-emerald-400 font-semibold">
                            ✓ Vừa vặn hoàn hảo trên bàn 4x14
                          </span>
                        )}
                      </div>

                      <div className="grid grid-rows-4 gap-1 p-2 bg-[#0a192f] rounded-lg border border-cyan-500/30">
                        {preview.rows.map((row, rIdx) => (
                          <div key={rIdx} className="grid grid-cols-14 gap-1">
                            {row.map((char, cIdx) => (
                              <div
                                key={cIdx}
                                className={`w-full aspect-square flex items-center justify-center font-black rounded-sm text-xs ${
                                  char
                                    ? "bg-amber-400 text-slate-900 border border-amber-200 shadow"
                                    : "bg-[#050c18] border border-cyan-900/40 text-transparent"
                                }`}
                              >
                                {char || "·"}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 🎬 MULTIMEDIA ATTACHMENT SECTION (For ALL Question Types) */}
            <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎬</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                    Đính kèm Đa phương tiện (Tùy chọn)
                  </span>
                </div>
                <select
                  value={editQMediaType}
                  onChange={(e) => setEditQMediaType(e.target.value as any)}
                  className="px-2.5 py-1 rounded-lg bg-input border border-border text-xs font-medium"
                >
                  <option value="NONE">Không có đa phương tiện</option>
                  <option value="IMAGE">🖼️ Hình ảnh minh họa</option>
                  <option value="VIDEO">🎬 Video clip (MP4 / YouTube)</option>
                  <option value="AUDIO">🎵 Âm thanh / Giọng nói (MP3 / WAV)</option>
                </select>
              </div>

              {editQMediaType !== "NONE" && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editQMediaUrl}
                      onChange={(e) => setEditQMediaUrl(e.target.value)}
                      placeholder={
                        editQMediaType === "VIDEO"
                          ? "Dán link YouTube (https://...) hoặc link file MP4 trực tiếp..."
                          : editQMediaType === "AUDIO"
                          ? "Dán link audio MP3/WAV trực tiếp..."
                          : "Dán link ảnh (https://...)..."
                      }
                      className="flex-1 px-3 py-1.5 rounded-lg bg-input border border-border text-xs"
                    />
                    <label className="px-3 py-1.5 rounded-lg bg-purple-600/40 hover:bg-purple-600/60 border border-purple-500/40 text-purple-200 text-xs font-semibold cursor-pointer transition flex items-center gap-1 shrink-0">
                      <span>{editQUploadingMedia ? "⏳ Đang tải..." : "📁 Tải tệp lên"}</span>
                      <input
                        type="file"
                        accept={
                          editQMediaType === "VIDEO"
                            ? "video/mp4,video/webm"
                            : editQMediaType === "AUDIO"
                            ? "audio/mp3,audio/wav,audio/ogg"
                            : "image/*"
                        }
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, true);
                        }}
                      />
                    </label>
                  </div>

                  {(editQMediaType === "VIDEO" || editQMediaType === "AUDIO") && (
                    <div className="p-3 rounded-lg bg-card/60 border border-border space-y-2">
                      <label className="block text-xs font-bold text-slate-200">
                        ⏱️ Chế độ phát & Đồng hồ đếm ngược trả lời:
                      </label>
                      <div className="space-y-1.5 text-xs">
                        <label className="flex items-start gap-2 cursor-pointer p-1.5 rounded hover:bg-purple-500/10">
                          <input
                            type="radio"
                            name="edit_playback_mode"
                            value="AFTER_PLAY"
                            checked={editQMediaPlaybackMode === "AFTER_PLAY"}
                            onChange={() => setEditQMediaPlaybackMode("AFTER_PLAY")}
                            className="mt-0.5 text-purple-600"
                          />
                          <div>
                            <span className="font-bold text-purple-200">
                              Phát xong clip mới bắt đầu đếm ngược thời gian (Chuẩn gameshow như Olympia)
                            </span>
                            <p className="text-[11px] text-muted-foreground">
                              Thí sinh tập trung lắng nghe/quan sát hết nội dung clip trước khi đồng hồ đếm ngược làm bài được kích hoạt.
                            </p>
                          </div>
                        </label>
                        <label className="flex items-start gap-2 cursor-pointer p-1.5 rounded hover:bg-purple-500/10">
                          <input
                            type="radio"
                            name="edit_playback_mode"
                            value="PARALLEL"
                            checked={editQMediaPlaybackMode === "PARALLEL"}
                            onChange={() => setEditQMediaPlaybackMode("PARALLEL")}
                            className="mt-0.5 text-purple-600"
                          />
                          <div>
                            <span className="font-bold text-cyan-200">
                              Đồng hồ đếm ngược chạy song song ngay khi clip bắt đầu phát
                            </span>
                            <p className="text-[11px] text-muted-foreground">
                              Áp dụng cho thử thách phản xạ nhanh, nhận diện đoạn nhạc hay tình huống khẩn cấp.
                            </p>
                          </div>
                        </label>
                      </div>

                      <div className="p-2 rounded bg-purple-900/30 border border-purple-500/30 text-[11px] text-purple-300 flex items-center gap-1.5">
                        <span>📡</span>
                        <span>
                          <strong>Đồng bộ qua WebSocket:</strong> Khi MC mở câu hỏi hoặc bấm Phát, video/audio phát đồng loạt trên máy chiếu và máy thí sinh; thanh tua của thí sinh bị khóa để tránh gian lận.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Media Preview */}
                  {editQMediaUrl.trim() && (
                    <div className="pt-1">
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1">Xem trước tệp:</p>
                      {editQMediaType === "IMAGE" && (
                        <img
                          src={editQMediaUrl}
                          alt="Media preview"
                          className="max-h-40 rounded-lg object-contain border border-border bg-black/40"
                          onError={(e) => ((e.target as any).style.display = "none")}
                        />
                      )}
                      {editQMediaType === "AUDIO" && (
                        <audio controls src={editQMediaUrl} className="w-full h-9 rounded-lg" />
                      )}
                      {editQMediaType === "VIDEO" && (
                        editQMediaUrl.includes("youtube.com") || editQMediaUrl.includes("youtu.be") ? (
                          <div className="aspect-video max-h-48 rounded-lg overflow-hidden border border-border">
                            <iframe
                              src={
                                editQMediaUrl.includes("watch?v=")
                                  ? editQMediaUrl.replace("watch?v=", "embed/")
                                  : editQMediaUrl.includes("youtu.be/")
                                  ? editQMediaUrl.replace("youtu.be/", "www.youtube.com/embed/")
                                  : editQMediaUrl
                              }
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            />
                          </div>
                        ) : (
                          <video controls src={editQMediaUrl} className="max-h-48 rounded-lg border border-border" />
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Gợi ý câu hỏi (Hint)</label>
              <input
                type="text"
                value={editQHint}
                onChange={(e) => setEditQHint(e.target.value)}
                placeholder="Gợi ý nếu đội chơi kích hoạt trợ giúp..."
                className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowEditQModal(false)}
                className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingQuestion || !editQContent.trim()}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-sm text-white transition disabled:opacity-50 cursor-pointer"
              >
                {savingQuestion ? "Đang lưu..." : "Cập nhật câu hỏi"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          MODAL 1: TẠO ĐỀ THI BẰNG AI (GEMINI & OPENAI)
         ═════════════════════════════════════════════════════════════════════ */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-6 sm:p-8 w-full max-w-2xl border border-amber-500/40 shadow-2xl overflow-y-auto max-h-[90vh] bg-[#121424]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-black font-black">
                  ✨
                </span>
                <div>
                  <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-200">
                    Tạo Đề Thi Tự Động Bằng AI
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hỗ trợ Google Gemini & OpenAI · Xuất chuẩn trắc nghiệm tiếng Việt
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="w-8 h-8 rounded-full glass hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white text-lg transition"
              >
                ✕
              </button>
            </div>

            {aiError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{aiError}</span>
              </div>
            )}

            <form onSubmit={handleGenerateAi} className="space-y-4">
              {/* Provider Selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAiProvider("gemini")}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition cursor-pointer text-left ${
                    aiProvider === "gemini"
                      ? "bg-gradient-to-r from-blue-600/30 to-cyan-600/20 border-cyan-400 text-white shadow-md ring-1 ring-cyan-400/50"
                      : "glass border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="text-2xl">🤖</span>
                  <div>
                    <p className="font-black text-sm">Google Gemini</p>
                    <p className="text-[10px] text-slate-400">gemini-2.0-flash (Siêu nhanh)</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAiProvider("openai")}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition cursor-pointer text-left ${
                    aiProvider === "openai"
                      ? "bg-gradient-to-r from-emerald-600/30 to-teal-600/20 border-emerald-400 text-white shadow-md ring-1 ring-emerald-400/50"
                      : "glass border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="text-2xl">⚡</span>
                  <div>
                    <p className="font-black text-sm">OpenAI</p>
                    <p className="text-[10px] text-slate-400">gpt-4o-mini (Thông minh)</p>
                  </div>
                </button>
              </div>

              {/* API Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    {aiProvider === "gemini" ? "Google Gemini API Key" : "OpenAI API Key"}
                  </label>
                  <span className="text-[11px] text-slate-400">
                    (Để trống nếu đã cài trong file <code className="text-amber-300 font-mono">.env</code>)
                  </span>
                </div>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder={aiProvider === "gemini" ? "AIzaSy..." : "sk-..."}
                  className="w-full px-3.5 py-2.5 rounded-xl glass border border-white/20 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
                <label className="flex items-center gap-2 mt-1.5 cursor-pointer text-[11px] text-slate-400">
                  <input
                    type="checkbox"
                    checked={aiSaveKey}
                    onChange={(e) => setAiSaveKey(e.target.checked)}
                    className="rounded border-white/20 text-cyan-500 focus:ring-0"
                  />
                  <span>Lưu API Key này vào trình duyệt (LocalStorage) để dùng cho các lần sau</span>
                </label>
              </div>

              {/* Topic */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Chủ đề / Lĩnh vực câu hỏi <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Ví dụ: Toán học & Logic, Khoa học Tự nhiên, Văn hóa - Xã hội, Lịch sử & Địa lý..."
                  className="w-full px-3.5 py-2.5 rounded-xl glass border border-white/20 text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    "Toán học & Logic",
                    "Khoa học Tự nhiên",
                    "Văn hóa - Xã hội",
                    "Lịch sử & Địa lý",
                    "Kinh tế & Quản trị",
                    "Công nghệ & Tin học",
                    "Ngoại ngữ",
                    "Kiến thức Tổng hợp",
                  ].map((top) => (
                    <button
                      key={top}
                      type="button"
                      onClick={() => setAiTopic(top)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                        aiTopic === top
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow"
                          : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {top}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grade & Question Count */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Cấp độ / Độ khó</label>
                  <select
                    value={aiGradeLevel}
                    onChange={(e) => setAiGradeLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass border border-white/20 text-xs text-white bg-[#151728] focus:outline-none"
                  >
                    <option value="Dễ / Tiểu học">Dễ (Tiểu học / Nhập môn)</option>
                    <option value="Trung bình / THPT">Trung bình (THCS / THPT)</option>
                    <option value="Khó / Đại học">Khó (Đại học / Chuyên sâu)</option>
                    <option value="Olympic / Siêu khó">Olympic / Tranh tài đỉnh cao</option>
                    <option value="Hỗn hợp mọi cấp độ">Hỗn hợp mọi cấp độ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Số lượng câu: <b className="text-cyan-300">{aiQuestionCount}</b> câu
                  </label>
                  <input
                    type="range"
                    min={4}
                    max={30}
                    step={1}
                    value={aiQuestionCount}
                    onChange={(e) => setAiQuestionCount(Number(e.target.value))}
                    className="w-full accent-cyan-400 mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 px-0.5 mt-0.5">
                    <span>4 câu</span>
                    <span>10 câu</span>
                    <span>20 câu</span>
                    <span>30 câu</span>
                  </div>
                </div>
              </div>

              {/* Question Types */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Định dạng câu hỏi mong muốn
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "MC_SINGLE", label: "Trắc nghiệm 1 đáp án", icon: "🔘" },
                    { id: "MC_MULTI", label: "Nhiều đáp án", icon: "☑️" },
                    { id: "TRUE_FALSE", label: "Đúng / Sai", icon: "⚖️" },
                    { id: "FILL_BLANK", label: "Điền từ khuyết", icon: "✍️" },
                    { id: "WORD_PUZZLE", label: "Ô chữ Chiếc nón 🎡", icon: "🔤" },
                  ].map((qt) => {
                    const isSelected = aiQuestionTypes.includes(qt.id);
                    return (
                      <button
                        key={qt.id}
                        type="button"
                        onClick={() => {
                          if (qt.id === "WORD_PUZZLE") {
                            setAiQuestionTypes(isSelected && aiQuestionTypes.length > 1 ? aiQuestionTypes.filter((t) => t !== qt.id) : [qt.id]);
                          } else {
                            const withoutPuzzle = aiQuestionTypes.filter((t) => t !== "WORD_PUZZLE");
                            if (isSelected) {
                              const next = withoutPuzzle.filter((t) => t !== qt.id);
                              setAiQuestionTypes(next.length ? next : ["MC_SINGLE"]);
                            } else {
                              setAiQuestionTypes([...withoutPuzzle, qt.id]);
                            }
                          }
                        }}
                        className={`p-2 rounded-xl border text-xs text-left transition flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? qt.id === "WORD_PUZZLE"
                              ? "bg-amber-500/25 border-amber-500/60 text-amber-200 font-bold shadow-sm"
                              : "bg-cyan-500/25 border-cyan-500/60 text-cyan-200 font-bold shadow-sm"
                            : "glass border-white/10 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span>{qt.icon}</span>
                        <span className="truncate">{qt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Points & Time Limit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Thang điểm mặc định</label>
                  <select
                    value={aiDefaultPoints}
                    onChange={(e) => setAiDefaultPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl glass border border-white/20 text-xs text-white bg-[#151728] focus:outline-none"
                  >
                    <option value={10}>10 Điểm / câu (Cơ bản)</option>
                    <option value={20}>20 Điểm / câu (Trung bình)</option>
                    <option value={30}>30 Điểm / câu (Nâng cao)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Thời gian suy nghĩ</label>
                  <select
                    value={aiDefaultTime}
                    onChange={(e) => setAiDefaultTime(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl glass border border-white/20 text-xs text-white bg-[#151728] focus:outline-none"
                  >
                    <option value={15}>15 Giây</option>
                    <option value={20}>20 Giây</option>
                    <option value={30}>30 Giây (Mặc định)</option>
                    <option value={45}>45 Giây</option>
                    <option value={60}>60 Giây</option>
                  </select>
                </div>
              </div>

              {/* Custom Prompt */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Ghi chú hoặc yêu cầu đặc biệt (Không bắt buộc)
                </label>
                <input
                  type="text"
                  value={aiCustomPrompt}
                  onChange={(e) => setAiCustomPrompt(e.target.value)}
                  placeholder="Ví dụ: Tập trung vào các mốc năm 1945-1975, thêm các câu lừa thú vị..."
                  className="w-full px-3.5 py-2 rounded-xl glass border border-white/20 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  disabled={isGeneratingAi}
                  className="px-4 py-2 rounded-xl glass hover:bg-white/10 text-slate-300 text-xs font-bold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingAi || !aiTopic.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white font-black text-xs shadow-xl transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isGeneratingAi ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>AI đang soạn thảo đề thi...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Bắt đầu tạo {aiQuestionCount} câu hỏi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          MODAL 2: NHẬP TỪ FILE HOẶC DÁN VĂN BẢN ĐỀ THI
         ═════════════════════════════════════════════════════════════════════ */}
      {showFileModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-6 sm:p-8 w-full max-w-2xl border border-cyan-500/40 shadow-2xl overflow-y-auto max-h-[90vh] bg-[#121424]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black">
                  📂
                </span>
                <div>
                  <h3 className="text-xl font-black text-white">Nhập Đề Thi Từ File & Văn Bản</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hỗ trợ Word (.docx), Excel (.xlsx), CSV, Text (.txt), JSON hoặc Dán trực tiếp
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFileModal(false)}
                className="w-8 h-8 rounded-full glass hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white text-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex items-center gap-2 p-1 rounded-xl glass border border-white/10 mb-4">
              <button
                type="button"
                onClick={() => setImportMode("upload")}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  importMode === "upload"
                    ? "bg-cyan-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>📁</span>
                <span>Tải tệp tin (.docx, .xlsx, .csv, .txt)</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode("rawtext")}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  importMode === "rawtext"
                    ? "bg-purple-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>📝</span>
                <span>Dán văn bản đề thi thô</span>
              </button>
            </div>

            {fileError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{fileError}</span>
              </div>
            )}

            {importMode === "upload" ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-cyan-500/40 rounded-2xl p-8 text-center bg-cyan-500/5 hover:bg-cyan-500/10 transition flex flex-col items-center justify-center relative cursor-pointer">
                  <span className="text-4xl mb-2">📄</span>
                  <p className="text-sm font-bold text-white mb-1">
                    Nhấp vào đây để chọn tệp từ máy tính
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Định dạng hỗ trợ: Microsoft Word (.docx), Excel (.xlsx, .xls), CSV (.csv), Text (.txt) hoặc JSON (.json)
                  </p>
                  <input
                    type="file"
                    accept=".docx,.xlsx,.xls,.csv,.txt,.json"
                    onChange={handleProcessUploadedFile}
                    disabled={isParsingFile}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>

                {/* 📥 Tải File Mẫu Chuẩn Cho Người Dùng */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">📥</span>
                    <div>
                      <p className="text-xs font-bold text-white">Chưa có tệp định dạng chuẩn?</p>
                      <p className="text-[11px] text-slate-400">
                        Tải file mẫu Excel hoặc JSON điền sẵn để đảm bảo hệ thống nhận diện đúng 100%.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={downloadMagicWheelExcelTemplate}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Tải tệp mẫu Excel có 2 sheet và hướng dẫn"
                    >
                      <span>📊</span>
                      <span>Mẫu Excel (.xlsx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={downloadMagicWheelJsonTemplate}
                      className="px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Tải tệp mẫu JSON chuẩn format"
                    >
                      <span>⚙️</span>
                      <span>Mẫu JSON (.json)</span>
                    </button>
                  </div>
                </div>

                {isParsingFile && (
                  <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-300 text-xs font-bold text-center animate-pulse flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-cyan-300/30 border-t-cyan-300 rounded-full animate-spin" />
                    <span>Đang đọc và phân tích cấu trúc tệp tin...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300">Nội dung văn bản đề thi</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRawTextContent(
                            `[Ô chữ] Vòng 1 | Chủ đề: DANH NHÂN LỊCH SỬ | Đáp án: NGUYỄN TRÃI | Gợi ý: Nhà quân sự, danh nhân văn hóa thế giới thời Hậu Lê.\n\n[Ô chữ] Vòng 2 | Chủ đề: ĐỊA DANH VIỆT NAM | Đáp án: VỊNH HẠ LONG | Gợi ý: Di sản thiên nhiên thế giới tại tỉnh Quảng Ninh.\n\n[Ô chữ] Vòng 3 | Chủ đề: THÀNH NGỮ TỤC NGỮ | Đáp án: UỐNG NƯỚC NHỚ NGUỒN | Gợi ý: Truyền thống đạo lý tri ân thế hệ đi trước của dân tộc ta.\n\n[Ô chữ] Vòng 4 | Chủ đề: KIỆT TÁC THƠ CA | Đáp án: TRUYỆN KIỀU NGUYỄN DU | Gợi ý: Kiệt tác lục bát đỉnh cao của văn học trung đại Việt Nam.`
                          );
                        }}
                        className="text-[11px] text-amber-300 hover:text-amber-200 font-bold underline cursor-pointer"
                      >
                        + Chèn mẫu [Ô chữ]
                      </button>
                      <span className="text-[11px] text-purple-300">Hỗ trợ nhận diện tự động</span>
                    </div>
                  </div>
                  <textarea
                    rows={10}
                    value={rawTextContent}
                    onChange={(e) => setRawTextContent(e.target.value)}
                    placeholder={`Ví dụ định dạng chuẩn:\n\n[Ô chữ] Vòng 1 | Chủ đề: DANH NHÂN | Đáp án: NGUYỄN HUỆ | Gợi ý: Vị anh hùng áo vải cờ đào\n\nHoặc trắc nghiệm:\nCâu 1: Đâu là hành tinh gần Mặt Trời nhất?\nA. Sao Kim\nB. Sao Thủy*\nC. Sao Hỏa\nD. Sao Mộc\nĐáp án: B`}
                    className="w-full p-3.5 rounded-xl glass border border-white/20 text-xs font-mono text-white leading-relaxed focus:outline-none focus:border-purple-400"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    💡 <b>Mẹo:</b> Có thể viết cú pháp <code className="text-amber-300">[Ô chữ] Vòng X | Chủ đề: ... | Đáp án: ... | Gợi ý: ...</code> cho Chiếc Nón Kỳ Diệu!
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowFileModal(false)}
                    className="px-4 py-2 rounded-xl glass hover:bg-white/10 text-slate-300 text-xs font-bold transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessRawText}
                    disabled={!rawTextContent.trim()}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>⚡</span>
                    <span>Bóc tách câu hỏi & Xem trước</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          MODAL 3: BẢNG XEM TRƯỚC & HIỆU ĐÍNH ĐỀ THI (PREVIEW & EDIT TABLE)
         ═════════════════════════════════════════════════════════════════════ */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="glass rounded-3xl p-4 sm:p-6 w-full max-w-5xl border-2 border-purple-500/50 shadow-2xl flex flex-col max-h-[94vh] bg-[#0f111e]">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl p-2 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 text-white font-black">
                  📋
                </span>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    Bảng Xem Trước & Hiệu Đính Đề Thi
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs">
                    <span className="font-bold text-slate-300">
                      Tổng số: <b className="text-cyan-300">{previewQuestions.length}</b> câu
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400 font-bold">
                      ✓ {previewQuestions.filter((q) => q.isValid).length} Hợp lệ
                    </span>
                    {previewQuestions.some((q) => !q.isValid) && (
                      <>
                        <span>•</span>
                        <span className="text-rose-400 font-bold animate-pulse">
                          ⚠️ {previewQuestions.filter((q) => !q.isValid).length} Cần kiểm tra
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefineAllQuestions}
                  disabled={isRefiningAll || previewQuestions.length === 0}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-purple-600/20 cursor-pointer disabled:opacity-50"
                  title="Tự động sửa lỗi cú pháp, cân bằng độ dài 4 phương án và chuẩn hóa điểm số theo chuẩn Quizorra"
                >
                  {isRefiningAll ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang hoàn thiện...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>AI Hoàn Thiện & Cân Bằng Đề</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleAddPreviewItem}
                  className="px-3 py-1.5 rounded-xl glass hover:bg-white/10 text-cyan-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <span>➕</span>
                  <span>Thêm câu mới</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="w-8 h-8 rounded-full glass hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white text-base transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quizorra Game Mode Distribution Summary */}
            {(() => {
              const totalQ = previewQuestions.length;
              if (totalQ === 0) return null;
              const p10 = previewQuestions.filter((q) => q.points === 10).length;
              const p20 = previewQuestions.filter((q) => q.points === 20).length;
              const p30 = previewQuestions.filter((q) => q.points === 30).length;
              const p40 = previewQuestions.filter((q) => q.points === 40).length;
              const outlierCount = previewQuestions.filter((q) => q.uniformity && !q.uniformity.isUniform).length;

              return (
                <div className="py-2 px-3 rounded-2xl bg-black/40 border border-purple-500/30 my-1.5 shrink-0 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-300">Phân bổ chuẩn Quizorra:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      🟢 10đ: {p10} ({Math.round((p10 / totalQ) * 100)}%)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      🟡 20đ: {p20} ({Math.round((p20 / totalQ) * 100)}%)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                      🟣 30đ: {p30} ({Math.round((p30 / totalQ) * 100)}%)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                      🔴 40đ: {p40} ({Math.round((p40 / totalQ) * 100)}%)
                    </span>
                  </div>

                  {outlierCount > 0 ? (
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                      <span>⚠️</span>
                      <span>{outlierCount} câu có độ dài phương án bị lệch</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-cyan-300 font-bold bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
                      <span>🛡️</span>
                      <span>100% phương án đạt chuẩn đồng nhất</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Target Bank Destination Configuration */}
            <div className="py-2.5 px-3 rounded-2xl bg-white/5 border border-white/10 my-2 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-4">
                <span className="font-bold text-slate-400">Lưu vào đâu:</span>
                {selectedBank && (
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-200 font-semibold">
                    <input
                      type="radio"
                      name="targetBankMode"
                      value="current"
                      checked={previewTargetMode === "current"}
                      onChange={() => setPreviewTargetMode("current")}
                      className="text-purple-500 focus:ring-0"
                    />
                    <span>Bộ đề hiện tại (<b>{selectedBank.title}</b>)</span>
                  </label>
                )}
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-200 font-semibold">
                  <input
                    type="radio"
                    name="targetBankMode"
                    value="new"
                    checked={previewTargetMode === "new"}
                    onChange={() => setPreviewTargetMode("new")}
                    className="text-purple-500 focus:ring-0"
                  />
                  <span>Tạo bộ đề mới riêng biệt</span>
                </label>
              </div>

              {previewTargetMode === "new" && (
                <div className="flex-1 max-w-sm">
                  <input
                    type="text"
                    value={previewNewBankTitle}
                    onChange={(e) => setPreviewNewBankTitle(e.target.value)}
                    placeholder="Tên bộ đề mới..."
                    className="w-full px-3 py-1.5 rounded-lg glass border border-white/20 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              )}
            </div>

            {/* Questions List (Scrollable Area) */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1 min-h-0">
              {previewQuestions.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <p className="text-3xl mb-2">📝</p>
                  <p className="font-bold">Danh sách đang trống</p>
                </div>
              ) : (
                previewQuestions.map((item, qIdx) => (
                  <div
                    key={qIdx}
                    className={`p-4 rounded-2xl border transition-all ${
                      item.isValid
                        ? "bg-[#141627] border-white/10 hover:border-purple-500/40"
                        : "bg-rose-950/20 border-rose-500/50"
                    }`}
                  >
                    {/* Header Row of Question */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-600/40 border border-purple-400 text-purple-200 font-black text-xs flex items-center justify-center">
                          {qIdx + 1}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/10 text-slate-300">
                          {item.type}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                          item.points >= 40
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                            : item.points >= 30
                            ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                            : item.points >= 20
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        }`}>
                          {item.points >= 40 ? "🔴 40đ (60s)" : item.points >= 30 ? "🟣 30đ (30s)" : item.points >= 20 ? "🟡 20đ (20s)" : "🟢 10đ (15s)"}
                        </span>
                        {!item.isValid && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            ⚠️ {item.validationErrors.join(", ")}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-slate-400">Điểm:</span>
                          <select
                            value={item.points}
                            onChange={(e) => {
                              const pts = Number(e.target.value) as 10 | 20 | 30 | 40;
                              handleUpdatePreviewItem(qIdx, {
                                points: pts,
                                timeLimit: pts === 40 ? 60 : pts === 30 ? 30 : pts === 20 ? 20 : 15,
                              });
                            }}
                            className="px-1.5 py-0.5 rounded glass border border-white/20 text-amber-300 font-bold bg-[#151728]"
                          >
                            <option value={10}>10đ</option>
                            <option value={20}>20đ</option>
                            <option value={30}>30đ</option>
                            <option value={40}>40đ</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-slate-400">Giây:</span>
                          <select
                            value={item.timeLimit}
                            onChange={(e) => handleUpdatePreviewItem(qIdx, { timeLimit: Number(e.target.value) })}
                            className="px-1.5 py-0.5 rounded glass border border-white/20 text-cyan-300 font-bold bg-[#151728]"
                          >
                            <option value={15}>15s</option>
                            <option value={20}>20s</option>
                            <option value={30}>30s</option>
                            <option value={45}>45s</option>
                            <option value={60}>60s</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeletePreviewItem(qIdx)}
                          className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition"
                          title="Xóa câu hỏi này"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Question Content Input */}
                    <div className="mb-2.5">
                      <textarea
                        rows={2}
                        value={item.content}
                        onChange={(e) => handleUpdatePreviewItem(qIdx, { content: e.target.value })}
                        placeholder="Nội dung câu hỏi..."
                        className="w-full px-3 py-1.5 rounded-xl glass border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {item.options.map((opt, optIdx) => (
                        <div
                          key={opt.id}
                          className={`p-2 rounded-xl border flex items-center gap-2 transition ${
                            opt.isCorrect
                              ? "bg-emerald-500/10 border-emerald-500/60 text-white"
                              : "bg-white/5 border-white/10 text-slate-300"
                          }`}
                        >
                          <label className="flex items-center gap-1 cursor-pointer shrink-0">
                            <input
                              type={item.type === "MC_MULTI" ? "checkbox" : "radio"}
                              name={`preview_correct_${qIdx}`}
                              checked={opt.isCorrect}
                              onChange={(e) => {
                                const newOpts = item.options.map((o, idx) => {
                                  if (item.type === "MC_MULTI") {
                                    return idx === optIdx ? { ...o, isCorrect: e.target.checked } : o;
                                  } else {
                                    return { ...o, isCorrect: idx === optIdx };
                                  }
                                });
                                handleUpdatePreviewItem(qIdx, { options: newOpts });
                              }}
                              className="accent-emerald-400 cursor-pointer"
                            />
                            <span className="font-black text-xs w-4">{opt.id}.</span>
                          </label>

                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => {
                              const newOpts = [...item.options];
                              newOpts[optIdx] = { ...opt, text: e.target.value };
                              handleUpdatePreviewItem(qIdx, { options: newOpts });
                            }}
                            placeholder={`Nội dung phương án ${opt.id}...`}
                            className="flex-1 bg-transparent border-0 text-xs text-white focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Hint / Explanation */}
                    {item.hint && (
                      <div className="mt-2 text-[11px] text-amber-300/80 italic flex items-center gap-1">
                        <span>💡</span>
                        <span>{item.hint}</span>
                      </div>
                    )}

                    {/* Uniformity Warning / Rebalance Button */}
                    {item.uniformity && !item.uniformity.isUniform && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span>⚠️</span>
                          <span>{item.uniformity.warningMessage || "Phương án có độ lệch độ dài bất thường (nguy cơ lộ đáp án)"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRebalanceQuestion(qIdx)}
                          disabled={rebalancingIndex === qIdx}
                          className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                        >
                          {rebalancingIndex === qIdx ? (
                            <>
                              <span className="w-3 h-3 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
                              <span>Đang cân bằng...</span>
                            </>
                          ) : (
                            <>
                              <span>✨</span>
                              <span>AI Cân bằng lại</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-white/10 mt-2 shrink-0 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Hãy kiểm tra kỹ các câu hỏi trước khi lưu vào ngân hàng đề thi.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  disabled={isSavingPreview}
                  className="px-4 py-2 rounded-xl glass hover:bg-white/10 text-slate-300 text-xs font-bold transition"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSavePreview}
                  disabled={isSavingPreview || previewQuestions.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-black text-xs shadow-xl transition disabled:opacity-40 flex items-center gap-2 cursor-pointer"
                >
                  {isSavingPreview ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang lưu đề thi...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Lưu {previewQuestions.length} câu vào Ngân hàng Đề thi</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ═════════════════════════════════════════════════════════════════════
          QUIZORRA QUESTION STUDIO MODAL
         ═════════════════════════════════════════════════════════════════════ */}
      <QuizorraQuestionStudioModal
        isOpen={showStudioModal}
        onClose={() => setShowStudioModal(false)}
        onSuccess={handleStudioSuccess}
        selectedBank={selectedBank}
      />
    </div>
  );
}
