/**
 * Timeout Quiz Unified Evaluator Engine
 * Chấm điểm đáp án chuẩn xác và đồng bộ 100% giữa Server (Socket handlers) và Sandbox (Offline/Online).
 * Hỗ trợ tất cả các dạng câu hỏi: MC_SINGLE, MC_MULTI, TRUE_FALSE, FILL_BLANK, ORDERING, MATCHING, DRAG_DROP, CLOZE_DROPDOWN, WORD_PUZZLE, ESSAY.
 */

export function normalizeTextForComparison(text: any): string {
  if (text === undefined || text === null) return "";
  return text
    .toString()
    .normalize("NFC")
    .toLowerCase()
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[.,!?;:]+$/, "")
    .replace(/\s+/g, " ");
}

export function matchFillBlankText(expectedAnswer: string, submittedAnswer: string): boolean {
  const normExpected = normalizeTextForComparison(expectedAnswer);
  const normSubmitted = normalizeTextForComparison(submittedAnswer);

  if (!normExpected || !normSubmitted) return false;
  if (normExpected === normSubmitted) return true;

  // Split multiple acceptable answers by /, ;, or |
  const extractVariants = (raw: string) =>
    raw
      .split(/[/;|]/)
      .flatMap((part) => {
        // Split comma only if it is not a decimal number like 3,14
        if (part.includes(",") && !/\d,\d/.test(part)) {
          return part.split(",");
        }
        return [part];
      })
      .map((v) => normalizeTextForComparison(v))
      .filter(Boolean);

  const expVariants = extractVariants(expectedAnswer);
  const subVariants = extractVariants(submittedAnswer);

  if (expVariants.includes(normSubmitted) || subVariants.includes(normExpected)) return true;
  for (const sv of subVariants) {
    if (expVariants.includes(sv)) return true;
  }

  // Numerical comparison (support decimal comma like 3,14 vs 3.14)
  const cleanExpNum = Number(normExpected.replace(",", "."));
  const cleanSubNum = Number(normSubmitted.replace(",", "."));
  if (!isNaN(cleanExpNum) && !isNaN(cleanSubNum) && cleanExpNum === cleanSubNum) {
    return true;
  }

  return false;
}

export function matchTrueFalseText(expectedTextOrId: string, submittedTextOrId: string): boolean {
  const normExp = normalizeTextForComparison(expectedTextOrId);
  const normSub = normalizeTextForComparison(submittedTextOrId);

  if (normExp === normSub) return true;

  const trueTokens = ["true", "đúng", "dung", "t", "d", "đ", "1", "yes", "có", "co", "y"];
  const falseTokens = ["false", "sai", "f", "s", "0", "no", "không", "khong", "n"];

  const isExpTrue = trueTokens.includes(normExp);
  const isExpFalse = falseTokens.includes(normExp);

  const isSubTrue = trueTokens.includes(normSub);
  const isSubFalse = falseTokens.includes(normSub);

  if (isExpTrue && isSubTrue) return true;
  if (isExpFalse && isSubFalse) return true;

  return false;
}

