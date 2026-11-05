"use client";

import React, { useState } from "react";
import type { OlympiaState } from "@/lib/olympia/types";
import {
  EconovaLowerThirdV3,
  VcnvAnswerRevealGraphic,
  TangTocRankedAnswersGraphic,
  VeDichSlantedGridGraphic,
  SummaryLowerThirdGraphic,
} from "@/components/olympia/Vtv3BroadcastGraphics";

export function DevGraphicsClient() {
  const [activeTab, setActiveTab] = useState<
    "all" | "kd" | "vcnv" | "tt" | "vd-grid" | "vd-qbox" | "summary"
  >("all");
  const [isBuzzed, setIsBuzzed] = useState(false);
  const [hopeStar, setHopeStar] = useState(true);
  const [rulesetId, setRulesetId] = useState<"O26" | "O20" | "O15">("O26");
  const [summaryIndex, setSummaryIndex] = useState(3);

  const mockState = {
    id: "dev-room",
    title: "Trận Chung Kết Năm - Olympia 26",
    hostSecret: "secret",
    createdAt: Date.now(),
    themeMode: "v3_arrow",
    rulesetId,
    currentRound: "khoiDong",
    status: "in_progress",
    audioSeason: "O26",
    seats: [
      { id: 0, name: "Quang Minh", school: "THPT Chuyên Hà Nội - Amsterdam", score: 285, online: true },
      { id: 1, name: "Anh Đức", school: "THPT Chuyên Lê Hồng Phong", score: 210, online: true },
      { id: 2, name: "Gia Bảo", school: "THPT Chuyên Quốc Học Huế", score: 180, online: true },
      { id: 3, name: "Thái Dương", school: "THPT Chuyên Phan Bội Châu", score: 150, online: true },
    ],
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
              ["kd", "1. Khởi Động"],
              ["vcnv", "2. VCNV"],
              ["tt", "3. Tăng Tốc"],
              ["vd-grid", "4a. Lưới Về Đích"],
              ["vd-qbox", "4b. Câu hỏi Về Đích"],
              ["summary", "5. Tổng kết điểm"],
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
              <option value="O15">O15 (1 row preset: 40, 60, 80)</option>
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
        {/* Deliverable 1: Khởi Động Lower Third */}
        {(activeTab === "all" || activeTab === "kd") && (
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
                runAnim={false}
              />
            </div>
          </div>
        )}

        {/* Deliverable 2: VCNV Answer Reveal */}
        {(activeTab === "all" || activeTab === "vcnv") && (
          <div
            id="graphic-vcnv"
            className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/60 border border-cyan-500/20 shadow-xl"
          >
            <div className="mb-4 text-sm font-black uppercase tracking-widest text-cyan-300">
              Deliverable 2: Hàng Đáp Án VCNV (4 thanh chevron, tên thuần, không tiền tố số thứ tự, font đồng đều)
            </div>
            <div className="w-full relative min-h-[360px] flex items-center justify-center">
              <VcnvAnswerRevealGraphic state={mockState} />
            </div>
          </div>
        )}

        {/* Deliverable 3: Tăng Tốc Ranked Answers */}
        {(activeTab === "all" || activeTab === "tt") && (
          <div
            id="graphic-tangtoc"
            className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/60 border border-cyan-500/20 shadow-xl"
          >
            <div className="mb-4 text-sm font-black uppercase tracking-widest text-cyan-300">
              Deliverable 3: Đáp Án Xếp Hạng Tăng Tốc (4 thanh chevron, thời gian thuần số xx.xx không chữ &apos;s&apos;)
            </div>
            <div className="w-full relative min-h-[360px] flex items-center justify-center">
              <TangTocRankedAnswersGraphic state={mockState} />
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
                selectedPoints={[20, 30, 20]}
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
              Deliverable 4b: Thanh Câu Hỏi Về Đích (1000×195 — Cụm điểm chuẩn Econova, ⭐, dải gói điểm 20|30|30)
            </div>
            <div className="w-full flex items-center justify-center min-h-[240px]">
              {(() => {
                const vdState = { ...mockState, currentRound: "veDich" as const };
                return (
                  <EconovaLowerThirdV3
                    state={vdState}
                    activeSeatId={0}
                    buzzedSeatId={isBuzzed ? 2 : undefined}
                    hopeStarActive={hopeStar}
                    questionText={vdState.veDich?.current?.q?.q}
                    serverNow={serverNow}
                    runAnim={false}
                  />
                );
              })()}
            </div>
          </div>
        )}

        {/* Deliverable 5: Summary Scoreboard */}
        {(activeTab === "all" || activeTab === "summary") && (
          <div
            id="graphic-summary"
            className="w-full flex flex-col items-center p-6 rounded-3xl bg-[#061129]/60 border border-cyan-500/20 shadow-xl"
          >
            <div className="mb-4 text-sm font-black uppercase tracking-widest text-cyan-300">
              Deliverable 5: Tổng Kết Điểm (Khung Banner Mũi Tên 1000×268, mở dần theo từng người)
            </div>
            <div className="w-full relative min-h-[320px] flex items-center justify-center">
              <SummaryLowerThirdGraphic state={mockState} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
