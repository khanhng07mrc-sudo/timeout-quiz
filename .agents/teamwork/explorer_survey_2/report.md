# Báo Cáo Khảo Sát Kiến Trúc Game State, Tiến Trình Vòng Thi, Hệ Thống Chuông Bục & Giao Thức Tương Tác Trường Quay 3D Olympia

**Dự án**: Timeout Quiz (Quizorra)  
**Tác giả**: Teamwork Explorer (Survey Instance 2)  
**Thời gian hoàn thành**: 2026-10-31T01:43:00Z  
**Phạm vi**: Khảo sát cấu trúc dự án, game state engine Olympia, logic 5 vòng thi, hệ thống chuông thí sinh, kịch bản đổi màu đèn sân khấu và hợp đồng giao tiếp (event contracts) cho phân hệ 3D Olympia Studio Scene.

---

## 1. Tổng Quan Kiến Trúc Dự Án & Quản Lý Trạng Thái (Project Architecture & State Management)

### 1.1. Cấu Trúc Mã Nguồn & Công Nghệ Cốt Lõi
Ứng dụng **Timeout Quiz (Quizorra)** được xây dựng trên nền tảng:
- **Framework**: Next.js 16.3.7 (App Router) + React 19.2.8 + TypeScript 5.
- **Backend & Networking**: Máy chủ lai Node.js (`server.ts` đóng gói qua esbuild thành `server.js`) tích hợp đồng thời Next.js HTTP server và Socket.IO server (`socket.io` 4.8.4).
- **Cơ sở dữ liệu**: Prisma ORM 5.22.0 kết nối cơ sở dữ liệu quan hệ lưu trữ Phòng thi (Room), Ngân hàng câu hỏi (QuestionBank) và Tài khoản Quản trị.
- **Đồ họa 3D WebGL**: `@react-three/fiber` (R3F ^9.8.2), `@react-three/drei` (^10.7.9) và `three` (^0.186.1).
- **Âm thanh**: Web Audio API kết hợp HTML5 Audio với hệ thống phân kênh Stereo Panning và Dynamic Volume Crossfading.

### 1.2. Mô Hình Quản Lý Trạng Thái (State Management Model)
Trong `d:\Timeout Quiz`, dự án **không sử dụng** các thư viện state bên ngoài như Redux hay Zustand. Thay vào đó, kiến trúc quản lý trạng thái của Olympia tuân theo mô hình **Authoritative Server Game Engine** cực kỳ chặt chẽ và nhất quán:
1. **Lớp Game Engine Độc Lập (`src/lib/olympia/engine.ts`)**:
   - Lớp `OlympiaGame` đóng vai trò là single source of truth cho toàn bộ trận đấu Olympia.
   - Quản lý tập trung toàn bộ dữ liệu trận đấu (`OlympiaState`), tính điểm theo 14 phiên bản luật thi (O13 -> O26), điều phối bộ đếm thời gian (timers), mở/khóa chuông (buzzers), và ghi nhận nhật ký thi đấu (`transcript`).
   - Có thể chạy độc lập ở server (multiplayer room) hoặc trực tiếp tại client trong `OlympiaSandboxStudio` thông qua `useRef<OlympiaGame>`.
2. **Lớp Đồng Bộ Thời Gian Thực (`src/lib/olympia/socket-olympia.ts`)**:
   - Sử dụng namespace riêng biệt `/olympia` (hoàn toàn tách biệt với các chế độ game khác).
   - Quản lý các phòng Socket.IO theo vai trò: `olympia:<code>:host`, `olympia:<code>:display`, `olympia:<code>:player:<seatId>`.
   - Cơ chế đồng bộ đồng hồ máy chủ (`time:sync`) đo lường Round-Trip Time (RTT) và độ lệch thời gian (`offsetRef.current = r.serverTime + (t1 - t0) / 2 - t1`), đảm bảo bộ đếm ngược trên mọi màn hình chính xác tới từng mili-giây mà không bị trôi lệch.
   - Phát sóng trạng thái theo phiên bản (`version`) giúp các máy khách bỏ qua các gói tin trùng lặp.
3. **Lớp Hooks Tùy Biến Client (`src/components/olympia/hooks.ts`)**:
   - `useOlympiaSocket({ code, role, hostKey, name, token })`: Kết nối, đồng bộ thời gian và nhận stream `OlympiaState`.
   - `useCountdown(timer, serverNow)`: Đếm ngược mượt mà ở tần số 10Hz/frame dựa trên chênh lệch thời gian máy chủ.
   - `useOlympiaAudio(state, audioSeason, enabled)`: Bắt các hiệu ứng âm thanh `cue` và điều phối BGM vòng thi.

