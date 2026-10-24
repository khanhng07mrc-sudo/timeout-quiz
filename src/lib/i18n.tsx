"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "vi" | "en" | "ja" | "ko" | "fr";

export interface LanguageInfo {
  code: Language;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
];

export const translations = {
  vi: {
    statusBadge: "NỀN TẢNG ĐẤU TRƯỜNG TRÍ TUỆ & TRẮC NGHIỆM TƯƠNG TÁC THỜI GIAN THỰC",
    tagline: "Giải pháp toàn diện phục vụ tổ chức thi đấu kiến thức, sự kiện giáo dục và các chương trình tương tác trực tiếp quy mô lớn.",
    playerPortal: {
      badge: "Dành Cho Người Tham Gia",
      title: "Vào thi đấu",
      live: "Trực tiếp ✨",
      desc: "Nhập mã phòng 6 chữ số và tên hiển thị để tham gia phòng thi trực tiếp, tương tác câu hỏi theo thời gian thực trên mọi thiết bị cá nhân.",
      pinLabel: "Mã phòng (PIN)",
      pinPlaceholder: "VD: 123456",
      nameLabel: "Tên của bạn",
      namePlaceholder: "VD: Nguyễn Văn A",
      submitBtn: "Vào phòng thi ngay",
      connecting: "Đang kết nối...",
      independentLink: "Cổng độc lập Thí sinh (/play)",
      deviceSupport: "Tối ưu Mobile, Tablet & PC",
      errorEmpty: "Vui lòng nhập đầy đủ mã phòng và tên hiển thị",
      errorNotFound: "Mã phòng không tồn tại hoặc phiên thi đấu đã kết thúc",
      errorConnection: "Lỗi kết nối máy chủ. Vui lòng kiểm tra đường truyền và thử lại.",
    },
    displayPortal: {
      badge: "Hội Trường",
      title: "Màn hình chiếu",
      desc: "Hiển thị độ nét cao cho TV và máy chiếu, truyền tải diễn biến câu hỏi, đồng hồ đếm ngược và bảng tổng sắp điểm số.",
      btn: "Mở cổng màn chiếu",
    },
    adminPortal: {
      badge: "Ban Tổ Chức",
      title: "Trung tâm Quản trị (Admin)",
      desc: "Khởi tạo và quản lý ngân hàng câu hỏi, thiết lập thể thức thi đấu và điều hành các phiên tương tác chuyên nghiệp.",
      btn: "Quản trị & Điều hành",
    },
    pillars: {
      realtime: {
        title: "Hạ Tầng Thời Gian Thực",
        desc: "Kết nối WebSocket ổn định với độ trễ cực thấp, bảo đảm đồng bộ tức thời giữa hàng trăm người chơi cùng lúc.",
      },
      quizBank: {
        title: "Ngân Hàng Đề Đa Năng",
        desc: "Soạn thảo và tổ chức linh hoạt đa dạng các định dạng câu hỏi trắc nghiệm, ghép đôi, hình ảnh và âm thanh.",
      },
      flexibleModes: {
        title: "Thể Thức Thi Đấu Linh Hoạt",
        desc: "Hỗ trợ thi đấu cá nhân hoặc phối hợp tổ đội, tối ưu cho trường học, sự kiện doanh nghiệp và hội thảo.",
      },
      analytics: {
        title: "Báo Cáo & Thống Kê Minh Bạch",
        desc: "Tự động tính điểm, tổng hợp thứ hạng trực tiếp và xuất nhật ký dữ liệu chi tiết, chuẩn xác sau mỗi vòng thi.",
      },
    },
    magicWheel: {
      title: "Vòng Quay Trí Tuệ (Magic Wheel)",
      desc: "Đấu trường Vòng Quay Trí Tuệ tương tác, giải mã ô chữ bí mật và tích lũy điểm thưởng ngoạn mục.",
    },
    footer: {
      brandSub: "Nền tảng thi đấu trắc nghiệm tương tác thời gian thực",
      play: "Vào thi đấu",
      display: "Màn hình chiếu",
      admin: "Khu vực Quản trị",
      terms: "Điều khoản dịch vụ",
      privacy: "Chính sách bảo mật",
      copyright: "© 2026 Quizorra. Toàn bộ quyền sở hữu trí tuệ được bảo lưu.",
      support: "Hỗ trợ kỹ thuật & Hợp tác:",
    },
  },
  en: {
    statusBadge: "REALTIME INTERACTIVE QUIZ ARENA & KNOWLEDGE SHOWDOWN PLATFORM",
    tagline: "Comprehensive solution for hosting intellectual showdowns, educational tournaments, and large-scale live audience interactive events.",
    playerPortal: {
      badge: "For Participants",
      title: "Join the Arena",
      live: "Live Arena ✨",
      desc: "Enter your 6-digit room PIN and display name to join live sessions and answer questions in real time on any personal device.",
      pinLabel: "Room PIN",
      pinPlaceholder: "E.g. 123456",
      nameLabel: "Your Name",
      namePlaceholder: "E.g. Alex Johnson",
      submitBtn: "Enter Arena Now",
      connecting: "Connecting...",
      independentLink: "Direct Player Portal (/play)",
      deviceSupport: "Optimized for Mobile, Tablet & PC",
      errorEmpty: "Please enter both room PIN and display name",
      errorNotFound: "Room code does not exist or tournament has ended",
      errorConnection: "Connection error. Please check your network and retry.",
    },
    displayPortal: {
      badge: "Auditorium",
      title: "Stage Projection Screen",
      desc: "Ultra HD presentation for TVs and projectors, displaying live questions, countdown timer, and dynamic rankings.",
      btn: "Launch Screen",
    },
    adminPortal: {
      badge: "Organizers",
      title: "Command Center (Admin)",
      desc: "Create and manage question banks, configure tournament rules, and orchestrate live competitive game shows.",
      btn: "Manage & Host",
    },
    pillars: {
      realtime: {
        title: "Realtime Infrastructure",
        desc: "Ultra-low latency WebSocket synchronization ensuring zero-lag answers across hundreds of concurrent players.",
      },
      quizBank: {
        title: "Versatile Question Bank",
        desc: "Draft and customize diverse question types, matching pairs, image puzzles, and rich multimedia content.",
      },
      flexibleModes: {
        title: "Dynamic Tournament Modes",
        desc: "Individual or team-based battle formats tailored for schools, corporate summits, and grand arenas.",
      },
      analytics: {
        title: "Transparent Leaderboards",
        desc: "Instant automated scoring, real-time podium placement, and comprehensive post-match analytics logs.",
      },
    },
    magicWheel: {
      title: "Tactical Magic Wheel",
      desc: "Interactive 24-sector wheel arena, secret crossword puzzle unraveling, and dynamic multiplier rewards.",
    },
    footer: {
      brandSub: "Realtime Interactive Quiz Arena Platform",
      play: "Join Match",
      display: "Stage Display",
      admin: "Admin Center",
      terms: "Terms of Service",
      privacy: "Privacy Policy",
      copyright: "© 2026 Quizorra. All intellectual property rights reserved.",
      support: "Technical Support & Inquiries:",
    },
  },
  ja: {
    statusBadge: "リアルタイム対戦型クイズアリーナ・インタラクティブ知識プラットフォーム",
    tagline: "教育トーナメント、企業イベント、大規模なインタラクティブ対戦を主催するための包括的ソリューション。",
    playerPortal: {
      badge: "参加者向け",
      title: "対戦に参加する",
      live: "ライブ配信中 ✨",
      desc: "6桁の部屋番号(PIN)と名前を入力して、あらゆる端末からリアルタイムで問題に回答できます。",
      pinLabel: "部屋番号 (PIN)",
      pinPlaceholder: "例: 123456",
      nameLabel: "あなたの名前",
      namePlaceholder: "例: 山田 太郎",
      submitBtn: "今すぐ対戦へ入場",
      connecting: "接続中...",
      independentLink: "参加者専用ポータル (/play)",
      deviceSupport: "スマホ・タブレット・PCに最適化",
      errorEmpty: "部屋番号とお名前を入力してください",
      errorNotFound: "部屋番号が存在しないか、対戦が終了しています",
      errorConnection: "サーバー接続エラーが発生しました。再試行してください。",
    },
    displayPortal: {
      badge: "ステージ / ホール",
      title: "メインスクリーン表示",
      desc: "大画面TVやプロジェクター向けの高精細表示。出題、タイマー、ランキングをリアルタイムで投影します。",
      btn: "投影画面を開く",
    },
    adminPortal: {
      badge: "主催者・運営",
      title: "管理司令センター (Admin)",
      desc: "問題バンクの作成・管理、対戦ルールの設定、プロフェッショナルな大会のリアルタイム進行を行います。",
      btn: "管理・進行画面へ",
    },
    pillars: {
      realtime: {
        title: "超低遅延リアルタイム通信",
        desc: "WebSocketによる高速同期で、数百人の同時プレイヤーでも一切の遅延なく回答を集計します。",
      },
      quizBank: {
        title: "高機能問題バンク",
        desc: "選択式、ペアマッチング、画像・音声など多彩な形式の問題を直感的に作成・管理できます。",
      },
      flexibleModes: {
        title: "柔軟な対戦フォーマット",
        desc: "個人戦からチーム戦まで、学校授業から企業フェスティバルまで幅広く対応します。",
      },
      analytics: {
        title: "透明性の高い自動集計",
        desc: "リアルタイム自動採点、瞬時のリーダーボード更新、試合後の詳細な分析レポートを提供します。",
      },
    },
    magicWheel: {
      title: "知恵のルーレット (Magic Wheel)",
      desc: "24マスの戦術ルーレットを回し、秘密の文字パズルを解読して高得点を獲得する対戦モード。",
    },
    footer: {
      brandSub: "リアルタイム対戦型クイズアリーナシステム",
      play: "対戦参加",
      display: "投影画面",
      admin: "管理センター",
      terms: "利用規約",
      privacy: "プライバシーポリシー",
      copyright: "© 2026 Quizorra. 無断転載を禁じます。",
      support: "技術サポート・お問い合わせ:",
    },
  },
  ko: {
    statusBadge: "실시간 대화형 퀴즈 아레나 & 지식 배틀 플랫폼",
    tagline: "지식 경연, 교육 토너먼트, 대규모 실시간 인터랙티브 행사를 위한 올인원 솔루션입니다.",
    playerPortal: {
      badge: "참가자 전용",
      title: "대회 입장하기",
      live: "실시간 진행 중 ✨",
      desc: "6자리 룸 PIN과 닉네임을 입력하여 모든 기기에서 실시간으로 퀴즈에 참여하고 답변하세요.",
      pinLabel: "룸 코드 (PIN)",
      pinPlaceholder: "예: 123456",
      nameLabel: "참가자 이름",
      namePlaceholder: "예: 홍길동",
      submitBtn: "지금 입장하기",
      connecting: "연결 중...",
      independentLink: "참가자 전용 포털 (/play)",
      deviceSupport: "모바일, 태블릿, PC 완벽 지원",
      errorEmpty: "룸 PIN과 이름을 모두 입력해주세요",
      errorNotFound: "방이 존재하지 않거나 대회가 이미 종료되었습니다",
      errorConnection: "서버 연결 오류입니다. 네트워크를 확인하고 다시 시도하세요.",
    },
    displayPortal: {
      badge: "메인 무대 / 강당",
      title: "프로젝션 대형 화면",
      desc: "TV 및 빔프로젝터용 초고화질 화면으로 문제 진행, 카운트다운 타이머, 실시간 순위표를 송출합니다.",
      btn: "대형 화면 열기",
    },
    adminPortal: {
      badge: "주최자 / 관리자",
      title: "통제 센터 (Admin)",
      desc: "문제 은행 구축, 대전 규칙 커스텀, 인터랙티브 퀴즈 토너먼트를 전문적으로 총괄 운영합니다.",
      btn: "관리 및 운영",
    },
    pillars: {
      realtime: {
        title: "초저지연 실시간 인프라",
        desc: "WebSocket 기반의 초고속 동기화로 수백 명이 동시에 접속해도 딜레이 없이 답변을 처리합니다.",
      },
      quizBank: {
        title: "다기능 문제 은행",
        desc: "객관식, 짝 맞추기, 이미지 및 음향 멀티미디어 퀴즈를 손쉽게 제작하고 체계적으로 관리합니다.",
      },
      flexibleModes: {
        title: "유연한 경기 포맷",
        desc: "개인전 및 팀 협력 배틀 지원, 학교 수업부터 기업 워크숍까지 최적화된 모드를 제공합니다.",
      },
      analytics: {
        title: "투명하고 정확한 통계",
        desc: "실시간 자동 채점 및 순위 산출, 경기 종료 후 상세 로그와 통계 데이터를 즉시 확인합니다.",
      },
    },
    magicWheel: {
      title: "지혜의 룰렛 (Magic Wheel)",
      desc: "24개 슬롯의 전술 룰렛을 돌리고 비밀 십자말풀이를 풀어 점수를 획득하는 인터랙티브 모드.",
    },
    footer: {
      brandSub: "실시간 인터랙티브 퀴즈 아레나 플랫폼",
      play: "참가하기",
      display: "스크린 화면",
      admin: "관리자 센터",
      terms: "이용약관",
      privacy: "개인정보 처리방침",
      copyright: "© 2026 Quizorra. All rights reserved.",
      support: "기술 지원 및 제휴 문의:",
    },
  },
  fr: {
    statusBadge: "ARÈNE DE QUIZ INTERACTIF EN TEMPS RÉEL ET DÉFIS DU SAVOIR",
    tagline: "La solution complète pour organiser des tournois de culture générale, des événements éducatifs et des shows interactifs.",
    playerPortal: {
      badge: "Pour les Participants",
      title: "Rejoindre l'Arène",
      live: "En Direct ✨",
      desc: "Entrez le code PIN à 6 chiffres et votre nom pour rejoindre la session et répondre en direct sur votre appareil.",
      pinLabel: "Code de la Salle (PIN)",
      pinPlaceholder: "Ex: 123456",
      nameLabel: "Votre Nom",
      namePlaceholder: "Ex: Thomas Martin",
      submitBtn: "Entrer dans la Salle",
      connecting: "Connexion en cours...",
      independentLink: "Portail Direct Candidat (/play)",
      deviceSupport: "Optimisé pour Mobile, Tablette & PC",
      errorEmpty: "Veuillez saisir le code PIN et votre nom",
      errorNotFound: "Cette salle n'existe pas ou la session est terminée",
      errorConnection: "Erreur de connexion serveur. Veuillez réessayer.",
    },
    displayPortal: {
      badge: "Amphithéâtre / Scène",
      title: "Écran de Projection",
      desc: "Affichage ultra haute définition pour téléviseurs et projecteurs, questions en direct, chronomètre et classement.",
      btn: "Ouvrir l'Écran",
    },
    adminPortal: {
      badge: "Organisateurs",
      title: "Centre de Contrôle (Admin)",
      desc: "Créez vos banques de questions, configurez les règles de jeu et animez des compétitions interactives.",
      btn: "Gestion & Animation",
    },
    pillars: {
      realtime: {
        title: "Infrastructure Temps Réel",
        desc: "Synchronisation ultra-rapide par WebSocket sans latence pour des centaines de joueurs simultanés.",
      },
      quizBank: {
        title: "Banque de Questions Polyvalente",
        desc: "Rédigez des QCM, associations, énigmes visuelles et médias variés en toute simplicité.",
      },
      flexibleModes: {
        title: "Modes de Jeu Flexibles",
        desc: "Format individuel ou en équipe adapté aux écoles, séminaires d'entreprise et événements publics.",
      },
      analytics: {
        title: "Résultats & Statistiques Précis",
        desc: "Calcul instantané des scores, podiums dynamiques et rapports complets exportables.",
      },
    },
    magicWheel: {
      title: "Roue Tactique Magique (Magic Wheel)",
      desc: "Arène interactive à 24 secteurs, décodage de mots cachés et multiplicateurs de points spectaculaires.",
    },
    footer: {
      brandSub: "Plateforme d'Arène de Quiz Interactif en Temps Réel",
      play: "Participer",
      display: "Projection Scène",
      admin: "Espace Admin",
      terms: "Conditions d'Utilisation",
      privacy: "Politique de Confidentialité",
      copyright: "© 2026 Quizorra. Tous droits réservés.",
      support: "Support Technique & Partenariats :",
    },
  },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.vi;
}

const I18nContext = createContext<I18nContextType>({
  language: "vi",
  setLanguage: () => {},
  t: translations.vi,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("vi");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("quizorra_lang") as Language;
      if (saved && translations[saved]) {
        setLanguageState(saved);
      }
    } catch (_) {}
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("quizorra_lang", lang);
    } catch (_) {}
  };

  const t = translations[language] || translations.vi;

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
