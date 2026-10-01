"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import SystemIcon from "@/components/ui/SystemIcon";

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
      const data = await res.json();
      if (data.banks) {
        setBanks(data.banks);
        if (data.banks.length > 0 && !selectedBank) {
          selectBank(data.banks[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectBank = async (bank: QuizBank) => {
    setSelectedBank(bank);
    setLoadingQuestions(true);
    try {
      const res = await fetch(`/api/quiz-bank/${bank.id}/questions`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.questions) {
        setQuestions(data.questions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleDeleteBank = async (bank: QuizBank) => {
    if (!confirm(`Xóa bộ đề "${bank.title}" và tất cả ${bank._count?.questions ?? 0} câu hỏi? Không thể hoàn tác!`)) return;
    setDeletingBankId(bank.id);
    try {
      const res = await fetch(`/api/quiz-bank/${bank.id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (res.ok) {
        setBanks((prev) => prev.filter((b) => b.id !== bank.id));
        if (selectedBank?.id === bank.id) {
          setSelectedBank(null);
          setQuestions([]);
        }
      } else {
        alert("Lỗi khi xóa bộ đề!");
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

  // Import File Handler (CSV, Excel XLSX, JSON)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBank) return;

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "json") {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const parsed = JSON.parse(evt.target?.result as string);
          if (Array.isArray(parsed)) {
            await uploadBulkQuestions(parsed);
          }
        } catch (err) {
          alert("Lỗi đọc file JSON: " + err);
        }
      };
      reader.readAsText(file);
    } else if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        complete: async (results: any) => {
          const formatted = results.data.map((row: any, idx: number) => ({
            type: row.type || "MC_SINGLE",
            content: row.content || `Câu hỏi ${idx + 1}`,
            points: Math.max(10, Math.round((Number(row.points) || 10) / 10) * 10),
            timeLimit: Number(row.timeLimit) || 30,
            options: [
              { id: "A", text: row.optionA || "", isCorrect: row.correct === "A" },
              { id: "B", text: row.optionB || "", isCorrect: row.correct === "B" },
              { id: "C", text: row.optionC || "", isCorrect: row.correct === "C" },
              { id: "D", text: row.optionD || "", isCorrect: row.correct === "D" },
            ].filter((o) => o.text !== ""),
            hint: row.hint || null,
          }));
          await uploadBulkQuestions(formatted);
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(firstSheet);
          const formatted = rows.map((row: any, idx: number) => ({
            type: row.type || "MC_SINGLE",
            content: row.content || `Câu hỏi ${idx + 1}`,
            points: Math.max(10, Math.round((Number(row.points) || 10) / 10) * 10),
            timeLimit: Number(row.timeLimit) || 30,
            options: [
              { id: "A", text: String(row.optionA || ""), isCorrect: String(row.correct).toUpperCase() === "A" },
              { id: "B", text: String(row.optionB || ""), isCorrect: String(row.correct).toUpperCase() === "B" },
              { id: "C", text: String(row.optionC || ""), isCorrect: String(row.correct).toUpperCase() === "C" },
              { id: "D", text: String(row.optionD || ""), isCorrect: String(row.correct).toUpperCase() === "D" },
            ].filter((o) => o.text !== ""),
            hint: row.hint || null,
          }));
          await uploadBulkQuestions(formatted);
        } catch (err) {
          alert("Lỗi đọc file Excel: " + err);
        }
      };
      reader.readAsArrayBuffer(file);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black whitespace-nowrap">Ngân hàng câu hỏi (Quiz Bank)</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Tạo, chỉnh sửa và nhập file câu hỏi (Excel/CSV/JSON)</p>
        </div>
        <button
          onClick={() => setShowNewBankModal(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 font-bold hover:opacity-90 transition inline-flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
        >
          <SystemIcon name="create_room" className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Tạo bộ câu hỏi mới</span>
        </button>
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
        <div className="md:col-span-2 glass rounded-2xl p-6 flex flex-col gap-4">
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
                  <label className="cursor-pointer px-4 py-2 rounded-xl glass border border-border hover:border-cyan-500 text-sm font-semibold transition whitespace-nowrap">
                    📂 Import (Excel/CSV/JSON)
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() => setShowNewQModal(true)}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold transition whitespace-nowrap"
                  >
                    + Thêm câu hỏi
                  </button>
                  <button
                    onClick={() => handleDeleteBank(selectedBank)}
                    disabled={deletingBankId === selectedBank.id}
                    className="px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/30 hover:bg-destructive/20 text-destructive text-sm font-semibold transition inline-flex items-center gap-1.5 whitespace-nowrap"
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
                <label className="block text-xs font-medium mb-1">Điểm số (bội số của 10)</label>
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={qPoints}
                  onChange={(e) => setQPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-input border border-border"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Bắt buộc chia hết cho 10 (10, 20, 30...)</p>
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
                <label className="block text-xs font-medium mb-1">Điểm số (bội số 10)</label>
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={editQPoints}
                  onChange={(e) => setEditQPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-input border border-border"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Bắt buộc chia hết cho 10 (10, 20, 30...)</p>
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
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold transition disabled:opacity-50"
              >
                {savingQuestion ? "Đang lưu..." : "Cập nhật câu hỏi"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
