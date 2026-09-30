"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const GAME_MODES = [
  { value: "CLASSIC", label: "Classic", desc: "Tất cả các đội cùng trả lời, chấm điểm theo Bloom & tỷ lệ đúng phòng", emoji: "🎮" },
  { value: "BUZZ", label: "Buzz", desc: "Bấm chuông tranh quyền trả lời sớm nhất", emoji: "⚡" },
  { value: "BOUNCEBACK", label: "Bounceback", desc: "1 đội trả lời chính, sai thì mở chuông 5s cho các đội khác cướp lượt", emoji: "🔄" },
  { value: "ELIMINATION", label: "Elimination", desc: "Loại dần đội điểm thấp nhất", emoji: "❌" },
  { value: "TOURNAMENT", label: "Tournament", desc: "Bảng đấu 1v1", emoji: "🏆" },
];

const POWERUP_TYPES = [
  { value: "FIFTY_FIFTY", emoji: "🔀", label: "50/50" },
  { value: "DOUBLE", emoji: "✖️2", label: "Nhân đôi" },
  { value: "FREEZE", emoji: "❄️", label: "Phong tỏa" },
  { value: "ATTACK", emoji: "⚔️", label: "Tấn công" },
  { value: "SKIP", emoji: "🔄", label: "Đổi câu" },
  { value: "TIME_PLUS", emoji: "⏱️", label: "Thêm giờ" },
  { value: "SHIELD", emoji: "🛡️", label: "Tái sinh" },
  { value: "STEAL", emoji: "💸", label: "Cướp điểm" },
  { value: "PENALTY", emoji: "💥", label: "Phạt đôi" },
  { value: "SCORE_X2", emoji: "⭐", label: "x2 điểm" },
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

  // Step 2: Teams (if teamMode === TEAM)
  const [teams, setTeams] = useState([
    { name: "Đội 1", color: TEAM_COLORS[0] },
    { name: "Đội 2", color: TEAM_COLORS[1] },
  ]);

  // Step 3: Power-up config
  const [powerupEnabled, setPowerupEnabled] = useState(false);
  const [powerupOwnerType, setPowerupOwnerType] = useState<"SHARED" | "TEAM">("SHARED");
  const [powerupCountShared, setPowerupCountShared] = useState(10);
  const [powerupCountPerTeam, setPowerupCountPerTeam] = useState(3);
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
            allowedPowerups,
            timeBonusEnabled,
            penaltyForWrong,
            penaltyPoints,
            bouncebackQuestionsPerTurn,
            bouncebackCycles,
            answerMethod,
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
              className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            >
              <option value="">— Chưa chọn bộ đề —</option>
              {quizBanks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.title}{bank._count ? ` (${bank._count.questions} câu)` : ""}
                </option>
              ))}
            </select>
            {quizBanks.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Chưa có bộ đề nào.{" "}
                <a href="/admin/quiz-bank/new" className="text-purple-400 underline">Tạo bộ đề mới</a>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Chế độ chơi</label>
            <div className="grid grid-cols-1 gap-3">
              {GAME_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
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

          <div>
            <label className="block text-sm font-medium mb-3">Phương thức trả lời (Tất cả các mode, đặc biệt Buzz & Bounceback)</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAnswerMethod("DEVICE")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  answerMethod === "DEVICE" ? "border-purple-500 bg-purple-500/10" : "border-border hover:border-purple-400"
                }`}
              >
                <div className="text-2xl mb-1">📱</div>
                <p className="font-bold text-sm">Trên thiết bị thí sinh</p>
                <p className="text-xs text-muted-foreground mt-1">Thí sinh bấm chọn đáp án trực tiếp trên điện thoại/máy tính</p>
              </button>
              <button
                type="button"
                onClick={() => setAnswerMethod("MC")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  answerMethod === "MC" ? "border-cyan-500 bg-cyan-500/10" : "border-border hover:border-cyan-400"
                }`}
              >
                <div className="text-2xl mb-1">🎙️</div>
                <p className="font-bold text-sm">Trả lời qua MC / Admin</p>
                <p className="text-xs text-muted-foreground mt-1">Thí sinh trả lời miệng, quản trò (Admin) click chọn đáp án trên máy</p>
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
                <div className="grid grid-cols-2 gap-2">
                  {POWERUP_TYPES.map((pt) => (
                    <button
                      key={pt.value}
                      onClick={() => togglePowerup(pt.value)}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                        allowedPowerups.includes(pt.value) ? "border-purple-500 bg-purple-500/10" : "border-border opacity-50"
                      }`}
                    >
                      <span>{pt.emoji}</span>
                      <span className="text-sm font-medium">{pt.label}</span>
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
          <div className="flex items-center justify-between glass rounded-xl p-4">
            <div>
              <p className="font-bold">Bonus theo thời gian</p>
              <p className="text-sm text-muted-foreground">Trả lời nhanh được nhiều điểm hơn</p>
            </div>
            <button
              onClick={() => setTimeBonusEnabled(!timeBonusEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${ timeBonusEnabled ? "bg-purple-500" : "bg-muted" }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white m-0.5 transition-transform ${ timeBonusEnabled ? "translate-x-6" : "translate-x-0" }`} />
            </button>
          </div>

          <div className="flex items-center justify-between glass rounded-xl p-4">
            <div>
              <p className="font-bold">Trừ điểm khi sai</p>
              <p className="text-sm text-muted-foreground">Đội trả lời sai sẽ bị trừ điểm</p>
            </div>
            <button
              onClick={() => setPenaltyForWrong(!penaltyForWrong)}
              className={`w-12 h-6 rounded-full transition-colors ${ penaltyForWrong ? "bg-destructive" : "bg-muted" }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white m-0.5 transition-transform ${ penaltyForWrong ? "translate-x-6" : "translate-x-0" }`} />
            </button>
          </div>

          {penaltyForWrong && (
            <div>
              <label className="block text-sm font-medium mb-2">Điểm trừ: {penaltyPoints}</label>
              <input type="range" min={1} max={20} value={penaltyPoints} onChange={(e) => setPenaltyPoints(+e.target.value)} className="w-full" />
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
