"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QuizBankQuickSummary from "@/components/admin/QuizBankQuickSummary";

const GAME_MODES = [
  { value: "CLASSIC", label: "Classic", desc: "Tất cả các đội cùng trả lời, chấm điểm theo Bloom & tỷ lệ đúng phòng", emoji: "🎮" },
  { value: "BUZZ", label: "Buzz", desc: "Bấm chuông tranh quyền trả lời sớm nhất", emoji: "⚡" },
  { value: "BOUNCEBACK", label: "Bounceback", desc: "1 đội trả lời chính, sai thì mở chuông 5s cho các đội khác cướp lượt", emoji: "🔄" },
  { value: "ELIMINATION", label: "Elimination", desc: "Loại dần đội điểm thấp nhất", emoji: "❌" },
  { value: "TOURNAMENT", label: "Tournament", desc: "Bảng đấu 1v1", emoji: "🏆" },
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

      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/admin/rooms/${data.room.code}`);
    } catch (err: any) {
      setError(err.message ?? "Lỗi khi tạo phòng");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
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
            <label className="block text-sm font-medium mb-3">Chế độ chơi</label>
            <div className="grid grid-cols-1 gap-3">
              {GAME_MODES.map((m) => (
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
                    mode === m.value ? "border-purple-500 bg-purple-500/10" : "border-border hover:border-purple-400"
                  }`}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <div>
                    <p className="font-bold">{m.label}</p>
                    <p className="text-sm text-muted-foreground">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {mode === "BOUNCEBACK" && (
            <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 space-y-4">
              <h3 className="font-bold text-sm text-purple-300">⚙️ Cấu hình lượt chơi Bounceback</h3>
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
                <span className="text-xl">❌</span>
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
                  <span className="text-2xl">📱</span>
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
                  <span className="text-2xl">🎙️</span>
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
                  <div className="text-2xl mb-1">{tm === "INDIVIDUAL" ? "👤" : "👥"}</div>
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
                <label className="block text-sm font-medium mb-3">Loại thẻ được phép</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {POWERUP_TYPES.map((pt) => (
                    <button
                      key={pt.value}
                      onClick={() => togglePowerup(pt.value)}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                        allowedPowerups.includes(pt.value) ? "border-purple-500 bg-purple-500/10" : "border-border opacity-50"
                      }`}
                    >
                      <span className="text-xl mt-0.5">{pt.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold">{pt.label}</div>
                        <div className="text-xs text-muted-foreground">{pt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
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
    </div>
  );
}
