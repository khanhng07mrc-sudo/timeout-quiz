import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeVietnameseTTS,
  summarizeOlympiaAnswer,
  getSeasonReadingRate,
  resolveMCRole,
  resolveMCVoiceConfig,
  ROUND_INTRO_LINES,
  resolveTurnHosts,
  getContestantSpokenName,
  generateBuzzerCallout,
  detectSpellingError,
  groupContestantAnswers,
  generateGroupedAnswerCommentary,
  generateTangTocTimeCallout,
  generateCnvBellsAnnouncement,
  formatCnvVerdictSpoken,
  VE_DICH_DRAMATIC_STEAL_DELAY_MS,
} from "./tts";

test("TTS: normalizeVietnameseTTS expands broadcast abbreviations and removes formatting", () => {
  const input = "**Câu hỏi (10 điểm):** TP. HCM là trung tâm kinh tế lớn của VN, nằm ở khu vực Nam Bộ, phát sóng trên VTV3.";
  const normalized = normalizeVietnameseTTS(input);

  assert.ok(!normalized.includes("**"), "Markdown bold must be stripped");
  assert.ok(!normalized.includes("(10 điểm)"), "Score cue must be stripped");
  assert.ok(normalized.includes("Thành phố "), "TP. must be expanded to Thành phố ");
  assert.ok(normalized.includes("Việt Nam"), "VN must be expanded to Việt Nam");
  assert.ok(normalized.includes("Vê Tê Vê Ba"), "VTV3 must be expanded to Vê Tê Vê Ba");

  const unitsInput = "Tốc độ 100 km/h, gia tốc 9.8 m/s, nhiệt độ 25 °C, độ ẩm 80% tại trường THPT.";
  const unitsNorm = normalizeVietnameseTTS(unitsInput);
  assert.ok(unitsNorm.includes("ki lô mét một giờ"), "km/h must be expanded");
  assert.ok(unitsNorm.includes("mét một giây"), "m/s must be expanded");
  assert.ok(unitsNorm.includes("độ xê"), "°C must be expanded");
  assert.ok(unitsNorm.includes("phần trăm"), "% must be expanded");
  assert.ok(unitsNorm.includes("Trung học phổ thông"), "THPT must be expanded");
});

test("TTS: summarizeOlympiaAnswer produces concise spoken answers without verbose clutter", () => {
  // Test 1: Strip prefix
  assert.equal(summarizeOlympiaAnswer("Đáp án: Isaac Newton"), "Isaac Newton");
  assert.equal(summarizeOlympiaAnswer("Từ khóa: Mặt Trời"), "Mặt Trời");
  assert.equal(summarizeOlympiaAnswer("Đáp án là: 120 km/h"), "120 ki lô mét một giờ");
  assert.equal(summarizeOlympiaAnswer("Đáp án là: 9.8 m/s"), "9.8 mét một giây");
  assert.equal(summarizeOlympiaAnswer("Đáp án đúng là: 1/2"), "1 phần 2");
  assert.equal(summarizeOlympiaAnswer("Đáp án là: 120 km/h / 150 km/h"), "120 ki lô mét một giờ");

  // Test 2: Strip parenthetical clarifications while preserving primary answer
  assert.equal(summarizeOlympiaAnswer("Thành phố Hồ Chí Minh (Sài Gòn)"), "Thành phố Hồ Chí Minh");
  assert.equal(summarizeOlympiaAnswer("Định luật I Newton (Định luật quán tính)"), "Định luật I Newton");
  assert.equal(summarizeOlympiaAnswer("Ampe (A)"), "Ampe");

  // Test 3: Strip slash or semicolon alternatives (take first option)
  assert.equal(summarizeOlympiaAnswer("Nguyễn Tất Thành / Nguyễn Ái Quốc / Hồ Chí Minh"), "Nguyễn Tất Thành");
  assert.equal(summarizeOlympiaAnswer("Khí Oxy; O2"), "Khí Oxy");

  // Test 4: Strip count and point annotations
  assert.equal(summarizeOlympiaAnswer("Văn Miếu - Quốc Tử Giám (10 điểm) (7 chữ cái)"), "Văn Miếu - Quốc Tử Giám");

  // Test 5: Truncate excessively long explanatory sentences (> 8 words)
  const longAnswer = "Đây là một cuộc khởi nghĩa nổi tiếng do Hai Bà Trưng lãnh đạo chống lại quân Đông Hán xâm lược vào năm 40 sau Công Nguyên.";
  const summarized = summarizeOlympiaAnswer(longAnswer);
  assert.ok(summarized.split(/\s+/).length <= 8, `Summarized words (${summarized.split(/\s+/).length}) must be <= 8 words`);
});

