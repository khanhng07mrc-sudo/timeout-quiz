# Handoff Report — Explorer Survey 1

**Task**: Ve Dich State Machine, Transition Flows, Arrow Animation & Host Controls Investigation (Requirements R1, R2, R3).  
**Working Directory**: `d:\Timeout Quiz\.agents\teamwork\explorer_survey_1`  
**Reference Document**: `d:\Timeout Quiz\.agents\teamwork\ORIGINAL_REQUEST.md` & `analysis.md`

---

## 1. Observation

### Observation 1.1: Khởi tạo vòng Về Đích ép thẳng vào `phase = "choosing"` và đè âm thanh
Tại `src/lib/olympia/engine.ts:652-655` và `756-779`:
```ts
652:             : round === "veDich"
653:               ? "4_VeDich/start_round"
654:               : "5_CauHoiPhu/open_question"
655:     );
...
756:       case "veDich": {
757:         const initialOrder = [...active];
758:         if (this.ruleset.veDich.turnOrderMode === "highest_unplayed" && initialOrder.length > 1) {
759:           initialOrder.sort((a, b) => (this.seat(b)?.score ?? 0) - (this.seat(a)?.score ?? 0) || a - b);
760:         }
761:         st.veDich = {
762:           order: initialOrder,
763:           turnIdx: 0,
764:           playedSeats: [],
765:           phase: "choosing",
766:           packages: {},
767:           qIdx: -1,
768:           current: null,
769:           timer: mkTimer(15000),
770:           steal: null,
771:           hopeStarUsed: [],
772:           hopeStarActive: false,
773:           deductedOnSteal: false,
774:           pointers: {},
775:           usedKeys: [],
776:           lastVerdict: null,
777:         };
778:         this.cue("4_VeDich/choose_package");
779:         break;
780:       }
```
Lệnh `this.cue("4_VeDich/start_round")` ở dòng 653 bị ghi đè ngay lập tức bằng `this.cue("4_VeDich/choose_package")` ở dòng 778. `st.veDich.phase` bị gán thẳng thành `"choosing"`.

### Observation 1.2: DisplayScreen lập tức hiển thị bảng chọn gói khi vào vòng Về Đích
Tại `src/components/olympia/DisplayScreen.tsx:73-83` và `778-780`:
```ts
73:     case "veDich": {
74:       const vd = state.veDich;
75:       if (!vd || vd.phase === "seatDone") return false;
76:       return (
77:         vd.phase === "choosing" ||
78:         vd.phase === "packageReady" ||
79:         vd.phase === "thinking" ||
80:         vd.phase === "stealing" ||
81:         vd.phase === "result"
82:       );
83:     }
...
778:       {vd.phase !== "result" && (isChoosing || isPackageIntroTime) && (
779:         <VeDichSlantedGridGraphic state={state} />
780:       )}
```
Vì `vd.phase === "choosing"`, `hasActiveRoundContent(state)` trả về `true` ngay khi vào vòng, và `isChoosing = true` khiến component `VeDichSlantedGridGraphic` được render ngay lập tức.

### Observation 1.3: Nút "Lên sân khấu" và chọn thí sinh không reset về trạng thái chờ
Tại `src/lib/olympia/engine.ts:2937-2941` và `2972`:
```ts
2937:       case "vd:onStage": {
2938:         vd.onStage = true;
2939:         this.cue("4_VeDich/on_stage");
2940:         return OK;
2941:       }
...
2972:         vd.phase = vd.packages[vd.order[idx]] ? "packageReady" : "choosing";
```
`vd:onStage` chỉ bật cờ `onStage = true` nhưng không chạm tới `vd.phase` (vốn đã bị `"choosing"` từ trước). Trong khi đó, `vd:setSeat` và `vd:nextSeat` (dòng 3249) cũng ép `phase = "choosing"`.