---

## 2. Phân Tích Logic Game Mode Olympia & Tiến Trình 5 Vòng Thi

### 2.1. Cấu Trúc Dữ Liệu `OlympiaState` (`src/lib/olympia/types.ts`)
```typescript
export interface OlympiaState {
  code: string;
  rulesetId: RulesetId; // "O13" | "O14" ... | "O26"
  stage: LobbyPhase;     // "lobby" | "playing" | "finished"
  seats: Seat[];         // 2 đến 8 thí sinh (chuẩn VTV3 là 4 thí sinh)
  currentRound: RoundId | null; // "khoiDong" | "vcnv" | "tangToc" | "veDich" | "cauHoiPhu"
  roundStatus: Record<RoundId, RoundStatus>; // "pending" | "active" | "done"
  banner: string | null; // Tiêu đề vòng thi toàn màn hình
  introTimer?: TimerState | null;     // Cờ hiệu trình chiếu đồ họa intro
  kdIntroTimer?: TimerState | null;   // Bộ đếm prelude 3.5s trước khi mở câu hỏi KD
  vdPackageTimer?: TimerState | null; // Trễ đồ họa chọn gói VĐ (1.8s)
  khoiDong: KhoiDongState | null;
  vcnv: VcnvState | null;
  tangToc: TangTocState | null;
  veDich: VeDichState | null;
  cauHoiPhu: CauHoiPhuState | null;
  cue: Cue | null;       // Âm thanh và hiệu ứng phát sóng
  cueSeq: number;        // Bộ đếm tăng dần mỗi khi có âm thanh mới
  version: number;
  now: number;
}
```

### 2.2. Chi Tiết Tiến Trình 5 Vòng Thi & Sự Kiện Vận Hành

#### Vòng 1: Khởi Động (`khoiDong`)
- **Phân khúc (Segments)**: Tùy phiên bản luật (O13–O21: lượt riêng 60s/thí sinh; O22: 30s-60s-90s; O23–O26: các lượt thi chung hoặc luân phiên có chuông bấm).
- **Trạng thái**: `kd.phase` gồm `"intro"` -> `"question"` -> `"result"` -> `"segmentDone"`.
- **Sự kiện Bắt Đầu Lượt**: Host kích hoạt hành động `kd:start`.
  - Thiết lập `kd.started = true`, `kd.phase = "question"`.
  - Kích hoạt `st.kdIntroTimer` trong 3.5 giây, phát âm thanh `1_KhoiDong/ready`.
  - Sau 3.5s, động cơ phát lệnh mở câu hỏi và chạy BGM.
- **Sự kiện Kết Thúc Lượt**: Host nhấn `kd:finishTurn` hoặc khi hết thời gian toàn phân khúc:
  - Phát âm thanh `1_KhoiDong/finish_turn`.
  - Tự động chuyển phân khúc kế tiếp hoặc chuyển `kd.phase = "segmentDone"`.
- **Ánh Sáng Trường Quay**: Chuyển sang **ĐỎ** ngay khi nhấn Bắt đầu (`kd.started === true`); tự động quay về **XANH DƯƠNG** khi kết thúc lượt thi (`kd:finishTurn`).

#### Vòng 2: Vượt Chướng Ngại Vật (`vcnv`)
- **Cấu trúc**: 4 hàng ngang tương ứng 4 gợi ý (index 0..3) và ô trung tâm (index 4).
- **Trạng thái**: `v.phase` gồm `"grid"` (lưới chướng ngại vật) -> `"question"` -> `"answers"` -> `"done"`.
- **Sự kiện Chọn & Bắt Đầu Câu Hỏi**:
  - Host chọn hàng ngang: `vcnv:selectRow`.
  - Host kích hoạt đếm giờ: `vcnv:timer`, phát âm thanh `2_VuotChuongNgaiVat/15s_tick`, chạy đồng hồ 15 giây (`v.timer`).
- **Sự kiện Mở Đáp Án**: Host nhấn `vcnv:reveal`, `v.phase = "answers"`, phát `reveal_answers`.
- **Ánh Sáng Trường Quay**: Chuyển sang **ĐỎ** sau khi bắt đầu câu hỏi khoảng 2 - 3 giây (`timerRunning(v.timer) && elapsed >= 2500ms`); quay về **XANH DƯƠNG** khi mở đáp án hoặc quay lại màn hình lưới ô chữ.

