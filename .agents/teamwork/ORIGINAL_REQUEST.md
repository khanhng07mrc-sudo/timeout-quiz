# Original User Request

## Initial Request — 2026-11-11T09:02:43Z

Đội ngũ đầy đủ (Full team): Khắc phục triệt để lỗi luồng chuyển cảnh khi nhấn tên phần thi Về đích, hoàn thiện hiệu ứng cặp mũi tên đi vào (twin arrows), sửa lỗi lộ câu hỏi đầu tiên sau khi chọn gói câu hỏi, chụp screenshot WebGL/DOM xác minh, và triển khai bản build lên production VPS cho Timeout Quiz. Bắt buộc thực hiện bước duyệt kế hoạch chi tiết (/plan) trước khi chỉnh sửa mã nguồn.

Working directory: d:\Timeout Quiz
Integrity mode: development

STRICT CONSTRAINT: Tuyệt đối không xóa hoặc sửa file ngoài thư mục d:\Timeout Quiz (các file và thư mục bên ngoài như d:\Olympia 26 chỉ được phép đọc nhằm mục đích phân tích, tham chiếu logic). Không ghi mã khóa bí mật hoặc thông tin SSH trực tiếp vào git.

## Requirements

### R1. Chuẩn hóa luồng chuyển cảnh và kích hoạt bảng chọn gói phần thi Về đích
- Khi nhấn vào tên phần thi Về đích: hệ thống chỉ phát intro vòng thi, tuyệt đối không nhảy ngay vào giao diện lựa chọn gói câu hỏi.
- Khi nhấn nút "Lên sân khấu": hệ thống tiếp tục phát nhạc, không chuyển sang giao diện lựa chọn gói câu hỏi.
- Chỉ khi Host/MC nhấn nút "Mở bảng chọn gói" (hoặc trigger tương ứng): hệ thống mới kích hoạt hiệu ứng chuyển cảnh cặp mũi tên và mở giao diện lựa chọn gói câu hỏi cho thí sinh.

### R2. Hoàn thiện hiệu ứng cặp mũi tên đi vào (Twin Arrows Animation)
- Tái sử dụng animation/đồ họa cặp mũi tên sẵn có trong dự án.
- Khắc phục lỗi căn chỉnh: đảm bảo cặp mũi tên được căn giữa (center alignment) chuẩn xác trên màn hình thi đấu và các giao diện hiển thị.
- Bổ sung hiệu ứng zoom cho các lớp mũi tên khi bắt đầu xuất hiện hoạt ảnh.

### R3. Khắc phục lỗi hiển thị sớm câu hỏi đầu tiên sau khi chọn gói
- Sau khi thí sinh hoàn tất việc chọn gói câu hỏi (ví dụ: gói 40, 60, 80 điểm...) và xác nhận, giao diện chỉ hiển thị thông tin gói câu hỏi đã chọn.
- Tuyệt đối không làm lộ hoặc hiển thị nội dung câu hỏi đầu tiên ngay lúc chọn xong gói.
- Nội dung câu hỏi đầu tiên chỉ được phép hiển thị khi Host/MC bấm nút hoặc phím kích hoạt bắt đầu câu hỏi.

### R4. Kế hoạch kỹ thuật và cổng phê duyệt (/plan)
- Trước khi chỉnh sửa bất kỳ file mã nguồn ứng dụng nào, nhóm phải phân tích codebase và đệ trình bản kế hoạch kỹ thuật chi tiết (phân tích nguyên nhân gốc rễ, phác thảo thay đổi state machine / UI / CSS/3D, và kế hoạch kiểm thử) để người dùng xem xét và phê duyệt trước khi tiến hành viết code.

