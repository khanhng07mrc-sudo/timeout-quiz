import { GameMode } from "@/types";
import { Language } from "@/lib/i18n";

export interface ModeRulesSummary {
  objective: string;
  mechanism: string;
  tip: string;
}

export interface LocalizedModeMeta {
  name: string;
  tagline: string;
  badge: string;
  perks: string[];
}

export const LOCALIZED_GAME_MODES: Record<Language, Record<GameMode, LocalizedModeMeta>> = {
  vi: {
    CLASSIC: {
      name: "Cổ Điển",
      tagline: "Đấu bảng tính điểm tổng hợp · Trọn bộ thẻ bổ trợ chiến thuật",
      badge: "Toàn năng",
      perks: ["Đấu bảng điểm", "Thẻ bổ trợ x2", "Thưởng tốc độ"],
    },
    BUZZ: {
      name: "Chuông Nhanh",
      tagline: "Bấm chuông siêu tốc · Độc chiếm quyền ưu tiên trả lời câu hỏi",
      badge: "Tốc độ",
      perks: ["Cướp chuông 0ms", "Khóa nút tự động", "Phạt điểm khi sai"],
    },
    BOUNCEBACK: {
      name: "Cướp Điểm",
      tagline: "Đội chính trả lời sai · Mở chuông 5 giây cho đối thủ cướp lượt",
      badge: "Cướp lượt",
      perks: ["Chuông phụ 5s", "Cướp lượt khi sai", "Phạt điểm đối thủ"],
    },
    ELIMINATION: {
      name: "Sinh Tồn",
      tagline: "Đấu trường sinh tồn khốc liệt · Loại dần đội điểm thấp nhất",
      badge: "Sinh tồn",
      perks: ["Loại dần theo vòng", "Thẻ Hồi sinh", "Tính điểm tích lũy"],
    },
    TOURNAMENT: {
      name: "Đấu Loại 1v1",
      tagline: "Nhánh đấu trực tiếp loại trừ · Tranh cúp vô địch đấu trường",
      badge: "Đối kháng",
      perks: ["Nhánh đấu 1v1", "Khán giả cổ vũ", "Tranh cúp Vô địch"],
    },
    MAGIC_WHEEL: {
      name: "Vòng Quay Trí Tuệ",
      tagline: "Vòng quay 24 ô tương tác · Giải mã ô chữ bí mật và tích lũy điểm thưởng",
      badge: "Gameshow",
      perks: ["Ô chữ 4x14 chuẩn", "Vòng quay 24 ô", "Ô Chữ Đặc Biệt 40s"],
    },
    GRID_CARO: {
      name: "Ma Trận Caro",
      tagline: "Chiếm ô bàn cờ chiến thuật · Nối chuỗi ô liên tiếp để giành chiến thắng",
      badge: "Chiến thuật",
      perks: ["Bàn cờ đa kích thước", "Nối hàng ngang dọc chéo", "Chiếm ô chiến lược"],
    },
    DICE_RACE: {
      name: "Đua Xúc Xắc",
      tagline: "Gieo xí ngầu 3D chân thực · Chinh phục đường đua vượt chướng ngại vật",
      badge: "Cờ bàn 3D",
      perks: ["Gieo xúc xắc 3D vật lý", "Đường đua nhiều chặng", "Ô sự kiện & cạm bẫy"],
    },
    WAGER: {
      name: "Cược Điểm Bí Mật",
      tagline: "Bí mật cược điểm trước câu hỏi · Nhân bội điểm số thắng lớn",
      badge: "Tâm lý",
      perks: ["Cược điểm bí mật", "Hệ số nhân 2.5x", "Bảo hiểm phá sản"],
    },
    MYSTERY_QUEST: {
      name: "Hành Trình Bí Ẩn",
      tagline: "Khám phá các căn phòng bí ẩn · Vượt qua thử thách để tích lũy kho báu",
      badge: "Phiêu lưu",
      perks: ["Thử thách phòng bí mật", "Minigame giải đố cân não", "Quyết định bảo toàn điểm"],
    },
    OLYMPIA: {
      name: "Đường Lên Đỉnh Olympia",
      tagline: "5 phần thi Olympia (Khởi Động, VCNV, Tăng Tốc, Về Đích, Câu Hỏi Phụ) · Luật O13–O26",
      badge: "Leo núi",
      perks: ["5 phần thi chuẩn", "Luật O13–O26 chuẩn", "2–8 thí sinh tranh tài"],
    },
  },
  en: {
    CLASSIC: {
      name: "Classic Arena",
      tagline: "Real-time leaderboard showdown · Full strategic powerups deck",
      badge: "All-Rounder",
      perks: ["Leaderboard", "Powerup cards", "Speed bonus"],
    },
    BUZZ: {
      name: "Fast Buzz",
      tagline: "Ultra-fast reflex buzzer · Sole right to answer each question",
      badge: "Reflex Speed",
      perks: ["0ms reaction", "Auto buzzer lockout", "Wrong penalty"],
    },
    BOUNCEBACK: {
      name: "Bounceback",
      tagline: "Main team answers wrong · 5s buzzer opens for opponents to steal",
      badge: "Steal Turn",
      perks: ["5s steal buzzer", "Steal on wrong", "Opponent penalty"],
    },
    ELIMINATION: {
      name: "Survival",
      tagline: "Intense survival arena · Progressively eliminate lowest scores",
      badge: "Battle Royale",
      perks: ["Round elimination", "Revival cards", "Deep scoring"],
    },
    TOURNAMENT: {
      name: "Tournament 1v1",
      tagline: "Direct elimination knockout brackets · Championship showdown",
      badge: "Direct Bracket",
      perks: ["1v1 brackets", "Audience cheer", "Trophy finals"],
    },
    MAGIC_WHEEL: {
      name: "Magic Wheel",
      tagline: "Interactive 24-sector wheel · Unravel secret crossword puzzles",
      badge: "TV Gameshow",
      perks: ["4x14 crossword", "24-sector wheel", "40s Grand Finale"],
    },
    GRID_CARO: {
      name: "Grid Caro",
      tagline: "Claim 4x4 grid cells · Connect K Caro lines for huge multipliers",
      badge: "Tactics",
      perks: ["4x4 matrix", "K-line combo", "Streak bonus +30pts"],
    },
    DICE_RACE: {
      name: "Dice Race",
      tagline: "Roll 2 3D dice marathon · Dodge penalty traps and race to finish",
      badge: "3D Board Race",
      perks: ["30-tile track", "3D physics dice", "Hazard tiles"],
    },
    WAGER: {
      name: "Secret Wager",
      tagline: "Secretly wager points before reveal · Multiply score for victory",
      badge: "Mind Game",
      perks: ["Secret wagering", "2.5x multiplier", "Bailout shield"],
    },
    MYSTERY_QUEST: {
      name: "Mystery Quest",
      tagline: "Open mystery chests · Master brain minigames & fate tiles",
      badge: "Adventure",
      perks: ["Mystery chests", "3 Brain minigames", "Cash-out decision"],
    },
    OLYMPIA: {
      name: "Road to Mount Olympia",
      tagline: "5 iconic Olympia rounds (Warm-up, Obstacle, Speed, Finish, Tiebreaker) · O13–O26 rules",
      badge: "Mountain Climb",
      perks: ["5 iconic rounds", "O13–O26 rule sets", "2–8 contestants"],
    },
  },
  ja: {
    CLASSIC: {
      name: "クラシック",
      tagline: "総合スコアリーダーボード対戦・戦略アイテムカード搭載",
      badge: "オールラウンド",
      perks: ["スコアランキング", "x2アイテムカード", "スピードボーナス"],
    },
    BUZZ: {
      name: "早押しクイズ",
      tagline: "超高速早押しボタン・回答権を独占してポイント獲得",
      badge: "スピード勝負",
      perks: ["0ms早押し判定", "自動ボタンロック", "誤答ペナルティ"],
    },
    BOUNCEBACK: {
      name: "バウンスバック",
      tagline: "メインチームが誤答時に5秒間の強奪ブザー解放",
      badge: "回答権強奪",
      perks: ["5秒強奪ブザー", "誤答で権利移行", "相手ペナルティ"],
    },
    ELIMINATION: {
      name: "サバイバル",
      tagline: "熾烈な脱落サバイバル・各ラウンド最下位チームが脱落",
      badge: "生き残り戦",
      perks: ["ラウンド別脱落", "復活カード", "累積スコア"],
    },
    TOURNAMENT: {
      name: "トーナメント 1v1",
      tagline: "直接対決トーナメント・頂点を目指すチャンピオンシップ",
      badge: "対戦格闘",
      perks: ["1v1ブラケット", "観客声援機能", "優勝トロフィー"],
    },
    MAGIC_WHEEL: {
      name: "マジックホイール",
      tagline: "24マスの知恵ルーレット・秘密の文字パズルを解き明かせ",
      badge: "テレビ番組風",
      perks: ["4x14マス文字盤", "24マス回転盤", "40秒特別ラウンド"],
    },
    GRID_CARO: {
      name: "グリッド・五目並べ",
      tagline: "4x4マスの陣取りゲーム・Kマス連続ラインで大量ボーナス",
      badge: "戦略戦",
      perks: ["4x4マトリクス", "Kマスライン連鎖", "連勝+30点"],
    },
    DICE_RACE: {
      name: "ダイスレース",
      tagline: "3Dサイコロ2個を振って進むマラソン・罠を避けてゴールへ",
      badge: "3Dボードレース",
      perks: ["30マスコース", "物理3Dダイス", "トラップマス"],
    },
    WAGER: {
      name: "シークレットベット",
      tagline: "出題前に極秘ポイントベット・倍率ボーナスで一発逆転",
      badge: "心理戦",
      perks: ["極秘ベット", "最大2.5倍", "破産保険シールド"],
    },
    MYSTERY_QUEST: {
      name: "ミステリークエスト",
      tagline: "宝箱を開放し、頭脳ミニゲームと運命マスを攻略せよ",
      badge: "冒険アドベンチャー",
      perks: ["神秘の宝箱", "3種のミニゲーム", "キャッシュアウト決断"],
    },
    OLYMPIA: {
      name: "オリンピア登頂",
      tagline: "伝統の5大ステージ（ウォームアップ、障害、スピード、フィニッシュ、延長戦）",
      badge: "頂上決戦",
      perks: ["公認5ラウンド", "O13–O26ルール", "2〜8名対戦"],
    },
  },
  ko: {
    CLASSIC: {
      name: "클래식",
      tagline: "종합 점수 실시간 리더보드 대결 · 전략 아이템 카드 풀장착",
      badge: "올라운드",
      perks: ["리더보드", "아이템 카드", "속도 보너스"],
    },
    BUZZ: {
      name: "스피드 버저",
      tagline: "초고속 버저 선점 · 단독 답변 권한으로 점수 독식",
      badge: "순발력",
      perks: ["0ms 초정밀 버저", "자동 잠금", "오답 페널티"],
    },
    BOUNCEBACK: {
      name: "바운스백",
      tagline: "메인 팀 오답 시 · 상대 팀에 5초 스틸 버저 오픈",
      badge: "기회 스틸",
      perks: ["5초 스틸 버저", "오답 찬스 스틸", "상대 감점"],
    },
    ELIMINATION: {
      name: "서바이벌",
      tagline: "치열한 생존 아레나 · 최하위 팀 단계별 탈락",
      badge: "생존 서바이벌",
      perks: ["단계별 탈락", "부활 카드", "누적 점수제"],
    },
    TOURNAMENT: {
      name: "토너먼트 1v1",
      tagline: "토너먼트 토너먼트 녹아웃 · 챔피언 트로피 쟁탈전",
      badge: "일대일 대전",
      perks: ["1v1 대진표", "관중 응원", "챔피언 트로피"],
    },
    MAGIC_WHEEL: {
      name: "매직 휠",
      tagline: "인터랙티브 24칸 회전판 · 비밀 크로스워드 퍼즐 추리",
      badge: "TV 게임쇼",
      perks: ["4x14 표준 글자판", "24칸 룰렛", "40초 파이널"],
    },
    GRID_CARO: {
      name: "그리드 오목",
      tagline: "4x4 격자 칸 점령 · K개 연속 라인 완성으로 대박 보너스",
      badge: "전략 전술",
      perks: ["4x4 매트릭스", "K개 연속 라인", "콤보 +30점"],
    },
    DICE_RACE: {
      name: "주사위 레이스",
      tagline: "3D 주사위 2개 굴리기 마라톤 · 함정을 돌파하여 결승선으로",
      badge: "3D 보드 레이스",
      perks: ["30칸 트랙", "3D 물리 주사위", "돌발 함정 칸"],
    },
    WAGER: {
      name: "시크릿 배팅",
      tagline: "문제 공개 전 비밀 점수 배팅 · 배수 적용으로 대역전승",
      badge: "심리 심층전",
      perks: ["비밀 배팅", "최대 2.5배 배수", "파산 방지 쉴드"],
    },
    MYSTERY_QUEST: {
      name: "미스터리 퀘스트",
      tagline: "신비한 보물상자 오픈 · 두뇌 미니게임 및 운명의 칸 돌파",
      badge: "어드벤처",
      perks: ["비밀 보물상자", "미니게임 3종", "캐시아웃 찬스"],
    },
    OLYMPIA: {
      name: "올림피아 등정",
      tagline: "5대 올림피아 라운드 (워밍업, 장애물, 스피드, 결승, 연장전) · O13–O26 룰",
      badge: "정상 결전",
      perks: ["공식 5개 라운드", "O13–O26 룰셋", "2~8인 대결"],
    },
  },
  fr: {
    CLASSIC: {
      name: "Classique",
      tagline: "Classement général en temps réel · Cartes bonus tactiques",
      badge: "Complet",
      perks: ["Classement direct", "Cartes bonus", "Bonus vitesse"],
    },
    BUZZ: {
      name: "Buzzer Rapide",
      tagline: "Vitesse de réaction maximale · Droit exclusif de réponse",
      badge: "Réflexes",
      perks: ["Buzzer 0ms", "Verrouillage auto", "Pénalité erreur"],
    },
    BOUNCEBACK: {
      name: "Rebond & Vol",
      tagline: "Équipe principale échoue · Buzzer 5s pour voler les points",
      badge: "Vol de Tour",
      perks: ["Buzzer vol 5s", "Vol sur erreur", "Pénalité adversaire"],
    },
    ELIMINATION: {
      name: "Survie Extrême",
      tagline: "Arène de survie intense · Élimination progressive des scores bas",
      badge: "Bataille Royale",
      perks: ["Élimination par tour", "Carte résurrection", "Score cumulé"],
    },
    TOURNAMENT: {
      name: "Tournoi 1v1",
      tagline: "Arbre à élimination directe · Match pour le trophée de champion",
      badge: "Face à Face",
      perks: ["Tableau 1v1", "Support public", "Trophée vainqueur"],
    },
    MAGIC_WHEEL: {
      name: "Roue Magique",
      tagline: "Roue interactive 24 secteurs · Déchiffrez les mots croisés mystères",
      badge: "Jeu Télévisé",
      perks: ["Mots croisés 4x14", "Roue 24 secteurs", "Finale 40s"],
    },
    GRID_CARO: {
      name: "Morpion Tactique",
      tagline: "Conquérez la grille 4x4 · Alignez K cases pour remporter le bonus",
      badge: "Tactique",
      perks: ["Grille 4x4", "Alignement K cases", "Bonus ligne +30pts"],
    },
    DICE_RACE: {
      name: "Course de Dés 3D",
      tagline: "Lancez 2 dés 3D · Esquivez les pièges et sprintez vers l'arrivée",
      badge: "Course Plateau",
      perks: ["Piste 30 cases", "Dés physiques 3D", "Cases pièges"],
    },
    WAGER: {
      name: "Pari Secret",
      tagline: "Pariez secrètement avant la question · Multipliez vos points",
      badge: "Jeu Psychologique",
      perks: ["Pari secret", "Multiplicateur 2.5x", "Bouclier anti-faillite"],
    },
    MYSTERY_QUEST: {
      name: "Quête Mystère",
      tagline: "Ouvrez les coffres mystères · Mini-jeux d'esprit et cases du destin",
      badge: "Aventure",
      perks: ["Coffres mystères", "3 Mini-jeux", "Décision cash-out"],
    },
    OLYMPIA: {
      name: "L'Ascension d'Olympie",
      tagline: "Les 5 manches légendaires d'Olympie (Échauffement, Obstacle, Vitesse, Finale, Égalité)",
      badge: "Sommet Alpin",
      perks: ["5 manches cultes", "Règles O13–O26", "2 à 8 candidats"],
    },
  },
};