### Observation 1.4: Lỗi lệch tâm 64px của cặp mũi tên trong `V3ArrowShell.tsx`
Tại `src/components/olympia/V3ArrowShell.tsx:159-163`:
```ts
159:   const dcConverge = canvasW / 2 - shell.startX / 2;
160:   const cssVars = {
161:     ["--v3a-dc" as string]: `${canvasW / 2 - shell.cThick}px`,
162:     ["--v3a-dc-converge" as string]: `${dcConverge}px`,
163:   } as React.CSSProperties;
```
Chạy thử nghiệm tại `test_arrows.cjs`:
- $W = 1080$, $\text{startX} = 64$, $\text{canvasW} = 1208$, $X_{center} = 604$.
- Code hiện tại: `dcConverge = 604 - 32 = 572px`.
- Mũi tên trái dừng tại: $64 + 572 = 636\text{px}$ (+32px qua tâm).
- Mũi tên phải dừng tại: $(64 + 1080) - 572 = 572\text{px}$ (-32px trước tâm).
- Lệch tâm giữa 2 mũi tên: **64px** ($=\text{startX}$).
- Khi sửa `dcConverge = shell.W / 2 = 540px`: Mũi tên trái $= 604\text{px}$, Mũi tên phải $= 604\text{px}$ (khớp tâm 100%, sai số = **0.000px**).

### Observation 1.5: Timer ngầm 2000ms làm lộ khung câu hỏi trước khi Host bấm bắt đầu
Tại `src/components/olympia/DisplayScreen.tsx:771-773` và `791`:
```tsx
771:   const isPackageIntroTime = Boolean(
772:     hasPkg && !cur && pkgTimer?.startedAt && serverNow() - pkgTimer.startedAt < 2000
773:   );
...
791:       ) : cur || (hasPkg && !isPackageIntroTime) ? (
792:         state.themeMode === "o26_classic" ? (
...
821:           <EconovaLowerThirdV3
...
828:             questionNumberBadge={
829:               cur
830:                 ? `Câu ${vd.qIdx + 1}/${vd.packages[owner]?.length || 3}`
831:                 : `Câu ${Math.max(1, vd.qIdx + 1)}/${vd.packages[owner]?.length || 3}`
832:             }
```
Sau khi xác nhận gói, `isPackageIntroTime` đếm 2 giây rồi biến thành `false`. Ngay khi đó, `(hasPkg && !isPackageIntroTime)` trở thành `true`, khiến `DisplayScreen` unmount `VeDichSlantedGridGraphic` và hiển thị ngay khung câu hỏi `EconovaLowerThirdV3` với nhãn `Câu 1/3` dù Host chưa bấm `vd:startQuestion`.

---

## 2. Logic Chain

1. **Từ Observation 1.1**: Vì `beginRound("veDich")` gán `phase = "choosing"` và phát `choose_package` đè lên `start_round`, hệ thống ngay từ thời điểm Host nhấn "Về đích" đã không phát trọn vẹn intro mà bị nhảy cóc vào trạng thái chọn gói.
2. **Từ Observation 1.2 & 1.3**: Vì `DisplayScreen` hiển thị bảng gói dựa trên `vd.phase === "choosing"`, và `vd:onStage` / `vd:setSeat` duy trì `phase === "choosing"`, màn hình chiếu luôn hiển thị bảng chọn gói ngay từ đầu, khiến nút "Lên sân khấu" không có không gian để phát nhạc chào đón thí sinh độc lập.
3. **Từ Observation 1.4**: Vỏ mũi tên có gốc tọa độ vẽ tại `startX`. Khoảng cách từ đỉnh nhọn mũi tên tới tâm canvas $\frac{\text{canvasW}}{2}$ đúng bằng $\frac{W}{2}$. Việc code dùng $\frac{\text{canvasW}}{2} - \frac{\text{startX}}{2}$ đã gây sai số tịnh tiến đúng $\frac{\text{startX}}{2}$ ở mỗi bên, dẫn tới khe hở lệch tâm 64px.
4. **Từ Observation 1.5**: Khi xác nhận gói, `phase = "packageReady"` và `cur = null`. Logic điều kiện hiển thị trong `DisplayScreen.tsx` phụ thuộc vào `!isPackageIntroTime` (timer ngầm 2000ms). Hết 2 giây, giao diện tự động bật khung câu hỏi dù `cur` chưa tồn tại, vi phạm yêu cầu giữ nguyên thông tin gói đã chọn cho tới khi Host bấm bắt đầu câu hỏi 1.
5. **Suy ra**: Để giải quyết triệt để R1, R2, R3, cần tái cấu trúc FSM Về Đích qua 5 pha rõ ràng: `idle` (intro) -> `idle` + `onStage` (lên sân khấu) -> `choosing` (mở bảng gói qua nút của Host) -> `packageReady` (giữ nguyên bảng gói đã chọn) -> `thinking` (chỉ mở khung câu 1 khi Host bấm `vd:startQuestion`); đồng thời sửa công thức `dcConverge = shell.W / 2` và thêm `scale()` cho keyframes.