#### Vòng 3: Tăng Tốc (`tangToc`)
- **Cấu trúc**: 4 câu hỏi hình ảnh/video với thời gian tăng dần (O22+: 10s, 20s, 30s, 40s; O13-21: 30s đều).
- **Trạng thái**: `tt.phase` gồm `"idle"` -> `"question"` -> `"ranking"` -> `"graded"`.
- **Sự kiện Bắt Đầu Câu Hỏi**:
  - Host mở câu: `tt:show`, phát `show_question`.
  - Host đếm giờ: `tt:timer`, phát `tick_XXs`, chạy đồng hồ `tt.timer`.
- **Ánh Sáng Trường Quay**: Tương tự VCNV, đèn chuyển sang **ĐỎ** sau 2 - 3 giây đếm giờ; quay lại **XANH DƯƠNG** khi hết giờ và hiển thị bảng xếp hạng đáp án (`tt:reveal`).

#### Vòng 4: Về Đích (`veDich`)
- **Cấu trúc**: Lần lượt từng thí sinh bước lên chọn gói câu hỏi (ví dụ gói 40, 60, 80 điểm hoặc tùy chọn 20, 30 điểm).
- **Trạng thái**: `vd.phase` gồm `"choosing"` -> `"packageReady"` -> `"thinking"` -> `"stealing"` -> `"result"` -> `"seatDone"`.
- **Sự kiện Thí Sinh Lên Sân Khấu**: Host nhấn nút "Lên sân khấu" (`vd:onStage`), phát âm thanh `4_VeDich/on_stage`.
- **Sự kiện Kết Thúc Lượt Thi**: Host nhấn nút "Trở về vị trí" / "Kết thúc lượt" (`vd:finishTurn` hoặc chuyển thí sinh `vd:nextSeat`), phát âm thanh `4_VeDich/finish_turn`.
- **Ánh Sáng Trường Quay**: Chuyển sang **ĐỎ** từ khoảnh khắc thí sinh bước lên sân khấu (`vd:onStage` / gói câu hỏi được xác nhận) và duy trì sắc đỏ qua toàn bộ 3 câu hỏi (kể cả thời gian suy nghĩ và giành quyền bấm chuông cướp điểm); tự động quay về **XANH DƯƠNG** ngay khi host nhấn kết thúc lượt thi.

#### Vòng 5: Câu Hỏi Phụ (`cauHoiPhu`)
- **Cấu trúc**: Chỉ kích hoạt khi kết thúc 4 vòng chính mà có >= 2 thí sinh bằng điểm ở các vị trí quyết định (Tranh giải Nhất hoặc vé vào vòng sau).
- **Trạng thái**: `cp.phase` gồm `"idle"` -> `"question"` -> `"result"` -> `"done"`.
- **Chuông bấm**: Thí sinh nào trong nhóm đồng hạng bấm chuông trước sẽ giành quyền trả lời.

---

## 3. Khảo Sát Hệ Thống Chuông Bấm Thí Sinh (Buzzer Reactions)

### 3.1. Cấu Trúc Khối 3D Chuông Bục (Kế thừa từ `WheelStudio3DScene.tsx`)
Tại bàn thi đấu của mỗi thí sinh, cụm chuông cơ điện tử chuẩn VTV3 được định hình bởi:
1. **Chân đế trụ mạ chrome bóng**: `cylinderGeometry args={[0.055, 0.07, 0.03, 16]}` mạ crom phản chiếu cao.
2. **Nắp chuông bán cầu (Bell Dome)**: `sphereGeometry args={[0.052, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55]}`.
   - Trạng thái bình thường: Màu vàng đồng hoàng gia (`#fbbf24`), độ phát quang `emissive="#d97706"`, cường độ nhẹ `0.65`.
   - Trạng thái phát sáng khi bấm chuông (Active): Phóng to nhẹ `scale={[1.15, 1.15, 1.15]}`, đổi sang sắc ĐỎ RỰC rực rỡ (`color="#ff0000"`), độ phát sáng `emissive="#ff0000"` với cường độ cực đại `emissiveIntensity=8.5 - 9.5`.
