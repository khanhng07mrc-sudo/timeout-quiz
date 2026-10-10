"use client";

import React, { useState, useEffect } from "react";
import { ParsedQuestionItem } from "@/lib/quiz-document-parser";
import { normalizeToThreeLevels } from "@/lib/game-engine/scoring";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (questions: ParsedQuestionItem[], title: string, description: string) => void;
  selectedBank?: { id: string; title: string } | null;
}

type StudioTab = "topic" | "document" | "rawtext";
type DocProcessingMode = "ai_generate" | "direct_extract";
type PresetMode = "balanced" | "warmup" | "climax" | "custom";

export default function QuizorraQuestionStudioModal({
  isOpen,
  onClose,
  onSuccess,
  selectedBank,
}: Props) {
  // Navigation & Tab State
  const [activeTab, setActiveTab] = useState<StudioTab>("topic");
  const [docProcessingMode, setDocProcessingMode] = useState<DocProcessingMode>("ai_generate");
  const [rawTextMode, setRawTextMode] = useState<DocProcessingMode>("ai_generate");

  // Topic Source
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("Trung bình / THPT");

  // Document Source
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const [parsedDocData, setParsedDocData] = useState<{
    filename: string;
    wordCount: number;
    extractedText: string;
    parsedQuestions?: ParsedQuestionItem[];
    hasStructuredQuestions: boolean;
  } | null>(null);
  const [docFocusPrompt, setDocFocusPrompt] = useState("");

  // Raw Text Source
  const [rawTextContent, setRawTextContent] = useState("");

  // Game Mode Configuration (Presets & Distribution)
  const [presetMode, setPresetMode] = useState<PresetMode>("balanced");
  const [totalCount, setTotalCount] = useState(10);
  const [customP10, setCustomP10] = useState(4);
  const [customP20, setCustomP20] = useState(4);
  const [customP30, setCustomP30] = useState(2);
  const [customPrompt, setCustomPrompt] = useState("");

  // AI Provider Settings
  const [provider, setProvider] = useState<"gemini" | "openai">("gemini");
  const [apiKey, setApiKey] = useState("");
  const [rememberKey, setRememberKey] = useState(true);

  // Status & Error
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load saved API key
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem(`ai_key_${provider}`) || "";
      setApiKey(savedKey);
    }
  }, [provider]);

  if (!isOpen) return null;

  // Calculate question distribution based on preset or custom
  const getDistribution = () => {
    if (presetMode === "custom") {
      return {
        points10: Math.max(0, customP10),
        points20: Math.max(0, customP20),
        points30: Math.max(0, customP30),
      };
    }
    const count = totalCount;
    if (presetMode === "balanced") {
      // 40% - 40% - 20%
      const p10 = Math.round(count * 0.4);
      const p20 = Math.round(count * 0.4);
      const p30 = Math.max(1, count - p10 - p20);
      return { points10: p10, points20: p20, points30: p30 };
    }
    if (presetMode === "warmup") {
      // 60% - 30% - 10%
      const p10 = Math.round(count * 0.6);
      const p20 = Math.round(count * 0.3);
      const p30 = Math.max(1, count - p10 - p20);
      return { points10: p10, points20: p20, points30: p30 };
    }
    // climax: 20% - 40% - 40%
    const p10 = Math.max(1, Math.round(count * 0.2));
    const p20 = Math.round(count * 0.4);
    const p30 = Math.max(1, count - p10 - p20);
    return { points10: p10, points20: p20, points30: p30 };
  };

  const distribution = getDistribution();
  const effTotal = distribution.points10 + distribution.points20 + distribution.points30;
  const estimatedTimeSec = distribution.points10 * 15 + distribution.points20 * 20 + distribution.points30 * 30;
  const estimatedMinutes = Math.ceil(estimatedTimeSec / 60);

  // Handle Document Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsingDoc(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("defaultPoints", "10");
      formData.append("defaultTime", "15");

      const res = await fetch("/api/quiz-bank/parse-document", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể phân tích tài liệu tải lên");
      }

      setParsedDocData({
        filename: data.filename,
        wordCount: data.wordCount,
        extractedText: data.extractedText,
        parsedQuestions: data.parsedQuestions,
        hasStructuredQuestions: Boolean(data.hasStructuredQuestions),
      });

      // Default mode choice: if file has structured questions, suggest extraction, else suggest AI generation
      if (data.hasStructuredQuestions) {
        setDocProcessingMode("direct_extract");
      } else {
        setDocProcessingMode("ai_generate");
      }
    } catch (err: any) {
      setErrorMessage(err.message || String(err));
      setSelectedFile(null);
      setParsedDocData(null);
    } finally {
      setIsParsingDoc(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Save API key if requested
    if (rememberKey && apiKey.trim()) {
      localStorage.setItem(`ai_key_${provider}`, apiKey.trim());
    }

    // Direct Extraction Mode from File
    if (activeTab === "document" && docProcessingMode === "direct_extract") {
      if (!parsedDocData || !parsedDocData.parsedQuestions || parsedDocData.parsedQuestions.length === 0) {
        setErrorMessage("Không tìm thấy câu hỏi có sẵn nào trong tài liệu. Vui lòng chuyển sang chế độ 'AI đọc tài liệu để soạn đề'!");
        return;
      }
      onSuccess(
        parsedDocData.parsedQuestions,
        `Trích xuất từ: ${parsedDocData.filename}`,
        `Bóc tách trực tiếp ${parsedDocData.parsedQuestions.length} câu hỏi từ tệp tin`
      );
      onClose();
      return;
    }

    // Direct Extraction Mode from Raw Text
    if (activeTab === "rawtext" && rawTextMode === "direct_extract") {
      if (!rawTextContent.trim()) {
        setErrorMessage("Vui lòng dán văn bản câu hỏi vào khung nhập liệu!");
        return;
      }
      // Parse raw text directly
      setIsGenerating(true);
      setProgressStatus("Đang phân tích cấu trúc văn bản...");
      try {
        const formData = new FormData();
        const blob = new Blob([rawTextContent], { type: "text/plain" });
        formData.append("file", blob, "raw_text.txt");
        const res = await fetch("/api/quiz-bank/parse-document", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Lỗi bóc tách văn bản");
        if (!data.parsedQuestions || data.parsedQuestions.length === 0) {
          throw new Error("Không phát hiện cấu trúc câu hỏi (Câu 1: ... A. B. C. D.) trong văn bản!");
        }
        onSuccess(
          data.parsedQuestions,
          "Bộ đề trích xuất từ văn bản",
          `Bóc tách trực tiếp ${data.parsedQuestions.length} câu hỏi`
        );
        onClose();
      } catch (err: any) {
        setErrorMessage(err.message || String(err));
      } finally {
        setIsGenerating(false);
        setProgressStatus(null);
      }
      return;
    }

    // AI Generation Modes
    setIsGenerating(true);
    setProgressStatus("AI đang đọc hiểu nội dung và biên soạn câu hỏi...");

    try {
      let action: "generate_from_scratch" | "generate_from_document" = "generate_from_scratch";
      let docText = "";
      let focusPrompt = "";
      let bankTitle = "";

      if (activeTab === "document") {
        if (!parsedDocData?.extractedText) {
          throw new Error("Vui lòng tải lên một tệp tài liệu trước!");
        }
        action = "generate_from_document";
        docText = parsedDocData.extractedText;
        focusPrompt = docFocusPrompt.trim();
        bankTitle = `Bộ đề AI từ ${parsedDocData.filename}`;
      } else if (activeTab === "rawtext") {
        if (!rawTextContent.trim()) {
          throw new Error("Vui lòng nhập nội dung tài liệu hoặc bài đọc!");
        }
        action = "generate_from_document";
        docText = rawTextContent.trim();
        focusPrompt = customPrompt.trim();
        bankTitle = "Bộ đề AI từ văn bản tài liệu";
      } else {
        // Topic tab
        if (!topic.trim()) {
          throw new Error("Vui lòng nhập chủ đề đề thi!");
        }
        action = "generate_from_scratch";
        bankTitle = `Bộ đề AI: ${topic.trim()}`;
      }

      const res = await fetch("/api/quiz-bank/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim() || undefined,
          action,
          topic: topic.trim(),
          documentText: docText,
          focusPrompt,
          gradeLevel,
          distribution,
          customPrompt: customPrompt.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi sinh đề từ AI");
      }

      onSuccess(
        data.questions || [],
        bankTitle,
        `Sinh bởi ${provider.toUpperCase()} chuẩn Quizorra (${data.questions?.length || 0} câu: ${distribution.points10} câu 10đ, ${distribution.points20} câu 20đ, ${distribution.points30} câu 30đ)`
      );
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || String(err));
    } finally {
      setIsGenerating(false);
      setProgressStatus(null);
    }
  };

  const isAiMode =
    activeTab === "topic" ||
    (activeTab === "document" && docProcessingMode === "ai_generate") ||
    (activeTab === "rawtext" && rawTextMode === "ai_generate");

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div
        className="glass rounded-3xl w-full max-w-4xl border border-purple-500/40 bg-[#0f1120] shadow-2xl my-4 sm:my-8 flex flex-col max-h-[92vh] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4 bg-gradient-to-r from-purple-950/40 via-[#15172b] to-cyan-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-500 text-white font-black shadow-lg shadow-purple-500/20">
              ⚡
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  QUIZORRA QUESTION STUDIO
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black uppercase tracking-widest">
                  Chuẩn Khảo Thí
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Tạo đề từ Chủ đề, Tài liệu PDF/Word/Excel hoặc Bóc tách đề thi • Tương thích mọi Game Mode
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="w-9 h-9 rounded-xl glass hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center font-bold text-lg transition"
            title="Đóng (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-white/10 flex items-center gap-2 bg-[#121426] shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("topic")}
            disabled={isGenerating}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === "topic"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/50"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>💡</span>
            <span>Chủ Đề & Prompt Tự Do</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("document")}
            disabled={isGenerating}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === "document"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400/50"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>📄</span>
            <span>Tài Liệu Đính Kèm (PDF, Word, Excel, TXT)</span>
            {selectedFile && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rawtext")}
            disabled={isGenerating}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === "rawtext"
                ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/30 border border-amber-400/50"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>📝</span>
            <span>Dán Văn Bản Thô</span>
          </button>
        </div>

        {/* Main Studio Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-center gap-2.5">
              <span className="text-lg">⚠️</span>
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {/* ── TAB 1: TOPIC SOURCE ── */}
          {activeTab === "topic" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
                    Chủ Đề Hoặc Lĩnh Vực Cần Ra Đề <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ví dụ: Lịch sử Việt Nam thế kỷ 20, Trí tuệ nhân tạo, Vật lý lượng tử..."
                    className="w-full px-4 py-3 rounded-2xl glass border border-white/20 text-white text-sm focus:outline-none focus:border-purple-400 placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
                    Cấp Độ / Đối Tượng
                  </label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl glass border border-white/20 text-white text-sm bg-[#151728] focus:outline-none focus:border-purple-400"
                  >
                    <option value="Học sinh THCS (Cơ bản)">Học sinh THCS (Cơ bản)</option>
                    <option value="Trung bình / THPT">Trung bình / THPT</option>
                    <option value="Đại học / Chuyên sâu">Đại học / Chuyên sâu</option>
                    <option value="Đố vui giải trí / Đại chúng">Đố vui giải trí / Đại chúng</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: DOCUMENT SOURCE ── */}
          {activeTab === "document" && (
            <div className="space-y-5">
              {!selectedFile ? (
                <div className="border-2 border-dashed border-cyan-500/40 rounded-3xl p-8 text-center bg-cyan-500/5 hover:bg-cyan-500/10 transition flex flex-col items-center justify-center relative cursor-pointer group">
                  <span className="text-5xl mb-3 group-hover:scale-110 transition transform">📑</span>
                  <p className="text-base font-black text-white mb-1">
                    Nhấp vào đây hoặc kéo thả file tài liệu vào khung
                  </p>
                  <p className="text-xs text-slate-400 max-w-md">
                    Hỗ trợ đầy đủ: <b>PDF (.pdf)</b>, Word (.docx), Excel (.xlsx, .xls), CSV, Text (.txt, .md)
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.json"
                    onChange={handleFileUpload}
                    disabled={isParsingDoc}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              ) : (
                <div className="p-4 sm:p-5 rounded-2xl glass border border-cyan-500/40 bg-cyan-950/20 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40">
                        📄
                      </span>
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-white truncate max-w-md">
                          {selectedFile.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-cyan-300 mt-0.5">
                          <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>{parsedDocData?.wordCount ?? 0} từ đã trích xuất</span>
                        </div>
                      </div>
                    </div>
                    <label className="px-3 py-1.5 rounded-xl glass hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer">
                      Đổi file khác
                      <input
                        type="file"
                        accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.json"
                        onChange={handleFileUpload}
                        disabled={isParsingDoc}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Processing Mode Switcher for Document */}
                  <div className="pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      onClick={() => setDocProcessingMode("ai_generate")}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                        docProcessingMode === "ai_generate"
                          ? "bg-purple-600/20 border-purple-500/80 text-white shadow-lg"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="docProcessingMode"
                        checked={docProcessingMode === "ai_generate"}
                        onChange={() => setDocProcessingMode("ai_generate")}
                        className="mt-0.5 text-purple-600 focus:ring-0"
                      />
                      <div>
                        <div className="text-xs font-black text-purple-300 uppercase tracking-wider">
                          ✨ AI Đọc Hiểu & Biên Soạn Đề Mới
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          AI tự phân tích tài liệu và sinh bộ câu hỏi trắc nghiệm chuẩn theo các mức điểm.
                        </p>
                      </div>
                    </label>

                    <label
                      onClick={() => setDocProcessingMode("direct_extract")}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                        docProcessingMode === "direct_extract"
                          ? "bg-cyan-600/20 border-cyan-500/80 text-white shadow-lg"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="docProcessingMode"
                        checked={docProcessingMode === "direct_extract"}
                        onChange={() => setDocProcessingMode("direct_extract")}
                        className="mt-0.5 text-cyan-600 focus:ring-0"
                      />
                      <div>
                        <div className="text-xs font-black text-cyan-300 uppercase tracking-wider">
                          🔍 Bóc Tách Câu Hỏi Có Sẵn Trong File
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          File đã chứa sẵn ngân hàng đề thi (A, B, C, D). Hệ thống trích xuất trực tiếp.
                        </p>
                      </div>
                    </label>
                  </div>

                  {docProcessingMode === "ai_generate" && (
                    <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        🎯 Trọng tâm kiến thức / Chương cần ra đề (Tùy chọn)
                      </label>
                      <input
                        type="text"
                        value={docFocusPrompt}
                        onChange={(e) => setDocFocusPrompt(e.target.value)}
                        placeholder="Ví dụ: Chỉ tập trung vào phần nguyên lý và ứng dụng thực tiễn của chương 2..."
                        className="w-full px-3.5 py-2 rounded-xl glass border border-white/20 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  )}
                </div>
              )}

              {isParsingDoc && (
                <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-300 text-xs font-bold text-center animate-pulse flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-cyan-300/30 border-t-cyan-300 rounded-full animate-spin" />
                  <span>Đang trích xuất và phân tích nội dung tệp tin...</span>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: RAW TEXT SOURCE ── */}
          {activeTab === "rawtext" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-1 rounded-xl glass border border-white/10">
                <button
                  type="button"
                  onClick={() => setRawTextMode("ai_generate")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    rawTextMode === "ai_generate" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>✨</span>
                  <span>AI đọc văn bản này để soạn đề</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRawTextMode("direct_extract")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    rawTextMode === "direct_extract" ? "bg-cyan-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>🔍</span>
                  <span>Bóc tách đề trắc nghiệm có sẵn</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-300 mb-1 uppercase tracking-wider">
                  Nội Dung Văn Bản Đề Thi Hoặc Tài Liệu Học Tập
                </label>
                <textarea
                  rows={8}
                  value={rawTextContent}
                  onChange={(e) => setRawTextContent(e.target.value)}
                  placeholder={
                    rawTextMode === "ai_generate"
                      ? "Dán bài đọc, đoạn văn bản, tài liệu bài giảng hoặc ghi chú ôn tập tại đây..."
                      : `Ví dụ định dạng đề thi có sẵn:\n\nCâu 1: Thủ đô của Việt Nam là gì?\nA. Đà Nẵng\nB. Hà Nội*\nC. Huế\nD. Cần Thơ\nĐáp án: B`
                  }
                  className="w-full p-4 rounded-2xl glass border border-white/20 text-xs font-mono text-white leading-relaxed focus:outline-none focus:border-amber-400 placeholder:text-slate-500"
                />
              </div>
            </div>
          )}

          {/* ── QUIZORRA GAME MODE PRESET & DISTRIBUTION ── */}
          {isAiMode && (
            <div className="p-5 rounded-3xl glass border border-purple-500/30 bg-purple-950/20 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚖️</span>
                  <h3 className="text-sm sm:text-base font-black text-amber-300 uppercase tracking-wider">
                    Cấu Hình Ràng Buộc Chuẩn Game Mode Quizorra
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    🟢 10đ (15s)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    🟡 20đ (20s)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                    🟣 30đ (30s)
                  </span>
                </div>
              </div>

              {/* Preset Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPresetMode("balanced")}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    presetMode === "balanced"
                      ? "bg-purple-600/30 border-purple-400 text-white shadow-lg"
                      : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="text-xs font-black text-amber-300">⚖️ Cân Bằng Quizorra</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">40% 10đ • 40% 20đ • 20% 30đ</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">Phù hợp mọi Game Mode</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPresetMode("warmup")}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    presetMode === "warmup"
                      ? "bg-emerald-600/30 border-emerald-400 text-white shadow-lg"
                      : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="text-xs font-black text-emerald-300">🟢 Khởi Động / Dễ</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">60% 10đ • 30% 20đ • 10% 30đ</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">Dễ thở, nhập môn</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPresetMode("climax")}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    presetMode === "climax"
                      ? "bg-rose-600/30 border-rose-400 text-white shadow-lg"
                      : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="text-xs font-black text-rose-300">🟣 Đấu Trường Đỉnh Cao</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">20% 10đ • 40% 20đ • 40% 30đ</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">Chung kết kịch tính</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPresetMode("custom")}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    presetMode === "custom"
                      ? "bg-cyan-600/30 border-cyan-400 text-white shadow-lg"
                      : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="text-xs font-black text-cyan-300">⚙️ Tự Chọn Số Câu</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">Tùy biến từng mức điểm</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">Nhập số câu cụ thể</div>
                </button>
              </div>

              {/* Slider for presets OR Custom Inputs */}
              {presetMode !== "custom" ? (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>Tổng số lượng câu hỏi mong muốn:</span>
                    <span className="text-amber-300 text-sm font-black">{totalCount} câu</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={30}
                    step={1}
                    value={totalCount}
                    onChange={(e) => setTotalCount(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>5 câu</span>
                    <span>10 câu</span>
                    <span>15 câu</span>
                    <span>20 câu</span>
                    <span>25 câu</span>
                    <span>30 câu</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-emerald-300">Số câu 10đ (15s)</label>
                    <input
                      type="number"
                      min={0}
                      max={25}
                      value={customP10}
                      onChange={(e) => setCustomP10(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 rounded-xl glass border border-emerald-500/40 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-amber-300">Số câu 20đ (20s)</label>
                    <input
                      type="number"
                      min={0}
                      max={25}
                      value={customP20}
                      onChange={(e) => setCustomP20(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 rounded-xl glass border border-amber-500/40 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-purple-300">Số câu 30đ (30s)</label>
                    <input
                      type="number"
                      min={0}
                      max={25}
                      value={customP30}
                      onChange={(e) => setCustomP30(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 rounded-xl glass border border-purple-500/40 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Distribution & Time Summary Badge */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-300">Phân bổ kết quả:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    {distribution.points10} câu 10đ
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    {distribution.points20} câu 20đ
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                    {distribution.points30} câu 30đ
                  </span>
                </div>
                <div className="text-cyan-300 font-bold flex items-center gap-1.5">
                  <span>⏱️ Tổng: {effTotal} câu</span>
                  <span>•</span>
                  <span>Ước tính ~{estimatedMinutes} phút thi đấu</span>
                </div>
              </div>

              {/* Anti-cueing Pledge */}
              <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-200 text-xs flex items-center gap-2.5">
                <span className="text-base shrink-0">🛡️</span>
                <span>
                  <b>Chuẩn Khảo Thí Tâm Lý (Anti-Cueing):</b> 4 phương án A, B, C, D được đảm bảo đồng đều độ dài, ngữ pháp song hành, cấm tuyệt đối chú thích riêng lẻ làm lộ đáp án đúng.
                </span>
              </div>
            </div>
          )}

          {/* ── AI PROVIDER SETTINGS ── */}
          {isAiMode && (
            <div className="p-4 rounded-2xl glass border border-white/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  Cấu Hình Mô Hình Trí Tuệ Nhân Tạo (AI Engine)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setProvider("gemini")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      provider === "gemini" ? "bg-cyan-600 text-white shadow" : "glass text-slate-400 hover:text-white"
                    }`}
                  >
                    Google Gemini 2.0 Flash
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvider("openai")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      provider === "openai" ? "bg-emerald-600 text-white shadow" : "glass text-slate-400 hover:text-white"
                    }`}
                  >
                    OpenAI GPT-4o-mini
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`Nhập ${provider === "gemini" ? "Google Gemini API Key" : "OpenAI API Key"} (hoặc để trống nếu đã cấu hình trong .env)...`}
                    className="w-full px-3.5 py-2 rounded-xl glass border border-white/20 text-xs text-white focus:outline-none placeholder:text-slate-500"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberKey}
                      onChange={(e) => setRememberKey(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-0"
                    />
                    <span>Ghi nhớ API Key trên trình duyệt</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 shrink-0">
            <div className="text-xs text-slate-400">
              {progressStatus && (
                <span className="text-cyan-300 font-bold flex items-center gap-2 animate-pulse">
                  <span className="w-3.5 h-3.5 border-2 border-cyan-300/30 border-t-cyan-300 rounded-full animate-spin" />
                  {progressStatus}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                className="px-5 py-2.5 rounded-xl glass hover:bg-white/10 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={
                  isGenerating ||
                  (activeTab === "topic" && !topic.trim()) ||
                  (activeTab === "document" && !selectedFile) ||
                  (activeTab === "rawtext" && !rawTextContent.trim())
                }
                className={`px-6 py-3 rounded-2xl text-white font-black text-xs sm:text-sm shadow-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isAiMode
                    ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95"
                    : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95"
                }`}
              >
                {isGenerating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Hệ thống đang xử lý...</span>
                  </>
                ) : isAiMode ? (
                  <>
                    <span>✨</span>
                    <span>Bắt Đầu Biên Soạn {effTotal} Câu Hỏi</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>Bóc Tách & Nhập Câu Hỏi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
