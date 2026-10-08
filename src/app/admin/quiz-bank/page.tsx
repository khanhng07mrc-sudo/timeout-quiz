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

interface QuestionItem {
  id?: string;
  type: string;
  content: string;
  options?: { id: string; text: string; isCorrect: boolean }[];
  answer?: string;
  points: number;
  timeLimit: number;
  hint?: string;
}

interface QuizBank {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
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

  // Edit Bank Modal State
  const [showEditBankModal, setShowEditBankModal] = useState(false);
  const [editBankTitle, setEditBankTitle] = useState("");
  const [editBankDesc, setEditBankDesc] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  // New Question Form State
  const [showNewQModal, setShowNewQModal] = useState(false);
  const [qType, setQType] = useState("MC_SINGLE");
  const [qContent, setQContent] = useState("");
  const [qPoints, setQPoints] = useState(10);
  const [qTimeLimit, setQTimeLimit] = useState(30);
  const [qHint, setQHint] = useState("");
  const [qAnswer, setQAnswer] = useState("");
  const [qOptions, setQOptions] = useState([
    { id: "A", text: "", isCorrect: true },
    { id: "B", text: "", isCorrect: false },
    { id: "C", text: "", isCorrect: false },
    { id: "D", text: "", isCorrect: false },
  ]);

  // Edit Question Modal State
  const [showEditQModal, setShowEditQModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQType, setEditQType] = useState("MC_SINGLE");
  const [editQContent, setEditQContent] = useState("");
  const [editQPoints, setEditQPoints] = useState(10);
  const [editQTimeLimit, setEditQTimeLimit] = useState(30);
  const [editQHint, setEditQHint] = useState("");
  const [editQAnswer, setEditQAnswer] = useState("");
  const [editQOptions, setEditQOptions] = useState([
    { id: "A", text: "", isCorrect: true },
    { id: "B", text: "", isCorrect: false },
    { id: "C", text: "", isCorrect: false },
    { id: "D", text: "", isCorrect: false },
  ]);
  const [savingQuestion, setSavingQuestion] = useState(false);

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
          const combined = [...localOnly, ...data.banks];
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
      setBanks(local);
      if (local.length > 0 && !selectedBank) {
        selectBank(local[0]);
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

  useEffect(() => {
    fetchBanks();
  }, []);

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch("/api/quiz-bank", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          ownerId: "demo-host-id",
        }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewDesc("");
        setShowNewBankModal(false);
        fetchBanks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank || !qContent.trim()) return;

    const rawPoints = Math.max(10, Math.round((Number(qPoints) || 10) / 10) * 10);
    const payload: any = {
      type: qType,
      content: qContent,
      points: rawPoints,
      timeLimit: Number(qTimeLimit),
      hint: qHint || null,
    };

    if (qType === "MC_SINGLE" || qType === "MC_MULTI") {
      payload.options = qOptions.filter((o) => o.text.trim() !== "");
    } else if (qType === "TRUE_FALSE") {
      payload.options = [
        { id: "true", text: "Đúng (True)", isCorrect: qAnswer === "true" },
        { id: "false", text: "Sai (False)", isCorrect: qAnswer === "false" },
      ];
    } else if (qType === "FILL_BLANK" || qType === "ESSAY") {
      payload.answer = qAnswer;
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
        setSelectedBank((prev) => (prev ? { ...prev, title: updated.title, description: updated.description } : prev));
        setBanks((prev) =>
          prev.map((b) => (b.id === selectedBank.id ? { ...b, title: updated.title, description: updated.description } : b))
        );
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

    if (q.options && q.options.length > 0) {
      const existing = q.options.map((opt, idx) => ({
        id: opt.id || String.fromCharCode(65 + idx),
        text: opt.text || "",
        isCorrect: !!opt.isCorrect,
      }));
      while (existing.length < 4) {
        existing.push({
          id: String.fromCharCode(65 + existing.length),
          text: "",
          isCorrect: false,
        });
      }
      setEditQOptions(existing);
    } else {
      setEditQOptions([
        { id: "A", text: "", isCorrect: true },
        { id: "B", text: "", isCorrect: false },
        { id: "C", text: "", isCorrect: false },
        { id: "D", text: "", isCorrect: false },
      ]);
    }
    setShowEditQModal(true);
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank || !editingQuestionId || !editQContent.trim()) return;
    setSavingQuestion(true);

