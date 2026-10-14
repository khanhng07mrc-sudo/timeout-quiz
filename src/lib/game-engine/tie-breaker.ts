import { Server as SocketIOServer } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  TieBreakerState,
  TieBreakerTeam,
  TieBreakerEnvelope,
} from "@/types";
import { prisma } from "@/lib/prisma";

type IO = SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

// In-memory active tie-breaker states: roomId -> TieBreakerState
export const roomTieBreakers = new Map<string, TieBreakerState>();
const tieBreakerTimers = new Map<string, NodeJS.Timeout>();

export function clearTieBreakerTimer(roomId: string) {
  const timer = tieBreakerTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    tieBreakerTimers.delete(roomId);
  }
}

export function cleanupTieBreaker(roomId: string) {
  clearTieBreakerTimer(roomId);
  roomTieBreakers.delete(roomId);
}

/**
 * 3 câu hỏi phụ dự phòng khẩn cấp nếu ngân hàng câu hỏi không có sẵn
 */
export const EMERGENCY_TIE_BREAKER_QUESTIONS = [
  {
    id: "EMERGENCY_TB_1",
    content: "Thủ đô của quốc gia nào được mệnh danh là 'Thành phố Ánh Sáng'?",
    options: [
      { id: "A", text: "Paris (Pháp)", isCorrect: true },
      { id: "B", text: "Rome (Ý)", isCorrect: false },
      { id: "C", text: "Tokyo (Nhật Bản)", isCorrect: false },
      { id: "D", text: "London (Anh)", isCorrect: false },
    ],
    hint: "Thành phố nổi tiếng với tháp Eiffel và dòng sông Seine thơ mộng.",
  },
  {
    id: "EMERGENCY_TB_2",
    content: "Đại dương nào có diện tích lớn nhất trên Trái Đất?",
    options: [
      { id: "A", text: "Đại Tây Dương", isCorrect: false },
      { id: "B", text: "Thái Bình Dương", isCorrect: true },
      { id: "C", text: "Ấn Độ Dương", isCorrect: false },
      { id: "D", text: "Bắc Băng Dương", isCorrect: false },
    ],
    hint: "Chiếm khoảng một phần ba bề mặt Trái Đất.",
  },
  {
    id: "EMERGENCY_TB_3",
    content: "Bảng tuần hoàn các nguyên tố hóa học đầu tiên do nhà khoa học nào phát minh ra?",
    options: [
      { id: "A", text: "Dmitri Mendeleev", isCorrect: true },
      { id: "B", text: "Marie Curie", isCorrect: false },
      { id: "C", text: "Albert Einstein", isCorrect: false },
      { id: "D", text: "Isaac Newton", isCorrect: false },
    ],
    hint: "Nhà hóa học người Nga sinh năm 1834.",
  },
];

/**
 * Kiểm tra xem trận đấu có hòa điểm ở Top 1 không.
 * Nếu có hòa điểm Top 1:
 * - Kích hoạt vòng câu hỏi phụ (Sudden Death Tie-breaker)
 * - Trả về false (chưa kết thúc trận)
 * Nếu không hòa:
 * - Trả về true (cho phép kết thúc trận bình thường)
 */