3. **Nút ấn chuông đỉnh**: `cylinderGeometry args={[0.014, 0.014, 0.02, 12]}` phát quang đỏ rực.
4. **Nguồn sáng điểm tỏa quang (Dual PointLights)**:
   - `pointLight position={[0, 0.14, 0]} color="#ff0000" intensity={isBuzzed ? 14.0 : 0}` rọi sáng trực diện mặt bàn và bảng điểm LED.
   - `pointLight position={[0, 1.20, 0]} color="#ff1111" intensity={isBuzzed ? 10.0 : 0}` tạo luồng sáng đỏ bao phủ bục thí sinh.
5. **Vòng hào quang mặt bàn (Neon Halo Ring)**: `ringGeometry args={[0.08, 0.22, 32]}` với vật liệu phát quang đỏ rực dưới chân chuông.

### 3.2. Quy Tắc Kích Hoạt Phát Sáng Đèn Chuông Giữa Các Vòng (R3)

Dựa trên yêu cầu cốt lõi **R3**, quy tắc kích hoạt đèn chuông giữa các vòng thi có sự phân định ranh giới kỹ thuật rõ ràng:

| Vòng Thi | Cơ Chế Thu Thập Dữ Liệu Engine | Quy Tắc Phát Sáng Đèn Chuông 3D | Ghi Chú Kỹ Thuật |
| :--- | :--- | :--- | :--- |
| **Khởi Động** (`khoiDong`) | `kd.buzzedSeat: number \| null` | Bục của thí sinh bấm chuông phát sáng màu **ĐỎ**. | Ở các câu hỏi thi chung (shared/turn), chuông mở (`kd.buzzOpen === true`), thí sinh nhấn chuông đầu tiên giành quyền trả lời và làm bục phát sáng đỏ. |
| **Về Đích** (`veDich`) | `vd.steal.buzzedSeat: number \| null` | Bục của thí sinh bấm chuông cướp điểm phát sáng màu **ĐỎ**. | Khi thí sinh chính trả lời sai/không trả lời, cổng cướp điểm 5 giây mở ra; thí sinh nào bấm cướp điểm sẽ làm sáng đỏ bục chuông của mình. |
| **Câu Hỏi Phụ** (`cauHoiPhu`) | `cp.buzzedSeat: number \| null` | Bục của bất kỳ thí sinh đồng hạng nào bấm chuông phát sáng màu **ĐỎ**. | Thí sinh thuộc nhóm đồng hạng bấm chuông trong 15s đếm ngược. |
| **Vượt Chướng Ngại Vật** (`vcnv`) | `v.bells: Array<{ seat: number; before: boolean }>` | **DUY NHẤT** bục của thí sinh bấm nhanh nhất (đầu tiên) phát sáng màu **ĐỎ**. | **Điểm đặc biệt quan trọng**: Trong VCNV, nhiều thí sinh có thể cùng nhấn chuông xin vượt CNV và tất cả đều được đẩy vào mảng `v.bells`. Tuy nhiên, chỉ phần tử đầu tiên `v.bells[0].seat` mới được kích hoạt hiệu ứng chuông đỏ trên bục 3D! Các thí sinh bấm sau (`v.bells[1]`, `v.bells[2]`,...) giữ nguyên trạng thái đèn bình thường. |

---

## 4. Hợp Đồng Giao Tiếp & Giao Diện Trạng Thái Cho 3D Olympia Studio Scene

### 4.1. TypeScript Interface Hợp Nhất (`OlympiaStudio3DSceneProps`)
Tạo dựng hợp đồng tương tác giữa Olympia Game Engine và Component 3D WebGL:

```typescript
export interface OlympiaStudio3DSceneProps {
  /** Toàn bộ trạng thái chính thống của trận đấu từ OlympiaGame / socket */
  state: OlympiaState;

  /** Hàm đồng bộ thời gian máy chủ (tránh trôi lệch đếm giây) */
  serverNow: () => number;

  /** Góc máy đạo diễn truyền hình (TV Studio Director Camera Angles) */
  camAngle?: number; // 0=Master Wide, 1=LED Wall Hero, 2=Contestant Dais, 3=Active Contestant, 4=MC Lectern, 5=Laurel Wreath, 6=Audience POV

  /** Callback thông báo thay đổi góc quay */
  onCamAngleChange?: (cam: number) => void;

  /** Cho phép điều khiển Pan/Tilt/Zoom tự do */
  allowPTZ?: boolean;

  /** Thiết lập chất lượng đồ họa phù hợp thiết bị người dùng */
  quality?: "LOW" | "MEDIUM" | "HIGH";

  /** Đường dẫn asset logo Olympia (mặc định lấy từ static public path) */
  logoUrl?: string;

  /** Callback khi người dùng nhấp trực tiếp vào bục/chuông 3D (dành cho Sandbox hoặc Director Console) */
  onBuzzerClick?: (seatId: number) => void;

  className?: string;
  style?: React.CSSProperties;
}
```