### R5. Xác minh hiển thị trực quan qua Screenshot WebGL / DOM
- Sau khi hoàn thành code và vượt qua các bài kiểm thử tự động, sử dụng trình duyệt chụp ảnh màn hình (screenshots) thực tế ghi nhận 5 trạng thái luồng thi Về đích:
  1. Nhấn tên phần thi Về đích (chỉ phát intro, không mở bảng chọn gói).
  2. Nhấn nút "Lên sân khấu" (chỉ phát nhạc, không mở bảng chọn gói).
  3. Nhấn nút "Mở bảng chọn gói" (hiển thị hiệu ứng cặp mũi tên căn giữa + zoom các lớp, sau đó mở bảng chọn gói).
  4. Trạng thái sau khi xác nhận chọn gói (chỉ hiển thị thông tin gói, câu hỏi 1 chưa hiển thị).
  5. Host kích hoạt hiển thị câu hỏi 1 (nội dung câu hỏi 1 xuất hiện).
- Cung cấp đường dẫn các file ảnh chụp màn hình trong báo cáo nghiệm thu.

### R6. Git Push và Triển khai Production VPS
- Sau khi toàn bộ kiểm thử tự động, typecheck (`npx tsc --noEmit`), build (`npm run build`) và kiểm tra visual screenshot thành công: commit sạch sẽ và push lên nhánh `origin/main` của repository `d:\Timeout Quiz`.
- Tiến hành deploy lên VPS production (`https://quizorra.ddns.net` qua script `deploy-vps.sh`) và kiểm tra endpoint `https://quizorra.ddns.net/api/health` trả về HTTP 200 với commit mới. Nếu subagent không có quyền SSH trực tiếp tới VPS `103.161.180.142`, chuẩn bị commit sạch đã push lên `origin/main` và bàn giao lại cho agent cha để thực hiện lệnh deploy lên VPS; tuyệt đối không lưu credentials trong git.

## Verification Resources
- Sử dụng các test suite và script kiểm thử hiện có trong `d:\Timeout Quiz` (`npm run test:olympia`, `npm test`, `npx tsc --noEmit`, `npm run build`).
- Đội ngũ triển khai tự xây dựng kịch bản kiểm thử tự động / integration tests mô phỏng các luồng trạng thái Về đích.
- Script chụp ảnh màn hình trình duyệt (Puppeteer / Playwright hoặc test runner có sẵn) để sinh ảnh chụp màn hình WebGL/DOM xác minh.
- Script deploy hiện có `deploy-vps.sh` và endpoint kiểm tra `https://quizorra.ddns.net/api/health`.

## Acceptance Criteria

### Kế hoạch triển khai (/plan)
- [ ] Kế hoạch kỹ thuật chi tiết được trình bày và được phê duyệt trước khi tiến hành sửa đổi mã nguồn.

### Luồng chuyển cảnh & Kích hoạt bảng chọn gói
- [ ] Nhấn vào tên phần thi Về đích chỉ phát intro, không chuyển trạng thái sang giao diện chọn gói câu hỏi.
- [ ] Nhấn nút "Lên sân khấu" chỉ phát nhạc, không chuyển trạng thái sang giao diện chọn gói câu hỏi.
- [ ] Chỉ khi nhấn nút "Mở bảng chọn gói", hiệu ứng cặp mũi tên mới kích hoạt và sau đó hiển thị bảng chọn gói câu hỏi.

### Đồ họa & Hiệu ứng cặp mũi tên
- [ ] Cặp mũi tên được căn giữa chính xác trên màn hình hiển thị trong suốt quá trình hoạt ảnh di chuyển vào.
- [ ] Các lớp mũi tên có hiệu ứng zoom khi bắt đầu xuất hiện hoạt ảnh.

### Hiển thị nội dung câu hỏi
- [ ] Sau khi thí sinh chọn xong gói câu hỏi, màn hình chỉ hiển thị thông tin gói câu hỏi đã chọn (điểm số/cấu trúc gói).
- [ ] Nội dung văn bản/hình ảnh của câu hỏi đầu tiên hoàn toàn không xuất hiện cho đến khi Host/MC thực hiện thao tác bắt đầu câu hỏi.
- [ ] Khi Host/MC bấm nút/phím bắt đầu câu hỏi 1, nội dung câu hỏi 1 hiển thị đầy đủ và chính xác.