test("TTS: getSeasonReadingRate dynamically adapts tempo according to season competition rules", () => {
  // O20, O21, O22: Rapid-fire tempo (unlimited question sprints)
  assert.equal(getSeasonReadingRate("O20"), 1.40);
  assert.equal(getSeasonReadingRate("O21"), 1.40);
  assert.equal(getSeasonReadingRate("O22"), 1.40);

  // O23, O24-25, O26, O27: Moderate broadcast tempo (5s per question)
  assert.equal(getSeasonReadingRate("O23"), 1.08);
  assert.equal(getSeasonReadingRate("O24-25"), 1.08);
  assert.equal(getSeasonReadingRate("O26"), 1.08);
  assert.equal(getSeasonReadingRate("O27"), 1.08);

  // Question length compensation: questions > 25 words scale tempo by 1.12x
  const normalRate = getSeasonReadingRate("O26", 15);
  const boostedRate = getSeasonReadingRate("O26", 30);
  assert.ok(boostedRate > normalRate, "Long question should have boosted reading tempo");
  assert.equal(boostedRate, +(1.08 * 1.12).toFixed(2));
});

test("TTS: resolveMCRole properly alternates roles between Khánh Vy and Ngọc Huy", () => {
  // Intro greeting
  assert.equal(resolveMCRole({ segment: "intro_greeting" }), "khanh_vy");

  // Round intros
  assert.equal(resolveMCRole({ segment: "round_intro", round: "khoiDong" }), "ngoc_huy");
  assert.equal(resolveMCRole({ segment: "round_intro", round: "vcnv" }), "khanh_vy");
  assert.equal(resolveMCRole({ segment: "round_intro", round: "tangToc" }), "ngoc_huy");
  assert.equal(resolveMCRole({ segment: "round_intro", round: "veDich" }), "khanh_vy");
  assert.equal(resolveMCRole({ segment: "round_intro", round: "cauHoiPhu" }), "ngoc_huy");

  // Khởi Động solo questions: seats 0 & 2 -> khanh_vy, seats 1 & 3 -> ngoc_huy
  assert.equal(resolveMCRole({ segment: "question", round: "khoiDong", seatId: 0 }), "khanh_vy");
  assert.equal(resolveMCRole({ segment: "question", round: "khoiDong", seatId: 1 }), "ngoc_huy");
  assert.equal(resolveMCRole({ segment: "question", round: "khoiDong", seatId: 2 }), "khanh_vy");
  assert.equal(resolveMCRole({ segment: "question", round: "khoiDong", seatId: 3 }), "ngoc_huy");

  // VCNV questions -> khanh_vy
  assert.equal(resolveMCRole({ segment: "question", round: "vcnv" }), "khanh_vy");

  // Tăng Tốc & Về Đích questions -> ngoc_huy
  assert.equal(resolveMCRole({ segment: "question", round: "tangToc" }), "ngoc_huy");
  assert.equal(resolveMCRole({ segment: "question", round: "veDich" }), "ngoc_huy");
  assert.equal(resolveMCRole({ segment: "question", round: "cauHoiPhu" }), "ngoc_huy");

  // Explicit override
  assert.equal(resolveMCRole({ role: "khanh_vy", round: "tangToc" }), "khanh_vy");
  assert.equal(resolveMCRole({ role: "ngoc_huy", round: "vcnv" }), "ngoc_huy");
});

test("TTS: resolveMCVoiceConfig provides calibrated acoustic pitch formant shifting", () => {
  const kvConfig = resolveMCVoiceConfig("khanh_vy");
  const nhConfig = resolveMCVoiceConfig("ngoc_huy");

  assert.equal(kvConfig.pitch, 1.12, "Khánh Vy pitch must be 1.12 (crisp feminine timbre)");
  assert.equal(nhConfig.pitch, 0.88, "Ngọc Huy pitch must be 0.88 (warm masculine timbre)");
});

test("TTS: ROUND_INTRO_LINES has complete script lines for all 5 rounds", () => {
  const rounds = ["khoiDong", "vcnv", "tangToc", "veDich", "cauHoiPhu"];
  for (const r of rounds) {
    assert.ok(ROUND_INTRO_LINES[r], `Round intro line for ${r} must exist`);
    assert.ok(ROUND_INTRO_LINES[r].text.length > 5, `Round intro text for ${r} must be non-empty`);
    assert.ok(ROUND_INTRO_LINES[r].role === "khanh_vy" || ROUND_INTRO_LINES[r].role === "ngoc_huy");
  }
});