export function evaluateAnswerCorrectness(
  question: any,
  submittedAnswer: any
): { isAutoCorrect: boolean | undefined; isCorrect: boolean | undefined; answerText: string } {
  if (!question) {
    return { isAutoCorrect: false, isCorrect: false, answerText: "(Không có câu hỏi)" };
  }
  const options = (question.options as any[]) || [];
  const ansArray = Array.isArray(submittedAnswer)
    ? submittedAnswer
    : submittedAnswer !== undefined && submittedAnswer !== null
    ? [String(submittedAnswer)]
    : [];

  if (ansArray.length === 0) {
    return { isAutoCorrect: false, isCorrect: false, answerText: "(Chưa chọn đáp án / Hết giờ)" };
  }

  // Selected option text for display summary
  const selectedOptions = options.filter((o: any) =>
    ansArray.some((ans) =>
      ans === o.id ||
      normalizeTextForComparison(ans) === normalizeTextForComparison(o.id) ||
      normalizeTextForComparison(ans) === normalizeTextForComparison(o.text)
    )
  );
  const answerText = selectedOptions.length > 0
    ? selectedOptions.map((o: any) => `${o.text}`).join(", ")
    : ansArray.join(", ");

  if (question.type === "ESSAY") {
    return { isAutoCorrect: undefined, isCorrect: undefined, answerText };
  }

  let isAutoCorrect = false;

  if (question.type === "MC_SINGLE") {
    const correctOption = options.find((o: any) => o.isCorrect) || (question.answer ? options.find((o: any) => o.id === question.answer) : null);
    const correctId = correctOption?.id || question.answer;
    const correctText = correctOption?.text;

    const normCorrectId = correctId ? normalizeTextForComparison(correctId) : "";
    const normCorrectText = correctText ? normalizeTextForComparison(correctText) : "";

    isAutoCorrect = ansArray.some((ans) => {
      const normAns = normalizeTextForComparison(ans);
      return (
        (normCorrectId && normAns === normCorrectId) ||
        (normCorrectText && normAns === normCorrectText) ||
        ans === correctId
      );
    });
  } else if (question.type === "TRUE_FALSE") {
    const correctOption = options.find((o: any) => o.isCorrect) || (question.answer ? options.find((o: any) => o.id === question.answer) : null);
    if (correctOption) {
      const normCorrectId = normalizeTextForComparison(correctOption.id);
      const normCorrectText = normalizeTextForComparison(correctOption.text || "");

      isAutoCorrect = ansArray.some((ans) => {
        const normAns = normalizeTextForComparison(ans);
        return (
          normAns === normCorrectId ||
          normAns === normCorrectText ||
          ans === correctOption.id ||
          matchTrueFalseText(correctOption.text || correctOption.id, ans)
        );
      });
    } else if (question.answer) {
      isAutoCorrect = ansArray.some((ans) => matchTrueFalseText(question.answer, ans));
    }
  } else if (question.type === "MC_MULTI") {
    let correctOptions = options.filter((o: any) => o.isCorrect);
    if (correctOptions.length === 0 && question.answer) {
      const expIds = question.answer.split(",").map((s: string) => s.trim());
      correctOptions = options.filter((o: any) => expIds.includes(o.id));
    }

    const correctIds = new Set(correctOptions.map((o: any) => normalizeTextForComparison(o.id)));
    const correctTexts = new Set(correctOptions.map((o: any) => normalizeTextForComparison(o.text || "")));

    const submittedNormalized = ansArray.map((ans) => normalizeTextForComparison(ans));
    let matchedCount = 0;
    for (const sub of submittedNormalized) {
      if (correctIds.has(sub) || correctTexts.has(sub)) {
        matchedCount++;
      } else {
        matchedCount = -1;
        break;
      }
    }
    isAutoCorrect = matchedCount === correctOptions.length && correctOptions.length === ansArray.length;
  } else if (question.type === "FILL_BLANK") {
    const expected = question.answer || (options.find((o: any) => o.isCorrect)?.text) || "";
    const submitted = ansArray[0] || "";
    isAutoCorrect = matchFillBlankText(expected, submitted);
  } else if (question.type === "WORD_PUZZLE") {
    const expected = question.answer || question.secretPhrase || "";
    const submitted = ansArray[0] || "";
    isAutoCorrect = normalizeTextForComparison(expected) === normalizeTextForComparison(submitted);
  } else if (question.type === "ORDERING" || question.type === "DRAG_DROP") {
    let expectedOrder: string[] = [];
    if (question.answer) {
      expectedOrder = question.answer.split(/[,>|]/).map((s: string) => s.trim());
    } else if (options.length > 0) {
      expectedOrder = options.map((o: any) => o.id);
    }

    let submittedOrder: string[] = [];
    if (Array.isArray(submittedAnswer)) {
      submittedOrder = submittedAnswer;
    } else if (Array.isArray(ansArray[0])) {
      submittedOrder = ansArray[0];
    } else if (typeof ansArray[0] === "string" && ansArray[0].startsWith("[")) {
      try {
        const parsed = JSON.parse(ansArray[0]);
        if (Array.isArray(parsed)) submittedOrder = parsed;
      } catch {
        submittedOrder = ansArray;
      }
    } else if (typeof ansArray[0] === "string" && ansArray[0].includes(",")) {
      submittedOrder = ansArray[0].split(",").map((s: string) => s.trim());
    } else {
      submittedOrder = ansArray;
    }

    const cleanExpected = expectedOrder.map((x) => normalizeTextForComparison(x));
    const cleanSubmitted = submittedOrder.map((x: any) =>
      normalizeTextForComparison(typeof x === "string" ? x : String(x?.id || x))
    );

    isAutoCorrect =
      cleanExpected.length > 0 &&
      cleanExpected.length === cleanSubmitted.length &&
      cleanExpected.every((val, idx) => val === cleanSubmitted[idx]);
  } else if (question.type === "MATCHING") {
    const rawPairs = (question.pairs as any[]) || [];
    let expectedPairs: { left: string; right: string }[] = [];
    if (rawPairs.length > 0) {
      expectedPairs = rawPairs.map((p, i) => ({
        left: p.id || `p${i + 1}`,
        right: p.right || String.fromCharCode(65 + i),
      }));
    } else if (question.answer) {
      expectedPairs = question.answer.split(",").map((part: string) => {
        const [l, r] = part.split(/[:=-]/).map((s: string) => s.trim());
        return { left: l, right: r };
      });
    }

    if (expectedPairs.length > 0) {
      let subPairs: { left: string; right: string }[] = [];
      if (Array.isArray(submittedAnswer) && submittedAnswer.every((x) => typeof x === "string" && /[:=-]/.test(x))) {
        subPairs = submittedAnswer.map((part: string) => {
          const [l, r] = part.split(/[:=-]/).map((s: string) => s.trim());
          return { left: l, right: r };
        });
      } else if (typeof submittedAnswer === "object" && submittedAnswer !== null && !Array.isArray(submittedAnswer)) {
        subPairs = Object.entries(submittedAnswer).map(([l, r]) => ({ left: l, right: String(r) }));
      } else if (typeof ansArray[0] === "string" && ansArray[0].startsWith("{")) {
        try {
          const obj = JSON.parse(ansArray[0]);
          subPairs = Object.entries(obj).map(([l, r]) => ({ left: l, right: String(r) }));
        } catch {}
      }

      if (subPairs.length >= expectedPairs.length) {
        let allMatched = true;
        for (const exp of expectedPairs) {
          const found = subPairs.find(
            (sp) =>
              normalizeTextForComparison(sp.left) === normalizeTextForComparison(exp.left) &&
              normalizeTextForComparison(sp.right) === normalizeTextForComparison(exp.right)
          );
          if (!found) {
            allMatched = false;
            break;
          }
        }
        isAutoCorrect = allMatched;
      } else {
        isAutoCorrect = false;
      }
    } else {
      isAutoCorrect = false;
    }
  } else if (question.type === "CLOZE_DROPDOWN") {
    const blanks = ((question as any).clozeBlanks || options || []) as any[];
    if (blanks.length > 0) {
      let subMap: Record<string, string> = {};
      if (typeof submittedAnswer === "object" && !Array.isArray(submittedAnswer) && submittedAnswer !== null) {
        subMap = submittedAnswer as any;
      } else if (Array.isArray(submittedAnswer)) {
        submittedAnswer.forEach((v: any, i: number) => { subMap[String(i + 1)] = typeof v === "string" ? v : v?.id; });
      } else if (typeof ansArray[0] === "string" && ansArray[0].startsWith("{")) {
        try { subMap = JSON.parse(ansArray[0]); } catch {}
      } else if (typeof ansArray[0] === "string" && ansArray[0].startsWith("[")) {
        try {
          const arr = JSON.parse(ansArray[0]);
          if (Array.isArray(arr)) arr.forEach((v: any, i: number) => { subMap[String(i + 1)] = typeof v === "string" ? v : v?.id; });
        } catch {}
      } else {
        ansArray.forEach((v: any, i: number) => { subMap[String(i + 1)] = v; });
      }

      let allCorrect = true;
      for (const blank of blanks) {
        const correctOpt = blank.options?.find((o: any) => o.isCorrect);
        const userChoice = subMap[String(blank.blankId)] || subMap[blank.blankId];
        if (!correctOpt || (userChoice !== correctOpt.id && userChoice !== correctOpt.text)) {
          allCorrect = false;
          break;
        }
      }
      isAutoCorrect = allCorrect;
    } else {
      isAutoCorrect = false;
    }
  }

  return { isAutoCorrect, isCorrect: isAutoCorrect, answerText };
}