### Xác minh hình ảnh trực quan (Visual Screenshots)
- [ ] Chụp đầy đủ 5 ảnh màn hình thực tế (screenshots) WebGL/DOM xác minh: (1) Intro không có bảng chọn gói, (2) Lên sân khấu không có bảng chọn gói, (3) Mở bảng chọn gói với hiệu ứng mũi tên căn giữa và zoom, (4) Xác nhận chọn gói chỉ hiện thông tin gói, (5) Host kích hoạt hiển thị câu hỏi 1.
- [ ] Đường dẫn các file ảnh chụp màn hình được cung cấp rõ ràng trong báo cáo nghiệm thu.

### Kiểm thử, Build & Triển khai VPS
- [ ] Toàn bộ kịch bản kiểm thử tự động mới và test suites hiện có chạy thành công (100% pass rate).
- [ ] Lệnh kiểm tra kiểu dữ liệu `npx tsc --noEmit` và lệnh build `npm run build` hoàn tất không có lỗi.
- [ ] Commit thay đổi sạch sẽ được push lên `origin/main` của `d:\Timeout Quiz`.
- [ ] Ứng dụng production trên VPS `https://quizorra.ddns.net` chạy đúng commit mới, `https://quizorra.ddns.net/api/health` trả về HTTP 200 (hoặc bàn giao commit sạch trên `origin/main` cho agent cha nếu thiếu SSH trực tiếp).
- [ ] Không có bất kỳ file nào bên ngoài thư mục `d:\Timeout Quiz` bị sửa đổi hoặc xóa bỏ; không lưu credentials vào git.


## Follow-up — 2026-11-11T09:39:37Z

Received Progress Update #4. The detailed plan has been formatted and presented to the user for approval (including the note that `useOlympiaCamera.ts` and `Podiums.tsx` also need to recognize `vd.onStage === true` while `vd.phase === "idle"` so "Lên sân khấu" triggers the center-podium walkout & CAM 10 -> CAM 15 transition cleanly without opening the package board).

Please remain paused at the `/plan` gate silently (do not send periodic reminder pings while waiting) until I send you the user's explicit approval or revision feedback.


## Follow-up — 2026-11-11T09:40:09Z

Plan APPROVED (Proceed / Approve) by the user!

You are cleared to proceed immediately with execution of Milestones 1–4 per the approved plan:
1. Remember to keep `useOlympiaCamera.ts` (`evaluateVeDichCameraState`, `vdOnStageEnteredAtRef`) and `Podiums.tsx` (`VeDichWalkingContestant`) synced with `vd.phase === "idle"` + `vd.onStage === true` so clicking "Lên sân khấu" runs the walkout & CAM 10 -> CAM 15 cleanly without opening the package board, and transitioning to `phase === "choosing"` ("Mở bảng chọn gói đồ họa") does not reset walkout state.
2. Verify all R1, R2 (`dc = shell.W / 2`, remove `50vw`, `transform-box: fill-box; transform-origin: center;`, multi-layer zoom animation, center-viewport `VeDichSlantedGridGraphic` reusing animated twin-arrow entry), R3 (remove `vdPackageTimer` 1.8s auto-open & 2000ms `isPackageIntroTime` leakage, mask unrevealed question content in public state, clean `N` hotkey & `[▶ Bắt đầu Câu 1 (N)]` host control).
3. Capture all 5 real WebGL/DOM verification screenshots (`state_1_intro`, `state_2_onstage`, `state_3_arrows_package`, `state_4_package_confirmed`, `state_5_question1_active`) and inspect/verify them directly.
4. Run full verification AFTER final code edits (`npx tsc --noEmit`, `npm run test:olympia`, `npm run test:olympia-3d`, `npm test`, `npm run build`), verify `d:\Timeout Quiz\AGENTS.md` and external directories (`d:\Olympia 26`) remain untouched, commit & push cleanly to `origin/main` (no credentials in git), and either run `deploy-vps.sh` (if direct SSH works) or hand off the clean pushed `origin/main` commit + screenshot paths to me for immediate VPS deployment and final verification.