test("TTS: resolveTurnHosts alternates 2 hosts per segment in Khởi Động and per row in VCNV", () => {
  // Khởi Động: segIdx 0 (even) -> Khánh Vy reads, Ngọc Huy confirms
  const kdTurn0 = resolveTurnHosts("khoiDong", 0);
  assert.equal(kdTurn0.readingHost, "khanh_vy");
  assert.equal(kdTurn0.coHost, "ngoc_huy");

  // Khởi Động: segIdx 1 (odd) -> Ngọc Huy reads, Khánh Vy confirms
  const kdTurn1 = resolveTurnHosts("khoiDong", 1);
  assert.equal(kdTurn1.readingHost, "ngoc_huy");
  assert.equal(kdTurn1.coHost, "khanh_vy");

  // Khởi Động: segIdx 2 (even) -> Khánh Vy reads, Ngọc Huy confirms
  const kdTurn2 = resolveTurnHosts("khoiDong", 2);
  assert.equal(kdTurn2.readingHost, "khanh_vy");
  assert.equal(kdTurn2.coHost, "ngoc_huy");

  // VCNV: rowIdx 0 (Row 1) -> Khánh Vy
  const vcnvRow0 = resolveTurnHosts("vcnv", 0);
  assert.equal(vcnvRow0.readingHost, "khanh_vy");
  assert.equal(vcnvRow0.coHost, "ngoc_huy");

  // VCNV: rowIdx 1 (Row 2) -> Ngọc Huy
  const vcnvRow1 = resolveTurnHosts("vcnv", 1);
  assert.equal(vcnvRow1.readingHost, "ngoc_huy");
  assert.equal(vcnvRow1.coHost, "khanh_vy");

  // VCNV: rowIdx 2 (Row 3) -> Khánh Vy
  const vcnvRow2 = resolveTurnHosts("vcnv", 2);
  assert.equal(vcnvRow2.readingHost, "khanh_vy");
  assert.equal(vcnvRow2.coHost, "ngoc_huy");

  // VCNV: rowIdx 3 (Row 4) -> Ngọc Huy
  const vcnvRow3 = resolveTurnHosts("vcnv", 3);
  assert.equal(vcnvRow3.readingHost, "ngoc_huy");
  assert.equal(vcnvRow3.coHost, "khanh_vy");

  // VCNV: rowIdx 4 (Center Question) -> Khánh Vy
  const vcnvRow4 = resolveTurnHosts("vcnv", 4);
  assert.equal(vcnvRow4.readingHost, "khanh_vy");
  assert.equal(vcnvRow4.coHost, "ngoc_huy");

  // resolveMCRole respects segIdx and rowIdx
  assert.equal(resolveMCRole({ round: "khoiDong", segIdx: 0, segment: "question" }), "khanh_vy");
  assert.equal(resolveMCRole({ round: "khoiDong", segIdx: 0, segment: "result" }), "ngoc_huy");
  assert.equal(resolveMCRole({ round: "khoiDong", segIdx: 1, segment: "question" }), "ngoc_huy");
  assert.equal(resolveMCRole({ round: "khoiDong", segIdx: 1, segment: "result" }), "khanh_vy");
  assert.equal(resolveMCRole({ round: "vcnv", rowIdx: 0, segment: "question" }), "khanh_vy");
  assert.equal(resolveMCRole({ round: "vcnv", rowIdx: 1, segment: "question" }), "ngoc_huy");
  assert.equal(resolveMCRole({ round: "vcnv", rowIdx: 1, segment: "cnv_bell" }), "khanh_vy");
});

test("TTS: getContestantSpokenName cleans broadcast prefixes while preserving full name", () => {
  assert.equal(getContestantSpokenName("Thí sinh Nguyễn Hoàng"), "Nguyễn Hoàng");
  assert.equal(getContestantSpokenName("Ghế 1: Trần Văn Nam"), "Trần Văn Nam");
  assert.equal(getContestantSpokenName("Bạn Lê Minh"), "Lê Minh");
  assert.equal(getContestantSpokenName("TS. Phạm Quốc"), "Phạm Quốc");
  assert.equal(getContestantSpokenName("Hoàng Minh"), "Hoàng Minh");
  assert.equal(getContestantSpokenName(""), "");
});

