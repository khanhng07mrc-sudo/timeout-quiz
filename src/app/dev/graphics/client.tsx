"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { OlympiaState } from "@/lib/olympia/types";
import {
  EconovaLowerThirdV3,
  VcnvAnswerRevealGraphic,
  TangTocRankedAnswersGraphic,
  VeDichSlantedGridGraphic,
  SummaryLowerThirdGraphic,
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
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (p) return p;
    }
    return "r6";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const p = sp.get("tab");
      if (p && p !== activeTab) setActiveTab(p);
      const r = sp.get("ruleset");
      if (r && (r === "O26" || r === "O20" || r === "O15" || r === "O13" || r === "O14")) {
        setRulesetId(r as any);
      }
    }
  }, [activeTab]);
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
              ["r6", "0. R6 Choreography"],
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
            <div className="w-full flex items-center justify-center min-h-[240px]">
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
                  },
                } as unknown as OlympiaState;
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