export function getLocalizedModeMeta(mode: GameMode | string, lang: Language = "vi"): LocalizedModeMeta {
  const modeKey = (mode || "CLASSIC").toUpperCase() as GameMode;
  const langDict = LOCALIZED_GAME_MODES[lang] || LOCALIZED_GAME_MODES.vi;
  return langDict[modeKey] || LOCALIZED_GAME_MODES.vi[modeKey] || {
    name: modeKey,
    tagline: "",
    badge: "Arena Mode",
    perks: [],
  };
}

export const MODE_DISPLAY_NAMES: Record<string, string> = {
  CLASSIC: "Cổ Điển",
  BUZZ: "Chuông Nhanh",
  BOUNCEBACK: "Cướp Điểm",
  ELIMINATION: "Sinh Tồn",
  TOURNAMENT: "Đấu Loại 1v1",
  MAGIC_WHEEL: "Vòng Quay Trí Tuệ",
  GRID_CARO: "Ma Trận Caro",
  DICE_RACE: "Đua Xúc Xắc",
  WAGER: "Cược Điểm Bí Mật",
  MYSTERY_QUEST: "Hành Trình Bí Ẩn",
  OLYMPIA: "Đường Lên Đỉnh Olympia",
};

export const MODE_RULES_SUMMARY: Record<string, ModeRulesSummary> = {
  CLASSIC: {
    objective: "Trả lời đồng thời các câu hỏi và tích lũy tổng điểm cao nhất phòng thi.",
    mechanism: "Tất cả các đội cùng nhận câu hỏi và chọn đáp án; điểm số chấm theo độ khó Bloom và tỷ lệ phòng.",
    tip: "Sử dụng Thẻ Bổ Trợ đúng thời điểm (x2, Đổi câu) để bứt phá bảng xếp hạng.",
  },
  BUZZ: {
    objective: "Giành quyền ưu tiên trả lời nhanh nhất ngay khi mở chuông để độc chiếm điểm số.",
    mechanism: "Nhấn chuông cực nhanh; đội bấm trước được trả lời độc quyền, trả lời sai sẽ bị trừ điểm.",
    tip: "Chỉ bấm chuông khi nắm chắc câu trả lời để tránh mất điểm đáng tiếc.",
  },
  BOUNCEBACK: {
    objective: "Tận dụng sai lầm của đối thủ để cướp lượt và thu trọn điểm số quý giá.",
    mechanism: "Đội chính trả lời trước; nếu trả lời sai, chuông phụ 5 giây mở ra cho các đội khác bấm cướp lượt.",
    tip: "Luôn sẵn sàng tư thế bấm cướp chuông ngay khi đội bạn lưỡng lự hoặc trả lời sai.",
  },
  ELIMINATION: {
    objective: "Sinh tồn qua từng chặng đấu khốc liệt và trụ lại đến câu hỏi cuối cùng.",
    mechanism: "Sau mỗi mốc câu hỏi quy định, đội đứng cuối bảng điểm sẽ bị loại trực tiếp khỏi cuộc đua.",
    tip: "Tập trung độ chính xác cao hơn tốc độ ở các vòng đầu để bảo toàn vé đi tiếp.",
  },
  TOURNAMENT: {
    objective: "Đánh bại đối thủ trong nhánh đấu trực tiếp để bước lên bục vinh quang.",
    mechanism: "Chia bảng thi đấu đối đầu 1v1 theo thể thức loại trực tiếp (Tứ kết, Bán kết, Chung kết).",
    tip: "Tận dụng các câu hỏi hệ số cao để tạo cách biệt an toàn trước đối thủ cùng cặp.",
  },
  MAGIC_WHEEL: {
    objective: "Quay nón tri thức, lật mở ô chữ bí mật và tích lũy điểm thưởng cao nhất phòng đấu.",
    mechanism: "Đội đến lượt chốt lực quay nón 24 ô; đoán đúng chữ cái hoặc câu hỏi để nhân điểm và giữ quyền quay tiếp.",
    tip: "Chú ý tần suất chữ cái phổ biến và chủ động Giải ô chữ khi đã nắm chắc đáp án để bảo toàn điểm.",
  },
  GRID_CARO: {
    objective: "Chiếm ô trên bàn cờ ma trận và nối chuỗi K ô liên tiếp ăn thưởng cực đại.",
    mechanism: "Đội trả lời đúng câu hỏi sẽ chiếm ô đã chọn; nối thành hàng ngang/dọc/chéo để kích hoạt combo Caro.",
    tip: "Vừa xây dựng chuỗi ô của đội mình vừa chặn đứng đường kết nối của đối thủ.",
  },
  DICE_RACE: {
    objective: "Đua xúc xắc marathon vượt các ô cạm bẫy để cán đích đầu tiên.",
    mechanism: "Gieo 2 xí ngầu 3D nhận số bước di chuyển; trả lời câu hỏi để kích hoạt ô sự kiện may rủi.",
    tip: "Tính toán khoảng cách an toàn với các ô phạt lùi bước hoặc mất lượt.",
  },
  WAGER: {
    objective: "Cân não bí mật đặt cược số điểm tối đa để nhân bội tài sản.",
    mechanism: "Bí mật cược điểm trước khi công bố nội dung câu hỏi; đúng nhận đủ tiền cược, sai mất sạch.",
    tip: "Quản lý vốn chặt chẽ: Đặt cược lớn ở chủ đề sở trường và cược an toàn ở chủ đề lạ.",
  },
  MYSTERY_QUEST: {
    objective: "Khám phá sân khấu phiêu lưu truyền hình qua các bối cảnh thần bí luân phiên.",
    mechanism: "Thi đấu luân phiên theo lượt; giải đố để lật mở Rương kho báu, Cánh cửa bí mật và Ô số phận.",
    tip: "Đưa ra quyết định Dừng chơi (Cash-out) đúng lúc trước khi chạm phải cạm bẫy chia đôi điểm.",
  },
  OLYMPIA: {
    objective: "Chinh phục vòng nguyệt quế qua các phần thi Khởi Động, VCNV, Tăng Tốc, Về Đích và Câu Hỏi Phụ.",
    mechanism: "Hỗ trợ tối đa 8 thí sinh, lựa chọn bộ luật từng mùa (O13–O26) và chọn riêng các vòng muốn thi đấu.",
    tip: "Phân bổ chiến thuật bấm chuông hợp lý và tận dụng Ngôi sao hy vọng ở vòng Về Đích.",
  },
};