test("TTS: generateBuzzerCallout randomizes between 3 variants and uses variant 3 for consecutive buzzers", () => {
  const name = "Thí sinh Minh Quân";

  // Non-consecutive: must produce either "Minh Quân!" or "Xin mời Minh Quân!"
  const results = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const callout = generateBuzzerCallout(name, false);
    assert.ok(
      callout === "Minh Quân!" || callout === "Xin mời Minh Quân!",
      `Callout must be Variant 1 or 2, got: ${callout}`
    );
    results.add(callout);
  }
  // Over 50 iterations, both variants should appear with non-zero probability
  assert.ok(results.has("Minh Quân!"), "Variant 1 '<Tên>!' should appear");
  assert.ok(results.has("Xin mời Minh Quân!"), "Variant 2 'Xin mời <Tên>!' should appear");

  // Consecutive: must produce Variant 3 "Tiếp tục là Minh Quân!"
  const consecutiveCallout = generateBuzzerCallout(name, true);
  assert.equal(consecutiveCallout, "Tiếp tục là Minh Quân!");
});

test("TTS: detectSpellingError accurately identifies diacritics, typos, and vowel-less gibberish", () => {
  // Correct match
  assert.equal(detectSpellingError("Hồ Chí Minh", "Hồ Chí Minh").isError, false);
  assert.equal(detectSpellingError("PARIS", "Paris").isError, false);

  // Diacritic error (missing/wrong accents)
  const diacritic1 = detectSpellingError("QUAN HO", "QUAN HỌ");
  assert.equal(diacritic1.isError, true);
  assert.equal(diacritic1.reason, "diacritic");

  const diacritic2 = detectSpellingError("HOA HOC", "HÓA HỌC");
  assert.equal(diacritic2.isError, true);
  assert.equal(diacritic2.reason, "diacritic");

  // Levenshtein distance typo (1-2 characters off on substantive word)
  const dist1 = detectSpellingError("PARISS", "PARIS");
  assert.equal(dist1.isError, true);
  assert.equal(dist1.reason, "distance");

  const dist2 = detectSpellingError("NGUYENN", "NGUYỄN");
  assert.equal(dist2.isError, true);

  // Completely wrong answer is NOT a spelling error, just a wrong answer
  const wrongAns = detectSpellingError("Hà Nội", "Sài Gòn");
  assert.equal(wrongAns.isError, false);

  // Vowel-less consonant mash / gibberish (length >= 3)
  const gibberish1 = detectSpellingError("sdkjfh");
  assert.equal(gibberish1.isError, true);
  assert.equal(gibberish1.reason, "gibberish");

  const gibberish2 = detectSpellingError("kkk");
  assert.equal(gibberish2.isError, true);
  assert.equal(gibberish2.reason, "gibberish");
});

test("TTS: groupContestantAnswers and generateGroupedAnswerCommentary properly format broadcast speech", () => {
  // Case 1: All 4 identical answers
  const subsAllSame = [
    { seat: 0, name: "Thí sinh A", answer: "Quang hợp" },
    { seat: 1, name: "Thí sinh B", answer: "Quang hợp" },
    { seat: 2, name: "Thí sinh C", answer: "Quang hợp" },
    { seat: 3, name: "Thí sinh D", answer: "Quang hợp" },
  ];
  const groups1 = groupContestantAnswers(subsAllSame, "Quang hợp");
  assert.equal(groups1.length, 1);
  assert.equal(groups1[0].contestantNames.length, 4);
  const comm1 = generateGroupedAnswerCommentary(groups1, { round: "vcnv", totalContestants: 4 });
  assert.equal(comm1, "Cả 4 bạn cùng có đáp án là Quang hợp.");

  // Case 2: Group of 2, 1 individual, 1 no-answer
  const subsMixed = [
    { seat: 0, name: "Thí sinh An", answer: "Mặt Trời" },
    { seat: 1, name: "Thí sinh Bình", answer: "Mặt Trời" },
    { seat: 2, name: "Thí sinh Cường", answer: "Mặt Trăng" },
    { seat: 3, name: "Thí sinh Dũng", answer: "", noAnswer: true },
  ];
  const groups2 = groupContestantAnswers(subsMixed, "Mặt Trời");
  const comm2 = generateGroupedAnswerCommentary(groups2, { round: "tangToc", totalContestants: 4 });
  assert.ok(comm2.includes("Các bạn An, Bình cùng có đáp án là Mặt Trời."));
  assert.ok(comm2.includes("Bạn Cường có đáp án là Mặt Trăng."));
  assert.ok(comm2.includes("Bạn Dũng không đưa ra câu trả lời."));

  // Case 3: Contestant with spelling error -> announced as spelling error
  const subsWithTypo = [
    { seat: 0, name: "Thí sinh Hoàng", answer: "QUANG HOP" }, // diacritic error vs target
    { seat: 1, name: "Thí sinh Mai", answer: "Quang hợp" },
  ];
  const groups3 = groupContestantAnswers(subsWithTypo, "Quang hợp");
  const comm3 = generateGroupedAnswerCommentary(groups3, { round: "vcnv", totalContestants: 2 });
  assert.ok(comm3.includes("Bạn Hoàng viết sai chính tả."));
  assert.ok(comm3.includes("Bạn Mai có đáp án là Quang hợp."));
});