    const rawPoints = Math.max(10, Math.round((Number(editQPoints) || 10) / 10) * 10);
    const payload: any = {
      type: editQType,
      content: editQContent.trim(),
      points: rawPoints,
      timeLimit: Number(editQTimeLimit) || 30,
      hint: editQHint.trim() || null,
    };

    if (editQType === "MC_SINGLE" || editQType === "MC_MULTI") {
      payload.options = editQOptions.filter((o) => o.text.trim() !== "");
      payload.answer = null;
    } else if (editQType === "TRUE_FALSE") {
      payload.options = [
        { id: "true", text: "Đúng (True)", isCorrect: editQAnswer === "true" },
        { id: "false", text: "Sai (False)", isCorrect: editQAnswer === "false" },
      ];
      payload.answer = editQAnswer;
    } else if (editQType === "FILL_BLANK" || editQType === "ESSAY") {
      payload.options = null;
      payload.answer = editQAnswer.trim();
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
    setIsSavingPreview(true);

    try {
      let targetBankId = selectedBank?.id;

      if (previewTargetMode === "new" || !targetBankId) {
        const title = previewNewBankTitle.trim() || "Bộ đề thi mới";
        const desc = previewNewBankDesc.trim() || undefined;

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
              setShowAiModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white font-bold text-xs sm:text-sm transition inline-flex items-center gap-2 shadow-lg shadow-amber-500/20 whitespace-nowrap cursor-pointer"
          >
            <span>✨</span>
            <span>Tạo đề bằng AI</span>
          </button>
          <button
            onClick={() => {
              setPreviewTargetMode("new");
              setShowFileModal(true);
            }}
            className="px-4 py-2.5 rounded-xl glass border border-cyan-500/40 hover:bg-cyan-500/10 font-bold text-xs sm:text-sm text-cyan-300 transition inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <span>📂</span>
            <span>Nhập File / Văn Bản</span>
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
            onClick={() => setShowNewBankModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 font-bold hover:opacity-90 transition inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <SystemIcon name="create_room" className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Tạo bộ đề mới</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Col: List of Banks */}
        <div className="glass rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="font-bold text-lg px-2 flex items-center gap-2 whitespace-nowrap">
            <SystemIcon name="quiz_bank" className="w-5 h-5 text-purple-400 shrink-0" />
            <span className="whitespace-nowrap">Danh sách bộ câu hỏi</span>
          </h2>
          {loading ? (
            <p className="text-muted-foreground p-3">Đang tải...</p>
          ) : banks.length === 0 ? (
            <p className="text-muted-foreground p-3">Chưa có bộ câu hỏi nào</p>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[70vh]">
              {banks.map((b) => (
                <div
                  key={b.id}
                  onClick={() => selectBank(b)}
                  className={`p-4 rounded-xl cursor-pointer transition border group relative ${
                    selectedBank?.id === b.id
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-border hover:border-purple-400/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-base flex-1">{b.title}</p>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditBank(b);
                        }}
                        className="p-1 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground text-xs transition"
                        title="Sửa thông tin bộ đề"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBank(b);
                        }}
                        disabled={deletingBankId === b.id}
                        className="p-1 rounded-lg hover:bg-destructive/20 text-destructive text-xs transition flex items-center justify-center"
                        title="Xóa bộ đề"
                      >
                        {deletingBankId === b.id ? "..." : <SystemIcon name="trash" className="w-3.5 h-3.5 text-red-400" />}
                      </button>
                    </div>
                  </div>
                  {b.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{b.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{b._count?.questions ?? 0} câu hỏi</span>
                    <span>{new Date(b.createdAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Questions inside selected bank */}
        <div key={selectedBank?.id || "empty"} className="md:col-span-2 glass rounded-2xl p-6 flex flex-col gap-4 animate-pull-from-left">
          {selectedBank ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-black">{selectedBank.title}</h2>
                    <button
                      onClick={() => openEditBank(selectedBank)}
                      className="px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border text-xs text-purple-300 hover:text-white flex items-center gap-1 transition whitespace-nowrap"
                      title="Sửa tên và mô tả bộ đề"
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
                      setShowAiModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-400/40 text-amber-300 text-xs sm:text-sm font-bold transition whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>✨</span>
                    <span>AI Tạo thêm</span>
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
                  <button
                    onClick={() => setShowNewQModal(true)}
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
                <div className="py-12 text-center text-muted-foreground">Đang tải câu hỏi...</div>
              ) : questions.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-3xl mb-2">📝</p>
                  <p className="text-muted-foreground font-medium">Chưa có câu hỏi nào trong bộ này</p>
                  <p className="text-xs text-muted-foreground mt-1">Bấm nút "Thêm câu hỏi" hoặc dùng tính năng "Import" file để bắt đầu</p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[65vh]">
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
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`p-2 rounded-lg text-xs font-medium border ${
                                opt.isCorrect
                                  ? "border-green-500/60 bg-green-500/10 text-green-300"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              <span className="font-bold mr-1">{opt.id}.</span> {opt.text}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.answer && (
                        <div className="text-xs text-cyan-300 mt-1">
                          Đáp án đúng: <span className="font-mono">{q.answer}</span>
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
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateBank}
            className="glass rounded-2xl p-6 w-full max-w-md space-y-4 border border-border"
          >
            <h3 className="text-xl font-bold">Tạo bộ câu hỏi mới</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Tiêu đề bộ đề *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="VD: Kiểm tra kiến thức Khoa học tự nhiên"
                className="w-full px-3 py-2 rounded-xl bg-input border border-border focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mô tả tóm tắt</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Mô tả nội dung, chủ đề hoặc mức độ khó..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-input border border-border focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowNewBankModal(false)}
                className="px-4 py-2 rounded-xl border border-border hover:bg-muted"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold"
              >
                Tạo mới
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
            className="glass rounded-2xl p-6 w-full max-w-xl space-y-4 border border-border my-8"
          >
            <h3 className="text-xl font-bold">Thêm câu hỏi mới</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Loại câu hỏi</label>
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-input border border-border"
                >
                  <option value="MC_SINGLE">Trắc nghiệm 1 đáp án</option>
                  <option value="MC_MULTI">Trắc nghiệm nhiều đáp án</option>
                  <option value="TRUE_FALSE">Đúng / Sai</option>
                  <option value="FILL_BLANK">Điền từ</option>
                  <option value="ESSAY">Tự luận</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Điểm số gốc (10đ, 20đ, 30đ)</label>
                <select
                  value={qPoints}
                  onChange={(e) => setQPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-input border border-border"
                >
                  <option value={10}>10 Điểm (Cơ bản / Ghi nhớ)</option>
                  <option value={20}>20 Điểm (Trung bình / Thông hiểu)</option>
                  <option value={30}>30 Điểm (Nâng cao / Vận dụng)</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-0.5">Hệ thống chuẩn hóa 3 mức điểm gốc duy nhất</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Thời gian (giây)</label>
                <input
                  type="number"
                  value={qTimeLimit}
                  onChange={(e) => setQTimeLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-input border border-border"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nội dung câu hỏi *</label>
              <textarea
                required
                value={qContent}
                onChange={(e) => setQContent(e.target.value)}
                placeholder="Nhập nội dung câu hỏi..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-input border border-border focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Answer inputs according to question type */}
            {(qType === "MC_SINGLE" || qType === "MC_MULTI") && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Các phương án lựa chọn</label>
                {qOptions.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type={qType === "MC_SINGLE" ? "radio" : "checkbox"}
                      name="correct-option"
                      checked={opt.isCorrect}
                      onChange={(e) => {
                        if (qType === "MC_SINGLE") {
                          setQOptions(qOptions.map((o, i) => ({ ...o, isCorrect: i === idx })));
                        } else {
                          setQOptions(qOptions.map((o, i) => (i === idx ? { ...o, isCorrect: e.target.checked } : o)));
                        }
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="font-bold text-sm w-4">{String.fromCharCode(65 + idx)}</span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...qOptions];
                        newOpts[idx].text = e.target.value;
                        setQOptions(newOpts);
                      }}
                      placeholder={`Lựa chọn ${String.fromCharCode(65 + idx)}`}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-input border border-border text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            {qType === "TRUE_FALSE" && (
              <div>
                <label className="block text-sm font-medium mb-1">Đáp án đúng</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tf_answer"
                      value="true"
                      checked={qAnswer === "true"}
                      onChange={(e) => setQAnswer(e.target.value)}
                    />
                    <span>Đúng (True)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tf_answer"
                      value="false"
                      checked={qAnswer === "false"}
                      onChange={(e) => setQAnswer(e.target.value)}
                    />
                    <span>Sai (False)</span>
                  </label>
                </div>
              </div>
            )}

            {(qType === "FILL_BLANK" || qType === "ESSAY") && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  {qType === "FILL_BLANK" ? "Từ/Cụm từ chuẩn đáp án" : "Gợi ý đáp án / Tiêu chí chấm"}
                </label>
                <input
                  type="text"
                  value={qAnswer}
                  onChange={(e) => setQAnswer(e.target.value)}
                  placeholder="Nhập đáp án chuẩn..."
                  className="w-full px-3 py-2 rounded-xl bg-input border border-border"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Gợi ý câu hỏi (Hint)</label>
              <input
                type="text"
                value={qHint}
                onChange={(e) => setQHint(e.target.value)}
                placeholder="Gợi ý nếu đội dùng thẻ gợi ý..."
                className="w-full px-3 py-2 rounded-xl bg-input border border-border"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowNewQModal(false)}
                className="px-4 py-2 rounded-xl border border-border hover:bg-muted"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold"
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
            className="glass rounded-2xl p-6 w-full max-w-xl space-y-4 border border-border my-8"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">✏️ Chỉnh sửa câu hỏi</h3>
              <button
                type="button"
                onClick={() => setShowEditQModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Loại câu hỏi</label>
                <select
                  value={editQType}
                  onChange={(e) => setEditQType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-input border border-border"
                >
                  <option value="MC_SINGLE">Trắc nghiệm 1 đáp án</option>
                  <option value="MC_MULTI">Trắc nghiệm nhiều đáp án</option>
                  <option value="TRUE_FALSE">Đúng / Sai</option>
                  <option value="FILL_BLANK">Điền từ</option>
                  <option value="ESSAY">Tự luận</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Điểm số gốc (10đ, 20đ, 30đ)</label>
                <select
                  value={editQPoints}
                  onChange={(e) => setEditQPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-input border border-border"
                >
                  <option value={10}>10 Điểm (Cơ bản / Ghi nhớ)</option>
                  <option value={20}>20 Điểm (Trung bình / Thông hiểu)</option>
                  <option value={30}>30 Điểm (Nâng cao / Vận dụng)</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-0.5">Hệ thống chuẩn hóa 3 mức điểm gốc duy nhất</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Thời gian (giây)</label>
                <input
                  type="number"
                  value={editQTimeLimit}
                  onChange={(e) => setEditQTimeLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-input border border-border"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nội dung câu hỏi *</label>
              <textarea
                required
                value={editQContent}
                onChange={(e) => setEditQContent(e.target.value)}
                placeholder="Nhập nội dung câu hỏi..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-input border border-border focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Answer inputs according to question type */}
            {(editQType === "MC_SINGLE" || editQType === "MC_MULTI") && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Các phương án lựa chọn (chọn đáp án đúng)</label>
                {editQOptions.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type={editQType === "MC_SINGLE" ? "radio" : "checkbox"}
                      name="edit-correct-option"
                      checked={opt.isCorrect}
                      onChange={(e) => {
                        if (editQType === "MC_SINGLE") {
                          setEditQOptions(editQOptions.map((o, i) => ({ ...o, isCorrect: i === idx })));
                        } else {
                          setEditQOptions(editQOptions.map((o, i) => (i === idx ? { ...o, isCorrect: e.target.checked } : o)));
                        }
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="font-bold text-sm w-4">{String.fromCharCode(65 + idx)}</span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...editQOptions];
                        newOpts[idx].text = e.target.value;
                        setEditQOptions(newOpts);
                      }}
                      placeholder={`Lựa chọn ${String.fromCharCode(65 + idx)}`}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-input border border-border text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            {editQType === "TRUE_FALSE" && (
              <div>
                <label className="block text-sm font-medium mb-1">Đáp án đúng</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit_tf_answer"
                      value="true"
                      checked={editQAnswer === "true"}
                      onChange={(e) => setEditQAnswer(e.target.value)}
                    />
                    <span>Đúng (True)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit_tf_answer"
                      value="false"
                      checked={editQAnswer === "false"}
                      onChange={(e) => setEditQAnswer(e.target.value)}
                    />
                    <span>Sai (False)</span>
                  </label>
                </div>
              </div>
            )}

            {(editQType === "FILL_BLANK" || editQType === "ESSAY") && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  {editQType === "FILL_BLANK" ? "Từ/Cụm từ chuẩn đáp án" : "Gợi ý đáp án / Tiêu chí chấm"}
                </label>
                <input
                  type="text"
                  value={editQAnswer}
                  onChange={(e) => setEditQAnswer(e.target.value)}
                  placeholder="Nhập đáp án chuẩn..."
                  className="w-full px-3 py-2 rounded-xl bg-input border border-border"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Gợi ý câu hỏi (Hint)</label>
              <input
                type="text"
                value={editQHint}
                onChange={(e) => setEditQHint(e.target.value)}
                placeholder="Gợi ý nếu đội dùng thẻ gợi ý..."
                className="w-full px-3 py-2 rounded-xl bg-input border border-border"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowEditQModal(false)}
                className="px-4 py-2 rounded-xl border border-border hover:bg-muted"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingQuestion || !editQContent.trim()}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold transition disabled:opacity-50 cursor-pointer"
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
                    min={5}
                    max={30}
                    step={5}
                    value={aiQuestionCount}
                    onChange={(e) => setAiQuestionCount(Number(e.target.value))}
                    className="w-full accent-cyan-400 mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 px-0.5 mt-0.5">
                    <span>5 câu</span>
                    <span>10 câu</span>
                    <span>20 câu</span>
                    <span>30 câu</span>
                  </div>
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
                    <span className="text-[11px] text-purple-300">Hỗ trợ nhận diện tự động</span>
                  </div>
                  <textarea
                    rows={10}
                    value={rawTextContent}
                    onChange={(e) => setRawTextContent(e.target.value)}
                    placeholder={`Ví dụ định dạng chuẩn:\n\nCâu 1: Đâu là hành tinh gần Mặt Trời nhất?\nA. Sao Kim\nB. Sao Thủy*\nC. Sao Hỏa\nD. Sao Mộc\nĐáp án: B\n\nCâu 2: Việt Nam có bao nhiêu tỉnh thành phố trực thuộc Trung ương?\nA. 61\nB. 62\nC. 63*\nD. 64`}
                    className="w-full p-3.5 rounded-xl glass border border-white/20 text-xs font-mono text-white leading-relaxed focus:outline-none focus:border-purple-400"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    💡 <b>Mẹo:</b> Có thể đánh dấu đáp án đúng bằng cách thêm dấu sao <code className="text-amber-300">*</code> vào cuối phương án hoặc viết dòng <code className="text-amber-300">Đáp án: B</code> ở cuối câu!
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
                            onChange={(e) => handleUpdatePreviewItem(qIdx, { points: Number(e.target.value) })}
                            className="px-1.5 py-0.5 rounded glass border border-white/20 text-amber-300 font-bold bg-[#151728]"
                          >
                            <option value={10}>10đ</option>
                            <option value={20}>20đ</option>
                            <option value={30}>30đ</option>
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
    </div>
  );
}
