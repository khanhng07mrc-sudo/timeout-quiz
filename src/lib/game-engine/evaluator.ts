/**
 * Timeout Quiz Unified Evaluator Engine
 * Chấm điểm đáp án chuẩn xác và đồng bộ 100% giữa Server (Socket handlers) và Sandbox (Offline/Online).
 * Hỗ trợ tất cả các dạng câu hỏi: MC_SINGLE, MC_MULTI, TRUE_FALSE, FILL_BLANK, MATCHING, DRAG_DROP, CLOZE_DROPDOWN, WORD_PUZZLE, ESSAY.
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
  const variants = expectedAnswer
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

  if (variants.includes(normSubmitted)) return true;

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

  const trueTokens = ["true", "đúng", "dung", "t", "d", "1", "yes", "có", "co", "y"];
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
): { isAutoCorrect: boolean | undefined; answerText: string } {
  if (!question) {
    return { isAutoCorrect: false, answerText: "(Không có câu hỏi)" };
  }
  const options = (question.options as any[]) || [];
  const ansArray = Array.isArray(submittedAnswer)
    ? submittedAnswer
    : submittedAnswer !== undefined && submittedAnswer !== null
    ? [String(submittedAnswer)]
    : [];

  if (ansArray.length === 0) {
    return { isAutoCorrect: false, answerText: "(Chưa chọn đáp án / Hết giờ)" };
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
    return { isAutoCorrect: undefined, answerText };
  }

  let isAutoCorrect = false;

  if (question.type === "MC_SINGLE") {
    const correctOption = options.find((o: any) => o.isCorrect);
    if (correctOption) {
      const normCorrectId = normalizeTextForComparison(correctOption.id);
      const normCorrectText = normalizeTextForComparison(correctOption.text || "");

      isAutoCorrect = ansArray.some((ans) => {
        const normAns = normalizeTextForComparison(ans);
        return (
          normAns === normCorrectId ||
          normAns === normCorrectText ||
          ans === correctOption.id
        );
      });
    }
  } else if (question.type === "TRUE_FALSE") {
    const correctOption = options.find((o: any) => o.isCorrect);
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
    const correctOptions = options.filter((o: any) => o.isCorrect);
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
  } else if (question.type === "MATCHING") {
    const rawPairs = (question.pairs as any[]) || [];
    if (rawPairs.length > 0) {
      let subObj: Record<string, string> = {};
      if (typeof submittedAnswer === "object" && !Array.isArray(submittedAnswer) && submittedAnswer !== null) {
        subObj = submittedAnswer as any;
      } else if (typeof ansArray[0] === "object" && ansArray[0] !== null && !Array.isArray(ansArray[0])) {
        subObj = ansArray[0] as any;
      } else if (typeof ansArray[0] === "string") {
        try {
          const parsed = JSON.parse(ansArray[0]);
          if (typeof parsed === "object" && !Array.isArray(parsed) && parsed !== null) {
            subObj = parsed;
          }
        } catch {}
      } else if (typeof (question as any).rawSubmission === "object") {
        subObj = (question as any).rawSubmission;
      }

      let allMatched = Object.keys(subObj).length >= rawPairs.length;
      for (let i = 0; i < rawPairs.length; i++) {
        const pair = rawPairs[i];
        const pairId = pair.id || `p${i + 1}`;
        const expectedRight = String.fromCharCode(65 + i);
        const userVal = subObj[pairId] || subObj[`L_${i}`] || subObj[String(i)] || subObj[pair.left];
        const isMatch =
          userVal === pairId ||
          userVal === expectedRight ||
          userVal === pair.right ||
          normalizeTextForComparison(userVal) === normalizeTextForComparison(pair.right);
        if (!isMatch) {
          allMatched = false;
          break;
        }
      }
      isAutoCorrect = allMatched;
    } else {
      isAutoCorrect = false;
    }
  } else if (question.type === "DRAG_DROP") {
    const correctOrder = options.map((o: any) => o.id);
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
    } else {
      submittedOrder = ansArray;
    }
    const cleanSubmitted = submittedOrder.map((x: any) => (typeof x === "string" ? x : String(x?.id || x)));
    isAutoCorrect =
      correctOrder.length === cleanSubmitted.length &&
      correctOrder.every((id: string, idx: number) => id === cleanSubmitted[idx]);
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

  return { isAutoCorrect, answerText };
}