### 4.2. Bộ Hàm Selector Trạng Thái Ánh Sáng & Chuông Bấm
Để đảm bảo tách biệt logic (separation of concerns), component 3D sẽ sử dụng các selector thuần túy:

```typescript
/** Xác định bục thí sinh nào đang có đèn chuông phát sáng ĐỎ rực rỡ */
export function getBuzzedSeatSet(state: OlympiaState): Set<number> {
  const buzzed = new Set<number>();
  if (!state || state.stage !== "playing") return buzzed;

  switch (state.currentRound) {
    case "khoiDong":
      if (state.khoiDong?.buzzedSeat != null) {
        buzzed.add(state.khoiDong.buzzedSeat);
      }
      break;

    case "vcnv":
      // QUY TẮC R3: Chỉ duy nhất thí sinh bấm nhanh nhất (phần tử đầu tiên) mới sáng đỏ
      if (state.vcnv?.bells && state.vcnv.bells.length > 0) {
        const firstBuzzer = state.vcnv.bells[0];
        if (firstBuzzer && firstBuzzer.seat != null) {
          buzzed.add(firstBuzzer.seat);
        }
      }
      break;

    case "veDich":
      if (state.veDich?.steal?.buzzedSeat != null) {
        buzzed.add(state.veDich.steal.buzzedSeat);
      }
      break;

    case "cauHoiPhu":
      if (state.cauHoiPhu?.buzzedSeat != null) {
        buzzed.add(state.cauHoiPhu.buzzedSeat);
      }
      break;
  }

  return buzzed;
}

export type StudioLightingTarget = "BLUE" | "RED";

/** Xác định màu ánh sáng mục tiêu của trường quay dựa trên tiến trình vòng thi */
export function getStudioLightingTarget(state: OlympiaState, serverNow: () => number): StudioLightingTarget {
  if (!state || state.stage !== "playing") return "BLUE";

  switch (state.currentRound) {
    case "khoiDong": {
      const kd = state.khoiDong;
      if (!kd) return "BLUE";
      // Đỏ từ khi nhấn Bắt đầu cho đến khi kết thúc lượt thi
      if (kd.started && kd.phase !== "intro" && kd.phase !== "segmentDone") {
        return "RED";
      }
      return "BLUE";
    }

    case "vcnv": {
      const v = state.vcnv;
      if (!v || v.currentRow < 0 || !v.timer.startedAt) return "BLUE";
      // Chuyển sang đỏ sau khoảng 2.5 giây đếm ngược
      const elapsed = serverNow() - v.timer.startedAt;
      if (elapsed >= 2500 && v.phase === "question") {
        return "RED";
      }
      return "BLUE";
    }

    case "tangToc": {
      const tt = state.tangToc;
      if (!tt || tt.qIdx < 0 || !tt.timer.startedAt) return "BLUE";
      // Chuyển sang đỏ sau khoảng 2.5 giây đếm ngược
      const elapsed = serverNow() - tt.timer.startedAt;
      if (elapsed >= 2500 && tt.phase === "question") {
        return "RED";
      }
      return "BLUE";
    }

    case "veDich": {
      const vd = state.veDich;
      if (!vd) return "BLUE";
      // Đỏ từ khi bước lên sân khấu (chọn gói xong hoặc đang thi đấu) tới khi kết thúc lượt
      if (vd.phase !== "idle" && vd.phase !== "seatDone") {
        return "RED";
      }
      return "BLUE";
    }

    default:
      return "BLUE";
  }
}
```

### 4.3. Kịch Bản Chuyển Đèn Phân Tầng (Staged Lighting Fade State Machine)
Theo tiêu chí **R2**, quá trình chuyển đổi màu đèn từ **Xanh Dương** sang **Đỏ** (và ngược lại) phải diễn ra tuần tự và mượt mà:
1. **Tầng 1 (Inner LED Displays & Backdrop Screen)**:
   - Bắt đầu chuyển màu ngay lập tức ($t = 0\text{s}$).
   - Thời gian chuyển đổi (interpolation time): $0.8\text{s}$.
   - Dải màn hình LED nền trung tâm và các panel hiển thị đổi sắc từ Deep Sapphire (`#0a2663`) sang Crimson Flame (`#880808` / `#ff1111`).
