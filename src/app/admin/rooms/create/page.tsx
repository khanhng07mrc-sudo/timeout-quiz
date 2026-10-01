"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QuizBankQuickSummary from "@/components/admin/QuizBankQuickSummary";
import PowerupIcon from "@/components/ui/PowerupIcon";
import GameModeIcon from "@/components/ui/GameModeIcon";
import SystemIcon from "@/components/ui/SystemIcon";
import GameModeRulesModal from "@/components/ui/GameModeRulesModal";
import { GameMode } from "@/types";

const GAME_MODES = [
  { value: "CLASSIC", label: "Classic", desc: "Tất cả các đội cùng làm bài, chấm theo Bloom & tỷ lệ đúng phòng", emoji: "🎮", badge: "Đại chúng", badgeColor: "text-purple-300 bg-purple-500/20 border-purple-500/30" },
  { value: "BUZZ", label: "Buzz", desc: "Bấm chuông tranh quyền trả lời nhanh nhất", emoji: "⚡", badge: "Tốc độ", badgeColor: "text-amber-300 bg-amber-500/20 border-amber-500/30" },
  { value: "BOUNCEBACK", label: "Bounceback", desc: "1 đội trả lời chính, sai thì mở chuông 5s cho các đội khác cướp lượt", emoji: "🔄", badge: "Cướp điểm", badgeColor: "text-cyan-300 bg-cyan-500/20 border-cyan-500/30" },
  { value: "ELIMINATION", label: "Elimination", desc: "Loại dần đội điểm thấp nhất sau mỗi chặng", emoji: "❌", badge: "Sinh tồn", badgeColor: "text-rose-300 bg-rose-500/20 border-rose-500/30" },
  { value: "TOURNAMENT", label: "Tournament 1v1", desc: "Bảng đấu đối kháng trực tiếp (Tứ kết, Bán kết, Chung kết)", emoji: "🏆", badge: "Đối kháng", badgeColor: "text-yellow-300 bg-yellow-500/20 border-yellow-500/30" },
  { value: "GRID_CARO", label: "Chọn ô & Caro", desc: "Lưới chữ nhật 1-X ô, độ khó bí ẩn & tính năng Tic-Tac-Toe", emoji: "🎯", badge: "Chiến thuật", badgeColor: "text-emerald-300 bg-emerald-500/20 border-emerald-500/30" },
  { value: "DICE_RACE", label: "Đua cờ Xí ngầu", desc: "Bàn cờ đua 30-50 ô, đổ xúc xắc 1-6 và chinh phục ô sự kiện", emoji: "🎲", badge: "May mắn", badgeColor: "text-indigo-300 bg-indigo-500/20 border-indigo-500/30" },
  { value: "WAGER", label: "Cược điểm Bí mật", desc: "All-in cân não, bí mật cược điểm trước khi hiện câu hỏi", emoji: "💰", badge: "Tâm lý", badgeColor: "text-orange-300 bg-orange-500/20 border-orange-500/30" },
];

const POWERUP_TYPES = [
  { value: "FIFTY_FIFTY", emoji: "🔀", label: "50/50", desc: "Bỏ 2 đáp án sai" },
  { value: "DOUBLE", emoji: "✖️2", label: "Nhân đôi (x2)", desc: "Đúng x2 điểm, Sai bị phạt" },
  { value: "SCORE_X2", emoji: "⭐", label: "x1.5 điểm", desc: "Đúng x1.5 điểm, Sai miễn phạt" },
  { value: "SHIELD", emoji: "🛡️", label: "Tái sinh (Khiên)", desc: "Miễn trừ điểm phạt 1 lần" },
  { value: "FREEZE", emoji: "❄️", label: "Phong tỏa", desc: "Đóng băng 1 đội đối thủ" },
  { value: "ATTACK", emoji: "⚔️", label: "Tấn công", desc: "Ép đối thủ trả lời, sai bị trừ" },
  { value: "SKIP", emoji: "🔄", label: "Đổi câu", desc: "Đổi sang câu hỏi khác" },
  { value: "TIME_PLUS", emoji: "⏱️", label: "Thêm giờ", desc: "+15 giây suy nghĩ" },
  { value: "STEAL", emoji: "💸", label: "Cướp điểm", desc: "Cướp điểm đội dẫn đầu" },
  { value: "PENALTY", emoji: "💥", label: "Phạt đôi", desc: "Nhân đôi điểm trừ đối thủ" },
];

const TEAM_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444", "#8b5cf6", "#f97316"];