export async function checkAndTriggerTieBreakerIfTied({
  io,
  room,
  leaderboard,
  roomQuestions,
  onGameEnd,
}: {
  io: IO;
  room: any;
  leaderboard: any[];
  roomQuestions?: any[];
  onGameEnd: () => Promise<void>;
}): Promise<boolean> {
  // Nếu đã giải quyết xong Tie-breaker trước đó -> Cho phép kết thúc game
  const existingTB = roomTieBreakers.get(room.id);
  if (existingTB && existingTB.status === "COMPLETED") {
    return true;
  }

  if (!leaderboard || leaderboard.length < 2) {
    return true;
  }

  // Lấy điểm số cao nhất của bảng xếp hạng
  const topScore = leaderboard[0].score;
  const tiedTopTeams = leaderboard.filter((t) => t.score === topScore);

  // Chỉ kích hoạt khi có từ 2 đội trở lên cùng có điểm cao nhất
  if (tiedTopTeams.length < 2) {
    return true;
  }

  console.log(`⚔️ [TIE-BREAKER] Phát hiện hòa điểm Top 1 tại phòng ${room.code} (${tiedTopTeams.length} đội: ${tiedTopTeams.map((t) => t.name).join(", ")}, Điểm: ${topScore})! Bắt đầu câu hỏi phụ!`);

  // Lấy các câu hỏi phụ
  let tieQuestions: any[] = [];
  if (roomQuestions && roomQuestions.length > 0) {
    tieQuestions = roomQuestions.filter((q: any) => Boolean(q.isTieBreaker));
  }
  if (tieQuestions.length === 0 && room.quizBankId) {
    const dbQuestions = await prisma.question.findMany({
      where: { quizBankId: room.quizBankId, isTieBreaker: true },
      orderBy: { order: "asc" },
    });
    if (dbQuestions && dbQuestions.length > 0) {
      tieQuestions = dbQuestions;
    }
  }

  // Nếu vẫn chưa đủ 3 câu, lấy từ EMERGENCY
  if (tieQuestions.length < 3) {
    const needed = 3 - tieQuestions.length;
    tieQuestions = [...tieQuestions, ...EMERGENCY_TIE_BREAKER_QUESTIONS.slice(0, needed)];
  }

  const tiedTeamsInfo: TieBreakerTeam[] = tiedTopTeams.map((t) => {
    const teamObj = (room.teams || []).find((rt: any) => rt.id === (t.teamId || t.id));
    return {
      id: t.teamId || t.id || "",
      name: t.name,
      score: t.score,
      color: teamObj?.color || "#f59e0b",
      avatar: teamObj?.avatar || "👑",
    };
  });

  const tieState: TieBreakerState = {
    roomId: room.id,
    roomCode: room.code,
    tiedTeams: tiedTeamsInfo,
    questionIndex: 0,
    maxQuestions: 3,
    status: "INTRO",
    questions: tieQuestions.slice(0, 3),
    attemptedTeamIds: [],
  };

  roomTieBreakers.set(room.id, tieState);
  io.to(`room:${room.code}`).emit("game:tie_breaker:state", tieState);

  // Sau 4 giây Intro hồi hộp -> Khởi chạy Câu hỏi phụ #1
  clearTieBreakerTimer(room.id);
  const introTimer = setTimeout(() => {
    launchTieBreakerQuestion({ io, roomId: room.id, qIndex: 0, onGameEnd });
  }, 4000);
  tieBreakerTimers.set(room.id, introTimer);

  return false;
}

/**
 * Khởi chạy 1 câu hỏi phụ theo index (0, 1, 2)
 */
export function launchTieBreakerQuestion({
  io,
  roomId,
  qIndex,
  onGameEnd,
}: {
  io: IO;
  roomId: string;
  qIndex: number;
  onGameEnd: () => Promise<void>;
}) {
  clearTieBreakerTimer(roomId);
  const tieState = roomTieBreakers.get(roomId);
  if (!tieState) return;

  // Nếu đã quá 3 câu hỏi phụ mà vẫn chưa phân định -> Kích hoạt Bốc Thăm (Lucky Draw)
  if (qIndex >= tieState.maxQuestions) {
    launchTieBreakerLuckyDraw({ io, roomId, onGameEnd });
    return;
  }

  const q = tieState.questions?.[qIndex];
  if (!q) {
    launchTieBreakerLuckyDraw({ io, roomId, onGameEnd });
    return;
  }

  const rawOptions = typeof q.options === "string" ? JSON.parse(q.options) : q.options || [];
  const options = rawOptions.map((opt: any) => ({
    id: opt.id,
    text: opt.text,
  }));
  const correctOpt = rawOptions.find((opt: any) => opt.isCorrect);
  const correctOptionId = correctOpt ? correctOpt.id : (q.answer || "A");

  const timeLimit = 20; // 20 giây cho mỗi câu hỏi phụ
  tieState.questionIndex = qIndex;
  tieState.status = "QUESTION_ACTIVE";
  tieState.buzzedTeamId = undefined;
  tieState.buzzedTeamName = undefined;
  tieState.buzzedPlayerName = undefined;
  tieState.buzzedAt = undefined;
  tieState.attemptedTeamIds = [];
  tieState.currentQuestion = {
    id: q.id || `tie-q-${qIndex + 1}`,
    content: q.content,
    options,
    correctOptionId,
    explanation: q.hint || undefined,
    timeLimit,
    endsAt: Date.now() + timeLimit * 1000,
  };

  roomTieBreakers.set(roomId, tieState);
  io.to(`room:${tieState.roomCode}`).emit("game:tie_breaker:state", tieState);

  // Timer 20s cho câu hỏi nếu không có ai bấm chuông
  const qTimer = setTimeout(() => {
    handleTieQuestionTimeout({ io, roomId, onGameEnd });
  }, timeLimit * 1000);
  tieBreakerTimers.set(roomId, qTimer);
}

/**
 * Xử lý khi hết thời gian câu hỏi phụ mà không đội nào bấm chuông
 */