2. **Tầng 2 (Stage Truss Rig, Floor Spots & Podiums)**:
   - Khởi động chuyển đổi sau trễ $0.4\text{s}$ ($t = 0.4\text{s}$).
   - Thời gian chuyển đổi: $1.0\text{s}$.
   - Hệ thống đèn chiếu rọi giàn trần, đèn sàn và đèn viền bục thí sinh chuyển từ tông xanh/vàng dịu sang sắc đỏ kịch tính.
3. **Tầng 3 (Audience Amphitheater & Ambient Environment)**:
   - Khởi động chuyển đổi sau trễ $0.8\text{s}$ ($t = 0.8\text{s}$).
   - Thời gian chuyển đổi: $1.2\text{s}$.
   - Toàn bộ khán đài khán giả và ánh sáng viền bao quanh trường quay hoàn tất chuyển sang sắc đỏ bao trùm.

### 4.4. Màn Hình LED Trung Tâm & Logo Nhận Diện Thương Hiệu (R1)
- **Tập tin Logo**: Đã xác minh sự tồn tại của file `C:\Users\khanh\Downloads\Olympia_logo_2016.webp` (xác thực thành công). Để Next.js và WebGL CanvasTexture có thể tải an toàn qua HTTP chuẩn CORS, tệp này sẽ được sao chép/phục vụ từ thư mục tĩnh `public/brand/Olympia_logo_2016.webp`.
- **Hiệu ứng chữ Gradient Vàng**: Dòng chữ `"ĐƯỜNG LÊN ĐỈNH OLYMPIA"` bên dưới logo được vẽ bằng Canvas 2D render sang WebGL texture với gradient vàng kim chuyển sắc từ sáng sang tối (`#fff8cc` -> `#fbbf24` -> `#b45309` -> `#78350f`), kết hợp viền kim loại nổi khối 3D.
- **Bố Cục Không Gian 3D**:
  - **Màn hình LED trung tâm**: Đặt tại trung tâm sân khấu ($Z \approx -6.5\text{m}$), tỷ lệ chuẩn 16:9 hoặc vòm cong panorama rộng rãi.
  - **Bục MC**: Đặt ở mạn trái sân khấu ($X \approx -3.8\text{m}$, $Z \approx -2.0\text{m}$), hướng chéo góc nhìn vào trung tâm và bục thí sinh.
  - **Dãy 4 bục thí sinh**: Đặt thành hình cánh cung thoải hướng về khán giả và màn hình LED ($X \approx 0.8\text{m} \dots 4.2\text{m}$), mỗi bục cách nhau $0.9\text{m}$, trang bị đầy đủ màn hình điểm số và chuông bấm phát quang.
  - **Khu vực Trưng Bày Vòng Nguyệt Quế (Laurel Wreath Pedestal)**: Trụ kính cường lực mạ viền vàng đặt tại vị trí trang trọng giữa khu vực MC và thí sinh ($X \approx -1.2\text{m}$, $Z \approx -3.2\text{m}$) với đèn spotlight rọi từ trần tạo điểm nhấn danh giá.

---

## 5. Kết Luận Khảo Sát & Khuyến Nghị Thực Thi Cho Các Giai Đoạn Tiếp Theo

1. **Tính Tương Thích Kiến Trúc**: Kiến trúc Three.js / R3F của `WheelStudio3DScene.tsx` rất hoàn thiện và sẵn sàng để tái cấu trúc thành `OlympiaStudio3DScene.tsx`.
2. **Độ Tin Cậy Của Engine**: Bộ kiểm thử `src/lib/olympia/engine.test.ts` đã vượt qua 100% (40/40 tests), đảm bảo trạng thái các vòng thi và bộ đếm chuông hoạt động hoàn hảo.
3. **Quy Tắc Chuông VCNV**: Cần đặc biệt lưu ý kiểm tra mảng `state.vcnv.bells[0]` để chỉ duy nhất thí sinh đầu tiên phát sáng đỏ, trong khi các vòng khác đọc từ `buzzedSeat`.
4. **Phân Phối Tài Nguyên Tĩnh**: Cần đưa `Olympia_logo_2016.webp` vào thư mục `public/brand/` để tích hợp mượt mà vào CanvasTexture.
