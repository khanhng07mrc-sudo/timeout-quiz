"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QuizBankQuickSummary from "@/components/admin/QuizBankQuickSummary";
import PowerupIcon from "@/components/ui/PowerupIcon";
import GameModeIcon from "@/components/ui/GameModeIcon";
import SystemIcon from "@/components/ui/SystemIcon";
import GameModeRulesModal from "@/components/ui/GameModeRulesModal";
import { GameMode, CardType } from "@/types";
import { getDefaultAllowedPowerupsForMode } from "@/lib/game-engine/powerups";
import { allocateQuestionsForMatch } from "@/lib/game-engine/question-allocator";

const GAME_MODES = [
  { value: "CLASSIC", label: "Classic", desc: "Tất cả các đội cùng làm bài, chấm theo Bloom & tỷ lệ đúng phòng", emoji: "🎮", badge: "Đại chúng", badgeColor: "text-purple-300 bg-purple-500/20 border-purple-500/30" },
  { value: "BUZZ", label: "Buzz", desc: "Bấm chuông tranh quyền trả lời nhanh nhất", emoji: "⚡", badge: "Tốc độ", badgeColor: "text-amber-300 bg-amber-500/20 border-amber-500/30" },
  { value: "BOUNCEBACK", label: "Bounceback", desc: "1 đội trả lời chính, sai thì mở chuông 5s cho các đội khác cướp lượt", emoji: "🔄", badge: "Cướp điểm", badgeColor: "text-cyan-300 bg-cyan-500/20 border-cyan-500/30" },
  { value: "ELIMINATION", label: "Elimination", desc: "Loại dần đội điểm thấp nhất sau mỗi chặng", emoji: "❌", badge: "Sinh tồn", badgeColor: "text-rose-300 bg-rose-500/20 border-rose-500/30" },
  { value: "TOURNAMENT", label: "Tournament 1v1", desc: "Bảng đấu đối kháng trực tiếp (Tứ kết, Bán kết, Chung kết)", emoji: "🏆", badge: "Đối kháng", badgeColor: "text-yellow-300 bg-yellow-500/20 border-yellow-500/30" },
  { value: "GRID_CARO", label: "Chọn ô & Caro", desc: "Lưới chữ nhật 1-X ô, độ khó bí ẩn & tính năng Tic-Tac-Toe", emoji: "🎯", badge: "Chiến thuật", badgeColor: "text-emerald-300 bg-emerald-500/20 border-emerald-500/30" },
  { value: "DICE_RACE", label: "Đua cờ Xí ngầu", desc: "Đường đua marathon 60-100 ô, gieo 2 xí ngầu 2-12 bước và chinh phục ô sự kiện", emoji: "🎲", badge: "May mắn", badgeColor: "text-indigo-300 bg-indigo-500/20 border-indigo-500/30" },
  { value: "WAGER", label: "Cược điểm Bí mật", desc: "All-in cân não, bí mật cược điểm trước khi hiện câu hỏi", emoji: "💰", badge: "Tâm lý", badgeColor: "text-orange-300 bg-orange-500/20 border-orange-500/30" },
  { value: "MYSTERY_QUEST", label: "Hành Trình Bí Ẩn", desc: "Gameshow luân phiên, Background biến hóa & Ô số phận (Không dùng Thẻ Bổ Trợ)", emoji: "🗝️", badge: "Kịch tính", badgeColor: "text-amber-300 bg-amber-500/20 border-amber-500/30" },
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
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/quiz-bank")
      .then((r) => r.json())
      .then((d) => {
        if (d.banks) {
          setQuizBanks(d.banks);
          if (d.banks.length > 0 && !quizBankId) {
            setQuizBankId(d.banks[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!quizBankId) {
      setBankQuestions([]);
      return;
    }
    fetch(`/api/quiz-bank/${quizBankId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.bank?.questions) {
          setBankQuestions(d.bank.questions);
        }
      })
      .catch(() => setBankQuestions([]));
  }, [quizBankId]);

  // Step 1: Basic settings
  const [roomName, setRoomName] = useState("");
  const [mode, setMode] = useState("CLASSIC");
  const [teamMode, setTeamMode] = useState<"INDIVIDUAL" | "TEAM">("TEAM");
  const [bouncebackQuestionsPerTurn, setBouncebackQuestionsPerTurn] = useState(1);
  const [bouncebackCycles, setBouncebackCycles] = useState(1);
  const [answerMethod, setAnswerMethod] = useState<"DEVICE" | "MC">("DEVICE");
  const [eliminationDeepScoring, setEliminationDeepScoring] = useState(true);
  const [eliminationIntervalQuestions, setEliminationIntervalQuestions] = useState(3);
  const [eliminationTeamsPerStage, setEliminationTeamsPerStage] = useState(1);
  const [eliminationRevivalCount, setEliminationRevivalCount] = useState(1);
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
  const [gridEasyCells, setGridEasyCells] = useState(5);
  const [gridMediumCells, setGridMediumCells] = useState(5);
  const [gridHardCells, setGridHardCells] = useState(6);
  // Modal state
  const [showRulesModal, setShowRulesModal] = useState(false);
  // Dice Race config
  const [diceTrackTotalTiles, setDiceTrackTotalTiles] = useState(60);
  // Wager config
  const [wagerTimeSeconds, setWagerTimeSeconds] = useState(15);
  const [wagerMinAllowance, setWagerMinAllowance] = useState(50);
  const [wagerInitialPoints, setWagerInitialPoints] = useState(50);
  const [wagerBailoutLimit, setWagerBailoutLimit] = useState(1);
  const [wagerMultiplierCap, setWagerMultiplierCap] = useState(2.5);
  // Buzz config
  const [buzzUnlockMode, setBuzzUnlockMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [buzzAutoDelay, setBuzzAutoDelay] = useState(3);
  // Mystery Quest config
  const [mysteryQuestTurnsPerTeam, setMysteryQuestTurnsPerTeam] = useState(2);
  // Match Question Allocation
  const [isCustomQuestionCount, setIsCustomQuestionCount] = useState(false);
  const [matchMaxQuestions, setMatchMaxQuestions] = useState(12);

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

  const handleSelectMode = (newMode: string) => {
    setMode(newMode);
    if (newMode === "MYSTERY_QUEST") {
      setPowerupEnabled(false);
      setAllowedPowerups([]);
    } else {
      setPowerupEnabled(true);
      setAllowedPowerups(getDefaultAllowedPowerupsForMode(newMode as GameMode));
    }
    if (newMode === "CLASSIC" || newMode === "ELIMINATION") {
      setAnswerMethod("DEVICE");
    }
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
    getDefaultAllowedPowerupsForMode("CLASSIC")
  );

  // Step 4: Other settings
  const [timeBonusEnabled, setTimeBonusEnabled] = useState(true);
  const [penaltyForWrong, setPenaltyForWrong] = useState(false);
  const [penaltyPoints, setPenaltyPoints] = useState(5);
  const [answerSubmissionMode, setAnswerSubmissionMode] = useState<"ALLOW_CHANGE" | "SINGLE_SUBMIT">("ALLOW_CHANGE");
  const [autoTimerStart, setAutoTimerStart] = useState(false);
  const [initialTeamScore, setInitialTeamScore] = useState<number>(0);

  const addTeam = () => {
    if (teams.length >= 20) return;
    setTeams([...teams, { name: `Đội ${teams.length + 1}`, color: TEAM_COLORS[teams.length % TEAM_COLORS.length] }]);
  };

  const removeTeam = (i: number) => setTeams(teams.filter((_, idx) => idx !== i));

  const togglePowerup = (type: string) => {
    const currentModeAllowed = getDefaultAllowedPowerupsForMode(mode as GameMode);
    if (!currentModeAllowed.includes(type as CardType)) return;
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
            powerupEnabled: mode === "MYSTERY_QUEST" ? false : powerupEnabled,
            powerupOwnerType,
            powerupCountShared: mode === "MYSTERY_QUEST" ? 0 : powerupCountShared,
            powerupCountPerTeam: mode === "MYSTERY_QUEST" ? 0 : powerupCountPerTeam,
            allowedPowerups: mode === "MYSTERY_QUEST" ? [] : (() => {
              const currentModeAllowed = getDefaultAllowedPowerupsForMode(mode as GameMode);
              const filtered = allowedPowerups.filter((p) => currentModeAllowed.includes(p as CardType));
              return filtered.length > 0 ? filtered : currentModeAllowed;
            })(),
            // Mode Classic là mode DUY NHẤT có bonus thời gian
            timeBonusEnabled: mode === "CLASSIC" ? timeBonusEnabled : false,
            penaltyForWrong,
            penaltyPoints,
            bouncebackQuestionsPerTurn,
            bouncebackCycles,
            answerMethod: finalAnswerMethod,
            eliminationDeepScoring: mode === "ELIMINATION" ? eliminationDeepScoring : false,
            eliminationIntervalQuestions,
            eliminationTeamsPerStage: mode === "ELIMINATION" ? eliminationTeamsPerStage : 1,
            eliminationRevivalCount: mode === "ELIMINATION" ? eliminationRevivalCount : 1,
            // Tournament config
            tournamentQuestionsPerMatch: mode === "TOURNAMENT" ? tournamentQuestionsPerMatch : 3,
            // Grid Caro config
            gridRows: mode === "GRID_CARO" ? gridRows : 4,
            gridCols: mode === "GRID_CARO" ? gridCols : 4,
            gridStreakTargetK: mode === "GRID_CARO" ? gridStreakTargetK : 3,
            gridCaroEnabled: mode === "GRID_CARO" ? (gridRows >= 4 && gridCols >= 4 && gridCaroEnabled) : false,
            gridCaroBonusPoints: mode === "GRID_CARO" ? gridCaroBonusPoints : 30,
            gridPreviewDuration: mode === "GRID_CARO" ? gridPreviewDuration : 5,
            gridEasyCells: mode === "GRID_CARO" ? gridEasyCells : undefined,
            gridMediumCells: mode === "GRID_CARO" ? gridMediumCells : undefined,
            gridHardCells: mode === "GRID_CARO" ? gridHardCells : undefined,
            // Dice Race config
            diceTrackTotalTiles: mode === "DICE_RACE" ? diceTrackTotalTiles : 60,
            // Wager config
            wagerTimeSeconds: mode === "WAGER" ? wagerTimeSeconds : 15,
            wagerMinAllowance: mode === "WAGER" ? wagerMinAllowance : 50,
            wagerInitialPoints: mode === "WAGER" ? wagerInitialPoints : 50,
            wagerBailoutLimit: mode === "WAGER" ? wagerBailoutLimit : 1,
            wagerMultiplierCap: mode === "WAGER" ? wagerMultiplierCap : 2.5,
            // Buzz config
            buzzUnlockMode: mode === "BUZZ" ? buzzUnlockMode : "AUTO",
            buzzAutoDelay: mode === "BUZZ" ? Math.max(3, buzzAutoDelay) : 3,
            // Answer submission & timer control
            answerSubmissionMode,
            autoTimerStart,
            initialTeamScore: Math.max(0, Number(initialTeamScore) || 0),
            // Match Question Allocation
            matchMaxQuestions: isCustomQuestionCount ? Math.max(1, Number(matchMaxQuestions) || 12) : 0,
            mysteryQuestTurnsPerTeam: mode === "MYSTERY_QUEST" ? mysteryQuestTurnsPerTeam : 2,
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

            {/* ─── 1. BỐ CỤC LƯỚI THẺ TRỰC QUAN (GRID 3x3) ─── */}
            {modeLayout === "GRID" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-slide-up">
                {GAME_MODES.map((m) => {
                  const isSelected = mode === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => handleSelectMode(m.value)}
                      className={`relative flex flex-col justify-between p-3.5 rounded-2xl border-2 text-left transition-all duration-200 active:scale-95 group min-h-[140px] cursor-pointer ${
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
                      onClick={() => handleSelectMode(m.value)}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
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

            {/* ─── 3. BỐ CỤC THẺ NHỎ TINH GỌN (COMPACT CHIPS: 5 TRÊN, 4 DƯỚI) ─── */}
            {modeLayout === "COMPACT" && (
              <div className="space-y-3 animate-slide-up">
                <div className="space-y-2">
                  {/* Dòng trên 5 chế độ */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {GAME_MODES.slice(0, 5).map((m) => {
                      const isSelected = mode === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => handleSelectMode(m.value)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all active:scale-95 whitespace-nowrap cursor-pointer ${
                            isSelected
                              ? "bg-purple-600 border-purple-400 text-white shadow-lg glow-purple"
                              : "bg-card/70 border-border hover:border-purple-400 text-foreground hover:bg-card"
                          }`}
                        >
                          <GameModeIcon mode={m.value} className="w-5 h-5 shrink-0" />
                          <span className="truncate">{m.label}</span>
                          {isSelected && <span className="text-xs font-black text-purple-200">✓</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Dòng dưới 4 chế độ */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    {GAME_MODES.slice(5).map((m) => {
                      const isSelected = mode === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => handleSelectMode(m.value)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all active:scale-95 whitespace-nowrap cursor-pointer ${
                            isSelected
                              ? "bg-purple-600 border-purple-400 text-white shadow-lg glow-purple"
                              : "bg-card/70 border-border hover:border-purple-400 text-foreground hover:bg-card"
                          }`}
                        >
                          <GameModeIcon mode={m.value} className="w-5 h-5 shrink-0" />
                          <span className="truncate">{m.label}</span>
                          {isSelected && <span className="text-xs font-black text-purple-200">✓</span>}
                        </button>
                      );
                    })}
                  </div>
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

          {/* Universal Match Question Count & Smart Allocation */}
          <div className="p-4 rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-900/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-black text-lg shrink-0">
                  🎯
                </div>
                <div>
                  <h3 className="font-bold text-sm text-indigo-200 flex items-center gap-2">
                    Cài đặt số lượng câu hỏi cho cuộc chơi
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Tự động phân bổ
                    </span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Hệ thống tự động cân đối độ khó Bloom (Dễ ~30% / Trung bình ~37% / Khó ~33%) và phân bổ số lượt phù hợp cho chế độ {GAME_MODES.find((m) => m.value === mode)?.label}.
                  </p>
                </div>
              </div>

              {/* Mode Toggle: All vs Custom */}
              <div className="flex items-center p-0.5 rounded-xl bg-card/80 border border-border gap-0.5 text-xs shadow-inner shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCustomQuestionCount(false)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    !isCustomQuestionCount
                      ? "bg-indigo-600 text-white shadow"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  <span>📚</span>
                  <span>Toàn bộ đề ({bankQuestions.length || 0} câu)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomQuestionCount(true);
                    if (!matchMaxQuestions || matchMaxQuestions <= 0) {
                      setMatchMaxQuestions(Math.min(12, bankQuestions.length || 12));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isCustomQuestionCount
                      ? "bg-indigo-600 text-white shadow"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  <span>🎯</span>
                  <span>Tùy chỉnh số câu</span>
                </button>
              </div>
            </div>

            {/* Custom Question Selection Controls */}
            {isCustomQuestionCount && (
              <div className="space-y-3 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-slate-300">Chọn nhanh:</span>
                    {[5, 10, 12, 15, 20, 25, 30].map((preset) => {
                      const isDisabled = bankQuestions.length > 0 && preset > bankQuestions.length;
                      const isSelected = matchMaxQuestions === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => setMatchMaxQuestions(preset)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            isSelected
                              ? "bg-indigo-500/30 border-indigo-400 text-indigo-200 shadow-sm"
                              : isDisabled
                              ? "opacity-30 cursor-not-allowed border-white/5 text-slate-500"
                              : "glass border-white/10 text-slate-300 hover:text-white hover:border-white/20"
                          }`}
                        >
                          {preset} câu
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-300 whitespace-nowrap">
                      Nhập số câu:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={bankQuestions.length > 0 ? bankQuestions.length : 100}
                      value={matchMaxQuestions}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        const maxVal = bankQuestions.length > 0 ? bankQuestions.length : 100;
                        setMatchMaxQuestions(Math.min(maxVal, Math.max(1, val)));
                      }}
                      className="w-20 px-2.5 py-1.5 rounded-lg bg-input border border-border text-sm font-bold text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <span className="text-xs text-muted-foreground">câu</span>
                  </div>
                </div>
              </div>
            )}

            {/* Real-time Allocation Breakdown Preview */}
            {(() => {
              const allocationTarget = isCustomQuestionCount ? matchMaxQuestions : 0;
              const samplePool = bankQuestions.length > 0
                ? bankQuestions
                : Array.from({ length: 24 }, (_, i) => ({
                    id: `mock-${i}`,
                    points: i % 3 === 0 ? 10 : i % 3 === 1 ? 20 : 30,
                    bloomLevel: i % 3 === 0 ? "REMEMBER" : i % 3 === 1 ? "APPLY" : "ANALYZE",
                  }));

              const allocResult = allocateQuestionsForMatch({
                questions: samplePool,
                targetCount: allocationTarget,
                mode: mode as GameMode,
                teamsCount: teams.length,
                options: {
                  eliminationStages: 3,
                  bouncebackQuestionsPerTurn,
                  tournamentQuestionsPerMatch,
                },
              });

              const { breakdown, modeDetails, totalQuestions } = allocResult;

              return (
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <span>📊</span> Dự kiến thi đấu: <strong className="text-indigo-300 font-mono text-sm">{totalQuestions} câu hỏi</strong>
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Chuẩn Bloom Gameshow (Dễ ~30% / TB ~37% / Khó ~33%)
                    </span>
                  </div>

                  {/* Visual ratio bar */}
                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex border border-white/10">
                    <div
                      style={{ width: `${breakdown.easyPercent}%` }}
                      className="bg-emerald-500 transition-all duration-300"
                      title={`Dễ: ${breakdown.easyCount} câu (${breakdown.easyPercent}%)`}
                    />
                    <div
                      style={{ width: `${breakdown.mediumPercent}%` }}
                      className="bg-amber-500 transition-all duration-300"
                      title={`Trung bình: ${breakdown.mediumCount} câu (${breakdown.mediumPercent}%)`}
                    />
                    <div
                      style={{ width: `${breakdown.hardPercent}%` }}
                      className="bg-purple-500 transition-all duration-300"
                      title={`Khó: ${breakdown.hardCount} câu (${breakdown.hardPercent}%)`}
                    />
                  </div>

                  {/* 3 Difficulty Stats Pills */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <div className="font-bold text-emerald-300 flex items-center justify-center gap-1">
                        <span>🟢</span> Dễ (10đ)
                      </div>
                      <div className="text-[11px] text-emerald-200 font-mono mt-0.5">
                        {breakdown.easyCount} câu ({breakdown.easyPercent}%)
                      </div>
                      <div className="text-[9px] text-emerald-400/80">Khởi động</div>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <div className="font-bold text-amber-300 flex items-center justify-center gap-1">
                        <span>🟡</span> TB (20đ)
                      </div>
                      <div className="text-[11px] text-amber-200 font-mono mt-0.5">
                        {breakdown.mediumCount} câu ({breakdown.mediumPercent}%)
                      </div>
                      <div className="text-[9px] text-amber-400/80">Tăng tốc</div>
                    </div>
                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30">
                      <div className="font-bold text-purple-300 flex items-center justify-center gap-1">
                        <span>🟣</span> Khó (30đ)
                      </div>
                      <div className="text-[11px] text-purple-200 font-mono mt-0.5">
                        {breakdown.hardCount} câu ({breakdown.hardPercent}%)
                      </div>
                      <div className="text-[9px] text-purple-400/80">Về đích</div>
                    </div>
                  </div>

                  {/* Mode Rule Allocation Notice */}
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2">
                    <span className="text-sm shrink-0">💡</span>
                    <p className="text-[11px] leading-relaxed">
                      {modeDetails.descriptionVi}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {mode === "MYSTERY_QUEST" && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-4">
              <div className="flex items-center gap-2">
                <GameModeIcon mode="MYSTERY_QUEST" className="w-6 h-6 shrink-0" />
                <h3 className="font-bold text-sm text-amber-300">Cấu hình Hành Trình Bí Ẩn (Mystery Quest)</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">
                    Số lượt thi đấu mỗi đội (Vòng chơi):
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={mysteryQuestTurnsPerTeam}
                      onChange={(e) => {
                        const turns = Math.max(1, parseInt(e.target.value) || 1);
                        setMysteryQuestTurnsPerTeam(turns);
                        if (isCustomQuestionCount) {
                          setMatchMaxQuestions(turns * teams.length);
                        }
                      }}
                      className="w-24 px-3 py-2 rounded-lg bg-input border border-border text-sm font-bold text-white text-center"
                    />
                    <span className="text-xs text-muted-foreground">
                      lượt/đội (Tổng: {teams.length * mysteryQuestTurnsPerTeam} câu)
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Các đội lần lượt lên sân khấu chính, mỗi lượt là một bối cảnh (Lâu đài, Đảo hải tặc, Rừng ma thuật, Cyber) và trò chơi mới.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#151728]/80 border border-amber-500/20 flex flex-col justify-center">
                  <div className="font-bold text-xs text-amber-300 flex items-center gap-1.5 mb-1">
                    <span>🗝️</span> Ô số phận
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Sau khi giải đúng câu hỏi thử thách, đội được lật mở ô bí mật với tác động điểm cực lớn (+50đ, +100đ, Nhân đôi x2, Chia đôi /2, Trộm điểm hoặc né Bom). Nếu đội chính sai, chuông cướp 5s sẽ mở ra cho các đội khác!
                  </p>
                </div>
              </div>
            </div>
          )}

          {mode === "BUZZ" && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-4">
              <div className="flex items-center gap-2">
                <GameModeIcon mode="BUZZ" className="w-6 h-6 shrink-0" />
                <h3 className="font-bold text-sm text-amber-300">Cấu hình chuông bấm (Buzz)</h3>
              </div>
              <div className="space-y-3">
                <label className="block text-xs font-medium text-slate-300">
                  Cơ chế mở khóa chuông cho các đội:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBuzzUnlockMode("AUTO")}
                    className={`p-3 rounded-xl border text-left transition ${
                      buzzUnlockMode === "AUTO"
                        ? "border-amber-500 bg-amber-500/20 text-white shadow"
                        : "border-border glass text-muted-foreground hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm text-amber-300 mb-1">
                      <span>⏱️</span> Tự động (Auto Delay)
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Chuông tự động mở sau thời gian delay đếm ngược (tối thiểu 3s) để thí sinh kịp đọc câu hỏi.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuzzUnlockMode("MANUAL")}
                    className={`p-3 rounded-xl border text-left transition ${
                      buzzUnlockMode === "MANUAL"
                        ? "border-amber-500 bg-amber-500/20 text-white shadow"
                        : "border-border glass text-muted-foreground hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm text-amber-300 mb-1">
                      <span>👨‍💼</span> Thủ công (Manual MC)
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Chuông bị khóa mặc định. Quản trò / MC chủ động bấm nút "Mở chuông" trên màn hình khi sẵn sàng.
                    </p>
                  </button>
                </div>

                {buzzUnlockMode === "AUTO" && (
                  <div className="pt-2">
                    <label className="block text-xs font-medium mb-1 text-slate-300">
                      Thời gian delay mở chuông (giây, tối thiểu 3s):
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={3}
                        max={30}
                        value={buzzAutoDelay}
                        onChange={(e) => setBuzzAutoDelay(Math.max(3, parseInt(e.target.value) || 3))}
                        className="w-32 px-3 py-2 rounded-lg bg-input border border-border text-sm font-bold text-white"
                      />
                      <span className="text-xs text-muted-foreground">giây đếm ngược sau khi hiện câu hỏi</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
                    Cứ sau {eliminationIntervalQuestions} câu, các đội có điểm số thấp nhất sẽ bị loại khỏi cuộc chơi.
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

                <div>
                  <label className="block text-xs font-medium mb-1">Số đội bị loại mỗi chặng</label>
                  <select
                    value={eliminationTeamsPerStage}
                    onChange={(e) => setEliminationTeamsPerStage(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm"
                  >
                    <option value={1}>1 đội (Mặc định)</option>
                    <option value={2}>2 đội (Khốc liệt)</option>
                    <option value={3}>3 đội (Tử chiến)</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Số đội điểm thấp nhất bị loại mỗi chặng (luôn tự động kẹp giữ tối thiểu 1 đội sống sót).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Số đội hồi sinh ở chặng áp chót</label>
                  <select
                    value={eliminationRevivalCount}
                    onChange={(e) => setEliminationRevivalCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm"
                  >
                    <option value={1}>1 đội (Mặc định)</option>
                    <option value={2}>2 đội</option>
                    <option value={3}>3 đội</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Trận ≥ 4 chặng: Ưu tiên đội đạt 100% câu đúng (hoặc lấy cao nhất nếu không ai đạt 100%) theo 3 ưu tiên: 1. % đúng bóng ma → 2. Bị loại sớm hơn → 3. Thời gian trả lời ít hơn.
                  </p>
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
            const totalCells = gridRows * gridCols;

            // Bank questions count per difficulty
            const easyInBank = bankQuestions.filter((q) => (q.points || 10) <= 10).length;
            const medInBank = bankQuestions.filter((q) => (q.points || 10) > 10 && (q.points || 10) <= 20).length;
            const hardInBank = bankQuestions.filter((q) => (q.points || 10) > 20).length;

            // Requirements (including 25% buffer for retries on wrong answers)
            const reqEasy = Math.ceil(gridEasyCells * 1.25);
            const reqMed = Math.ceil(gridMediumCells * 1.25);
            const reqHard = Math.ceil(gridHardCells * 1.25);

            const easyValid = easyInBank >= reqEasy;
            const medValid = medInBank >= reqMed;
            const hardValid = hardInBank >= reqHard;
            const totalAllocated = gridEasyCells + gridMediumCells + gridHardCells;
            const totalMatch = totalAllocated === totalCells;
            const isPoolSatisfied = !quizBankId || (easyValid && medValid && hardValid && totalMatch);

            const autoBalance = (r: number, c: number) => {
              const total = r * c;
              const easy = Math.floor(total / 3);
              const med = Math.floor(total / 3);
              const hard = total - easy - med;
              setGridEasyCells(easy);
              setGridMediumCells(med);
              setGridHardCells(hard);
            };

            return (
              <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <GameModeIcon mode="GRID_CARO" className="w-6 h-6 shrink-0" />
                    <div>
                      <h3 className="font-bold text-sm text-purple-300">Cấu hình Bàn cờ & Kiểm tra Kho đề (GRID_CARO)</h3>
                      <p className="text-[11px] text-muted-foreground">
                        Bắt buộc kiểm tra kích thước hàng, cột, độ khó từng ô và số lượng câu hỏi có sẵn (+25% dự phòng).
                      </p>
                    </div>
                  </div>

                  {/* Optional Caro Streak Toggle */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-foreground">
                      Thưởng Caro:
                    </span>
                    <button
                      type="button"
                      disabled={!canEnableCaro || !isPoolSatisfied}
                      onClick={() => setGridCaroEnabled(!gridCaroEnabled)}
                      className={`w-10 h-5 rounded-full transition-colors ${
                        canEnableCaro && gridCaroEnabled && isPoolSatisfied ? "bg-purple-500" : "bg-muted opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white m-0.5 transition-transform ${
                          canEnableCaro && gridCaroEnabled && isPoolSatisfied ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className={`text-[11px] font-bold ${canEnableCaro && gridCaroEnabled && isPoolSatisfied ? "text-green-400" : "text-muted-foreground"}`}>
                      {canEnableCaro && gridCaroEnabled && isPoolSatisfied ? "BẬT" : "TẮT"}
                    </span>
                  </div>
                </div>

                {/* Grid Dimensions */}
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
                        autoBalance(r, gridCols);
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
                        autoBalance(gridRows, c);
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
                      disabled={!canEnableCaro || !gridCaroEnabled}
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

                {/* Difficulty Allocation Inputs */}
                <div className="bg-[#121424]/90 rounded-xl p-3 border border-white/10 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      🎯 Phân bổ số lượng ô theo từng độ khó ({totalAllocated}/{totalCells} ô):
                    </span>
                    <button
                      type="button"
                      onClick={() => autoBalance(gridRows, gridCols)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/40 transition"
                    >
                      ⚡ Tự động cân bằng đều
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Easy */}
                    <div className="p-2.5 rounded-lg border border-green-500/30 bg-green-500/10 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-green-300">🟢 Dễ (10đ)</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${easyValid ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                          {easyValid ? "✅ ĐỦ" : `❌ Thiếu ${reqEasy - easyInBank}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={totalCells}
                          value={gridEasyCells}
                          onChange={(e) => setGridEasyCells(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-20 px-2 py-1 rounded bg-black/40 border border-green-500/40 text-xs font-bold text-white"
                        />
                        <span className="text-[11px] text-muted-foreground">ô trên bàn cờ</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Kho có: <strong>{easyInBank}</strong> | Cần tối thiểu: <strong>{reqEasy}</strong> câu (+25% dự phòng)
                      </p>
                    </div>

                    {/* Medium */}
                    <div className="p-2.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-yellow-300">🟡 Trung bình (20đ)</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${medValid ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                          {medValid ? "✅ ĐỦ" : `❌ Thiếu ${reqMed - medInBank}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={totalCells}
                          value={gridMediumCells}
                          onChange={(e) => setGridMediumCells(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-20 px-2 py-1 rounded bg-black/40 border border-yellow-500/40 text-xs font-bold text-white"
                        />
                        <span className="text-[11px] text-muted-foreground">ô trên bàn cờ</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Kho có: <strong>{medInBank}</strong> | Cần tối thiểu: <strong>{reqMed}</strong> câu (+25% dự phòng)
                      </p>
                    </div>

                    {/* Hard */}
                    <div className="p-2.5 rounded-lg border border-purple-500/30 bg-purple-500/10 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300">🟣 Khó (30đ)</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${hardValid ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                          {hardValid ? "✅ ĐỦ" : `❌ Thiếu ${reqHard - hardInBank}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={totalCells}
                          value={gridHardCells}
                          onChange={(e) => setGridHardCells(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-20 px-2 py-1 rounded bg-black/40 border border-purple-500/40 text-xs font-bold text-white"
                        />
                        <span className="text-[11px] text-muted-foreground">ô trên bàn cờ</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Kho có: <strong>{hardInBank}</strong> | Cần tối thiểu: <strong>{reqHard}</strong> câu (+25% dự phòng)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comprehensive Validation Status Banner */}
                <div className="space-y-2 text-[11px]">
                  {!totalMatch ? (
                    <div className="p-3 rounded-xl bg-red-500/20 border-2 border-red-500 text-red-200 font-medium">
                      ❌ <strong>Lỗi phân bổ:</strong> Tổng số ô các độ khó ({totalAllocated} ô) không khớp kích thước bàn cờ ({gridRows}×{gridCols} = {totalCells} ô). Hãy điều chỉnh lại hoặc bấm "Tự động cân bằng đều".
                    </div>
                  ) : !easyValid || !medValid || !hardValid ? (
                    <div className="p-3 rounded-xl bg-red-500/20 border-2 border-red-500 text-red-200 space-y-1 font-medium">
                      <p className="font-bold text-red-100">
                        ❌ Kho câu hỏi KHÔNG ĐÁP ỨNG ĐỦ cho bàn cờ {gridRows}×{gridCols} ({totalCells} ô + 25% dự phòng):
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-200/90 pl-1">
                        {!easyValid && <li>Câu Dễ: Có {easyInBank} / Cần tối thiểu {reqEasy} câu (Thiếu {reqEasy - easyInBank} câu)</li>}
                        {!medValid && <li>Câu Trung bình: Có {medInBank} / Cần tối thiểu {reqMed} câu (Thiếu {reqMed - medInBank} câu)</li>}
                        {!hardValid && <li>Câu Khó: Có {hardInBank} / Cần tối thiểu {reqHard} câu (Thiếu {reqHard - hardInBank} câu)</li>}
                      </ul>
                      <p className="text-amber-300 font-bold text-[10px] pt-1">
                        👉 Phòng thi không thể tạo khi kho đề bị thiếu! Vui lòng chọn bộ đề khác hoặc giảm số hàng/cột và số ô tương ứng.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 font-medium">
                      ✅ <strong>Kho câu hỏi đáp ứng HOÀN TOÀN:</strong> Đủ {totalCells} ô cờ và sẵn sàng {reqEasy + reqMed + reqHard - totalCells} câu dự phòng (25%) cho các ô bị trả lời sai. Sẵn sàng tạo phòng!
                    </div>
                  )}

                  {!canEnableCaro && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[10px]">
                      ℹ️ Bảng {gridRows}×{gridCols} nhỏ hơn 4×4 nên tính năng thưởng Caro tự động tắt (hoạt động như chọn ô tính điểm).
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {mode === "DICE_RACE" && (
            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 space-y-4">
              <div className="flex items-center gap-2">
                <GameModeIcon mode="DICE_RACE" className="w-6 h-6 shrink-0" />
                <h3 className="font-bold text-sm text-indigo-300">Cấu hình Đua cờ Xí ngầu (Board Game Marathon Track)</h3>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Độ dài đường đua marathon (60 - 100 ô)</label>
                <div className="flex items-center gap-2 mb-2">
                  {[60, 70, 80, 90, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDiceTrackTotalTiles(preset)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                        diceTrackTotalTiles === preset
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {preset} ô
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={60}
                  max={100}
                  step={10}
                  value={diceTrackTotalTiles}
                  onChange={(e) => setDiceTrackTotalTiles(Math.min(100, Math.max(60, parseInt(e.target.value) || 60)))}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Đường đua marathon quy mô lớn (mặc định 60 ô). Mỗi lượt trả lời ĐÚNG, đội được gieo 2 viên xí ngầu (tổng 2–12 bước với phân phối Gauss). Mật độ ô chức năng được kiểm soát ở mức 15-20% với ô 🔀 Vượt mặt đội đứng liền trước, 🛡️ Khiên bảo hộ, 🚀 Tăng tốc (+2 bước), 💥 Bẫy hụt (-2 bước), 🎲 Thêm lượt, và 🏆 Về đích!
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
                <div>
                  <label className="block text-xs font-medium mb-1">Trần cược tối đa (Hệ số x1.0 - x3.0 điểm câu hỏi)</label>
                  <select
                    value={wagerMultiplierCap}
                    onChange={(e) => setWagerMultiplierCap(Math.max(1.0, Math.min(3.0, parseFloat(e.target.value) || 2.5)))}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm"
                  >
                    <option value={1}>x1.0 (Bằng điểm câu: Câu 10đ trần 10đ, Câu 20đ trần 20đ, Câu 30đ trần 30đ)</option>
                    <option value={1.5}>x1.5 (Câu 10đ trần 15đ, Câu 20đ trần 30đ, Câu 30đ trần 45đ)</option>
                    <option value={2}>x2.0 (Câu 10đ trần 20đ, Câu 20đ trần 40đ, Câu 30đ trần 60đ)</option>
                    <option value={2.5}>x2.5 (Mặc định - Câu 10đ trần 25đ, Câu 20đ trần 50đ, Câu 30đ trần 75đ)</option>
                    <option value={3}>x3.0 (Tối đa - Câu 10đ trần 30đ, Câu 20đ trần 60đ, Câu 30đ trần 90đ)</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Mức cược tối đa mà các đội có thể đặt cho câu hỏi (cho phép từ x1.0 đến x3.0).
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
          {mode === "MYSTERY_QUEST" ? (
            <div className="p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-purple-950/20 to-slate-900/60 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl shadow-lg">
                🗝️
              </div>
              <div className="max-w-xl mx-auto space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                  <span>✨</span> Mode duy nhất không sử dụng Thẻ Hỗ Trợ
                </div>
                <h3 className="text-xl font-black text-white">Hành Trình Bí Ẩn: Không hỗ trợ Power-up</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Vì tính chất đặc thù gameshow sân khấu luân phiên từng đội, bối cảnh biến hóa liên tục và cơ chế kịch tính từ các <strong>Ô số phận</strong> (Thưởng/Phạt điểm cực lớn, Trộm điểm, Nhân đôi x2, Bom nổ), <strong>Hành Trình Bí Ẩn</strong> được thiết kế thuần túy không dùng Thẻ Bổ Trợ để đảm bảo nhịp độ và tính bất ngờ tự nhiên.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 max-w-lg mx-auto text-left flex items-start gap-3">
                <span className="text-xl shrink-0">ℹ️</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tất cả các thẻ bài (Khiên, Băng, Cướp, 50/50, ...) đều được tự động vô hiệu hóa cho chế độ này. Bạn có thể nhấn <strong>&ldquo;Tiếp theo&rdquo;</strong> để sang bước cài đặt điểm số và hoàn tất tạo phòng.
                </p>
              </div>
            </div>
          ) : (
            <>
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
                {(() => {
                  const currentModeAllowed = getDefaultAllowedPowerupsForMode(mode as GameMode);
                  const activeValidCount = allowedPowerups.filter((p) => currentModeAllowed.includes(p as CardType)).length;

                  return (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-bold text-foreground">Loại thẻ được phép</label>
                          <span className="text-xs font-mono text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30 font-bold">
                            {activeValidCount}/{currentModeAllowed.length} khả dụng trong mode {mode}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Quick Select Buttons */}
                          <button
                            type="button"
                            onClick={() => setAllowedPowerups([...currentModeAllowed])}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg glass border border-purple-500/40 hover:bg-purple-500/20 text-purple-300 hover:text-white transition"
                          >
                            Chọn tất cả ({currentModeAllowed.length} thẻ)
                          </button>
                          <button
                            type="button"
                            onClick={() => setAllowedPowerups([])}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg glass border border-border hover:bg-white/10 text-muted-foreground hover:text-white transition"
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
                            const isSupported = currentModeAllowed.includes(pt.value as CardType);
                            const isAllowed = isSupported && allowedPowerups.includes(pt.value);
                            return (
                              <button
                                key={pt.value}
                                type="button"
                                disabled={!isSupported}
                                onClick={() => togglePowerup(pt.value)}
                                className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                  !isSupported
                                    ? "border-red-500/20 bg-red-950/10 opacity-30 cursor-not-allowed text-slate-500"
                                    : isAllowed
                                    ? "border-purple-500 bg-purple-500/15 shadow-sm text-foreground hover:border-purple-400"
                                    : "border-border opacity-40 hover:opacity-75 glass bg-card/30 hover:border-slate-500"
                                }`}
                              >
                                <PowerupIcon type={pt.value} className={`w-8 h-8 shrink-0 mt-0.5 drop-shadow ${!isSupported ? "grayscale opacity-50" : ""}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold">{pt.label}</span>
                                    {!isSupported ? (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                                        Không hỗ trợ
                                      </span>
                                    ) : isAllowed ? (
                                      <span className="text-xs text-purple-400 font-bold">✓ Bật</span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Tắt</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">{pt.desc}</div>
                                  {!isSupported && (
                                    <p className="text-[10px] text-red-300/80 mt-1 italic">
                                      🚫 Không phù hợp với cơ chế của chế độ {mode}
                                    </p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 animate-slide-up">
                          {POWERUP_TYPES.map((pt) => {
                            const isSupported = currentModeAllowed.includes(pt.value as CardType);
                            const isAllowed = isSupported && allowedPowerups.includes(pt.value);
                            return (
                              <button
                                key={pt.value}
                                type="button"
                                disabled={!isSupported}
                                onClick={() => togglePowerup(pt.value)}
                                title={!isSupported ? `Không hỗ trợ trong chế độ ${mode}` : pt.desc}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-bold ${
                                  !isSupported
                                    ? "border-red-500/20 bg-red-950/20 opacity-35 cursor-not-allowed text-slate-500 line-through"
                                    : isAllowed
                                    ? "border-purple-500 bg-purple-600 text-white shadow-md glow-purple active:scale-95"
                                    : "border-border/60 bg-card/40 opacity-40 hover:opacity-80 text-muted-foreground active:scale-95"
                                }`}
                              >
                                <PowerupIcon type={pt.value} className={`w-5 h-5 shrink-0 ${!isSupported ? "grayscale" : ""}`} />
                                <span>{pt.label}</span>
                                {!isSupported ? (
                                  <span className="text-[10px] text-red-400">✕</span>
                                ) : isAllowed ? (
                                  <span className="text-xs font-black text-purple-200">✓</span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </>
          )}
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

          {/* Cấu hình Nộp bài: Thay đổi tự do vs Bấm 1 lần duy nhất */}
          <div className="glass rounded-xl p-5 space-y-4 border border-border">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-base">Cơ chế nộp câu trả lời</p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Toàn phòng
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Quy định người chơi được đổi phương án hay chỉ được bấm chọn duy nhất một lần
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAnswerSubmissionMode("ALLOW_CHANGE")}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  answerSubmissionMode === "ALLOW_CHANGE"
                    ? "border-cyan-400 bg-cyan-500/20 shadow-md ring-1 ring-cyan-400/50"
                    : "border-border glass hover:border-slate-500 opacity-60 hover:opacity-90"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-cyan-200">🔄 Cho phép đổi phương án</span>
                  {answerSubmissionMode === "ALLOW_CHANGE" && (
                    <span className="text-xs text-cyan-400 font-black">✓ Mặc định</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Thí sinh đổi đáp án thoải mái suốt thời gian; có nút <strong>[🔒 Chốt đáp án]</strong> để kết thúc sớm. Câu hỏi dừng khi hết giờ hoặc khi tất cả người chơi đã chốt bài.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAnswerSubmissionMode("SINGLE_SUBMIT")}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  answerSubmissionMode === "SINGLE_SUBMIT"
                    ? "border-purple-400 bg-purple-500/20 shadow-md ring-1 ring-purple-400/50"
                    : "border-border glass hover:border-slate-500 opacity-60 hover:opacity-90"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-purple-200">🔒 Bấm 1 lần duy nhất</span>
                  {answerSubmissionMode === "SINGLE_SUBMIT" && (
                    <span className="text-xs text-purple-400 font-black">✓ Đang chọn</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bấm chọn đáp án là khóa bài ngay lập tức. Câu hỏi <strong>tự động kết thúc sớm</strong> nếu tất cả người chơi hoàn thành sớm mà không cần chờ hết giờ.
                </p>
              </button>
            </div>

            {mode === "BOUNCEBACK" && (
              <p className="text-[11px] text-amber-300/90 italic bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                💡 <strong>Lưu ý Bounceback:</strong> Đội trả lời chính tuân theo thiết lập này (hoặc đổi tự do), nhưng đội bấm chuông cướp điểm luôn chỉ được tính 1 lần trả lời duy nhất theo luật thi đấu cố định.
              </p>
            )}
          </div>

          {/* Cấu hình khởi động đồng hồ đếm ngược: Thủ công vs Tự động */}
          <div className="flex items-center justify-between glass rounded-xl p-4 border border-border">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold">Đồng hồ đếm ngược thủ công (MC điều khiển)</p>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Khuyên dùng
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {!autoTimerStart
                  ? "Bật: Mở câu hỏi nhưng tạm dừng tính giờ để MC đọc đề; MC bấm 'Bắt đầu tính giờ' thì đồng hồ và nhạc mới chạy"
                  : "Tắt: Tự động đếm ngược và phát nhạc ngay khi câu hỏi xuất hiện"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoTimerStart(!autoTimerStart)}
              className={`w-12 h-6 rounded-full transition-colors ${ !autoTimerStart ? "bg-amber-500" : "bg-muted" }`}
              title={!autoTimerStart ? "Đang bật thủ công" : "Đang bật tự động"}
            >
              <div className={`w-5 h-5 rounded-full bg-white m-0.5 transition-transform ${ !autoTimerStart ? "translate-x-6" : "translate-x-0" }`} />
            </button>
          </div>

          {/* Cài đặt điểm xuất phát ban đầu cho các đội */}
          <div className="glass rounded-xl p-4 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-bold">Điểm xuất phát ban đầu của các đội</p>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  &gt;= 0 điểm
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Số điểm khởi đầu mỗi đội nhận được khi trận đấu bắt đầu (Mặc định 0; Điểm số xuyên suốt cuộc chơi luôn &gt;= 0).
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="number"
                min={0}
                step={5}
                value={initialTeamScore}
                onChange={(e) => setInitialTeamScore(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 px-3 py-2 rounded-xl bg-input border border-border text-center font-mono font-bold text-lg focus:outline-none focus:ring-2 focus:ring-ring text-white"
              />
              <span className="text-sm font-semibold text-muted-foreground">pts</span>
            </div>
          </div>
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