function handleTieQuestionTimeout({
  io,
  roomId,
  onGameEnd,
}: {
  io: IO;
  roomId: string;
  onGameEnd: () => Promise<void>;
}) {
  const tieState = roomTieBreakers.get(roomId);
  if (!tieState || tieState.status !== "QUESTION_ACTIVE") return;

  // Hiển thị đáp án 3 giây rồi chuyển sang câu hỏi phụ tiếp theo
  tieState.status = "ANSWER_REVEALED";
  roomTieBreakers.set(roomId, tieState);
  io.to(`room:${tieState.roomCode}`).emit("game:tie_breaker:state", tieState);

  clearTieBreakerTimer(roomId);
  const nextTimer = setTimeout(() => {
    launchTieBreakerQuestion({ io, roomId, qIndex: tieState.questionIndex + 1, onGameEnd });
  }, 3500);
  tieBreakerTimers.set(roomId, nextTimer);
}

/**
 * Xử lý khi 1 đội hòa điểm bấm chuông
 */
export function handleTieBreakerBuzz({
  io,
  roomId,
  teamId,
  teamName,
  playerName,
  onGameEnd,
}: {
  io: IO;
  roomId: string;
  teamId: string;
  teamName: string;
  playerName: string;
  onGameEnd: () => Promise<void>;
}): boolean {
  const tieState = roomTieBreakers.get(roomId);
  if (!tieState || tieState.status !== "QUESTION_ACTIVE") return false;

  // Kiểm tra đội bấm có thuộc danh sách hòa điểm Top 1 không
  const isTiedTeam = tieState.tiedTeams.some((t) => t.id === teamId);
  if (!isTiedTeam) return false;

  // Kiểm tra đội này đã trả lời sai trong câu này chưa
  if (tieState.attemptedTeamIds.includes(teamId)) return false;

  clearTieBreakerTimer(roomId);

  const answerDuration = 10; // 10 giây để chọn đáp án sau khi bấm chuông
  tieState.status = "BUZZER_LOCKED";
  tieState.buzzedTeamId = teamId;
  tieState.buzzedTeamName = teamName;
  tieState.buzzedPlayerName = playerName;
  tieState.buzzedAt = Date.now();
  tieState.answeringTimeRemaining = answerDuration;

  roomTieBreakers.set(roomId, tieState);
  io.to(`room:${tieState.roomCode}`).emit("game:tie_breaker:state", tieState);

  // Timer 10s cho đội trả lời
  const ansTimer = setTimeout(() => {
    // Nếu hết 10s không chọn đáp án -> Tính là trả lời sai
    handleTieBreakerAnswer({
      io,
      roomId,
      teamId,
      optionId: "__TIMEOUT__",
      onGameEnd,
    });
  }, answerDuration * 1000);
  tieBreakerTimers.set(roomId, ansTimer);

  return true;
}

/**
 * Xử lý khi đội bấm chuông gửi câu trả lời
 */
export function handleTieBreakerAnswer({
  io,
  roomId,
  teamId,
  optionId,
  onGameEnd,
}: {
  io: IO;
  roomId: string;
  teamId: string;
  optionId: string;
  onGameEnd: () => Promise<void>;
}) {
  const tieState = roomTieBreakers.get(roomId);
  if (!tieState || tieState.status !== "BUZZER_LOCKED") return;
  if (tieState.buzzedTeamId !== teamId) return;

  clearTieBreakerTimer(roomId);

  const isCorrect = optionId === tieState.currentQuestion?.correctOptionId;

  if (isCorrect) {
    // 🏆 TRẢ LỜI ĐÚNG -> QUÁN QUÂN XUẤT HIỆN!
    tieState.status = "COMPLETED";
    tieState.championTeamId = teamId;
    tieState.championTeamName = tieState.buzzedTeamName;
    roomTieBreakers.set(roomId, tieState);
    io.to(`room:${tieState.roomCode}`).emit("game:tie_breaker:state", tieState);

    // Chờ 5s ăn mừng rồi chính thức kết thúc trận
    const endTimer = setTimeout(async () => {
      await onGameEnd();
    }, 5000);
    tieBreakerTimers.set(roomId, endTimer);
  } else {
    // ❌ TRẢ LỜI SAI -> Nhường quyền bấm cho đội còn lại hoặc sang câu tiếp theo
    tieState.attemptedTeamIds.push(teamId);
    const remainingTeams = tieState.tiedTeams.filter((t) => !tieState.attemptedTeamIds.includes(t.id));

    if (remainingTeams.length > 0) {
      // Mở lại chuông cho đội còn lại trong 10 giây
      const retryDuration = 10;
      tieState.status = "QUESTION_ACTIVE";
      tieState.buzzedTeamId = undefined;
      tieState.buzzedTeamName = undefined;
      tieState.buzzedPlayerName = undefined;
      tieState.buzzedAt = undefined;
      if (tieState.currentQuestion) {
        tieState.currentQuestion.endsAt = Date.now() + retryDuration * 1000;
      }
      roomTieBreakers.set(roomId, tieState);
      io.to(`room:${tieState.roomCode}`).emit("game:tie_breaker:state", tieState);

      const retryTimer = setTimeout(() => {
        handleTieQuestionTimeout({ io, roomId, onGameEnd });
      }, retryDuration * 1000);
      tieBreakerTimers.set(roomId, retryTimer);
    } else {
      // Cả 2 đội đều sai ở câu này -> Hiển thị đáp án và chuyển sang câu tiếp theo
      tieState.status = "ANSWER_REVEALED";
      roomTieBreakers.set(roomId, tieState);
      io.to(`room:${tieState.roomCode}`).emit("game:tie_breaker:state", tieState);

      const nextTimer = setTimeout(() => {
        launchTieBreakerQuestion({ io, roomId, qIndex: tieState.questionIndex + 1, onGameEnd });
      }, 3500);
      tieBreakerTimers.set(roomId, nextTimer);
    }
  }
}