Go ahead with Milestone 1!


## Follow-up — 2026-11-11T09:41:24Z

CRITICAL ADDITIONAL USER REQUIREMENT FOR R3 (just received from user):
Exact user words:
"không chỉ ẩn câu hỏi, mà index câu hỏi vẫn duy trì ở 0, chỉ lên 1 khi đã nhấn chuyển câu lần đầu, hạn chế các lỗi bổ sung như chỉ ẩn nên vẫn tồn tại trong cache"

Please enforce ALL parts of this strictly in Milestones 1, 3, and 4:
1. **Question index starts & remains at 0 before first question transition (like Khởi Động's `Câu 0/N`)**:
   - After confirming package (`phase === "packageReady"`), internal `qIdx` MUST stay `-1` (1-based display index `0`, e.g., `0 / 3` or `Câu 0/3`), NOT `1` (`qIdx = 0`)!
   - The question index ONLY advances from `0` to `1` (`qIdx: -1 -> 0`, displaying `1 / 3`) when Host presses the question-advance / start-question button or shortcut key (`"Chuyển câu"` / `"Bắt đầu câu"` / `N`) **for the first time**!
   - Check how `KhoiDong` handles `qIdx = -1` / `Câu 0/6` in `engine.ts`, `DisplayScreen.tsx`, and `HostConsole.tsx` so Về Đích follows the exact same bug-free pattern (and make sure pressing "Chuyển câu" once goes cleanly to Question 1, NOT skipping straight to Question 2!).
2. **True non-existence / zero-cache guarantee (NEVER CSS-hide or pre-populate Question 1)**:
   - NEVER mount Question 1's text, answer, media URL, or DOM nodes (no `hidden`/`opacity-0`/cached `current` object).
   - Keep `vd.current === null` and `qIdx === -1` until the first question-advance action.
   - Strip unrevealed question data (`q`, `a`, `media`, `mediaType`, etc.) from `vd.packages[seat]` in `getPublicState()` / Display/Player WebSocket state so Question 1 never enters browser state, React component cache, or `<img/video>` cache prematurely! Only keep `{ points }` (and `used`/revealed metadata if needed) for unopened slots!
   - When switching contestants (`vd:nextSeat`) or resetting (`vd:onStage` / `beginRound`), clear any local cached question/answer React state in `DisplayScreen.tsx` / child graphics (`key` / reset) so stale cached questions never persist across turns/caches.
3. Add explicit unit/integration assertions verifying both:
   - Right after `vd:confirmPackage`, `qIdx === -1` (display index `0`), `current === null`, and public state contains ZERO text/media of Question 1 (cannot be leaked via WS payload or DOM cache).
   - First press of question transition button/key advances display index from `0` -> `1` (`qIdx === 0`) and loads Question 1 (not Question 2!).


## Follow-up — 2026-11-11T10:11:18Z

IMPORTANT ADDITIONAL UI RULE FOR VỀ ĐÍCH (just sent by user):
Exact user words:
"Lưu ý, phần Về đích không hiện Câu x/3 hoặc 4, lĩnh vực gì cả"

Verified exact places in `d:\Timeout Quiz\src\components\olympia\DisplayScreen.tsx` right now:
1. `DisplayScreen.tsx:821-823` inside `VeDich()` (`EconovaLowerThirdV3`):
   Currently passes:
   `questionNumberBadge={`Câu ${vd.qIdx + 1}/${vd.packages[owner]?.length || 3}`}`
   -> REMOVE `questionNumberBadge` (pass `null` / omit prop) in `VeDich` so Về Đích Display NEVER renders `Câu x/3` or `Câu x/4`!
2. `DisplayScreen.tsx:824-828` (`EconovaLowerThirdV3` `headerBadge`) AND `DisplayScreen.tsx:792-799` (`Vtv3ChalkboardQuestionFrame` `headerBadge`):
   Currently both use `cur.q.subject || "VỀ ĐÍCH"`!
   -> REMOVE `cur.q.subject` completely in `VeDich` so Về Đích Display NEVER shows any subject / lĩnh vực (keep e.g. `VỀ ĐÍCH · ${cur.points} ĐIỂM...` / `${seatName(state, owner)} · VỀ ĐÍCH (${cur.points} điểm)...`, and also check if `V3SingleAnswerBar` or any Về Đích view in `src/app/olympia/` renders `Câu x/3`, `Câu x/4`, or `subject`).
3. Keep `KhoiDong()` untouched! Also keep the engine & Host internal/control tracking at `qIdx = -1` (0/3 -> advances to `qIdx = 0` / 1 on first "Chuyển câu" / start trigger, with zero payload/cache leak), while Display/TV UI in Về Đích hides both `Câu x/3|4` and `lĩnh vực`.
4. Add unit/DOM assertions and verify in Milestone 4 screenshot #5 (`state_5_question1_active.png`) that neither `Câu 1/3`, `Câu 1/4`, nor any `subject` (lĩnh vực) string renders on Về Đích Display!


## Follow-up — 2026-11-11T10:17:17Z

Note from user: the user asked for urgent screenshots of the Về Đích graphics right now to inspect & provide early feedback (`à mà screenshot đồ hoạ Về đích và gửi lên đây ngay, cấp tốc, để tôi dễ phản ánh lại ngay`). I am capturing the current baseline Về Đích graphics (`/dev/graphics?tab=vd-grid`, `?tab=vd-qbox`, and live Display) right now, AND please prioritize capturing & sending intermediate Về Đích graphic screenshots right as soon as Milestone 2 (twin-arrow centering + 4-layer zoom + centered package grid) lands so the user can give early feedback immediately.


## Follow-up — 2026-11-11T10:28:18Z

URGENT USER FEEDBACK FROM EARLY SCREENSHOT REVIEW (must be fixed in Milestone 2 right away alongside the twin-arrow centering & zoom fixes):

The user inspected the 4 baseline Về Đích graphic screenshots (`vd_gfx_1`..`vd_gfx_4`) and spotted these 4 exact visual/typography bugs in `EconovaLowerThirdV3` (`src/components/olympia/Vtv3BroadcastGraphics.tsx` & `src/components/olympia/v3Geometry.ts`):

1. **Contestant tab names overflow when longer than cell width — horizontal-only scaling required**:
   - Exact user spec: `"có lỗi tên thí sinh chưa tự thu nhỏ chiều ngang (giữ nguyên chiều cao) khi quá dài so với chiều ngang ô chứa"`
   - Location: `Vtv3BroadcastGraphics.tsx:2758-2798` (`lt.tabs.cells`). Currently `<text fontSize="16">` overflows cell dividers badly (especially with 6–8 contestants like `THÍ SINH 2 (0)` touching adjacent cells).
   - Fix: Implement a horizontal-only auto-fit `<SvgFittedText>` (using measured `text.getComputedTextLength()` + conservative initial heuristic before paint) that applies `transform={`translate(${cx}, ${cy}) scale(${sx}, 1) translate(${-cx}, ${-cy})`}` whenever `measuredWidth > cellInnerWidth` (`tab.width - 14`, accounting for slant margin). Note `sy` MUST stay `1` so vertical height is preserved while width compresses cleanly inside the tab! Also apply to `KhoiDong` / `EconovaContestantScoreTabBar` if sharing the same tab rendering.

2. **First contestant tab (`tab 0`) not centered properly in its cell**:
   - Exact user spec: `"tên thí sinh đầu không căn giữa ô"`
   - Location: `Vtv3BroadcastGraphics.tsx:2782-2796` and `v3Geometry.ts:331-335`.
   - Fix: Ensure tab text centering uses the true midpoint at vertical center `(left(cy) + right(cy)) / 2` (consistent across slanted `edgeL`/`seamX`, avoiding any optical/padding offset on `tab 0`) and centers vertically cleanly with `y={tab.cy}` + `dominantBaseline="central"` (instead of `cy + 6` offset which can sit off-center), and avoid trailing `letterSpacing` pushing the string off `textAnchor="middle"`.

3. **Big score number in Về Đích right cluster: wrong font, off-center, and must be WHITE (`#ffffff`)**:
   - Exact user specs:
     - `"số điểm hiện đang xài font không đúng"` -> Change `fontFamily="monospace"` (`Vtv3BroadcastGraphics.tsx:2839`) to match the broadcast sans font (`Plus Jakarta Sans` / `sans-serif` via `font-sans` / CSS font family, `fontWeight="900"`).
     - `"chưa căn giữa"` -> Currently `Vtv3BroadcastGraphics.tsx:2833-2834` uses `x={(lt.clusterLine.x0 + shell.endX) / 2}` (`1044.86`) and `y={82}` without `dominantBaseline="central"`. Because `lt.clusterLine` slants leftward and `shell.endX` is the chevron peak (`midY`), the chamber above `packStrip` (`y ∈ [0, H - stripH]`) has vertical middle `scoreCy = (H - stripH) / 2` and horizontal center at `scoreCy` equal to `(lt.clusterX(scoreCy) + shell.edgeR(scoreCy)) / 2` (~`1027` for `y=82`!). Compute true `(lt.clusterX(scoreCy) + shell.edgeR(scoreCy)) / 2` and `y={scoreCy}` with `dominantBaseline="central"` so the score is dead-center inside the upper cluster chamber (for any score `0`, `285`, `-10`, etc.).
     - `"màu chữ phải chuyển thành trắng"` -> Change `fill="#fbbf24"` and amber glow (`Vtv3BroadcastGraphics.tsx:2836, 2841`) to pure crisp **white** `fill="#ffffff"` with clean dark/subtle drop-shadow (e.g., `drop-shadow(0 2px 10px rgba(0,0,0,0.65))`).

4. **Bottom per-question point strip (`20 | 30 | 30`) is too small**:
   - Exact user spec: `"số điểm từng câu bên dưới cũng bị bé quá"`
   - Location: `Vtv3BroadcastGraphics.tsx:2449` (`buildClusterPackStrip(shell, lt, 3, 36)`) and `Vtv3BroadcastGraphics.tsx:2860-2870` (`fontSize="13"`, `y={cell.cy + 5}`).
   - Fix: Increase `packStrip` height (e.g. `42–44px`) and bump cell text `fontSize` from `13` to **`20`–`22`** (`fontWeight="900"`, `y={cell.cy}`, `dominantBaseline="central"`, clean bold `font-sans`), so `20 | 30 | 30` is crisp, prominent, and well-proportioned!


## Follow-up — 2026-11-11T10:38:31Z

ADDITIONAL VISUAL BUG SPOTTED BY USER FOR MILESTONE 2 (confirmed directly in `vd_gfx_2_qbox_dev.png` and `Vtv3BroadcastGraphics.tsx:2510-2512`):

Exact user message:
`"đồng thời fix lỗi câu hỏi đôi khi bị lan ra cụm bên phải nữa"`

Root cause verified in `src/components/olympia/Vtv3BroadcastGraphics.tsx`:
- Line 2511 uses `qRight = isVeDich && lt.clusterLine ? lt.clusterLine.x0 - 16 : ...`
- `lt.clusterLine.x0` (`967.71`) is at `y = 0` (top edge), whereas the `/` cluster divider slants leftward down to `lt.clusterX(186) = 901.29` at the bottom of the question box (`y = 48..186`), a `-66.4px` overhang!
- As a result, multi-line question text wraps up to `qRight = 951.71`, directly colliding with / spilling past the white slanted divider into the right score cluster (`285`) as seen on line 2 (`"...chủ"`) in `vd_gfx_2_qbox_dev.png`!
- Also check `overflow-hidden` / text containment when `qText` is long or has no spaces.

Fix in `EconovaLowerThirdV3` (`Vtv3BroadcastGraphics.tsx:2510-2512, 2880-2901`):
- Enforce strict clearance inside the slanted `/` cluster chamber (`lt.clusterX(y)`):
  - Either use a slanted right-float spacer (`float: right`, `shape-outside: polygon(100% 0, 100% 100%, 0 100%)`, width `clusterX(qTop) - clusterX(qBottom)` inside outer width up to `clusterX(qTop) - 18`) OR set conservative `qRight = Math.min(lt.clusterX(qTop), lt.clusterX(qBottom)) - 18` (`lt.clusterX(qBottom) - 18`!), PLUS apply an exact polygonal `clipPath` matching the `/` divider margin (`- 10px` safe padding) and verify left/right slant margins (`edgeL(y)` at `y < 100` vs `y > 100`) so NO question text character or word can ever cross or touch the white `/` divider into the right score cluster on any line or string length!
- Also check `Vtv3ChalkboardQuestionFrame` (`o26_classic`) so text never overflows into any side/score area either.
- Include long-question check in the updated M2 screenshot verification!


## Follow-up — 2026-11-11T11:15:43Z

Feedback & Directives on M2 screenshots:
- `vd_qbox_typography.png` verified crisp: Tab 0 centered, score 285 bold white `#ffffff` sans centered in slanted cluster, `20 | 30 | 30` strip larger and sharp, multi-line question wraps cleanly before `/` divider with zero overlap.

Three important checks for Milestones 2–4:
1. **Do NOT leave test screenshots committed in `d:\Timeout Quiz\public\screenshots\`** — write final M4 verification screenshots to artifact directory (`C:\Users\khanh\.gemini\antigravity\brain\aac021ca-ce70-48a4-b3be-d09545e52c3f\screenshots\` or local scratch outside git) or clean up `public/screenshots/` before git commit so the repo stays completely clean.
2. Verify **6–8 contestants** visually too (ensuring `scale(sx, 1)` keeps 8-seat tab names inside their slanted dividers without touching adjacent seams).
3. In Milestone 4's 5-state capture (`state_3_arrows_package.png` or `state_3a`/`state_3b`), capture both the **mid-animation centered zoomed twin arrows** on live Display AND the **centered package board** right as it opens on the 3D Display screen (showing it centered over the stage rather than lower-third).


## Follow-up — 2026-11-11T11:20:23Z

URGENT FOLLOW-UP USER FEEDBACK ON HOPE STAR (`vd_qbox_typography.png`):

Exact user message:
`"ngôi sao hy vọng lơ lửng thế, nó phải có kích cỡ khá to, và nằm trên cụm phải, không treo lơ lửng thế kia"`

Verified exact cause in `src/components/olympia/Vtv3BroadcastGraphics.tsx` and `src/components/olympia/HopeStarBadge.tsx`:
1. `HopeStarBadge.tsx` uses a `480x480` WebM (`hope_star.webm`) with 2.0x expanding aura padding around the golden star core, so `size={76}` only displays a ~34px star — far too small!
2. `Vtv3BroadcastGraphics.tsx:2668-2675` puts `HopeStarBadge` at `{ top: -24, right: 12 }` inside `<V3ScaledStage designW={shell.canvasW} designH={H}>`. Because `shell.canvasW = 1244` while `shell.endX = 1122` (the right wing ends at `1122` and right cluster chamber top is `lt.clusterX(0)..shell.edgeR(0)` = `967.7..1086.3`), `right: 12` places the star out in pitch-black empty space (`x ≈ 1156..1232`), completely detached/floating away from the right cluster!

Fix required in `EconovaLowerThirdV3` (`Vtv3BroadcastGraphics.tsx:2664-2676`, and similarly check `V3SingleAnswerBar` `1854-1865` inside `V3ScaledStage`):
- Increase `HopeStarBadge` size substantially (`size={150}` to `size={168}` so the metallic star core itself renders large ~72-84px!).
- Anchor it **directly ON / crowning the right score cluster** (NEVER floating out in empty space outside `shell.edgeR`):
  - Center it horizontally over the right cluster's upper edge (`starCx = isVeDich && lt.clusterX ? (lt.clusterX(0) + shell.edgeR(0)) / 2 : shell.endX - 60` -> `left: starCx - starSize / 2`) and vertically resting ON the upper rim of the right cluster chamber (`top: -starSize * 0.44` or center `y ≈ 8..14`, so the golden star visibly sits right on top of / overlaps the top of the right score cluster directly above the white score `285` without obscuring `285`, AND never floats disconnected in black empty space!).
  - Capture a fresh `vd_qbox` screenshot right after updating this and send it back so we can visually verify with the user right away!


## Follow-up — 2026-11-11T11:42:02Z

CRITICAL GAP CAUGHT BEFORE VICTORY AUDIT IN `VeDichSlantedGridGraphic` (`Vtv3BroadcastGraphics.tsx:2996-3176` & `DisplayScreen.tsx:773-779`):

While `EconovaLowerThirdV3` and `V3ArrowShell.tsx` now have the fixed `dc = shell.W / 2`, `--v3-travel`, `transform-box: fill-box; transform-origin: center;`, and 4-layer zoom-in keyframes:
**`VeDichSlantedGridGraphic` (`Vtv3BroadcastGraphics.tsx:3069-3174`) STILL RENDERS A STATIC `<svg>` INSIDE `<V3ScaledStage>` WITH ZERO TWIN-ARROW ANIMATION!**

Remember the user's explicit bug report:
- `"tới khi nhấn Mở bảng chọn gói thì mới có hiệu ứng cho lựa chọn gói câu"`
- `"mà giao diện còn chưa có hiệu ứng cặp mũi tên đi vô nữa"`

Fix needed before Milestone 4 screenshot capture & Victory Audit:
1. Give `VeDichSlantedGridGraphic` (`Vtv3BroadcastGraphics.tsx:2996-3176`) an `animate?: boolean` prop (default `true` in live `DisplayScreen` during `choosing`, or `false` if needed for static previews — wait in `DisplayScreen.tsx`, wrap `{showPackageGrid && ...}` with `key={`pkg-grid-${owner}-${vd.turnIdx}`}` instead of remounting on `vd.phase` change `choosing -> packageReady`, so the 4-layer centered twin arrows + zoom fly in smoothly when **"Mở bảng chọn gói"** opens `choosing`, and then stay open smoothly highlighting red cells when confirmed to `packageReady` without flickering/replaying!).
2. Use the exact same 4-layer twin-arrow wings (`g1`, `g2`, `l3`, `navy` with `dc = shell.W / 2`, `--v3-travel = Math.max(shell.canvasW, 1400)`, `transform-box: fill-box; transform-origin: center;`, `scale(0.10..0.25) -> 1.15 -> 1.0`, plus center-out `v3-eco-hex-body` clip-path reveal + header pill fade) — or wrap via `V3ArrowShell` enhanced with the 4-layer cushion wings!
3. Also double-check `DisplayScreen.tsx:773` `key={`${owner}-${vd.turnIdx}-${vd.qIdx}-${vd.phase}`}` -> because `key` includes `vd.phase`, transitioning `choosing -> packageReady` remounts `<VeDichSlantedGridGraphic>` if inside that keyed `div`! Keep `key={`${owner}-${vd.turnIdx}-${vd.qIdx}`}` or separate keys so `choosing -> packageReady` transitions smoothly without jumping.
4. Capture **State 3** screenshot (`state_3a_arrows_converging.png` mid-flight around `~0.6s-0.8s` + `state_3b_arrows_package.png` opened at center viewport) AND **State 5** with **6–8 contestants** (`scale(sx, 1)` tab fit + centered white score + HopeStar + non-overlapping question text) on live Display!