test("TTS: generateTangTocTimeCallout calls out reaction time under 1.5s and identical tied times", () => {
  // Fast answer (< 1.5s)
  const fastSubs = [
    { seat: 0, name: "Thí sinh Huy", answer: "120", ms: 1250 },
    { seat: 1, name: "Thí sinh Lan", answer: "120", ms: 3400 },
  ];
  const fastCallout = generateTangTocTimeCallout(fastSubs);
  assert.ok(fastCallout != null);
  assert.ok(fastCallout.includes("Bạn Huy trả lời rất nhanh, chỉ 1.25 giây!"));

  // Identical response times
  const tiedSubs = [
    { seat: 0, name: "Thí sinh Nam", answer: "A", ms: 2400 },
    { seat: 1, name: "Thí sinh Hoa", answer: "A", ms: 2400 },
    { seat: 2, name: "Thí sinh Kiên", answer: "B", ms: 4100 },
  ];
  const tiedCallout = generateTangTocTimeCallout(tiedSubs);
  assert.ok(tiedCallout != null);
  assert.ok(tiedCallout.includes("Hai bạn Nam và Hoa có cùng thời gian trả lời là 2.40 giây!"));

  // Normal distinct answers (> 1.5s) produce null
  const normalSubs = [
    { seat: 0, name: "Thí sinh A", answer: "X", ms: 2100 },
    { seat: 1, name: "Thí sinh B", answer: "Y", ms: 3500 },
  ];
  assert.equal(generateTangTocTimeCallout(normalSubs), null);
});

test("TTS: generateCnvBellsAnnouncement orders buzzer sequence chronologically", () => {
  const single = generateCnvBellsAnnouncement(["Thí sinh Quân"]);
  assert.equal(single, "Tín hiệu chuông xin trả lời Chướng ngại vật từ bạn Quân.");

  const multiple = generateCnvBellsAnnouncement(["Thí sinh Quân", "Thí sinh Linh", "Thí sinh Phúc"]);
  assert.equal(
    multiple,
    "Tín hiệu chuông xin trả lời Chướng ngại vật từ bạn Quân, tiếp theo là Linh, Phúc."
  );
});

test("TTS: formatCnvVerdictSpoken formats congratulations on correct and elimination on wrong", () => {
  const correct = formatCnvVerdictSpoken(true, "Thí sinh Minh", "Chiến dịch Điện Biên Phủ");
  assert.ok(correct.includes("Chúc mừng bạn Minh đã trả lời chính xác Chướng ngại vật!"));
  assert.ok(correct.includes("Từ khóa là: Chiến dịch Điện Biên Phủ!"));

  const wrong = formatCnvVerdictSpoken(false, "Thí sinh Tuấn");
  assert.ok(wrong.includes("Rất tiếc câu trả lời chưa chính xác."));
  assert.ok(wrong.includes("Bạn Tuấn mất quyền chơi phần thi Vượt chướng ngại vật."));
  assert.ok(wrong.includes("Các bạn còn lại tiếp tục phần thi."));
});

test("TTS: VE_DICH_DRAMATIC_STEAL_DELAY_MS is within the required 2.0s - 3.0s window", () => {
  assert.ok(
    VE_DICH_DRAMATIC_STEAL_DELAY_MS >= 2000 && VE_DICH_DRAMATIC_STEAL_DELAY_MS <= 3000,
    `Dramatic delay (${VE_DICH_DRAMATIC_STEAL_DELAY_MS}ms) must be between 2000ms and 3000ms`
  );
  assert.equal(VE_DICH_DRAMATIC_STEAL_DELAY_MS, 2500);
});
