import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeVietnameseTTS,
  summarizeOlympiaAnswer,
  getSeasonReadingRate,
  resolveMCRole,
  resolveMCVoiceConfig,
  ROUND_INTRO_LINES,
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