export default function CreateRoomPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Quiz banks
  const [quizBanks, setQuizBanks] = useState<{ id: string; title: string; _count?: { questions: number } }[]>([]);
  const [quizBankId, setQuizBankId] = useState("");

  useEffect(() => {
    fetch("/api/quiz-bank")
      .then((r) => r.json())
      .then((d) => {
        if (d.banks) setQuizBanks(d.banks);
      })
      .catch(() => {});
  }, []);

  // Step 1: Basic settings
  const [roomName, setRoomName] = useState("");
  const [mode, setMode] = useState("CLASSIC");
  const [teamMode, setTeamMode] = useState<"INDIVIDUAL" | "TEAM">("TEAM");
  const [bouncebackQuestionsPerTurn, setBouncebackQuestionsPerTurn] = useState(1);
  const [bouncebackCycles, setBouncebackCycles] = useState(1);
  const [answerMethod, setAnswerMethod] = useState<"DEVICE" | "MC">("DEVICE");
  const [eliminationDeepScoring, setEliminationDeepScoring] = useState(true);
  const [eliminationIntervalQuestions, setEliminationIntervalQuestions] = useState(3);
  // Tournament config
  const [tournamentQuestionsPerMatch, setTournamentQuestionsPerMatch] = useState(3);
  // Grid Caro config
  const [gridRows, setGridRows] = useState(4);
  const [gridCols, setGridCols] = useState(4);
  const [gridStreakTargetK, setGridStreakTargetK] = useState(3);
  const [gridCaroEnabled, setGridCaroEnabled] = useState(true);
  const [gridCaroBonusPoints, setGridCaroBonusPoints] = useState(30);
  const [gridPreviewDuration, setGridPreviewDuration] = useState(5);
  const [gridMaxRounds, setGridMaxRounds] = useState(3);
  // Modal state
  const [showRulesModal, setShowRulesModal] = useState(false);
  // Dice Race config
  const [diceTrackTotalTiles, setDiceTrackTotalTiles] = useState(30);
  // Wager config
  const [wagerTimeSeconds, setWagerTimeSeconds] = useState(15);
  const [wagerMinAllowance, setWagerMinAllowance] = useState(50);
  const [wagerInitialPoints, setWagerInitialPoints] = useState(50);
  const [wagerBailoutLimit, setWagerBailoutLimit] = useState(1);

  // Layout switcher states
  const [modeLayout, setModeLayout] = useState<"GRID" | "LIST" | "COMPACT">("GRID");
  const [powerupLayout, setPowerupLayout] = useState<"GRID" | "COMPACT">("GRID");

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("timeout_admin_mode_layout") as "GRID" | "LIST" | "COMPACT" | null;
      if (savedMode && ["GRID", "LIST", "COMPACT"].includes(savedMode)) {
        setModeLayout(savedMode);
      }
      const savedPowerup = localStorage.getItem("timeout_admin_powerup_layout") as "GRID" | "COMPACT" | null;
      if (savedPowerup && ["GRID", "COMPACT"].includes(savedPowerup)) {
        setPowerupLayout(savedPowerup);
      }
    } catch {}
  }, []);

  const handleSetModeLayout = (layout: "GRID" | "LIST" | "COMPACT") => {
    setModeLayout(layout);
    try {
      localStorage.setItem("timeout_admin_mode_layout", layout);
    } catch {}
  };

  const handleSetPowerupLayout = (layout: "GRID" | "COMPACT") => {
    setPowerupLayout(layout);
    try {
      localStorage.setItem("timeout_admin_powerup_layout", layout);
    } catch {}
  };

  // Step 2: Teams (if teamMode === TEAM)
  const [teams, setTeams] = useState([
    { name: "Đội 1", color: TEAM_COLORS[0] },
    { name: "Đội 2", color: TEAM_COLORS[1] },
  ]);

  // Step 3: Power-up config
  const [powerupEnabled, setPowerupEnabled] = useState(true);
  const [powerupOwnerType, setPowerupOwnerType] = useState<"SHARED" | "TEAM">("TEAM");
  const [powerupCountShared, setPowerupCountShared] = useState(10);
  const [powerupCountPerTeam, setPowerupCountPerTeam] = useState(2);
  const [maxHandSize, setMaxHandSize] = useState(3);
  const [allowedPowerups, setAllowedPowerups] = useState<string[]>(
    POWERUP_TYPES.map((p) => p.value)
  );

  // Step 4: Other settings
  const [timeBonusEnabled, setTimeBonusEnabled] = useState(true);
  const [penaltyForWrong, setPenaltyForWrong] = useState(false);
  const [penaltyPoints, setPenaltyPoints] = useState(5);

  const addTeam = () => {
    if (teams.length >= 20) return;
    setTeams([...teams, { name: `Đội ${teams.length + 1}`, color: TEAM_COLORS[teams.length % TEAM_COLORS.length] }]);
  };

  const removeTeam = (i: number) => setTeams(teams.filter((_, idx) => idx !== i));

  const togglePowerup = (type: string) => {
    setAllowedPowerups((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleCreate = async () => {
    if (!roomName.trim()) { setError("Vui lòng nhập tên phòng"); return; }
    setLoading(true);
    setError("");
    try {
      const isDeviceOnly = mode === "CLASSIC" || mode === "ELIMINATION";
      const finalAnswerMethod = isDeviceOnly ? "DEVICE" : answerMethod;

      const token = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/rooms", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: roomName,
          mode,
          teamMode,
          quizBankId: quizBankId || null,
          hostId: "demo-host-id", // In real app: from session
          teams: teamMode === "TEAM" ? teams : [],
          config: {
            powerupEnabled,
            powerupOwnerType,
            powerupCountShared,
            powerupCountPerTeam,
            maxHandSize,
            allowedPowerups,
            // Mode Classic là mode DUY NHẤT có bonus thời gian
            timeBonusEnabled: mode === "CLASSIC" ? timeBonusEnabled : false,
            penaltyForWrong,
            penaltyPoints,
            bouncebackQuestionsPerTurn,
            bouncebackCycles,
            answerMethod: finalAnswerMethod,
            eliminationDeepScoring: mode === "ELIMINATION" ? eliminationDeepScoring : false,
            eliminationIntervalQuestions,
            // Tournament config
            tournamentQuestionsPerMatch: mode === "TOURNAMENT" ? tournamentQuestionsPerMatch : 3,
            // Grid Caro config
            gridRows: mode === "GRID_CARO" ? gridRows : 4,
            gridCols: mode === "GRID_CARO" ? gridCols : 4,
            gridStreakTargetK: mode === "GRID_CARO" ? gridStreakTargetK : 3,
            gridCaroEnabled: mode === "GRID_CARO" ? (gridRows >= 4 && gridCols >= 4 && gridCaroEnabled) : false,
            gridCaroBonusPoints: mode === "GRID_CARO" ? gridCaroBonusPoints : 30,
            gridPreviewDuration: mode === "GRID_CARO" ? gridPreviewDuration : 5,
            // Dice Race config
            diceTrackTotalTiles: mode === "DICE_RACE" ? diceTrackTotalTiles : 30,
            // Wager config
            wagerTimeSeconds: mode === "WAGER" ? wagerTimeSeconds : 15,
            wagerMinAllowance: mode === "WAGER" ? wagerMinAllowance : 50,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.hostKey) {
        localStorage.setItem(`host_key_${data.room.code}`, data.hostKey);
        router.push(`/admin/rooms/${data.room.code}?key=${data.hostKey}`);
      } else {
        router.push(`/admin/rooms/${data.room.code}`);
      }
    } catch (err: any) {
      setError(err.message ?? "Lỗi khi tạo phòng");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black">Tạo phòng mới</h1>
        <div className="flex gap-2 mt-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${ step >= s ? "bg-purple-500" : "bg-muted" }`} />
          ))}
        </div>
        <p className="text-muted-foreground text-sm mt-2">
          Bước {step}/4
        </p>
      </div>

      {/* Step 1: Basic settings */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Tên phòng *</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Quiz Trí Tuệ Khỏi Đầu Năm..."
              className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Bộ đề câu hỏi{" "}
              <span className="text-muted-foreground font-normal">(có thể chọn sau)</span>
            </label>
            <select
              value={quizBankId}
              onChange={(e) => setQuizBankId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#151728] border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm text-white"
            >
              <option value="" className="bg-[#151728] text-white">— Chưa chọn bộ đề —</option>
              {quizBanks.map((bank) => (
                <option key={bank.id} value={bank.id} className="bg-[#151728] text-white">
                  {bank.title}{bank._count ? ` (${bank._count.questions} câu)` : ""}
                </option>
              ))}
            </select>

            {quizBankId && (
              <div className="mt-3">
                <QuizBankQuickSummary
                  bankId={quizBankId}
                  onClear={() => setQuizBankId("")}
                />
              </div>
            )}

            {quizBanks.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Chưa có bộ đề nào.{" "}
                <a href="/admin/quiz-bank" className="text-purple-400 underline">Tạo bộ đề mới</a>
              </p>
            )}
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-foreground">Chế độ chơi</label>
                <span className="text-xs text-muted-foreground font-mono bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  {GAME_MODES.length} chế độ
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Segmented layout switcher: Grid, List, Compact */}
                <div className="flex items-center p-0.5 rounded-xl bg-card/80 border border-border gap-0.5 text-xs shadow-inner">
                  <button
                    type="button"
                    onClick={() => handleSetModeLayout("GRID")}
                    title="Bố cục Lưới thẻ (2-4 cột trực quan)"
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                      modeLayout === "GRID"
                        ? "bg-purple-600 text-white shadow-md glow-purple"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <span>⊞</span>
                    <span className="text-[11px] whitespace-nowrap">Lưới</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetModeLayout("LIST")}
                    title="Bố cục Danh sách chi tiết (1 cột)"
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                      modeLayout === "LIST"
                        ? "bg-purple-600 text-white shadow-md glow-purple"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <span>☰</span>
                    <span className="text-[11px] whitespace-nowrap">Danh sách</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetModeLayout("COMPACT")}
                    title="Bố cục Thẻ nhỏ tinh gọn (Chips ngang)"
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                      modeLayout === "COMPACT"
                        ? "bg-purple-600 text-white shadow-md glow-purple"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <span>🏷️</span>
                    <span className="text-[11px] whitespace-nowrap">Tinh gọn</span>
                  </button>
                </div>

                {/* Rules modal button */}
                <button
                  type="button"
                  onClick={() => setShowRulesModal(true)}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass border border-cyan-500/30 hover:bg-cyan-500/10 shrink-0 whitespace-nowrap"
                >
                  <span>📖</span>
                  <span className="hidden sm:inline whitespace-nowrap">Chi tiết thể lệ</span>
                </button>
              </div>
            </div>

            {/* ─── 1. BỐ CỤC LƯỚI THẺ TRỰC QUAN (GRID) ─── */}
            {modeLayout === "GRID" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-slide-up">
                {GAME_MODES.map((m) => {
                  const isSelected = mode === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        setMode(m.value);
                        if (m.value === "CLASSIC" || m.value === "ELIMINATION") {
                          setAnswerMethod("DEVICE");
                        }
                      }}
                      className={`relative flex flex-col justify-between p-3.5 rounded-2xl border-2 text-left transition-all duration-200 active:scale-95 group min-h-[140px] ${
                        isSelected
                          ? "border-purple-500 bg-purple-500/15 ring-2 ring-purple-500/40 text-white shadow-xl glow-purple"
                          : "border-border hover:border-purple-400 glass bg-card/60 hover:bg-card text-foreground"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <GameModeIcon mode={m.value} className="w-10 h-10 drop-shadow shrink-0" />
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${m.badgeColor}`}>
                          {m.badge}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-sm group-hover:text-purple-300 transition-colors flex items-center gap-1 whitespace-nowrap">
                          <span className="whitespace-nowrap">{m.label}</span>
                          {isSelected && <span className="text-purple-400 text-xs font-black">✓</span>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {m.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ─── 2. BỐ CỤC DANH SÁCH CHI TIẾT (LIST) ─── */}
            {modeLayout === "LIST" && (
              <div className="grid grid-cols-1 gap-2.5 animate-slide-up">
                {GAME_MODES.map((m) => {
                  const isSelected = mode === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        setMode(m.value);
                        if (m.value === "CLASSIC" || m.value === "ELIMINATION") {
                          setAnswerMethod("DEVICE");
                        }
                      }}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-purple-500 bg-purple-500/15 ring-2 ring-purple-500/40 text-white shadow-md glow-purple"
                          : "border-border hover:border-purple-400 glass bg-card/50"
                      }`}
                    >
                      <GameModeIcon mode={m.value} className="w-10 h-10 shrink-0 drop-shadow" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-base">{m.label}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${m.badgeColor}`}>
                            {m.badge}
                          </span>
                          {isSelected && <span className="text-purple-400 text-xs font-black">✓ Đang chọn</span>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{m.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ─── 3. BỐ CỤC THẺ NHỎ TINH GỌN (COMPACT CHIPS) ─── */}
            {modeLayout === "COMPACT" && (
              <div className="space-y-3 animate-slide-up">
                <div className="flex flex-wrap gap-2">
                  {GAME_MODES.map((m) => {
                    const isSelected = mode === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => {
                          setMode(m.value);
                          if (m.value === "CLASSIC" || m.value === "ELIMINATION") {
                            setAnswerMethod("DEVICE");
                          }
                        }}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all active:scale-95 whitespace-nowrap shrink-0 ${
                          isSelected
                            ? "bg-purple-600 border-purple-400 text-white shadow-lg glow-purple"
                            : "bg-card/70 border-border hover:border-purple-400 text-foreground hover:bg-card"
                        }`}
                      >
                        <GameModeIcon mode={m.value} className="w-5 h-5 shrink-0" />
                        <span className="whitespace-nowrap">{m.label}</span>
                        {isSelected && <span className="text-xs font-black text-purple-200">✓</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Active Mode Summary Preview Box */}
                {(() => {
                  const currentModeObj = GAME_MODES.find((m) => m.value === mode);
                  if (!currentModeObj) return null;
                  return (
                    <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-3 animate-slide-up">
                      <GameModeIcon mode={currentModeObj.value} className="w-12 h-12 shrink-0 drop-shadow" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-purple-200 whitespace-nowrap">{currentModeObj.label}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${currentModeObj.badgeColor}`}>
                            {currentModeObj.badge}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{currentModeObj.desc}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {mode === "BOUNCEBACK" && (
            <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 space-y-4">
              <div className="flex items-center gap-2">
                <GameModeIcon mode="BOUNCEBACK" className="w-6 h-6 shrink-0" />
                <h3 className="font-bold text-sm text-purple-300">Cấu hình lượt chơi Bounceback</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Số câu mỗi lượt cho mỗi đội</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={bouncebackQuestionsPerTurn}
                    onChange={(e) => setBouncebackQuestionsPerTurn(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Số chu kỳ luân phiên</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={bouncebackCycles}
                    onChange={(e) => setBouncebackCycles(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Ước tính: {teams.length} đội × {bouncebackQuestionsPerTurn} câu/lượt × {bouncebackCycles} chu kỳ = {teams.length * bouncebackQuestionsPerTurn * bouncebackCycles} câu hỏi.
              </p>
            </div>
          )}

          {mode === "ELIMINATION" && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 space-y-4">
              <div className="flex items-center gap-2">
                <GameModeIcon mode="ELIMINATION" className="w-6 h-6 shrink-0" />
                <h3 className="font-bold text-sm text-red-300">Cấu hình chế độ Elimination (Loại dần)</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Số câu hỏi mỗi đợt loại đội</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={eliminationIntervalQuestions}
                    onChange={(e) => setEliminationIntervalQuestions(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Cứ sau {eliminationIntervalQuestions} câu, đội có điểm số thấp nhất sẽ bị loại khỏi cuộc chơi.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#151728]/80 border border-border flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Công thức tính điểm sâu</span>
                      <button
                        type="button"
                        onClick={() => setEliminationDeepScoring(!eliminationDeepScoring)}
                        className={`w-10 h-5 rounded-full transition-colors ${eliminationDeepScoring ? "bg-purple-500" : "bg-muted"}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white m-0.5 transition-transform ${eliminationDeepScoring ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {eliminationDeepScoring
                        ? "Bật: Điểm Bloom + độ hiếm câu hỏi + tỷ lệ thành viên đúng nhóm (không tính điểm thời gian)."
                        : "Tắt: Chỉ tính điểm đúng/sai thuần túy theo điểm gốc của câu."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mode === "TOURNAMENT" && (
            <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 space-y-4">
              <div className="flex items-center gap-2">
                <GameModeIcon mode="TOURNAMENT" className="w-6 h-6 shrink-0" />
                <h3 className="font-bold text-sm text-yellow-300">Cấu hình Giải đấu Tournament 1v1 (Knockout Bracket)</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Số câu hỏi mỗi trận đấu 1v1</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={tournamentQuestionsPerMatch}
                    onChange={(e) => setTournamentQuestionsPerMatch(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Mỗi cặp đối đầu sẽ tranh tài trong {tournamentQuestionsPerMatch} câu hỏi, đội ghi nhiều điểm hơn sẽ đi tiếp vào vòng sau.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#151728]/80 border border-border flex flex-col justify-center">
                  <p className="text-xs font-bold text-foreground">Sơ đồ nhánh đấu tự động</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Hệ thống sẽ tự sinh nhánh đấu (Tứ kết, Bán kết, Chung kết) dựa theo số lượng đội tham gia. Các đội khác sẽ theo dõi trận đấu trực tiếp.
                  </p>
                </div>
              </div>
            </div>
          )}

          {mode === "GRID_CARO" && (() => {
            const canEnableCaro = gridRows >= 4 && gridCols >= 4;
            const selectedBank = quizBanks.find((b) => b.id === quizBankId);
            const bankQuestionsCount = selectedBank?._count?.questions ?? 0;
            const totalCells = gridRows * gridCols;
            const notEnoughQuestions = bankQuestionsCount > 0 && bankQuestionsCount < totalCells;
            const hasExcessQuestions = bankQuestionsCount > 0 && bankQuestionsCount > totalCells;

            return (
              <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <GameModeIcon mode="GRID_CARO" className="w-6 h-6 shrink-0" />
                    <h3 className="font-bold text-sm text-purple-300">Cấu hình Lưới câu hỏi & Caro (Tic-Tac-Toe)</h3>
                  </div>

                  {/* Optional Caro Streak Toggle */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-foreground">
                      Thưởng Caro liên tiếp:
                    </span>
                    <button
                      type="button"
                      disabled={!canEnableCaro || notEnoughQuestions}
                      onClick={() => setGridCaroEnabled(!gridCaroEnabled)}
                      className={`w-10 h-5 rounded-full transition-colors ${
                        canEnableCaro && gridCaroEnabled && !notEnoughQuestions ? "bg-purple-500" : "bg-muted opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white m-0.5 transition-transform ${
                          canEnableCaro && gridCaroEnabled && !notEnoughQuestions ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className={`text-[11px] font-bold ${canEnableCaro && gridCaroEnabled && !notEnoughQuestions ? "text-green-400" : "text-muted-foreground"}`}>
                      {canEnableCaro && gridCaroEnabled && !notEnoughQuestions ? "BẬT" : "TẮT"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Số hàng ({gridRows})</label>
                    <input
                      type="number"
                      min={3}
                      max={6}
                      value={gridRows}
                      onChange={(e) => {
                        const r = Math.min(6, Math.max(3, parseInt(e.target.value) || 4));
                        setGridRows(r);
                        if (r < 4 || gridCols < 4) setGridCaroEnabled(false);
                        const maxK = Math.min(r, gridCols) - 1;
                        if (gridStreakTargetK > maxK) setGridStreakTargetK(Math.max(3, maxK));
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Số cột ({gridCols})</label>
                    <input
                      type="number"
                      min={3}
                      max={6}
                      value={gridCols}
                      onChange={(e) => {
                        const c = Math.min(6, Math.max(3, parseInt(e.target.value) || 4));
                        setGridCols(c);
                        if (gridRows < 4 || c < 4) setGridCaroEnabled(false);
                        const maxK = Math.min(gridRows, c) - 1;
                        if (gridStreakTargetK > maxK) setGridStreakTargetK(Math.max(3, maxK));
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Số ô Caro liên tiếp (K)
                    </label>
                    <input
                      type="number"
                      disabled={!canEnableCaro || !gridCaroEnabled || notEnoughQuestions}
                      min={3}
                      max={Math.max(3, Math.min(gridRows, gridCols) - 1)}
                      value={gridStreakTargetK}
                      onChange={(e) => {
                        const maxK = Math.max(3, Math.min(gridRows, gridCols) - 1);
                        setGridStreakTargetK(Math.min(maxK, Math.max(3, parseInt(e.target.value) || 3)));
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Thời gian xem trước (s)</label>
                    <input
                      type="number"
                      min={5}
                      max={15}
                      value={gridPreviewDuration}
                      onChange={(e) => setGridPreviewDuration(Math.min(15, Math.max(5, parseInt(e.target.value) || 5)))}
                      className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm"
                    />
                  </div>
                </div>

                {/* Status & Validation Banners */}
                <div className="space-y-2 text-[11px]">
                  {!canEnableCaro ? (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200">
                      ⚠️ Bảng hiện tại là {gridRows}×{gridCols} ({totalCells} ô). <strong>Tính năng thưởng Caro liên tiếp yêu cầu bảng tối thiểu từ 4×4 trở lên</strong>. Chế độ này sẽ hoạt động như Lưới chọn ô câu hỏi thông thường.
                    </div>
                  ) : notEnoughQuestions ? (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300">
                      ❌ Bộ đề đã chọn chỉ có {bankQuestionsCount} câu, không đủ {totalCells} câu cho bảng {gridRows}×{gridCols}. Vui lòng chọn bộ đề có ít nhất {totalCells} câu để kích hoạt Caro!
                    </div>
                  ) : !gridCaroEnabled ? (
                    <div className="p-2.5 rounded-lg bg-card/60 border border-border text-muted-foreground">
                      ℹ️ Tính năng thưởng Caro liên tiếp đang TẮT (Optional). Các đội tự do chọn ô câu hỏi để ghi điểm mà không tính chuỗi hàng/cột/chéo.
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-200 space-y-1">
                      <p>
                        🎯 <strong>Thưởng Caro liên tiếp đang BẬT:</strong> Đội đầu tiên xếp được {gridStreakTargetK} ô liên tiếp cùng hàng, cột hoặc đường chéo sẽ nhận <strong>thưởng Caro Bonus</strong>.
                      </p>
                      <p className="text-cyan-300">
                        ✨ <em>Điểm thưởng Caro được tính bằng trung bình cộng điểm số của {gridStreakTargetK} ô tạo nên chuỗi (làm tròn về số chia hết cho 5 gần nhất).</em>
                      </p>
                      {hasExcessQuestions && (
                        <p className="text-amber-300 text-[10px] mt-1 pt-1 border-t border-purple-500/30">
                          📌 Bộ đề có {bankQuestionsCount} câu. Bàn cờ sẽ sử dụng đúng {totalCells} câu đầu tiên và bỏ qua {bankQuestionsCount - totalCells} câu dư thừa.
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-muted-foreground">
                    Quy tắc câu hỏi duy nhất: Mỗi câu hỏi chỉ xuất hiện tối đa 1 lần. Trả lời sai không bị trừ điểm và ô đó vẫn mở cho các đội sau chọn lại với câu hỏi mới!
                  </p>
                </div>
              </div>
            );
          })()}

          {mode === "DICE_RACE" && (
            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 space-y-4">
              <div className="flex items-center gap-2">
                <GameModeIcon mode="DICE_RACE" className="w-6 h-6 shrink-0" />
                <h3 className="font-bold text-sm text-indigo-300">Cấu hình Đua cờ Xí ngầu (Board Game Track)</h3>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Độ dài đường đua (Số ô bàn cờ: 30 - 50 ô)</label>
                <input
                  type="number"
                  min={30}
                  max={50}
                  value={diceTrackTotalTiles}
                  onChange={(e) => setDiceTrackTotalTiles(Math.min(50, Math.max(30, parseInt(e.target.value) || 30)))}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Mỗi lượt chơi, đội tung xúc xắc 1-6 bước trên điện thoại/máy tính. Nếu trả lời ĐÚNG, đội sẽ tiến số bước tương ứng. Bàn cờ rải rác các ô đặc biệt: 🚀 Tăng tốc (+2 bước), 💥 Bẫy hụt (-2 bước), 💎 Ngọc thưởng (+150đ), 🔀 Đổi chỗ, và 🏆 Về đích nhận cúp vàng!
                </p>
              </div>
            </div>
          )}

          {mode === "WAGER" && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-4">
              <div className="flex items-center gap-2">
                <GameModeIcon mode="WAGER" className="w-6 h-6 shrink-0" />
                <h3 className="font-bold text-sm text-amber-300">Cấu hình Cược điểm (Wager & Bailout)</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Thời gian đặt cược (giây)</label>
                  <input
                    type="number"
                    min={10}
                    max={30}
                    value={wagerTimeSeconds}
                    onChange={(e) => setWagerTimeSeconds(Math.min(30, Math.max(10, parseInt(e.target.value) || 15)))}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Thời gian các đội đặt cược trên bảng 12 ô (10-30s).
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Số điểm tặng ban đầu</label>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    step={5}
                    value={wagerInitialPoints}
                    onChange={(e) => setWagerInitialPoints(Math.max(10, parseInt(e.target.value) || 50))}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Mỗi đội được tặng trước {wagerInitialPoints} điểm khi bắt đầu vòng thi.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Số lần nhận trợ cấp tối đa</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={wagerBailoutLimit}
                    onChange={(e) => setWagerBailoutLimit(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Mỗi đội được cứu trợ tối đa {wagerBailoutLimit} lần khi tụt xuống &le; 0 điểm.
                  </p>
                </div>
              </div>

              {/* Informative rules explanation box */}
              <div className="p-3 rounded-lg bg-[#151728]/80 border border-amber-500/20 text-xs text-amber-200/90 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">🏥 Cơ chế Trợ cấp:</span>
                  <p className="text-[11px] leading-relaxed">
                    Khi điểm đội xuống <strong>&le; 0 điểm</strong>, quản trò có thể bấm cứu trợ. Mức điểm trợ cấp sẽ <strong>tự động lấy bằng điểm của đội thấp nhất đang có điểm &gt; 0</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">⚡ Thứ tự ưu tiên cứu:</span>
                  <p className="text-[11px] leading-relaxed">
                    Mỗi câu hỏi, Admin chỉ được kích hoạt cứu <strong>duy nhất 1 đội</strong> (ưu tiên đội tụt xuống 0 điểm trước). Đội rơi điểm sau sẽ chờ ở các câu tiếp theo.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">🏆 Thắng Knockout:</span>
                  <p className="text-[11px] leading-relaxed">
                    Quyền trợ cấp chỉ áp dụng khi còn <strong>ít nhất 2 đội có điểm &gt; 0</strong>. Nếu chỉ còn 1 đội có điểm dương, đội đó lập tức <strong>chiến thắng Knockout</strong>!
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">🎯 Bảng cược 12 ô:</span>
                  <p className="text-[11px] leading-relaxed">
                    Các ô cược cách nhau 5 điểm. Đội không được cược quá số điểm hiện có của mình và <strong>không được cược 2 lần liên tiếp</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Phương thức trả lời</label>
            <p className="text-xs text-muted-foreground mb-3">
              {mode === "CLASSIC" || mode === "ELIMINATION"
                ? `Mode ${mode === "CLASSIC" ? "Classic" : "Elimination"} bắt buộc mọi đội làm bài đồng thời trên thiết bị thí sinh`
                : "Cho phép thí sinh trả lời trên thiết bị hoặc trả lời miệng qua Quản trò (MC)"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAnswerMethod("DEVICE")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  answerMethod === "DEVICE" ? "border-purple-500 bg-purple-500/10" : "border-border hover:border-purple-400"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <SystemIcon name="device" className="w-7 h-7" />
                  {(mode === "CLASSIC" || mode === "ELIMINATION") && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      Bắt buộc
                    </span>
                  )}
                </div>
                <p className="font-bold text-sm">Trên thiết bị thí sinh</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Thí sinh bấm chọn đáp án trực tiếp trên điện thoại/máy tính
                </p>
              </button>

              <button
                type="button"
                disabled={mode === "CLASSIC" || mode === "ELIMINATION"}
                onClick={() => {
                  if (mode !== "CLASSIC" && mode !== "ELIMINATION") setAnswerMethod("MC");
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                  mode === "CLASSIC" || mode === "ELIMINATION"
                    ? "border-border/40 opacity-40 cursor-not-allowed bg-muted/10"
                    : answerMethod === "MC"
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-border hover:border-cyan-400"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <SystemIcon name="mc" className="w-7 h-7" />
                  {(mode === "CLASSIC" || mode === "ELIMINATION") && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-destructive/20 text-destructive border border-destructive/40">
                      Không hỗ trợ
                    </span>
                  )}
                </div>
                <p className="font-bold text-sm">Trả lời qua MC / Admin</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {mode === "CLASSIC"
                    ? "Mode Classic yêu cầu thí sinh làm bài đồng loạt trên thiết bị để tính điểm tốc độ"
                    : mode === "ELIMINATION"
                    ? "Mode Elimination yêu cầu mọi đội làm bài đồng loạt trên thiết bị để xét loại"
                    : "Thí sinh trả lời miệng, quản trò (Admin) click chọn đáp án trên máy"}
                </p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Kiểu chơi</label>
            <div className="grid grid-cols-2 gap-3">
              {(["INDIVIDUAL", "TEAM"] as const).map((tm) => (
                <button
                  key={tm}
                  onClick={() => setTeamMode(tm)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    teamMode === tm ? "border-cyan-500 bg-cyan-500/10" : "border-border hover:border-cyan-400"
                  }`}
                >
                  <div className="flex justify-center mb-1.5">
                    <SystemIcon name={tm === "INDIVIDUAL" ? "individual" : "team"} className="w-7 h-7" />
                  </div>
                  <p className="font-bold">{tm === "INDIVIDUAL" ? "Cá nhân" : "Nhóm"}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Teams */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Đội tham gia</h2>
            <button onClick={addTeam} disabled={teams.length >= 20} className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-medium text-sm disabled:opacity-50">
              + Thêm đội
            </button>
          </div>
          {teams.map((team, i) => (
            <div key={i} className="glass rounded-xl p-4 flex items-center gap-3">
              <input
                type="color"
                value={team.color}
                onChange={(e) => setTeams(teams.map((t, idx) => idx === i ? { ...t, color: e.target.value } : t))}
                className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
              />
              <input
                type="text"
                value={team.name}
                onChange={(e) => setTeams(teams.map((t, idx) => idx === i ? { ...t, name: e.target.value } : t))}
                className="flex-1 px-3 py-2 rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button onClick={() => removeTeam(i)} disabled={teams.length <= 2} className="p-2 rounded-lg hover:bg-destructive/20 text-destructive disabled:opacity-30">
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Step 3: Power-ups */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">Kích hoạt thẻ hỗ trợ</h2>
              <p className="text-sm text-muted-foreground">Power-up cards cho các đội</p>
            </div>
            <button
              onClick={() => setPowerupEnabled(!powerupEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${ powerupEnabled ? "bg-purple-500" : "bg-muted" }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white m-0.5 transition-transform ${ powerupEnabled ? "translate-x-6" : "translate-x-0" }`} />
            </button>
          </div>

          {powerupEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Kiểu thẻ</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["SHARED", "TEAM"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setPowerupOwnerType(t)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${ powerupOwnerType === t ? "border-purple-500 bg-purple-500/10" : "border-border" }`}
                    >
                      <p className="font-bold">{t === "SHARED" ? "Chung" : "Riêng"}</p>
                      <p className="text-xs text-muted-foreground">{t === "SHARED" ? "Thẻ chung tất cả đội" : "Mỗi đội có thẻ riêng"}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {powerupOwnerType === "SHARED" ? `Số thẻ chung: ${powerupCountShared}` : `Số thẻ/đội: ${powerupCountPerTeam}`}
                </label>
                <input
                  type="range" min={1} max={20}
                  value={powerupOwnerType === "SHARED" ? powerupCountShared : powerupCountPerTeam}
                  onChange={(e) => powerupOwnerType === "SHARED" ? setPowerupCountShared(+e.target.value) : setPowerupCountPerTeam(+e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-bold text-foreground">Loại thẻ được phép</label>
                    <span className="text-xs font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30 font-bold">
                      {allowedPowerups.length}/{POWERUP_TYPES.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Quick Select Buttons */}
                    <button
                      type="button"
                      onClick={() => setAllowedPowerups(POWERUP_TYPES.map((p) => p.value))}
                      className="text-xs font-semibold px-2 py-1 rounded-lg glass border border-border hover:bg-white/10 text-muted-foreground hover:text-white transition"
                    >
                      Chọn tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllowedPowerups([])}
                      className="text-xs font-semibold px-2 py-1 rounded-lg glass border border-border hover:bg-white/10 text-muted-foreground hover:text-white transition"
                    >
                      Bỏ chọn
                    </button>

                    {/* Segmented layout switcher: Grid vs Compact */}
                    <div className="flex items-center p-0.5 rounded-xl bg-card border border-border gap-0.5 text-xs shadow-inner">
                      <button
                        type="button"
                        onClick={() => handleSetPowerupLayout("GRID")}
                        title="Bố cục Lưới thẻ"
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold transition-all ${
                          powerupLayout === "GRID"
                            ? "bg-purple-600 text-white shadow"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>⊞</span>
                        <span className="text-[11px]">Lưới</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetPowerupLayout("COMPACT")}
                        title="Bố cục Thẻ nhỏ tinh gọn (Chips)"
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold transition-all ${
                          powerupLayout === "COMPACT"
                            ? "bg-purple-600 text-white shadow"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>🏷️</span>
                        <span className="text-[11px]">Tinh gọn</span>
                      </button>
                    </div>
                  </div>
                </div>

                {powerupLayout === "GRID" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-slide-up">
                    {POWERUP_TYPES.map((pt) => {
                      const isAllowed = allowedPowerups.includes(pt.value);
                      return (
                        <button
                          key={pt.value}
                          type="button"
                          onClick={() => togglePowerup(pt.value)}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                            isAllowed
                              ? "border-purple-500 bg-purple-500/15 shadow-sm text-foreground"
                              : "border-border opacity-40 hover:opacity-75 glass bg-card/30"
                          }`}
                        >
                          <PowerupIcon type={pt.value} className="w-8 h-8 shrink-0 mt-0.5 drop-shadow" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold">{pt.label}</span>
                              {isAllowed ? (
                                <span className="text-xs text-purple-400 font-bold">✓ Bật</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Tắt</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{pt.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 animate-slide-up">
                    {POWERUP_TYPES.map((pt) => {
                      const isAllowed = allowedPowerups.includes(pt.value);
                      return (
                        <button
                          key={pt.value}
                          type="button"
                          onClick={() => togglePowerup(pt.value)}
                          title={pt.desc}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-bold active:scale-95 ${
                            isAllowed
                              ? "border-purple-500 bg-purple-600 text-white shadow-md glow-purple"
                              : "border-border/60 bg-card/40 opacity-40 hover:opacity-80 text-muted-foreground"
                          }`}
                        >
                          <PowerupIcon type={pt.value} className="w-5 h-5 shrink-0" />
                          <span>{pt.label}</span>
                          {isAllowed && <span className="text-xs font-black text-purple-200">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 4: Scoring */}
      {step === 4 && (
        <div className="space-y-6">
          {/* Bonus theo thời gian: Chỉ duy nhất mode CLASSIC */}
          {mode === "CLASSIC" ? (
            <div className="flex items-center justify-between glass rounded-xl p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold">Bonus theo thời gian</p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Dành riêng Classic
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Trả lời càng nhanh càng được nhiều điểm thưởng (tối đa +50% điểm)</p>
              </div>
              <button
                type="button"
                onClick={() => setTimeBonusEnabled(!timeBonusEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${ timeBonusEnabled ? "bg-purple-500" : "bg-muted" }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white m-0.5 transition-transform ${ timeBonusEnabled ? "translate-x-6" : "translate-x-0" }`} />
              </button>
            </div>
          ) : (
            <div className="glass rounded-xl p-4 opacity-70 border border-border flex items-center justify-between">
              <div>
                <p className="font-bold text-muted-foreground">Bonus theo thời gian</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Không áp dụng cho chế độ {mode}. Chế độ này tính điểm theo câu hỏi (không thưởng tốc độ).
                </p>
              </div>
              <span className="text-xs font-semibold text-muted-foreground px-2.5 py-1 rounded-lg bg-muted/40 border border-border">
                Không áp dụng
              </span>
            </div>
          )}

          <div className="flex items-center justify-between glass rounded-xl p-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold">Trừ điểm khi sai</p>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-destructive/20 text-destructive border border-destructive/30">
                  -50% điểm câu
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Trả lời sai sẽ bị trừ đúng bằng một nửa (50%) số điểm của câu hỏi đó
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPenaltyForWrong(!penaltyForWrong)}
              className={`w-12 h-6 rounded-full transition-colors ${ penaltyForWrong ? "bg-destructive" : "bg-muted" }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white m-0.5 transition-transform ${ penaltyForWrong ? "translate-x-6" : "translate-x-0" }`} />
            </button>
          </div>

          {penaltyForWrong && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive-foreground space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <span>⚠️</span> Quy tắc trừ điểm cố định:
              </p>
              <p className="text-muted-foreground">
                Mức trừ điểm luôn bằng <strong>1/2 (50%)</strong> giá trị câu hỏi (Ví dụ: câu 10 điểm trừ 5 điểm, câu 20 điểm trừ 10 điểm, câu 30 điểm trừ 15 điểm). Điểm số các câu hỏi trong đề được quy định chia hết cho 10.
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 text-destructive text-sm text-center bg-destructive/10 rounded-lg p-3">{error}</div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} className="flex-1 py-3 rounded-xl border border-border hover:border-purple-500 font-bold transition-colors">
            ← Quay lại
          </button>
        )}
        {step < 4 ? (
          <button
            onClick={() => { if (step === 1 && !roomName.trim()) { setError("Nhập tên phòng"); return; } setError(""); setStep(step + 1); }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 font-bold transition-all"
          >
            Tiếp theo →
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 font-bold disabled:opacity-50"
          >
            {loading ? "Đang tạo..." : "🎮 Tạo phòng ngay"}
          </button>
        )}
      </div>

      {/* Rules Modal */}
      <GameModeRulesModal
        mode={mode as GameMode}
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </div>
  );
}