---

## 3. Caveats

- **Phần thi phụ (CauHoiPhu)**: CauHoiPhu diễn ra sau Về đích khi có đồng điểm, không bị ảnh hưởng bởi FSM Về đích nhưng dùng chung một số cơ chế chuông steal và layout màn hình.
- **Tương thích test suites cũ**: Trong `engine.test.ts`, một số test trước đây gọi thẳng `vd:choosePackage` sau `game:start`. Khi sửa `beginRound` khởi tạo ở `phase = "idle"`, các unit test đó cần gọi `vd:showPackageGraphic` trước khi `vd:choosePackage` hoặc test helper cần được bổ sung bước này.
- **Không có thêm caveats khác**. Toàn bộ mã nguồn đã được typecheck (`npx tsc --noEmit` exit code 0) và test (`npm run test:olympia` 51/51 pass, `npm test` 97/97 pass).

---

## 4. Conclusion

1. **Requirement R1**: Chuyển đổi trạng thái ban đầu của Về đích từ `"choosing"` sang `"idle"`, bảo toàn cue `4_VeDich/start_round`. Nút "Lên sân khấu" chỉ chuyển `onStage = true`, phát `4_VeDich/on_stage`. Chỉ khi Host nhấn "Mở bảng chọn gói đồ họa" (`vd:showPackageGraphic`), hệ thống mới kích hoạt `phase = "choosing"` và cue `4_VeDich/choose_package`.
2. **Requirement R2**: Sửa công thức `dcConverge = shell.W / 2` trong `V3ArrowShell.tsx` loại bỏ hoàn toàn sai số lệch tâm 64px (sai số về 0.000px). Bổ sung `scale(0.15)` tại 0% cho keyframe `v3a-wing-l` và `v3a-wing-r` để tạo hiệu ứng zoom các lớp khi xuất hiện.
3. **Requirement R3**: Sửa điều kiện render trong `DisplayScreen.tsx`: duy trì `VeDichSlantedGridGraphic` trong suốt pha `packageReady` (khi `!cur`). Khung câu hỏi `EconovaLowerThirdV3` hoặc `Vtv3ChalkboardQuestionFrame` chỉ được render khi `cur != null` và `vd.phase === "thinking" || vd.phase === "stealing"`.

---

## 5. Verification Method

1. **Chạy kiểm tra kiểu tĩnh (TypeScript typecheck)**:
   ```powershell
   cd "d:\Timeout Quiz"; npx tsc --noEmit
   ```
   *Kỳ vọng*: Mã thoát code 0, không có lỗi kiểu.

2. **Chạy test suites Olympia engine & E2E**:
   ```powershell
   cd "d:\Timeout Quiz"; npm run test:olympia
   cd "d:\Timeout Quiz"; npm test
   ```
   *Kỳ vọng*: 100% tests pass.

3. **Chạy script kiểm tra toán học căn giữa mũi tên**:
   ```powershell
   cd "d:\Timeout Quiz"; node .agents/teamwork/explorer_survey_1/test_arrows.cjs
   ```
   *Kỳ vọng*: `Match target center exactly? true` với `Left tip = 604`, `Right tip = 604`.

4. **Kiểm tra trực quan WebGL / DOM (5 ảnh màn hình theo R5)**:
   - State 1: Nhấn Về Đích -> Chỉ có banner Về Đích, CAM 1/3, đèn xanh, KHÔNG có bảng chọn gói.
   - State 2: Nhấn Lên sân khấu -> CAM 15, đèn đỏ, nhạc on_stage, KHÔNG có bảng chọn gói.
   - State 3: Nhấn Mở bảng chọn gói -> Cặp mũi tên zoom & căn giữa đối xứng -> Mở bảng chọn gói.
   - State 4: Xác nhận gói -> Lưới điểm hiển thị gói đã chọn, câu hỏi 1 KHÔNG xuất hiện.
   - State 5: Host bấm Câu tiếp / Bắt đầu câu 1 -> Khung câu hỏi xuất hiện với nội dung câu 1.