/**
 * Chuẩn hóa tiêu đề phòng thi thanh lịch, không nhồi nhét mã kỹ thuật hay dấu gạch dưới
 */
export function formatRoomTitle(rawTitle: string | undefined, mode?: string, lang: Language = "vi"): { mainTitle: string; badgeText: string } {
  const modeKey = (mode || "CLASSIC").toUpperCase() as GameMode;
  const meta = getLocalizedModeMeta(modeKey, lang);
  const cleanModeName = meta.name || modeKey;

  if (!rawTitle) {
    return {
      mainTitle: `${cleanModeName} Arena`,
      badgeText: "Phòng Thi Đấu",
    };
  }

  // Nếu là phòng Sandbox
  if (rawTitle.toLowerCase().includes("sandbox")) {
    const teamMatch = rawTitle.match(/(\d+)\s*(?:đội|doi|teams?)/i);
    const teamCount = teamMatch ? `${teamMatch[1]} Đội` : "Đấu Đội";
    return {
      mainTitle: `${cleanModeName} Arena`,
      badgeText: `🧪 Sandbox Studio · ${teamCount}`,
    };
  }

  // Xóa bỏ các mã enum thô kệch nếu có
  let cleaned = rawTitle
    .replace(/MYSTERY_QUEST|GRID_CARO|DICE_RACE|BOUNCEBACK|ELIMINATION|TOURNAMENT|MAGIC_WHEEL/gi, "")
    .replace(/[-_–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.length < 3) {
    cleaned = `${cleanModeName} Arena`;
  }

  return {
    mainTitle: cleaned,
    badgeText: `${cleanModeName} Mode`,
  };
}