/**
 * Khởi chạy cơ chế Bốc Thăm (Hộp quà / Lá thăm bí mật) khi sau 3 câu vẫn hòa
 */
export function launchTieBreakerLuckyDraw({
  io,
  roomId,
  onGameEnd: _onGameEnd,
}: {
  io: IO;
  roomId: string;
  onGameEnd?: () => Promise<void>;
}) {
  clearTieBreakerTimer(roomId);
  const tieState = roomTieBreakers.get(roomId);
  if (!tieState) return;

  const count = tieState.tiedTeams.length;
  // Tạo số lá thăm bằng số đội hòa điểm
  const envelopes: TieBreakerEnvelope[] = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    isChampion: false,
    isOpened: false,
  }));

  // Ngẫu nhiên 1 lá thăm duy nhất chứa Vương Miện Quán Quân
  const luckyIndex = Math.floor(Math.random() * count);
  envelopes[luckyIndex].isChampion = true;

  tieState.status = "LUCKY_DRAW";
  tieState.luckyDraw = {
    envelopes,
    currentTurnTeamId: tieState.tiedTeams[0]?.id,
    currentTurnTeamName: tieState.tiedTeams[0]?.name,
  };

  roomTieBreakers.set(roomId, tieState);
  io.to(`room:${tieState.roomCode}`).emit("game:tie_breaker:state", tieState);
}

/**
 * Xử lý khi một đội chọn mở lá thăm may mắn
 */
export function handleTieBreakerLuckyPick({
  io,
  roomId,
  teamId,
  envelopeId,
  onGameEnd,
}: {
  io: IO;
  roomId: string;
  teamId: string;
  envelopeId: number;
  onGameEnd: () => Promise<void>;
}) {
  const tieState = roomTieBreakers.get(roomId);
  if (!tieState || tieState.status !== "LUCKY_DRAW" || !tieState.luckyDraw) return;

  const env = tieState.luckyDraw.envelopes.find((e) => e.id === envelopeId);
  if (!env || env.isOpened) return;

  const team = tieState.tiedTeams.find((t) => t.id === teamId);
  if (!team) return;

  env.isOpened = true;
  env.pickedByTeamId = team.id;
  env.pickedByTeamName = team.name;

  let winnerTeam = team;
  if (!env.isChampion) {
    // Nếu bốc trúng lá không có vương miện và có 2 đội -> Đội còn lại tự động là Quán Quân!
    const otherTeam = tieState.tiedTeams.find((t) => t.id !== teamId);
    if (otherTeam) {
      winnerTeam = otherTeam;
    }
  }

  // Mở tất cả các lá thăm còn lại để công khai minh bạch
  tieState.luckyDraw.envelopes.forEach((e) => {
    e.isOpened = true;
  });

  tieState.status = "COMPLETED";
  tieState.championTeamId = winnerTeam.id;
  tieState.championTeamName = winnerTeam.name;
  tieState.luckyDraw.winnerTeamId = winnerTeam.id;
  tieState.luckyDraw.winnerTeamName = winnerTeam.name;

  roomTieBreakers.set(roomId, tieState);
  io.to(`room:${tieState.roomCode}`).emit("game:tie_breaker:state", tieState);

  // Chờ 5s ăn mừng rồi chính thức kết thúc trận
  clearTieBreakerTimer(roomId);
  const endTimer = setTimeout(async () => {
    await onGameEnd();
  }, 5500);
  tieBreakerTimers.set(roomId, endTimer);
}
