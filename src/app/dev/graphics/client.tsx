"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { ROUND_LABELS, type OlympiaState } from "@/lib/olympia/types";
import { getVcnvUnit } from "@/lib/olympia/engine";
import { activeSeats } from "@/components/olympia/ui";
import {
  EconovaLowerThirdV3,
  VcnvCountdownGraphic,
  VcnvAnswerRevealGraphic,
  TangTocQuestionGraphic,
  TangTocRankedAnswersGraphic,
  VeDichSlantedGridGraphic,
  SummaryLowerThirdGraphic,
  V3SingleAnswerBar,
  Olympia22BackgroundBackdrop,
  BroadcastRoundIntroOverlay,
  Vtv3ClassicSummaryGraphic,
  ClassicWoodenBackingBeam,
  Vtv3ChalkboardBackdrop,
  HorizontalBrassRod,
  RedConnectionRivet,
} from "@/components/olympia/Vtv3BroadcastGraphics";

const OlympiaStudio3DScene = dynamic(() => import("@/components/olympia/OlympiaStudio3DScene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[540px] flex items-center justify-center bg-[#020510] text-cyan-300 font-bold">
      Đang tải Trường quay 3D...
    </div>
  ),
});

export function DevGraphicsClient() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("r6");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const p = sp.get("tab");
      if (p) setActiveTab(p);
      const r = sp.get("ruleset");
      if (r && (r === "O26" || r === "O20" || r === "O15" || r === "O13" || r === "O14")) {
        setRulesetId(r as any);
      }
    }
  }, []);
  const [isBuzzed, setIsBuzzed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("buzzed") === "1";
    }
    return false;
  });
  const [hopeStar, setHopeStar] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const hs = new URLSearchParams(window.location.search).get("hopeStar");
      if (hs === "0" || hs === "false") return false;
    }
    return true;
  });
  const [rulesetId, setRulesetId] = useState<"O26" | "O20" | "O15" | "O13" | "O14">(() => {
    if (typeof window !== "undefined") {
      const r = new URLSearchParams(window.location.search).get("ruleset");
      if (r === "O26" || r === "O20" || r === "O15" || r === "O13" || r === "O14") {
        return r;
      }
    }
    return "O26";
  });
  const [seatsCount, setSeatsCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const n = Number(new URLSearchParams(window.location.search).get("seats"));
      if (n >= 2 && n <= 8) return Math.floor(n);
    }
    return 4;
  });
  const [summaryIndex, setSummaryIndex] = useState(3);
  const [forceAnim, setForceAnim] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("anim") === "1";
    }
    return false;
  });

  const mockSeats2 = [
    { id: 0, name: "Quang Minh", school: "THPT Chuyên Hà Nội - Amsterdam", score: 285, online: true },
    { id: 1, name: "Anh Đức", school: "THPT Chuyên Lê Hồng Phong", score: 210, online: true },
  ];

  const mockSeats4 = [
    ...mockSeats2,
    { id: 2, name: "Gia Bảo", school: "THPT Chuyên Quốc Học Huế", score: 180, online: true },
    { id: 3, name: "Thái Dương", school: "THPT Chuyên Phan Bội Châu", score: 150, online: true },
  ];

  const mockSeats6 = [
    ...mockSeats4,
    { id: 4, name: "Hải Đăng", school: "THPT Chuyên Lam Sơn", score: 195, online: true },
    { id: 5, name: "Tuấn Minh", school: "THPT Chuyên Bắc Ninh", score: 165, online: true },
  ];

  const mockSeats7 = [
    ...mockSeats6,
    { id: 6, name: "Hoàng Bách", school: "THPT Chuyên Trần Phú", score: 175, online: true },
  ];

  const mockSeats8 = [
    ...mockSeats7,
    { id: 7, name: "Nguyễn Hoàng Minh Triết", school: "THPT Chuyên Lương Thế Vinh", score: 220, online: true },
  ];

  const activeMockSeats =
    seatsCount === 2
      ? mockSeats2
      : seatsCount === 6
      ? mockSeats6
      : seatsCount === 7
      ? mockSeats7
      : seatsCount === 8
      ? mockSeats8
      : mockSeats4.slice(0, seatsCount);

  const mockState = {
    id: "dev-room",
    title: "Trận Chung Kết Năm - Olympia 26",
    hostSecret: "secret",
    createdAt: Date.now(),
    themeMode: "v3_arrow",
    rulesetId,
    seatCount: activeMockSeats.length,
    currentRound: "khoiDong",
    status: "in_progress",
    stage: "playing",
    audioSeason: "O26",
    seats: activeMockSeats,
    khoiDong: {
      phase: "question",
      qIdx: 5,
      lockedSeats: [],
      current: {
        q: "Theo định luật tuần hoàn của Mendeleev, tính chất của các đơn chất cũng như dạng và tính chất của các hợp chất tạo nên từ các nguyên tố đó biến đổi tuần hoàn theo chiều tăng của cái gì?",
        a: "Điện tích hạt nhân nguyên tử",
      },
    },
    vcnv: {
      phase: "answers",
      keyword: "TRÍ TUỆ NHÂN TẠO",
      rows: [],
      revealedRows: [0, 1],
      revealedPieces: [0, 1],
      answers: {
        0: { text: "MẠNG NƠ-RON", correct: true },
        1: { text: "MẠNG NƠ-RON", correct: true },
        2: { text: "THUẬT TOÁN", correct: false },
        3: { text: "MÁY TÍNH", correct: false },
      },
      currentPiece: 2,
    },
    tangToc: {
      phase: "ranking",
      qIdx: 2,
      questions: [],
      ranking: [
        { seat: 0, answer: "CHÂU ÂU", ms: 1230, points: 40, noAnswer: false },
        { seat: 1, answer: "CHÂU Á", ms: 2450, points: 30, noAnswer: false },
        { seat: 2, answer: "CHÂU PHI", ms: 3890, points: 20, noAnswer: false },
        { seat: 3, answer: "CHÂU MỸ", ms: 4500, points: 10, noAnswer: false },
      ],
    },
    veDich: {
      phase: "thinking",
      order: [0, 1, 2, 3],
      turnIdx: 0,
      qIdx: 1,
      packages: {
        0: [{ points: 20, q: { text: "Câu hỏi 1", answer: "A1" } }, { points: 30, q: { text: "Câu hỏi 2", answer: "A2" } }, { points: 30, q: { text: "Câu hỏi 3", answer: "A3" } }],
        1: [{ points: 20, q: { text: "Câu hỏi 1", answer: "A1" } }, { points: 20, q: { text: "Câu hỏi 2", answer: "A2" } }, { points: 30, q: { text: "Câu hỏi 3", answer: "A3" } }],
        2: [{ points: 30, q: { text: "Câu hỏi 1", answer: "A1" } }, { points: 30, q: { text: "Câu hỏi 2", answer: "A2" } }, { points: 30, q: { text: "Câu hỏi 3", answer: "A3" } }],
        3: [{ points: 20, q: { text: "Câu hỏi 1", answer: "A1" } }, { points: 30, q: { text: "Câu hỏi 2", answer: "A2" } }, { points: 30, q: { text: "Câu hỏi 3", answer: "A3" } }],
      },
      hopeStarActive: hopeStar,
      current: {
        points: 30,
        q: {
          q: "Hợp chất hữu cơ nào có công thức phân tử C6H12O6, là sản phẩm trực tiếp của quá trình quang hợp ở thực vật và nguồn năng lượng chủ yếu cho tế bào sinh vật?",
          a: "Glucose (Đường nho)",
        },
      },
      timer: { totalMs: 20000, remainingMs: 14500, startedAt: Date.now() - 5500 },
      steal: null,
      hopeStarUsed: [],
      deductedOnSteal: false,
      pointers: {},
      lastVerdict: null,
    },
    summaryState: {
      active: true,
      isAuto: false,
      currentIndex: summaryIndex,
      orderedSeats: [0, 1, 2, 3],
    },
    bellLogs: [],
    events: [],
  } as unknown as OlympiaState;

  const serverNow = () => Date.now();

  // ─────────────────────────────────────────────────────────────────────────
  // MILESTONE 3 / REQUIREMENT R4 — AUTOMATED HEADLESS SCREENSHOT STATES
  // ─────────────────────────────────────────────────────────────────────────
  const r4VcnvRevealState: OlympiaState = {
    ...mockState,
    stage: "playing",
    currentRound: "vcnv",
    themeMode: "o26_classic",
    vcnv: {
      ...mockState.vcnv!,
      phase: "answers",
      currentRow: 0,
      keyword: "TRÍ TUỆ NHÂN TẠO",
      keywordLength: 14,
      rows: [
        { hint: "Gợi ý hàng ngang 1 (9 chữ cái): Cấu trúc tính toán mô phỏng hệ thần kinh sinh học", answer: "MẠNG NƠ RON", letterCount: 9, opened: true, wrong: false },
        { hint: "Gợi ý hàng ngang 2 (9 chữ cái)", answer: "THUẬT TOÁN", letterCount: 9, opened: false, wrong: false },
        { hint: "Gợi ý hàng ngang 3 (9 chữ cái)", answer: "DỮ LIỆU LỚN", letterCount: 9, opened: false, wrong: false },
        { hint: "Gợi ý hàng ngang 4 (6 chữ cái)", answer: "HỌC SÂU", letterCount: 6, opened: false, wrong: false },
      ],
      revealedCorrectAnswer: true,
      answers: {
        0: { text: "MẠNG NƠ RON", at: 3820, ms: 3820 },
        1: { text: "MẠNG NƠ RON", at: 4950, ms: 4950 },
        2: { text: "THUẬT TOÁN", at: 6120, ms: 6120 },
        3: { text: "TRÍ TUỆ NHÂN TẠO", at: 8400, ms: 8400 },
      },
      bells: [
        { seat: 0, before: false, atMs: 1420 },
        { seat: 1, before: false, atMs: 2150 },
      ],
      eliminatedSeats: [2],
    },
  };

  const r4TangTocRevealState: OlympiaState = {
    ...mockState,
    stage: "playing",
    currentRound: "tangToc",
    themeMode: "o26_classic",
    tangToc: {
      ...mockState.tangToc!,
      phase: "graded",
      qIdx: 0,
      revealedCorrectAnswer: true,
      correctAnswer: "CHÂU ÂU",
      ranking: [
        { seat: 0, answer: "CHÂU ÂU", ms: 1230, points: 40, wrong: false, noAnswer: false },
        { seat: 1, answer: "CHÂU ÂU", ms: 2450, points: 30, wrong: false, noAnswer: false },
        { seat: 2, answer: "CHÂU Á", ms: 3890, points: 0, wrong: true, noAnswer: false },
        { seat: 3, answer: "CHÂU PHI", ms: 4500, points: 0, wrong: true, noAnswer: false },
      ],
    },
  };

  const r4RoundIntroState: OlympiaState = {
    ...mockState,
    stage: "playing",
    currentRound: "vcnv",
    banner: ROUND_LABELS.vcnv,
    themeMode: "o26_classic",
  };

  const r4CenterShieldedState: OlympiaState = {
    ...mockState,
    stage: "playing",
    currentRound: "vcnv",
    themeMode: "o26_classic",
    vcnv: {
      ...mockState.vcnv!,
      phase: "question",
      currentRow: 4,
      keyword: "TRÍ TUỆ NHÂN TẠO",
      keywordLength: 14,
      mysteryImage: "/olympia/olympia_22_background.png",
      piecesRevealed: [false, false, false, false, false],
      bells: [
        { seat: 0, before: false, atMs: 1420 },
        { seat: 1, before: false, atMs: 2150 },
      ],
      timer: { totalMs: 15000, remainingMs: 12000, startedAt: Date.now() - 3000 },
      rows: [
        { hint: "Hàng ngang 1 (9 chữ cái): Cấu trúc tính toán sinh học", answer: "MẠNG NƠ RON", letterCount: 9, opened: false, wrong: false },
        { hint: "Hàng ngang 2 (9 chữ cái): Trình tự hữu hạn các bước", answer: "THUẬT TOÁN", letterCount: 9, opened: false, wrong: false },
        { hint: "Hàng ngang 3 (9 chữ cái): Tập hợp dữ liệu quy mô lớn", answer: "DỮ LIỆU LỚN", letterCount: 9, opened: false, wrong: false },
        { hint: "Hàng ngang 4 (6 chữ cái): Nhánh học máy nâng cao", answer: "HỌC SÂU", letterCount: 6, opened: false, wrong: false },
      ],
      centerQuestion: {
        q: "Câu hỏi trung tâm: Hãy cho biết lĩnh vực khoa học công nghệ bao trùm cả 4 khái niệm ở các hàng ngang trên?",
        a: "TRÍ TUỆ NHÂN TẠO",
      },
    },
  };

  const r4ScoreboardCleanState: OlympiaState = {
    ...mockState,
    stage: "playing",
    currentRound: "veDich",
    themeMode: "o26_classic",
    summaryState: {
      active: true,
      isAuto: false,
      currentIndex: 3,
      orderedSeats: [0, 1, 2, 3],
    },
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#020713] text-white p-6 flex flex-col items-center justify-center">
        <div className="text-cyan-400 font-bold tracking-wider animate-pulse">
          Đang tải đồ hoạ Olympia 26...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020713] text-white p-6 flex flex-col items-center">
      {/* Dev Navigation & Switcher */}
      <div className="w-full max-w-6xl mb-8 p-4 bg-slate-900/90 rounded-2xl border border-cyan-500/40 flex flex-wrap items-center justify-between gap-4 shadow-2xl backdrop-blur-md">
        <div>
          <h1 className="text-xl font-black text-cyan-400 tracking-wider">
            OLYMPIA 26 — THEME V3 BROADCAST GRAPHICS PREVIEW
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Mounting real React components directly to ensure zero distortion and authentic Econova geometry parity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["all", "Tất cả"],
              ["r4", "★ R4 Visual Proofs"],
              ["r6", "0. R6 Choreography"],
              ["kd", "1. Khởi Động"],
              ["vcnv", "2. VCNV"],
              ["tt", "3. Tăng Tốc"],
              ["vd-grid", "4a. Lưới Về Đích"],
              ["vd-qbox", "4b. Câu hỏi Về Đích"],
              ["ans", "4c. Đáp án đơn"],
              ["chp", "4d. Câu hỏi phụ"],
              ["summary", "5. Tổng kết điểm"],
              ["econova", "6. Econova Broadcast"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === key
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full pt-2 border-t border-slate-800 text-xs text-slate-300">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={forceAnim}
              onChange={(e) => setForceAnim(e.target.checked)}
              className="rounded text-cyan-500"
            />
            <span>Run Entrance Anim</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isBuzzed}
              onChange={(e) => setIsBuzzed(e.target.checked)}
              className="rounded text-cyan-500"
            />
            <span>Buzzed Seat (TS 1 Chuông)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={hopeStar}
              onChange={(e) => setHopeStar(e.target.checked)}
              className="rounded text-cyan-500"
            />
            <span>Ngôi sao hy vọng ⭐</span>
          </label>

          <div className="flex items-center gap-1.5">
            <span>Ruleset:</span>
            <select
              value={rulesetId}
              onChange={(e) => setRulesetId(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
            >
              <option value="O26">O26 (2 rows: 20, 30)</option>
              <option value="O20">O20 (3 rows: 10, 20, 30)</option>
              <option value="O15">O15 (1 row preset: 40, 60, 80 — 3 câu: 10-20-30)</option>
              <option value="O13">O13 (1 row preset: 40, 60, 80 — 4 câu: 10-10-20-20)</option>
              <option value="O14">O14 (1 row preset: 40, 60, 80 — 4 câu: 10-10-20-20)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Thí sinh:</span>
            <select
              value={seatsCount}
              onChange={(e) => setSeatsCount(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
            >
              <option value={2}>2 thí sinh</option>
              <option value={4}>4 thí sinh</option>
              <option value={6}>6 thí sinh</option>
              <option value={7}>7 thí sinh</option>
              <option value={8}>8 thí sinh</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Reveal step:</span>
            <select
              value={summaryIndex}
              onChange={(e) => setSummaryIndex(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
            >
              <option value={0}>1 người (Quán quân)</option>
              <option value={1}>2 người (+Á quân)</option>
              <option value={2}>3 người (+Hạng 3)</option>
              <option value={3}>Đủ 4 người</option>
            </select>
          </div>
        </div>
      </div>

      {/* Graphics Containers */}
      <div className="w-full max-w-6xl flex flex-col gap-12 items-center">
        {/* TIẾN TRÌNH KHỞI ĐỘNG CHUẨN XÁC 100% THEO YÊU CẦU */}
        {(activeTab === "all" || activeTab === "kd") && (
          <div className="w-full flex flex-col gap-6">
            {/* Giai đoạn 2: t = 3.5s (Phát open_question ĐỒNG THỜI đồ hoạ bung mở ở Câu 0/6 ruột trống) */}
            <div
              id="stage-kd-35s"
              className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border-2 border-amber-400/40 shadow-2xl"
            >
              <div className="mb-2 text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                GIAI ĐOẠN 2 (t = 3.5s): ÂM OPEN_QUESTION PHÁT + ĐỒ HOẠ HẠ 1/3 BUNG MỞ (CÂU 0/6, RUỘT TRỐNG)
              </div>
              <p className="text-xs text-slate-300 mb-4 text-center">
                Khung đồ hoạ lục giác Econova unroll ở $t = 3.5s$ cùng lúc âm thanh open_question phát. Huy hiệu hiển thị <strong>Câu 0/6</strong> và ruột câu hỏi trống hoàn toàn.
              </p>
              <div className="w-full flex items-center justify-center min-h-[200px]">
                {(() => {
                  const stateStage2 = {
                    ...mockState,
                    khoiDong: {
                      ...mockState.khoiDong,
                      qIdx: -1,
                      questionRevealed: false,
                      current: null,
                    },
                  } as unknown as OlympiaState;
                  return (
                    <EconovaLowerThirdV3
                      state={stateStage2}
                      activeSeatId={0}
                      questionNumberBadge="Câu 0/6"
                      questionText=""
                      serverNow={serverNow}
                      runAnim={false}
                    />
                  );
                })()}
              </div>
            </div>

            {/* Giai đoạn 3: Bấm CÂU TIẾP (Chuyển lên Câu 1/6, nạp câu hỏi 1 và phát BGM) */}
            <div
              id="stage-kd-q1"
              className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border-2 border-cyan-400/40 shadow-2xl"
            >
              <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                GIAI ĐOẠN 3 (BẤM CÂU TIẾP LẦN 1): BỘ ĐẾM LÊN CÂU 1/6 + HIỆN NỘI DUNG CÂU 1 + PHÁT BGM KD_BGM_1
              </div>
              <p className="text-xs text-slate-300 mb-4 text-center">
                Bộ đếm chuyển sang <strong>Câu 1/6</strong>, nội dung câu hỏi 1 hiển thị rõ nét chuẩn phát sóng truyền hình (94% viewport), âm thanh open_question phát và BGM bắt đầu.
              </p>
              <div className="w-full flex items-center justify-center min-h-[220px]">
                {(() => {
                  const stateStage3 = {
                    ...mockState,
                    khoiDong: {
                      ...mockState.khoiDong,
                      qIdx: 0,
                      questionRevealed: true,
                      current: {
                        q: "Tài liệu do bên mời thầu lập quy định tiêu chuẩn kỹ thuật, năng lực và hướng dẫn nộp thầu viết tắt là gì?",
                        a: "HSMT (Hồ sơ mời thầu)",
                      },
                    },
                  } as unknown as OlympiaState;
                  return (
                    <EconovaLowerThirdV3
                      state={stateStage3}
                      activeSeatId={0}
                      questionNumberBadge="Câu 1/6"
                      questionText="Tài liệu do bên mời thầu lập quy định tiêu chuẩn kỹ thuật, năng lực và hướng dẫn nộp thầu viết tắt là gì?"
                      serverNow={serverNow}
                      runAnim={false}
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Deliverable 3D: SÂN KHẤU TRƯỜNG QUAY 3D VÀ NHÂN VẬT Á ĐÔNG */}
        {activeTab === "kd" && (
          <div className="w-full flex flex-col gap-6">
            <div
              id="graphic-studio-3d"
              className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border border-emerald-500/30 shadow-2xl"
            >
              <div className="mb-2 text-xs font-black uppercase tracking-wider text-emerald-300">
                TRƯỜNG QUAY 3D STUDIO — GÓC CẬN CẢNH THÍ SINH 1 (CAM 5: THIẾT KẾ GIẢI PHẪU Á ĐÔNG MỀM MẠI)
              </div>
              <p className="text-xs text-slate-300 mb-4 text-center">
                Cận cảnh thí sinh số 1 tại bục: Áo polo học sinh có chân cổ và nẹp cúc, cơ thang vai mềm mại, khuôn mặt Á Đông với sống mũi tự nhiên, khóe môi, mắt có chiều sâu và ánh sáng trường quay chân thực.
              </p>
              <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-[#030712] relative">
                <OlympiaStudio3DScene
                  state={mockState}
                  serverNow={serverNow}
                  activeCamera={5}
                  transitionMode="CUT"
                  showDirectorBar={false}
                  allowPTZ={false}
                  defaultQuality="HIGH"
                />
              </div>
            </div>

            <div
              id="graphic-studio-3d-mc"
              className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border border-purple-500/30 shadow-2xl"
            >
              <div className="mb-2 text-xs font-black uppercase tracking-wider text-purple-300">
                TRƯỜNG QUAY 3D STUDIO — GÓC CẬN BỤC 2 MC (CAM 3: KHÁNH VY & NGỌC HUY)
              </div>
              <p className="text-xs text-slate-300 mb-4 text-center">
                Bục dẫn chương trình của MC Khánh Vy & Ngọc Huy: Vest truyền hình chuyên nghiệp, khuôn mặt biểu cảm tự nhiên, ánh sáng studio rạng rỡ.
              </p>
              <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-[#030712] relative">
                <OlympiaStudio3DScene
                  state={mockState}
                  serverNow={serverNow}
                  activeCamera={3}
                  transitionMode="CUT"
                  showDirectorBar={false}
                  allowPTZ={false}
                  defaultQuality="HIGH"
                />
              </div>
            </div>
          </div>
        )}

        {/* Deliverable R4: HEADLESS SCREENSHOT AUTOMATION PROOFS & BROADCAST VISUAL PLAN (R1 - R4) */}
        {(activeTab === "all" ||
          activeTab === "r4" ||
          activeTab === "r4-1" ||
          activeTab === "r4-2" ||
          activeTab === "r4-3" ||
          activeTab === "r4-4" ||
          activeTab === "r4-5" ||
          activeTab === "r4-6" ||
          activeTab === "r4-7" ||
          activeTab === "r4-vcnv-reveal" ||
          activeTab === "r4-tangtoc-reveal" ||
          activeTab === "r4-round-intro" ||
          activeTab === "r4-host-console-vcnv" ||
          activeTab === "r4-playerpad-lock" ||
          activeTab === "r4-vcnv-center-shielded" ||
          activeTab === "r4-scoreboard-clean") && (
          <div className="w-full flex flex-col gap-8">
            <div className="p-4 bg-gradient-to-r from-cyan-950/90 via-slate-900 to-amber-950/90 border-l-4 border-amber-400 rounded-xl shadow-xl">
              <h2 className="text-base font-black text-amber-300 tracking-wider">
                MILESTONE 3 — HEADLESS SCREENSHOT PROOFS &amp; BROADCAST VISUAL PLAN (R1, R2, R3, R4)
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Automated 1920x1080 visual proofs: VCNV/Tăng Tốc 3D rotate reveals with wooden beam &amp; emerald green highlight, Round Intro 3D overlay, Host Console direct answer bell column, PlayerPad inline lock badge, VCNV center tile shielded, and DisplayScreen scoreboard clean of keyboard hints.
              </p>
            </div>

            {/* 01: VCNV 3D Answer Reveal with Wooden Beam & Green Highlight */}
            {(activeTab === "all" ||
              activeTab === "r4" ||
              activeTab === "r4-1" ||
              activeTab === "r4-vcnv-reveal") && (
              <div className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border-2 border-cyan-500/40 shadow-2xl">
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  01_VCNV_3D_ANSWER_REVEAL.PNG — VCNV 3D ROTATE &amp; WOODEN BEAM &amp; GREEN HIGHLIGHT (R1, R4)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Đồ hoạ hiện đáp án VCNV tỷ lệ chuẩn, chuyển động rotate 3D mượt mà với xà gỗ đỡ (ClassicWoodenBackingBeam) và hiệu ứng quét sáng (sheen-sweep-beam). Hàng thí sinh đúng chuyển màu xanh lục (emerald), hàng sai mờ đi (opacity 0.35); loại bỏ hoàn toàn overlay đáp án phụ ở chân màn hình.
                </p>
                <div className="w-full overflow-x-auto flex justify-center py-2">
                  <div
                    id="screenshot-r4-vcnv-reveal"
                    className="relative w-[1920px] h-[1080px] shrink-0 overflow-hidden bg-[#040d21] rounded-2xl border border-cyan-400/30 shadow-2xl select-none"
                  >
                    <VcnvAnswerRevealGraphic
                      state={r4VcnvRevealState}
                      isWaitingAnswer={false}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 02: Tăng Tốc Ranked Answer Reveal */}
            {(activeTab === "all" ||
              activeTab === "r4" ||
              activeTab === "r4-2" ||
              activeTab === "r4-tangtoc-reveal") && (
              <div className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border-2 border-cyan-500/40 shadow-2xl">
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  02_TANGTOC_RANKED_ANSWER_REVEAL.PNG — TĂNG TỐC RANKED REVEAL &amp; RESPONSE TIMES &amp; GREEN HIGHLIGHT (R1, R4)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Đồ hoạ hiện đáp án Tăng Tốc xếp hạng theo thời gian phản hồi (1.23s, 2.45s, 3.89s, 4.50s) với xà gỗ đỡ, chuyển động rotate 3D, hàng đúng chuyển màu xanh lục cùng huy hiệu điểm (+40, +30), hàng sai mờ đi.
                </p>
                <div className="w-full overflow-x-auto flex justify-center py-2">
                  <div
                    id="screenshot-r4-tangtoc-reveal"
                    className="relative w-[1920px] h-[1080px] shrink-0 overflow-hidden bg-[#040d21] rounded-2xl border border-cyan-400/30 shadow-2xl select-none"
                  >
                    <TangTocRankedAnswersGraphic
                      state={r4TangTocRevealState}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 03: Round Intro 3D Overlay */}
            {(activeTab === "all" ||
              activeTab === "r4" ||
              activeTab === "r4-3" ||
              activeTab === "r4-round-intro") && (
              <div className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border-2 border-cyan-500/40 shadow-2xl">
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  03_ROUND_INTRO_ANIMATIONS.PNG — BROADCAST ROUND INTRO OVERLAY (3D ROTATE &amp; LIGHT SWEEP) (R1, R4)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Hoạt cảnh mở đầu đồng bộ cho 5 vòng thi với thanh ngang gắn đồng (HorizontalBrassRod), phối cảnh 3D perspective 1200px (rotateX: -60° &rarr; 0°), 4 đinh tán góc đỏ, dải sáng kim loại sheen sweep beam, và huy hiệu phụ đề vòng thi.
                </p>
                <div className="w-full overflow-x-auto flex justify-center py-2">
                  <div
                    id="screenshot-r4-round-intro"
                    className="relative w-[1920px] h-[1080px] shrink-0 overflow-hidden bg-[#040d21] rounded-2xl border border-cyan-400/30 shadow-2xl select-none flex items-center justify-center"
                  >
                    <Vtv3ChalkboardBackdrop />
                    <BroadcastRoundIntroOverlay
                      state={r4RoundIntroState}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 04: Host Console VCNV Direct Answers Table */}
            {(activeTab === "all" ||
              activeTab === "r4" ||
              activeTab === "r4-4" ||
              activeTab === "r4-host-console-vcnv") && (
              <div className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border-2 border-cyan-500/40 shadow-2xl">
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  04_HOST_CONSOLE_VCNV_DIRECT_ANSWERS.PNG — HOST CONSOLE VCNV BẢNG ĐÁP ÁN TRỰC TIẾP &amp; CỘT CHUÔNG (R2, R4)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Bố trí lại bảng đáp án trực tiếp VCNV: Cột riêng biệt nhỏ gọn hiển thị số thứ tự chuông (🔔 1, 🔔 2) cố định w-10 sm:w-12, mở rộng tối đa ô đáp án không bị gãy chữ, chuẩn hoá phân loại độ dài từ khoá (14 chữ cái).
                </p>
                <div className="w-full overflow-x-auto flex justify-center py-2">
                  <div
                    id="screenshot-r4-host-console-vcnv"
                    className="relative w-[1920px] h-[1080px] shrink-0 overflow-hidden bg-[#070b16] rounded-2xl border border-cyan-400/30 shadow-2xl p-10 flex flex-col justify-between text-white select-none"
                  >
                    {/* Host Console Top Brand Header */}
                    <div className="w-full pb-4 border-b border-cyan-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="px-3 py-1 rounded-lg bg-cyan-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-md shadow-cyan-500/30">
                          QUIZZORA VTV3
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-cyan-300 tracking-wide">
                            HOST CONSOLE — ĐIỀU KHIỂN TRẬN ĐẤU OLYMPIA 26
                          </h2>
                          <p className="text-xs text-slate-400">
                            Phần thi: VƯỢT CHƯỚNG NGẠI VẬT · Chế độ trực tiếp · Socket Online
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-mono text-xs font-bold">
                          ● SERVER ONLINE
                        </span>
                        <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs">
                          ROOM: OLYMPIA-2026
                        </span>
                      </div>
                    </div>

                    {/* Host Console Round Navigation & Top Controls */}
                    <div className="grid grid-cols-5 gap-3">
                      {["1. Khởi Động", "2. VCNV (Đang chơi)", "3. Tăng Tốc", "4. Về Đích", "5. Câu Hỏi Phụ"].map((rName, rIdx) => (
                        <div
                          key={rIdx}
                          className={`p-3 rounded-xl border text-center font-black text-sm uppercase tracking-wider transition ${
                            rIdx === 1
                              ? "bg-gradient-to-r from-amber-500/30 via-amber-600/20 to-amber-500/30 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                              : "bg-slate-900/60 border-slate-800 text-slate-500"
                          }`}
                        >
                          {rName}
                        </div>
                      ))}
                    </div>

                    {/* VCNV Main Interactive Direct Answers Panel (Requirement R2) */}
                    <div className="p-6 rounded-2xl bg-slate-900/95 border-2 border-cyan-500/50 shadow-2xl space-y-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-base sm:text-lg text-cyan-300 uppercase tracking-wide">
                            BẢNG ĐÁP ÁN TRỰC TIẾP &amp; QUYỀN CHƠI VCNV (4 THÍ SINH)
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-200 font-bold text-xs">
                            Từ khóa: 14 chữ cái
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded-md bg-amber-950/80 border border-amber-400/60 text-amber-300 text-xs font-black animate-pulse">
                            🔔 2 thí sinh bấm chuông CNV
                          </span>
                          <span className="text-xs text-slate-400">
                            Cột thứ tự chuông độc lập · Tự động dừng quyền trả lời hàng ngang
                          </span>
                        </div>
                      </div>

                      {/* 4 Contestant Live Answer Rows with Dedicated Bell Column */}
                      <div className="space-y-3">
                        {[
                          {
                            id: 0,
                            name: "Quang Minh",
                            school: "THPT Chuyên Hà Nội - Amsterdam",
                            ans: "MẠNG NƠ RON",
                            time: "3.82s",
                            hasBell: true,
                            bellIdx: 0,
                            isLocked: false,
                          },
                          {
                            id: 1,
                            name: "Anh Đức",
                            school: "THPT Chuyên Lê Hồng Phong",
                            ans: "MẠNG NƠ RON",
                            time: "4.95s",
                            hasBell: true,
                            bellIdx: 1,
                            isLocked: false,
                          },
                          {
                            id: 2,
                            name: "Gia Bảo",
                            school: "THPT Chuyên Quốc Học Huế",
                            ans: "THUẬT TOÁN",
                            time: "6.12s",
                            hasBell: false,
                            bellIdx: -1,
                            isLocked: true,
                          },
                          {
                            id: 3,
                            name: "Thái Dương",
                            school: "THPT Chuyên Phan Bội Châu",
                            ans: "TRÍ TUỆ NHÂN TẠO",
                            time: "8.40s",
                            hasBell: false,
                            bellIdx: -1,
                            isLocked: false,
                          },
                        ].map((c) => (
                          <div
                            key={c.id}
                            className={`rounded-xl px-4 py-3 border flex items-center justify-between gap-4 transition shadow-lg ${
                              c.hasBell
                                ? "bg-amber-950/70 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)]"
                                : c.isLocked
                                ? "bg-rose-950/40 border-rose-500/50"
                                : "bg-slate-900/90 border-white/10"
                            }`}
                          >
                            {/* 1. Contestant ID & Name */}
                            <div className="w-56 shrink-0 flex items-center gap-2.5 min-w-0">
                              <span className="px-2.5 py-1 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-mono font-black text-xs shrink-0">
                                TS{c.id + 1}
                              </span>
                              <div className="truncate">
                                <div className="font-black text-sm text-slate-100 truncate">{c.name}</div>
                                <div className="text-[11px] text-slate-400 truncate">{c.school}</div>
                              </div>
                            </div>

                            {/* 2. Live Typed Answer Box */}
                            <div className="flex-1 min-w-0 rounded-lg bg-black/60 border border-white/15 px-4 py-2 min-h-[44px] flex items-center justify-between gap-3 overflow-hidden">
                              <div className="flex items-center gap-2 min-w-0 overflow-hidden flex-1">
                                <span className="font-black text-base text-amber-300 uppercase tracking-wider truncate">
                                  {c.ans}
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-xs font-mono font-bold text-cyan-300 shrink-0 whitespace-nowrap ml-2">
                                {c.time}
                              </span>
                            </div>

                            {/* 3. Dedicated Fixed CNV Bell Order Column (Requirement R2) */}
                            <div className="w-14 sm:w-16 shrink-0 flex items-center justify-center">
                              {c.hasBell ? (
                                <span
                                  className="px-2.5 py-1 rounded-lg text-xs font-black text-amber-200 bg-amber-500/30 border border-amber-400 shadow-md whitespace-nowrap animate-pulse"
                                  title={`Thí sinh bấm chuông CNV thứ tự #${c.bellIdx + 1}`}
                                >
                                  🔔 {c.bellIdx + 1}
                                </span>
                              ) : (
                                <span className="text-slate-600 text-base font-bold select-none">—</span>
                              )}
                            </div>

                            {/* 4. Lock / Unlock Action */}
                            <button
                              type="button"
                              className={`px-4 py-2 rounded-lg text-xs font-black border shrink-0 whitespace-nowrap transition cursor-pointer ${
                                c.isLocked
                                  ? "bg-rose-600 text-white border-rose-300 shadow-md shadow-rose-600/30"
                                  : "bg-emerald-950/90 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900"
                              }`}
                            >
                              {c.isLocked ? "🔒 Mở lại quyền" : "🟢 Đang chơi"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Operational Action Bar */}
                    <div className="grid grid-cols-4 gap-4 pt-2">
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 flex flex-col items-center justify-center text-center">
                        <span className="text-[11px] text-slate-400 uppercase font-bold">Hàng Ngang Hiện Tại</span>
                        <span className="text-base font-black text-cyan-300">HÀNG 1 (9 CHỮ CÁI)</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 flex flex-col items-center justify-center text-center">
                        <span className="text-[11px] text-slate-400 uppercase font-bold">Thời Gian Còn Lại</span>
                        <span className="text-base font-mono font-black text-amber-400">⏱️ 15.00s</span>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex flex-col items-center justify-center text-center cursor-pointer">
                        <span className="text-[11px] text-emerald-400 uppercase font-bold">Thao Tác Điều Khiển</span>
                        <span className="text-sm font-black text-emerald-300">CÔNG BỐ ĐÁP ÁN HÀNG NGANG</span>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 flex flex-col items-center justify-center text-center cursor-pointer">
                        <span className="text-[11px] text-amber-400 uppercase font-bold">Chướng Ngại Vật</span>
                        <span className="text-sm font-black text-amber-300">XỬ LÝ CHUÔNG CNV (#1, #2)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 05: PlayerPad Inline Lock Badge */}
            {(activeTab === "all" ||
              activeTab === "r4" ||
              activeTab === "r4-5" ||
              activeTab === "r4-playerpad-lock") && (
              <div className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border-2 border-cyan-500/40 shadow-2xl">
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  05_PLAYERPAD_INLINE_LOCK_BADGE.PNG — PLAYERPAD HUY HIỆU KHÓA QUYỀN TRÊN CÙNG 1 DÒNG DUY NHẤT (R2, R4)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Giao diện máy thí sinh (PlayerPad): Nhãn tab tinh gọn (❓ Hàng ngang &amp; 🧩 Miếng ghép &amp; CNV) cho phép huy hiệu 🔒 Khóa quyền nằm phẳng trên cùng 1 dòng duy nhất (flex-nowrap) mà không bị rơi dòng hay che khuất trên mọi kích thước màn hình.
                </p>
                <div className="w-full overflow-x-auto flex justify-center py-2">
                  <div
                    id="screenshot-r4-playerpad-lock"
                    className="relative w-[1920px] h-[1080px] shrink-0 overflow-hidden bg-[#020510] rounded-2xl border border-cyan-400/30 shadow-2xl flex items-center justify-center p-8 select-none"
                  >
                    <Vtv3ChalkboardBackdrop className="opacity-40" />

                    {/* Mobile / Tablet Device Deck Showcase */}
                    <div className="relative z-10 w-full max-w-[560px] rounded-3xl p-6 bg-gradient-to-b from-[#181b22] via-[#121418] to-[#0a0b0e] border-[3px] border-[#d4af37] shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(212,175,55,0.3)] flex flex-col gap-4">
                      {/* Contestant Header Bar */}
                      <div className="flex items-center justify-between border-b border-[#d4af37]/30 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#d4af37] to-[#854d0e] flex items-center justify-center text-slate-950 font-black text-sm shadow">
                            TS3
                          </div>
                          <div>
                            <div className="font-black text-base text-amber-200">GIA BẢO</div>
                            <div className="text-xs text-slate-400">THPT Chuyên Quốc Học Huế</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-amber-300/80 font-bold uppercase tracking-wider">ĐIỂM SỐ</div>
                          <div className="text-2xl font-black text-amber-300 drop-shadow-[0_2px_8px_rgba(245,158,11,0.8)]">
                            180 đ
                          </div>
                        </div>
                      </div>

                      {/* Question Box Frame with Single Line Tabs & Lock Badge */}
                      <div className="rounded-2xl p-4 bg-slate-950/80 border-2 border-[#d4af37]/50 shadow-inner flex flex-col gap-3">
                        {/* THE KEY REQUIREMENT: VCNV sub-tabs inside Question Box strictly on 1 single line with Lock Status */}
                        <div className="shrink-0 flex items-center justify-between gap-1 mb-1 pb-2 border-b border-[#d4af37]/30 flex-nowrap w-full overflow-hidden">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden flex-nowrap">
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-lg font-black text-xs border bg-gradient-to-b from-[#b8860b] via-[#854d0e] to-[#451a03] text-amber-100 border-[#fef08a] shadow-[0_0_8px_rgba(212,175,55,0.4)] shrink-0 whitespace-nowrap cursor-pointer"
                            >
                              ❓ Hàng ngang
                            </button>
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-lg font-black text-xs border bg-[#1a1c20]/80 text-amber-200/70 border-[#d4af37]/30 shrink-0 whitespace-nowrap cursor-pointer"
                            >
                              🧩 Miếng ghép &amp; CNV (14 chữ cái)
                            </button>
                          </div>
                          <span className="text-xs px-2.5 py-1 font-black rounded-lg border shrink-0 whitespace-nowrap ml-1 text-rose-300 bg-rose-950/80 border-rose-500/60 shadow animate-pulse">
                            🔒 Khóa quyền
                          </span>
                        </div>

                        {/* Question Content */}
                        <div className="text-sm font-bold text-slate-100 leading-relaxed min-h-[50px]">
                          Hàng ngang 1 (9 chữ cái): Cấu trúc tính toán mô phỏng mạng lưới thần kinh sinh học giúp máy tính học hỏi từ dữ liệu?
                        </div>

                        {/* 15s Timer Bar */}
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full"
                            style={{ width: "45%" }}
                          />
                        </div>
                      </div>

                      {/* Locked Contestant Notification & Disabled Input */}
                      <div className="rounded-xl p-3 bg-rose-950/40 border border-rose-500/50 flex items-center gap-3">
                        <span className="text-xl">🔒</span>
                        <div className="text-xs text-rose-200 font-semibold leading-snug">
                          Bạn đã dừng quyền chơi do có chuông CNV hoặc đã bị loại ở vòng này. Bảng nhập đáp án tạm thời bị khoá.
                        </div>
                      </div>

                      {/* Answer Input Mock */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          disabled
                          placeholder="Đáp án đã bị khoá..."
                          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-500 text-sm italic cursor-not-allowed"
                        />
                        <button
                          disabled
                          className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-600 font-bold text-sm cursor-not-allowed border border-slate-700"
                        >
                          GỬI
                        </button>
                      </div>

                      {/* Buzzer Button */}
                      <button
                        disabled
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 text-slate-500 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-not-allowed"
                      >
                        🔔 BẤM CHUÔNG VCNV (ĐÃ KHÓA)
                      </button>
                    </div>

                    {/* Explanatory Overlay Banner */}
                    <div className="absolute top-6 left-8 bg-slate-900/90 border border-cyan-500/40 rounded-xl px-4 py-2 shadow-lg max-w-sm pointer-events-none">
                      <div className="text-xs font-black text-cyan-300 uppercase">Minh chứng PlayerPad (R2)</div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        Huy hiệu 🔒 Khóa quyền nằm cố định trên cùng 1 dòng phẳng với các nút tab điều hướng — Không bị rớt dòng trên mọi thiết bị.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 06: VCNV Center Tile Shielded */}
            {(activeTab === "all" ||
              activeTab === "r4" ||
              activeTab === "r4-6" ||
              activeTab === "r4-vcnv-center-shielded") && (
              <div className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border-2 border-cyan-500/40 shadow-2xl">
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  06_VCNV_CENTER_TILE_SHIELDED.PNG — VCNV Ô TRUNG TÂM SỐ 5 CHE KÍN 100% OPACITY (R3, R4)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Sửa lỗi ô trung tâm VCNV (mảnh ghép số 5): Loại bỏ animate-pulse gây giảm opacity trên khối hộp, chỉ nhấp nháy viền ngoài (ring-4 ring-amber-300 animate-pulse), đảm bảo che kín 100% ảnh nền bí mật phía sau khi chưa mở.
                </p>
                <div className="w-full overflow-x-auto flex justify-center py-2">
                  <div
                    id="screenshot-r4-vcnv-center-shielded"
                    className="relative w-[1920px] h-[1080px] shrink-0 overflow-hidden bg-[#040d21] rounded-2xl border border-cyan-400/30 shadow-2xl select-none"
                  >
                    <VcnvCountdownGraphic
                      state={r4CenterShieldedState}
                      serverNow={serverNow}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 07: DisplayScreen Scoreboard Clean */}
            {(activeTab === "all" ||
              activeTab === "r4" ||
              activeTab === "r4-7" ||
              activeTab === "r4-scoreboard-clean") && (
              <div className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border-2 border-cyan-500/40 shadow-2xl">
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  07_DISPLAYSCREEN_SCOREBOARD_CLEAN.PNG — BẢNG ĐIỂM DISPLAYSCREEN KHÔNG CÒN DÒNG HƯỚNG DẪN PHÍM BẤM (R3, R4)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Màn hình phát sóng trường quay (DisplayScreen): Loại bỏ hoàn toàn dòng chữ hướng dẫn phím bấm ("Bấm vào khung hoặc dùng phím Space / Phím mũi tên để chuyển thí sinh"), đạt chuẩn giao diện phát sóng truyền hình chuyên nghiệp.
                </p>
                <div className="w-full overflow-x-auto flex justify-center py-2">
                  <div
                    id="screenshot-r4-scoreboard-clean"
                    className="relative w-[1920px] h-[1080px] shrink-0 overflow-hidden bg-[#030712] rounded-2xl border border-cyan-400/30 shadow-2xl select-none flex flex-col justify-end p-8"
                  >
                    <Olympia22BackgroundBackdrop />
                    <div className="relative z-20 w-full max-w-[1720px] mx-auto">
                      <SummaryLowerThirdGraphic
                        state={r4ScoreboardCleanState}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Deliverable R6: 3D STUDIO CHOREOGRAPHY & 2-8 CONTESTANT VERIFICATION (R1 - R6) */}
        {(activeTab === "all" || activeTab === "r6" || activeTab === "r6-2" || activeTab === "r6-4" || activeTab === "r6-6" || activeTab === "r6-7" || activeTab === "r6-8" || activeTab === "r6-mc" || activeTab === "r6-cam11" || activeTab === "r6-cam3" || activeTab === "r6-tech" || activeTab === "r6-mc-center" || activeTab === "r6-empty-podiums" || activeTab === "r6-name-school") && (
          <div className="w-full flex flex-col gap-6">
            {/* R6.0A: 2 Contestants in CAM 10 (Centered on Dais) */}
            {(activeTab === "all" || activeTab === "r6" || activeTab === "r6-2") && (
              <div
                id="screenshot-r6-2-contestants-cam10"
                className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border border-cyan-500/40 shadow-2xl"
              >
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  R6.0A: 2 THÍ SINH — CAM 10 CĂN GIỮA CUNG SÀN DAIS 1.28π (GỌN GÀNG, CÁCH ĐỀU 91.9CM)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  2 bục thí sinh căn giữa chính tâm cung sàn mở rộng 1.28π, khớp nối màn hình cong LED phía trên và logo Quizorra ở chính giữa.
                </p>
                <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-cyan-500/20 shadow-inner bg-[#030712] relative">
                  <OlympiaStudio3DScene
                    state={{
                      ...mockState,
                      stage: "playing",
                      seatCount: 2,
                      seats: mockSeats2 as any,
                      entranceCompleted: true,
                    }}
                    serverNow={serverNow}
                    activeCamera={10}
                    transitionMode="CUT"
                    showDirectorBar={false}
                    allowPTZ={false}
                    defaultQuality="HIGH"
                  />
                </div>
              </div>
            )}

            {/* R6.0B: 4 Contestants in CAM 10 (Centered on Dais) */}
            {(activeTab === "all" || activeTab === "r6" || activeTab === "r6-4") && (
              <div
                id="screenshot-r6-4-contestants-cam10"
                className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border border-cyan-500/40 shadow-2xl"
              >
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  R6.0B: 4 THÍ SINH — CAM 10 CĂN GIỮA CUNG SÀN DAIS 1.28π (KHỚP NỐI MÀN HÌNH LED, CÁCH BỤC MC 7.88M)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  4 bục thí sinh căn đối xứng chính tâm cung sàn Dais mở rộng 1.28π (lề trái/phải cân bằng 5.01m), nằm gọn 100% trên sàn và thẳng hàng màn hình LED phía trên.
                </p>
                <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-cyan-500/20 shadow-inner bg-[#030712] relative">
                  <OlympiaStudio3DScene
                    state={{
                      ...mockState,
                      stage: "playing",
                      seatCount: 4,
                      seats: mockSeats4 as any,
                      entranceCompleted: true,
                    }}
                    serverNow={serverNow}
                    activeCamera={10}
                    transitionMode="CUT"
                    showDirectorBar={false}
                    allowPTZ={false}
                    defaultQuality="HIGH"
                  />
                </div>
              </div>
            )}

            {/* R6 Milestone 5.1: 6 Contestants in CAM 10 (Wide Podiums Arc) */}
            {(activeTab === "all" || activeTab === "r6" || activeTab === "r6-6") && (
              <div
                id="screenshot-r6-6-contestants-cam10"
                className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border border-cyan-500/40 shadow-2xl"
              >
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  R6.1: 6 THÍ SINH — CAM 10 CĂN GIỮA CUNG SÀN DAIS 1.28π (KHOẢNG HỞ 33.9CM, NẰM GỌN 100% TRÊN SÀN)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Toàn bộ 6 bục căn đối xứng chính tâm cung sàn mở rộng 1.28π (lề trái/phải ~3.65m), cách bục MC 7.33m, CAM 10 bao quát trọn vẹn không dính bục MC.
                </p>
                <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-cyan-500/20 shadow-inner bg-[#030712] relative">
                  <OlympiaStudio3DScene
                    state={{
                      ...mockState,
                      stage: "playing",
                      seatCount: 6,
                      seats: mockSeats6 as any,
                      entranceCompleted: true,
                    }}
                    serverNow={serverNow}
                    activeCamera={10}
                    transitionMode="CUT"
                    showDirectorBar={false}
                    allowPTZ={false}
                    defaultQuality="HIGH"
                  />
                </div>
              </div>
            )}

            {/* R6 Milestone 5.2: 7 Contestants in CAM 10 (Wide Podiums Arc) */}
            {(activeTab === "all" || activeTab === "r6" || activeTab === "r6-7") && (
              <div
                id="screenshot-r6-7-contestants-cam10"
                className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border border-cyan-500/40 shadow-2xl"
              >
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  R6.2: 7 THÍ SINH — CAM 10 CĂN GIỮA CUNG SÀN DAIS 1.28π (KHOẢNG HỞ 32.6CM, NẰM GỌN TRÊN SÀN)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  7 bục thí sinh căn đối xứng chính giữa cung sàn mở rộng 1.28π (lề hai bên ~2.92m, không nổi lềnh bềnh), cách bục MC 7.01m, khớp nối màn hình LED phía trên.
                </p>
                <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-cyan-500/20 shadow-inner bg-[#030712] relative">
                  <OlympiaStudio3DScene
                    state={{
                      ...mockState,
                      stage: "playing",
                      seatCount: 7,
                      seats: mockSeats7 as any,
                      entranceCompleted: true,
                    }}
                    serverNow={serverNow}
                    activeCamera={10}
                    transitionMode="CUT"
                    showDirectorBar={false}
                    allowPTZ={false}
                    defaultQuality="HIGH"
                  />
                </div>
              </div>
            )}

            {/* R6 Milestone 5.3: 8 Contestants in CAM 10 (Wide Podiums Arc) */}
            {(activeTab === "all" || activeTab === "r6" || activeTab === "r6-8") && (
              <div
                id="screenshot-r6-8-contestants-cam10"
                className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border border-cyan-500/40 shadow-2xl"
              >
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  R6.3: 8 THÍ SINH — CAM 10 CĂN GIỮA CUNG SÀN DAIS 1.28π (KHOẢNG HỞ 31.7CM, CÁCH BỤC MC 6.67M)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Toàn bộ 8 bục nằm gọn 100% bên trong mặt sàn nâng 1.28π (lề hai bên cân đối ~2.19m, không tràn mép hay nổi lềnh bềnh), mép sàn khớp nối vách màn hình LED phía trên và loại bỏ hoàn toàn bục MC khỏi CAM 10.
                </p>
                <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-cyan-500/20 shadow-inner bg-[#030712] relative">
                  <OlympiaStudio3DScene
                    state={{
                      ...mockState,
                      stage: "playing",
                      seatCount: 8,
                      seats: mockSeats8 as any,
                      entranceCompleted: true,
                    }}
                    serverNow={serverNow}
                    activeCamera={10}
                    transitionMode="CUT"
                    showDirectorBar={false}
                    allowPTZ={false}
                    defaultQuality="HIGH"
                  />
                </div>
              </div>
            )}

            {/* R6 Milestone 5.4: MC Stage Lighting (CAM 3: Warm White Key/Fill + Desk Uplight) */}
            {(activeTab === "all" || activeTab === "r6" || activeTab === "r6-mc") && (
              <div
                id="screenshot-r6-mc-lighting"
                className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border border-amber-500/40 shadow-2xl"
              >
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-amber-300">
                  R6.4: BỤC MC &amp; CHIẾU SÁNG HAI MC KHÁNH VY &amp; NGỌC HUY (CAM 3: WARM WHITE KEY/FILL + DESK UPLIGHT)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Chiếu sáng khu vực MC bằng đèn overhead warm white #fff5e6, đèn rọi bàn pointLight cục bộ [3.12, 2.40, -6.40] và console uplight. Khánh Vy và Ngọc Huy sáng rõ khuôn mặt, màu da hồng hào ấm áp và trang phục chuẩn truyền hình.
                </p>
                <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-amber-500/20 shadow-inner bg-[#030712] relative">
                  <OlympiaStudio3DScene
                    state={{
                      ...mockState,
                      stage: "playing",
                    }}
                    serverNow={serverNow}
                    activeCamera={3}
                    transitionMode="CUT"
                    showDirectorBar={false}
                    allowPTZ={false}
                    defaultQuality="HIGH"
                  />
                </div>
              </div>
            )}

            {/* R6 Milestone 5.5: CAM 11 Contestant Greeting Transition Perspective */}
            {(activeTab === "all" || activeTab === "r6" || activeTab === "r6-cam11") && (
              <div
                id="screenshot-r6-cam11-perspective"
                className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border border-purple-500/40 shadow-2xl"
              >
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-purple-300">
                  R6.5: CAM 11 CHUYỂN CẢNH SỚM 0.6S (ĐÓN TRƯỚC BƯỚC CHÂN THÍ SINH CHÀO SÂN TẠI BỤC GIỮA)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Góc máy CAM 11 cận cảnh trực diện chào sân chuyển cảnh sớm tại t = 1.2s đón đầu bước chân thí sinh bước xuống bậc thang cuối cùng của sàn trung tâm, loại bỏ khán giả phân tâm phía sau.
                </p>
                <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-purple-500/20 shadow-inner bg-[#030712] relative">
                  <OlympiaStudio3DScene
                    state={{
                      ...mockState,
                      stage: "playing",
                      entranceState: {
                        active: true,
                        startedAt: Date.now() - 1500,
                        currentSeatIdx: 0,
                        seatStartedAt: Date.now() - 1500,
                        seatGestures: [],
                      },
                    }}
                    serverNow={serverNow}
                    activeCamera={11}
                    transitionMode="CUT"
                    showDirectorBar={false}
                    allowPTZ={false}
                    defaultQuality="HIGH"
                  />
                </div>
              </div>
            )}

            {/* R6 Verification 1: Idle MC Framing (CAM 3, Tight MC Framing, Desk Excluded) */}
            {(activeTab === "all" || activeTab === "r6" || activeTab === "r6-cam3") && (
              <div
                id="screenshot-r6-cam3-mc-framing"
                className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border border-purple-500/30 shadow-2xl"
              >
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-purple-300">
                  R6.1: GÓC QUAY MC TIỀN TRẬN ĐẤU (CAM 3: TRUNG CẬN, KHÔNG DÍNH BÀN MC, TỈ LỆ 16:9 CHUẨN TRUYỀN HÌNH)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Khung hình CAM 3 tinh chỉnh [2.75, 1.50, -5.75] target [3.08, 1.45, -7.15], loại bỏ hoàn toàn mặt bàn ở Z=-6.70 khỏi đáy khung hình, giữ khoảng headroom tự nhiên.
                </p>
                <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-[#030712] relative">
                  <OlympiaStudio3DScene
                    state={{
                      ...mockState,
                      stage: "lobby",
                    }}
                    serverNow={serverNow}
                    activeCamera={3}
                    transitionMode="CUT"
                    showDirectorBar={false}
                    allowPTZ={false}
                    defaultQuality="HIGH"
                  />
                </div>
              </div>
            )}

            {/* R6 Verification 2: 6s Rotating Tech Floor Animation */}
            {(activeTab === "all" || activeTab === "r6" || activeTab === "r6-tech") && (
              <div
                id="screenshot-r6-tech-floor-animation"
                className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border border-cyan-500/30 shadow-2xl"
              >
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  R6.2: HOẠT HỌA SÀN CÔNG NGHỆ XOAY 6 GIÂY (CYAN LASER ARCS, TIA SÁNG SÀN & RADAR HUD RINGS)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Sàn trung tâm hiển thị đồ họa công nghệ xoay ngược chiều (t = 3.0s của intro), hiệu ứng laser cyan phát sáng, vitrine nguyệt quế và decal sàn ẩn hoàn toàn.
                </p>
                <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-[#030712] relative">
                  <OlympiaStudio3DScene
                    state={{
                      ...mockState,
                      stage: "playing",
                      introTimer: { startedAt: Date.now() - 3000, totalMs: 10000, remainingMs: 7000 },
                    }}
                    serverNow={serverNow}
                    activeCamera={1}
                    transitionMode="CUT"
                    showDirectorBar={false}
                    allowPTZ={false}
                    defaultQuality="HIGH"
                  />
                </div>
              </div>
            )}

            {/* R6 Verification 3: MCs at Center Stage */}
            {(activeTab === "all" || activeTab === "r6" || activeTab === "r6-mc-center") && (
              <div
                id="screenshot-r6-mc-center-stage"
                className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border border-amber-500/30 shadow-2xl"
              >
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-amber-300">
                  R6.3: HAI MC TIẾN RA SÂN KHẤU TRUNG TÂM ([0, 0.18, 0], KHÁNH VY & NGỌC HUY DẪN KHAI MẠC)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Hai MC bước ra vòng tròn sân khấu trung tâm tại tọa độ [±0.38, 0.18, 0], hướng chính diện ống kính máy quay đón chào khán giả truyền hình.
                </p>
                <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-[#030712] relative">
                  <OlympiaStudio3DScene
                    state={{
                      ...mockState,
                      stage: "playing",
                      entranceState: {
                        active: true,
                        startedAt: Date.now() + 999999999,
                        currentSeatIdx: 0,
                        seatStartedAt: Date.now(),
                        seatGestures: [],
                      },
                      introTimer: undefined,
                    }}
                    serverNow={serverNow}
                    activeCamera={1}
                    transitionMode="CUT"
                    showDirectorBar={false}
                    allowPTZ={false}
                    defaultQuality="HIGH"
                  />
                </div>
              </div>
            )}

            {/* R6 Verification 4: Empty Podiums Before Introduction */}
            {(activeTab === "all" || activeTab === "r6" || activeTab === "r6-empty-podiums") && (
              <div
                id="screenshot-r6-empty-podiums-pre-match"
                className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border border-emerald-500/30 shadow-2xl"
              >
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-emerald-300">
                  R6.4: BỤC THÍ SINH TRƯỚC KHI BẮT ĐẦU (GIAI ĐOẠN 1: TOÀN BỘ MÀN HÌNH BỤC HIỆN LOGO OLYMPIA)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Mới mở phòng (Lobby / Pre-match), cả 4 màn hình bục thí sinh chỉ hiển thị màn hình chờ có Logo Đường lên đỉnh Olympia, chưa hiện tên, trường hay điểm số.
                </p>
                <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-[#030712] relative">
                  <OlympiaStudio3DScene
                    state={{
                      ...mockState,
                      stage: "lobby",
                      entranceState: undefined,
                      entranceCompleted: false,
                    }}
                    serverNow={serverNow}
                    activeCamera={10}
                    transitionMode="CUT"
                    showDirectorBar={false}
                    allowPTZ={false}
                    defaultQuality="HIGH"
                  />
                </div>
              </div>
            )}

            {/* R6 Verification 5: Contestant Arrived at Podium (Phase 2: Name + School) */}
            {(activeTab === "all" || activeTab === "r6" || activeTab === "r6-name-school") && (
              <div
                id="screenshot-r6-podium-name-school"
                className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border border-indigo-500/30 shadow-2xl"
              >
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-indigo-300">
                  R6.5: BẢNG ĐIỂM BỤC THÍ SINH GIAI ĐOẠN 2 (THÍ SINH ĐÃ TỚI BỤC - HIỆN TÊN + TRƯỜNG THPT)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Khi thí sinh bước tới vị trí bục của mình xong, bảng điểm chuyển sang giao diện Tên thí sinh + Tên trường THPT, giữ nguyên tới trước Khởi Động.
                </p>
                <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-[#030712] relative">
                  <OlympiaStudio3DScene
                    state={{
                      ...mockState,
                      stage: "playing",
                      currentRound: undefined as unknown as any,
                      entranceCompleted: true,
                    }}
                    serverNow={serverNow}
                    activeCamera={5}
                    transitionMode="CUT"
                    showDirectorBar={false}
                    allowPTZ={false}
                    defaultQuality="HIGH"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Deliverable 3D: SÂN KHẤU TRƯỜNG QUAY 3D VÀ NHÂN VẬT Á ĐÔNG (KD & VỀ ĐÍCH) */}
        {activeTab === "kd" && (
          <div className="w-full flex flex-col gap-6">
            <div
              id="graphic-studio-3d-stage"
              className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border border-cyan-500/30 shadow-2xl"
            >
              <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                SÀN TRUNG TÂM VÀ TOÀN CẢNH SÂN KHẤU (CAM 1: VÒNG NGUYỆT QUẾ MẶT SÀN & HIỆU ỨNG TIA SÁNG MỞ ĐẦU)
              </div>
              <p className="text-xs text-slate-300 mb-4 text-center">
                Vòng nguyệt quế nằm phẳng trên mặt sàn trung tâm, hiệu ứng tia sáng radiant burst khi mở đầu, và hệ thống vòng led đồng tâm chuẩn Olympia 26.
              </p>
              <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-[#030712] relative">
                <OlympiaStudio3DScene
                  state={mockState}
                  serverNow={serverNow}
                  activeCamera={1}
                  transitionMode="CUT"
                  showDirectorBar={false}
                  allowPTZ={false}
                  defaultQuality="HIGH"
                />
              </div>
            </div>

            <div
              id="graphic-studio-3d-vedich-blue"
              className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border border-cyan-500/30 shadow-2xl"
            >
              <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                SÂN KHẤU VÒNG VỀ ĐÍCH — TRẠNG THÁI XANH (CAM 1: ĐÈN KHE SÀN & BỤC GIỮA ĐỒNG BỘ CYAN)
              </div>
              <p className="text-xs text-slate-300 mb-4 text-center">
                Về Đích trạng thái nhàn rỗi / chuẩn bị chọn gói: Toàn bộ đèn khe hắt sàn (cove ribbons), bục giữa và các vòng led chuyển sang màu xanh cyan đồng bộ cùng toàn bộ hệ thống đèn trường quay.
              </p>
              <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-[#030712] relative">
                <OlympiaStudio3DScene
                  state={{
                    ...mockState,
                    stage: "playing",
                    currentRound: "veDich",
                    roundIdx: 3,
                    veDich: { phase: "idle", currentSeat: 0, package: [20, 20, 30] } as any,
                  }}
                  serverNow={serverNow}
                  activeCamera={1}
                  transitionMode="CUT"
                  showDirectorBar={false}
                  allowPTZ={false}
                  defaultQuality="HIGH"
                />
              </div>
            </div>

            <div
              id="graphic-studio-3d-vedich-red"
              className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border border-rose-500/30 shadow-2xl"
            >
              <div className="mb-2 text-xs font-black uppercase tracking-wider text-rose-300">
                SÂN KHẤU VÒNG VỀ ĐÍCH — TRẠNG THÁI ĐỎ & THÍ SINH TẠI BỤC GIỮA (CAM 1: TOÀN BỘ ĐÈN KHE & SÀN ĐỎ RỰC)
              </div>
              <p className="text-xs text-slate-300 mb-4 text-center">
                Về Đích trạng thái trả lời / suy nghĩ: Thí sinh 1 đứng tại bục giữa trên vòng nguyệt quế xoay, các thí sinh khác đứng cố định tại bục bảng điểm; toàn bộ đèn khe sàn và bục giữa chuyển sang màu đỏ rực rỡ.
              </p>
              <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-[#030712] relative">
                <OlympiaStudio3DScene
                  state={{
                    ...mockState,
                    stage: "playing",
                    currentRound: "veDich",
                    roundIdx: 3,
                    veDich: {
                      order: [0, 1, 2, 3],
                      turnIdx: 0,
                      phase: "thinking",
                      currentSeat: 0,
                      package: [20, 20, 30],
                      currentQuestionIdx: 1,
                      timer: { startedAt: Date.now() - 5000, totalMs: 20000, remainingMs: 15000 },
                    } as any,
                  }}
                  serverNow={serverNow}
                  activeCamera={1}
                  transitionMode="CUT"
                  showDirectorBar={false}
                  allowPTZ={false}
                  defaultQuality="HIGH"
                />
              </div>
            </div>

            <div
              id="graphic-studio-3d-vedich-cam15"
              className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border border-amber-500/30 shadow-2xl"
            >
              <div className="mb-2 text-xs font-black uppercase tracking-wider text-amber-300">
                CẬN CẢNH BỤC GIỮA VỀ ĐÍCH — CAM 15 (TRUNG CẬN CHÍNH DIỆN THÍ SINH & BỤC ĐỨNG TRUNG TÂM)
              </div>
              <p className="text-xs text-slate-300 mb-4 text-center">
                Góc quay CAM 15 chuẩn mực truyền hình: Khung hình trung cận chính diện thí sinh số 1 tại bục giữa, bắt trọn khuôn mặt Á Đông, trang phục polo học sinh, bảng điều khiển có viền LED động và vòng nguyệt quế vàng xoay bên dưới.
              </p>
              <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-[#030712] relative">
                <OlympiaStudio3DScene
                  state={{
                    ...mockState,
                    stage: "playing",
                    currentRound: "veDich",
                    roundIdx: 3,
                    veDich: {
                      order: [0, 1, 2, 3],
                      turnIdx: 0,
                      phase: "thinking",
                      currentSeat: 0,
                      package: [20, 20, 30],
                      currentQuestionIdx: 1,
                      timer: { startedAt: Date.now() - 5000, totalMs: 20000, remainingMs: 15000 },
                    } as any,
                  }}
                  serverNow={serverNow}
                  activeCamera={15}
                  transitionMode="CUT"
                  showDirectorBar={false}
                  allowPTZ={false}
                  defaultQuality="HIGH"
                />
              </div>
            </div>
          </div>
        )}

        {/* Deliverable 1: Khởi Động Lower Third (Full View) */}
        {(activeTab === "all" || activeTab === "kd") && (
          <div className="w-full flex flex-col gap-6">
            <div
              id="graphic-khoidong"
              className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/60 border border-cyan-500/20 shadow-xl"
            >
              <div className="mb-4 text-sm font-black uppercase tracking-widest text-cyan-300">
                Deliverable 1: Khởi Động Lower Third (1000×172 — Tabs: 0..2 hình bình hành, tab 3 hình thang cân)
              </div>
              <div className="w-full flex items-center justify-center min-h-[220px]">
                <EconovaLowerThirdV3
                  state={mockState}
                  activeSeatId={0}
                  buzzedSeatId={isBuzzed ? 1 : undefined}
                  questionText={mockState.khoiDong?.current?.q}
                  serverNow={serverNow}
                  runAnim={forceAnim}
                />
              </div>
            </div>

            <div
              id="graphic-kd-o22"
              className="w-full flex flex-col items-center p-6 pt-10 rounded-3xl bg-[#061129]/60 border border-amber-400/30 shadow-xl"
            >
              <div className="mb-6 text-sm font-black uppercase tracking-widest text-amber-300">
                Deliverable 1b: Khởi Động Luật O22 / O13–O21 (Đồng hồ lượt 60s + Thanh thời gian bạc Econova)
              </div>
              <div className="w-full flex items-center justify-center min-h-[240px]">
                <EconovaLowerThirdV3
                  state={{ ...mockState, rulesetId: "O22" } as unknown as OlympiaState}
                  activeSeatId={0}
                  questionNumberBadge="Câu 3/12"
                  headerBadge="KHỞI ĐỘNG 60S"
                  questionText="Trong hệ Mặt Trời, hành tinh nào có kích thước lớn nhất và khối lượng gấp hơn 2,5 lần tổng khối lượng các hành tinh còn lại?"
                  timer={{ totalMs: 60000, remainingMs: 60000, startedAt: Date.now() - 18000 }}
                  showTimerClock={true}
                  serverNow={serverNow}
                  runAnim={forceAnim}
                />
              </div>
            </div>
          </div>
        )}

        {/* Deliverable 2: VCNV Countdown 4-Quadrant & Answer Reveal */}
        {(activeTab === "all" || activeTab === "vcnv") && (
          <div className="w-full flex flex-col gap-6">
            <div
              id="graphic-vcnv-quad"
              className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/60 border border-cyan-500/20 shadow-xl"
            >
              <div className="mb-4 text-sm font-black uppercase tracking-widest text-cyan-300">
                Deliverable 2a: VCNV 4-Góc (Nền Econova 22 + Thanh thời gian 15s chuyên biệt)
              </div>
              <div className="relative w-full max-w-[1120px] aspect-video rounded-2xl overflow-hidden border border-cyan-400/30 shadow-2xl">
                {(() => {
                  const vcnvQuadState = {
                    ...mockState,
                    currentRound: "vcnv",
                    vcnv: {
                      ...mockState.vcnv,
                      phase: "hint_showing",
                      currentRow: 1,
                      keyword: "TRÍ TUỆ NHÂN TẠO",
                      keywordLength: 14,
                      mysteryImage: "/olympia/olympia_22_background.png",
                      piecesRevealed: [true, false, false, false, false],
                      bells: [],
                      rows: [
                        { hint: "Hàng ngang 1", answer: "MẠNG NƠ RON", letterCount: 9, opened: true, wrong: false },
                        { hint: "Dãy hữu hạn các bước rõ ràng nhằm giải quyết một bài toán trên máy tính gọi là gì?", answer: "THUẬT TOÁN", letterCount: 9, opened: false, wrong: false },
                        { hint: "Hàng ngang 3", answer: "DỮ LIỆU LỚN", letterCount: 9, opened: false, wrong: false },
                        { hint: "Hàng ngang 4", answer: "HỌC SÂU", letterCount: 6, opened: false, wrong: false },
                      ],
                      timer: { totalMs: 15000, remainingMs: 15000, startedAt: Date.now() - 6200 },
                    } as any,
                  } as unknown as OlympiaState;
                  return (
                    <>
                      <VcnvCountdownGraphic state={vcnvQuadState} serverNow={serverNow} />
                      {/* Real Quadrant 4 3D Studio Camera matching DisplayScreen.tsx z-[35] */}
                      <div className="absolute z-[35] rounded-2xl border-2 border-cyan-400/80 shadow-[0_0_30px_rgba(6,182,212,0.35)] overflow-hidden pointer-events-none top-[calc(50%+0.375rem)] left-[calc(50%+0.375rem)] right-3 bottom-3 sm:top-[calc(50%+0.5rem)] sm:left-[calc(50%+0.5rem)] sm:right-5 sm:bottom-5 md:top-[calc(50%+0.625rem)] md:left-[calc(50%+0.625rem)] md:right-6 md:bottom-6 bg-[#020510]">
                        <OlympiaStudio3DScene
                          state={vcnvQuadState}
                          serverNow={serverNow}
                          activeCamera={1}
                          transitionMode="CUT"
                          showDirectorBar={false}
                          allowPTZ={false}
                          defaultQuality="LIGHT"
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div
              id="graphic-vcnv"
              className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/60 border border-cyan-500/20 shadow-xl"
            >
              <div className="mb-4 text-sm font-black uppercase tracking-widest text-cyan-300">
                Deliverable 2b: Hàng Đáp Án VCNV (Nền Econova 22 + 4 thanh chevron)
              </div>
              <div className="w-full relative min-h-[420px] flex items-center justify-center rounded-2xl overflow-hidden border border-cyan-400/20">
                <VcnvAnswerRevealGraphic state={mockState} />
              </div>
            </div>
          </div>
        )}

        {/* Deliverable 3: Tăng Tốc Question & Ranked Answers */}
        {(activeTab === "all" || activeTab === "tt") && (
          <div className="w-full flex flex-col gap-6">
            <div
              id="graphic-tt-question"
              className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/60 border border-cyan-500/20 shadow-xl"
            >
              <div className="mb-4 text-sm font-black uppercase tracking-widest text-cyan-300">
                Deliverable 3a: Tăng Tốc Câu Hỏi (Nền Econova 22 + Thanh thời gian bạc 30s)
              </div>
              <div className="relative w-full max-w-[1120px] aspect-video rounded-2xl overflow-hidden border border-cyan-400/30 shadow-2xl">
                <TangTocQuestionGraphic
                  state={{
                    ...mockState,
                    currentRound: "tangToc",
                    tangToc: {
                      ...mockState.tangToc!,
                      phase: "question",
                      qIdx: 0,
                      questions: [
                        {
                          q: "Đây là công trình kiến trúc biểu tượng nào của thế giới?",
                          a: "Tháp Eiffel",
                          media: "/olympia/olympia_scoreboard_startscreen.png",
                          type: "image",
                        },
                      ],
                      timer: { totalMs: 30000, remainingMs: 30000, startedAt: Date.now() - 12500 },
                    } as any,
                  }}
                  serverNow={serverNow}
                />
              </div>
            </div>

            <div
              id="graphic-tangtoc"
              className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/60 border border-cyan-500/20 shadow-xl"
            >
              <div className="mb-4 text-sm font-black uppercase tracking-widest text-cyan-300">
                Deliverable 3b: Đáp Án Xếp Hạng Tăng Tốc (Nền Econova 22 + 4 thanh chevron, thời gian xx.xx)
              </div>
              <div className="w-full relative min-h-[420px] flex items-center justify-center rounded-2xl overflow-hidden border border-cyan-400/20">
                <TangTocRankedAnswersGraphic state={mockState} />
              </div>
            </div>
          </div>
        )}

        {/* Deliverable 4a: Về Đích Package Selection Grid */}
        {(activeTab === "all" || activeTab === "vd-grid") && (
          <div
            id="graphic-vedich-grid"
            className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/60 border border-cyan-500/20 shadow-xl"
          >
            <div className="mb-4 text-sm font-black uppercase tracking-widest text-cyan-300">
              Deliverable 4a: Lưới Chọn Gói Điểm Về Đích (1080×360 — Chuẩn Olympia 26 Wiki, các ô hình bình hành)
            </div>
            <div className="w-full flex items-center justify-center min-h-[420px]">
                  <VeDichSlantedGridGraphic
                    state={mockState}
                    ownerSeatId={0}
                    animate={forceAnim}
                    selectedPoints={
                      rulesetId === "O13" || rulesetId === "O14"
                        ? [10, 10, 20, 20]
                        : rulesetId === "O15"
                        ? [10, 20, 30]
                        : [20, 30, 20]
                    }
                  />
                </div>
              </div>
            )}

        {/* Deliverable 4b: Về Đích Question Lower Third */}
        {(activeTab === "all" || activeTab === "vd-qbox") && (
          <div
            id="graphic-vedich-qbox"
            className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/60 border border-cyan-500/20 shadow-xl"
          >
            <div className="mb-4 text-sm font-black uppercase tracking-widest text-cyan-300">
              Deliverable 4b: Thanh Câu Hỏi Về Đích (1000×200 — Cụm điểm chuẩn Econova, ⭐, dải gói điểm theo luật {rulesetId})
            </div>
            <div className="w-full flex items-center justify-center min-h-[240px] pt-24">
              {(() => {
                const mockPackages =
                  rulesetId === "O13" || rulesetId === "O14"
                    ? [
                        { points: 10, q: { q: "Câu 1 (10đ): Tác phẩm 'Tắt đèn' của nhà văn nào?", a: "Ngô Tất Tố" } },
                        { points: 10, q: { q: "Câu 2 (10đ): Đơn vị đo cường độ dòng điện là gì?", a: "Ampe" } },
                        { points: 20, q: { q: "Câu 3 (20đ): Thành phố nào có diện tích tự nhiên lớn nhất cả nước?", a: "Hà Nội" } },
                        { points: 20, q: { q: "Câu 4 (20đ): Hành tinh nào gần Mặt Trời nhất?", a: "Sao Thủy" } },
                      ]
                    : rulesetId === "O15"
                    ? [
                        { points: 10, q: { q: "Câu 1 (10đ): Đơn vị đo cường độ dòng điện là gì?", a: "Ampe" } },
                        { points: 20, q: { q: "Câu 2 (20đ): Thành phố nào có diện tích tự nhiên lớn nhất cả nước?", a: "Hà Nội" } },
                        { points: 30, q: { q: "Câu 3 (30đ): Ai là người phát minh ra bảng tuần hoàn các nguyên tố hóa học?", a: "Dmitri Mendeleev" } },
                      ]
                    : [
                        { points: 20, q: { q: "Câu 1 (20đ): Thành phố nào có diện tích tự nhiên lớn nhất cả nước?", a: "Hà Nội" } },
                        { points: 30, q: { q: "Câu 2 (30đ): Ai là người phát minh ra bảng tuần hoàn hóa học?", a: "Mendeleev" } },
                        { points: 20, q: { q: "Câu 3 (20đ): Đơn vị đo cường độ dòng điện là gì?", a: "Ampe" } },
                      ];

                const vdState = {
                  ...mockState,
                  currentRound: "veDich" as const,
                  rulesetId,
                  veDich: {
                    ...mockState.veDich!,
                    order: activeMockSeats.map((s) => s.id),
                    qIdx: 0,
                    packages: {
                      0: mockPackages,
                    },
                    current: mockPackages[0],
                    timer: { totalMs: 20000, remainingMs: 20000, startedAt: Date.now() - 8000 },
                  },
                } as unknown as OlympiaState;
                const emptyQ = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("empty") === "1";
                const fc = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("fc") === "1";
                return (
                  <EconovaLowerThirdV3
                    state={vdState}
                    activeSeatId={0}
                    buzzedSeatId={isBuzzed ? 2 : undefined}
                    hopeStarActive={hopeStar}
                    questionText={emptyQ ? "" : vdState.veDich?.current?.q?.q}
                    timer={emptyQ ? null : vdState.veDich?.timer}
                    serverNow={serverNow}
                    runAnim={forceAnim}
                    expandFromCenter={fc || emptyQ}
                  />
                );
              })()}
            </div>
          </div>
        )}

        {/* Deliverable 4c: Single Answer Bar */}
        {(activeTab === "all" || activeTab === "ans") && (
          <div
            id="graphic-single-answer"
            className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/60 border border-cyan-500/20 shadow-xl"
          >
            <div className="mb-4 text-sm font-black uppercase tracking-widest text-cyan-300">
              Deliverable 4c: Thanh Đáp Án Đơn Khởi Động (V3SingleAnswerBar)
            </div>
            <div className="w-full relative min-h-[140px] flex items-center justify-center">
              <V3SingleAnswerBar
                answerText="ĐIỆN TÍCH HẠT NHÂN NGUYÊN TỬ"
                points={30}
              />
            </div>
          </div>
        )}

        {/* Deliverable 4d: Câu Hỏi Phụ */}
        {(activeTab === "all" || activeTab === "chp") && (
          <div
            id="graphic-chp"
            className="w-full flex flex-col items-center p-6 pt-10 rounded-3xl bg-[#061129]/60 border border-cyan-500/20 shadow-xl"
          >
            <div className="mb-6 text-sm font-black uppercase tracking-widest text-cyan-300">
              Deliverable 4d: Câu Hỏi Phụ (15s Econova + Chuông Giành Quyền Trả Lời)
            </div>
            <div className="w-full flex items-center justify-center min-h-[220px]">
              <EconovaLowerThirdV3
                state={{ ...mockState, currentRound: "cauHoiPhu" } as unknown as OlympiaState}
                buzzedSeatId={isBuzzed ? 1 : 0}
                headerBadge="CÂU HỎI PHỤ"
                questionText="Trong bảng tuần hoàn các nguyên tố hóa học, nguyên tố nào có độ âm điện lớn nhất?"
                timer={{ totalMs: 15000, remainingMs: 15000, startedAt: Date.now() - 6000 }}
                serverNow={serverNow}
                runAnim={forceAnim}
              />
            </div>
          </div>
        )}

        {/* Deliverable 5: Summary Scoreboard (Lower-Third & Fullscreen) */}
        {(activeTab === "all" || activeTab === "summary") && (
          <div className="w-full flex flex-col gap-6">
            <div
              id="graphic-summary"
              className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/60 border border-cyan-500/20 shadow-xl"
            >
              <div className="mb-4 text-sm font-black uppercase tracking-widest text-cyan-300">
                Deliverable 5a: Tổng Kết Điểm Lower Third (1000×268)
              </div>
              <div className="w-full relative min-h-[320px] flex items-center justify-center">
                <SummaryLowerThirdGraphic state={mockState} />
              </div>
            </div>

            <div
              id="graphic-summary-fs"
              className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/60 border border-cyan-500/20 shadow-xl"
            >
              <div className="mb-4 text-sm font-black uppercase tracking-widest text-cyan-300">
                Deliverable 5b: Tổng Kết Điểm Fullscreen (Nền Econova 22)
              </div>
              <div className="relative w-full max-w-[1120px] aspect-video rounded-2xl overflow-hidden border border-cyan-400/30 shadow-2xl">
                <SummaryLowerThirdGraphic
                  state={{
                    ...mockState,
                    overlayMode: "FULLSCREEN",
                    summaryState: {
                      ...mockState.summaryState!,
                      isFullscreen: true,
                    },
                  }}
                />
              </div>
            </div>
          </div>
        )}
        {/* Deliverable 6: ECONOVA BROADCAST VERIFICATION (R1 - R3 / MILESTONE 2) */}
        {(activeTab === "all" ||
          activeTab === "econova" ||
          activeTab === "econova-1" ||
          activeTab === "econova-2" ||
          activeTab === "econova-3" ||
          activeTab === "econova-4" ||
          activeTab === "econova-5" ||
          activeTab === "vd-empty" ||
          activeTab === "vcnv-frames" ||
          activeTab === "tt-frames" ||
          activeTab === "vcnv-answers" ||
          activeTab === "tt-answers") && (
          <div className="w-full flex flex-col gap-8">
            <div className="p-4 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-blue-950/80 border-l-4 border-cyan-400 rounded-xl">
              <h2 className="text-base font-black text-cyan-300 tracking-wider">
                MILESTONE 2 — ECONOVA BROADCAST GRAPHICS AUTOMATED VERIFICATION (R1, R2, R3)
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Visual proofs for Về Đích seamless continuity &amp; early empty lower-third, and VCNV / Tăng Tốc staggered frame reveal &amp; 2s answer fade-in.
              </p>
            </div>

            {/* 01: Về Đích Lower Third Early Empty Content */}
            {(activeTab === "all" ||
              activeTab === "econova" ||
              activeTab === "econova-1" ||
              activeTab === "vd-empty") && (
              <div
                id="screenshot-01-vedich-lower-third-empty"
                className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border-2 border-cyan-500/40 shadow-2xl"
              >
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  01_VEDICH_LOWER_THIRD_EMPTY.PNG — VỀ ĐÍCH LOWER THIRD MỞ SỚM NỘI DUNG TRỐNG (R1)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Mở sớm thanh câu hỏi 1/3 dưới với ruột trống ngay sau khi lưới chọn gói điểm đóng lại. Huy hiệu thí sinh (Quang Minh, 285đ), dải gói điểm (20-30-20), cụm điểm số hiển thị đầy đủ, mũi tên bung mở tiếp tục từ tâm (arrowFromCenter).
                </p>
                <div className="relative w-full max-w-[1280px] aspect-video rounded-2xl overflow-hidden border border-cyan-400/30 shadow-2xl bg-[#040d21] flex flex-col justify-end p-6">
                  <Olympia22BackgroundBackdrop />
                  <div className="relative z-20 w-full max-w-[94vw] 2xl:max-w-[95vw] mx-auto flex flex-col justify-end">
                    <EconovaLowerThirdV3
                      state={{
                        ...mockState,
                        currentRound: "veDich",
                        rulesetId,
                        veDich: {
                          ...mockState.veDich!,
                          order: activeMockSeats.map((s) => s.id),
                          qIdx: -1,
                          turnIdx: 0,
                          packages: {
                            0: [
                              { points: 20, q: { q: "Câu 1", a: "A1" } },
                              { points: 30, q: { q: "Câu 2", a: "A2" } },
                              { points: 20, q: { q: "Câu 3", a: "A3" } },
                            ],
                          },
                          current: null,
                          timer: null as any,
                        },
                      }}
                      activeSeatId={0}
                      questionText=""
                      timer={null}
                      serverNow={serverNow}
                      runAnim={false}
                      arrowFromCenter={true}
                      expandFromCenter={true}
                      showScoreTab={true}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 02: VCNV Frames Open First */}
            {(activeTab === "all" ||
              activeTab === "econova" ||
              activeTab === "econova-2" ||
              activeTab === "vcnv-frames") && (
              <div
                id="screenshot-02-vcnv-frames-open-first"
                className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border-2 border-cyan-500/40 shadow-2xl"
              >
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  02_VCNV_FRAMES_OPEN_FIRST.PNG — VCNV KHUNG ĐÁP ÁN BUNG MỞ TRƯỚC (R2: GIAI ĐOẠN 1: t &lt; 2.0S)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Các khung đáp án thí sinh bung mở lần lượt dạng stagger (rowDelay = idx * 0.16s), tên thí sinh hiển thị rõ tại điểm kết thúc mở khung (nameDelay = rowDelay + 0.38s), chữ đáp án chưa fade-in (ansDelay = 2.0s).
                </p>
                <div className="relative w-full max-w-[1280px] aspect-video rounded-2xl overflow-hidden border border-cyan-400/30 shadow-2xl bg-[#040d21] flex items-center justify-center p-6">
                  <VcnvAnswerRevealGraphic
                    state={mockState}
                    isWaitingAnswer={true}
                  />
                </div>
              </div>
            )}

            {/* 03: Tăng Tốc Frames Open First */}
            {(activeTab === "all" ||
              activeTab === "econova" ||
              activeTab === "econova-3" ||
              activeTab === "tt-frames") && (
              <div
                id="screenshot-03-tangtoc-frames-open-first"
                className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border-2 border-cyan-500/40 shadow-2xl"
              >
                <style>{`
                  .econova-tt-frames-only .v3-tt-answer {
                    display: none !important;
                  }
                `}</style>
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  03_TANGTOC_FRAMES_OPEN_FIRST.PNG — TĂNG TỐC KHUNG ĐÁP ÁN BUNG MỞ TRƯỚC (R2: GIAI ĐOẠN 1: t &lt; 2.0S)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Các thanh đáp án thí sinh bung mở lần lượt dạng stagger (rowDelay = idx * 0.16s), tên thí sinh hiển thị rõ, chữ nội dung câu trả lời và thời gian chưa fade-in (ansDelay = 2.0s).
                </p>
                <div className="relative w-full max-w-[1280px] aspect-video rounded-2xl overflow-hidden border border-cyan-400/30 shadow-2xl bg-[#040d21] flex items-center justify-center p-6 econova-tt-frames-only">
                  <TangTocRankedAnswersGraphic
                    state={mockState}
                  />
                </div>
              </div>
            )}

            {/* 04: VCNV Answers Fade-In After 2s */}
            {(activeTab === "all" ||
              activeTab === "econova" ||
              activeTab === "econova-4" ||
              activeTab === "vcnv-answers") && (
              <div
                id="screenshot-04-vcnv-answers-fade-in-2s"
                className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border-2 border-cyan-500/40 shadow-2xl"
              >
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  04_VCNV_ANSWERS_FADE_IN_2S.PNG — VCNV ĐÁP ÁN THÍ SINH FADE-IN SAU 2S THEO THỨ TỰ GHẾ (R2)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Chữ đáp án của 4 thí sinh fade-in xuất hiện lần lượt sau khoảng 2 giây (ansDelay = 2.0s + idx * 0.25s) theo đúng thứ tự ghế thí sinh (Quang Minh: MẠNG NƠ-RON, Anh Đức: MẠNG NƠ-RON, Gia Bảo: THUẬT TOÁN, Thái Dương: MÁY TÍNH).
                </p>
                <div className="relative w-full max-w-[1280px] aspect-video rounded-2xl overflow-hidden border border-cyan-400/30 shadow-2xl bg-[#040d21] flex items-center justify-center p-6">
                  <VcnvAnswerRevealGraphic
                    state={mockState}
                    isWaitingAnswer={false}
                  />
                </div>
              </div>
            )}

            {/* 05: Tăng Tốc Answers Fade-In After 2s */}
            {(activeTab === "all" ||
              activeTab === "econova" ||
              activeTab === "econova-5" ||
              activeTab === "tt-answers") && (
              <div
                id="screenshot-05-tangtoc-answers-fade-in-2s"
                className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/80 border-2 border-cyan-500/40 shadow-2xl"
              >
                <div className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                  05_TANGTOC_ANSWERS_FADE_IN_2S.PNG — TĂNG TỐC ĐÁP ÁN &amp; THỜI GIAN FADE-IN SAU 2S THEO XẾP HẠNG TỐC ĐỘ (R2)
                </div>
                <p className="text-xs text-slate-300 mb-4 text-center">
                  Chữ đáp án và thời gian phản hồi của 4 thí sinh fade-in xuất hiện lần lượt sau khoảng 2 giây (ansDelay = 2.0s + idx * 0.25s) theo đúng thứ tự xếp hạng thời gian gửi/tốc độ (Quang Minh: CHÂU ÂU - 1.23, Anh Đức: CHÂU Á - 2.45, Gia Bảo: CHÂU PHI - 3.89, Thái Dương: CHÂU MỸ - 4.50).
                </p>
                <div className="relative w-full max-w-[1280px] aspect-video rounded-2xl overflow-hidden border border-cyan-400/30 shadow-2xl bg-[#040d21] flex items-center justify-center p-6">
                  <TangTocRankedAnswersGraphic
                    state={mockState}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
