export const ASSESSMENT_SCORING_VERSION = 2;

export const answerOptions = [
  { label: "Rarely true", value: 1 },
  { label: "Sometimes true", value: 2 },
  { label: "Often true", value: 3 },
  { label: "Almost always true", value: 4 },
];

export const categories = [
  {
    key: "discipline",
    label: "Discipline",
    description: "How consistently you follow your rules instead of your impulses.",
  },
  {
    key: "lossAcceptance",
    label: "Loss acceptance",
    description: "How well you can take a controlled loss without emotional disruption.",
  },
  {
    key: "risk",
    label: "Risk control",
    description: "How well you protect capital before chasing returns.",
  },
  {
    key: "consistency",
    label: "Consistency",
    description: "How structured your routine, review process, and execution really are.",
  },
  {
    key: "emotions",
    label: "Emotional control",
    description: "How much fear, frustration, greed, and impatience affect your decisions.",
  },
  {
    key: "preparation",
    label: "Preparation & method clarity",
    description: "How well you prepare, understand context, and use tools with purpose instead of noise.",
  },
];

export const questions = [
  { id: 1, category: "discipline", text: "I enter trades even when my setup is not fully there because I do not want to miss the move." },
  { id: 2, category: "discipline", text: "I know my rules, but in live market conditions I still break them." },
  { id: 3, category: "discipline", text: "After one good trade, I often feel tempted to keep trading even when the session no longer makes sense." },
  { id: 4, category: "discipline", text: "I trade because the market is open, not because I truly have a valid opportunity." },
  { id: 5, category: "discipline", text: "I do not always stop trading when I hit my own limit for the day." },
  { id: 6, category: "lossAcceptance", text: "When price comes close to my stop, I feel the urge to move it and give the trade more room." },
  { id: 7, category: "lossAcceptance", text: "Taking a clean loss still feels personal to me, even when I know it was a valid trade." },
  { id: 8, category: "lossAcceptance", text: "After a losing trade, I want to win it back quickly." },
  { id: 9, category: "lossAcceptance", text: "I re-enter after being stopped out because I cannot accept missing the move." },
  { id: 10, category: "lossAcceptance", text: "My emotional pain after a loss is stronger than my respect for my trading plan." },
  { id: 11, category: "risk", text: "My position size changes depending on how confident or frustrated I feel." },
  { id: 12, category: "risk", text: "I sometimes risk too much on one trade because the setup looks obvious." },
  { id: 13, category: "risk", text: "I have days where I do not really know my maximum acceptable loss before I start trading." },
  { id: 14, category: "risk", text: "I have taken oversized trades trying to recover a red day." },
  { id: 15, category: "risk", text: "Protecting capital is not always my first focus when I trade." },
  { id: 16, category: "consistency", text: "My trading routine changes too much from one week to another." },
  { id: 17, category: "consistency", text: "I do not review my trades deeply enough to see my repeating mistakes." },
  { id: 18, category: "consistency", text: "I switch methods, timeframes, or ideas too often when results are not immediate." },
  { id: 19, category: "consistency", text: "I journal inconsistently or skip it when I do not feel like facing the truth." },
  { id: 20, category: "consistency", text: "My biggest problem is not information, it is repeating the same mistakes." },
  { id: 21, category: "emotions", text: "My mood before trading has a big impact on the quality of my execution." },
  { id: 22, category: "emotions", text: "Fear of missing out still pushes me into bad entries." },
  { id: 23, category: "emotions", text: "Impatience makes me want action even when waiting is the best decision." },
  { id: 24, category: "emotions", text: "I can feel when I am emotional, but I still trade anyway." },
  { id: 25, category: "emotions", text: "The hardest part of trading for me is managing myself, not reading the chart." },
  { id: 26, category: "preparation", text: "I start the week without properly reviewing higher-timeframe structure and important price levels." },
  { id: 27, category: "preparation", text: "I ignore the economic calendar and only react to market volatility after it hits." },
  { id: 28, category: "preparation", text: "I build trading ideas without reviewing broader context such as seasonality, positioning, or macro drivers." },
  { id: 29, category: "preparation", text: "I use tools like ATR or volume without a clear reason such as volatility measurement, confirmation, or risk management." },
  { id: 30, category: "preparation", text: "My trading method is not clear enough for me to explain why I use each tool and when I should stay out of the market." },
];

export const levels = [
  {
    key: "level1",
    title: "Level 1: Reactive Trader",
    range: [25, 49],
    summary:
      "You are likely fighting the market and yourself at the same time. The issue is not knowledge alone. Your execution is being pulled by emotion, urgency, and rule-breaking.",
    focus:
      "Slow down the damage first. Stabilize risk, stop reactive trading, and create a daily structure you can actually follow.",
  },
  {
    key: "level2",
    title: "Level 2: Developing Trader",
    range: [50, 68],
    summary:
      "You already understand important trading ideas, but your consistency is not strong enough yet. You know more than you execute.",
    focus:
      "Your next step is tightening routines, reducing overtrading, and making your process stronger than your emotions.",
  },
  {
    key: "level3",
    title: "Level 3: Structured Trader",
    range: [69, 82],
    summary:
      "You have a real base. There is structure, awareness, and enough maturity to improve with refinement instead of reinvention.",
    focus:
      "You need cleaner review loops, sharper self-observation, and fewer leaks in emotional execution.",
  },
  {
    key: "level4",
    title: "Level 4: Advanced Trader",
    range: [83, 100],
    summary:
      "You are operating from structure, not noise. Your work is no longer about survival. It is about refinement, longevity, and protecting a strong process.",
    focus:
      "Stay selective, keep journaling honestly, and keep refining the weak spots before they grow.",
  },
];

export const modules = {
  discipline: {
    title: "Discipline reset plan",
    bullets: [
      "Set a strict maximum number of trades for the day before the market opens.",
      "Use a pre-trade checklist and require a full match before execution.",
      "Create a stop rule for boredom, revenge, and impulse entries.",
    ],
  },
  lossAcceptance: {
    title: "Loss acceptance work",
    bullets: [
      "Treat a valid stopped-out trade as professional execution, not personal failure.",
      "Use a written post-loss reset rule before taking another trade.",
      "Review every moved stop and re-entry for emotional intent, not outcome.",
    ],
  },
  risk: {
    title: "Capital protection framework",
    bullets: [
      "Fix your risk per trade and daily drawdown before the session starts.",
      "Separate confidence from position sizing completely.",
      "Track all oversized trades and build a no-exception rule around them.",
    ],
  },
  consistency: {
    title: "Consistency system",
    bullets: [
      "Journal daily even on red or frustrating days.",
      "Review your month by mistake pattern, not only by profit and loss.",
      "Keep one clear execution process for long enough to measure it honestly.",
    ],
  },
  emotions: {
    title: "Emotional control protocol",
    bullets: [
      "Record your mental state before the first trade of the day.",
      "Pause after emotional spikes and step away before re-engaging.",
      "Build one short reset routine you use after fear, greed, or frustration appears.",
    ],
  },
  preparation: {
    title: "Preparation and method clarity plan",
    bullets: [
      "Build a weekly routine around higher-timeframe review, key levels, and major market events.",
      "Use indicators and context tools only when you can define their exact purpose in your process.",
      "Reduce chart noise and keep only the tools that improve clarity, risk control, or confirmation.",
    ],
  },
};

function clampScore(score) {
  return Math.max(25, Math.min(100, Math.round(score)));
}

function categoryScoreFromRawTotal(rawTotal, questionCount) {
  return clampScore(((questionCount * 4 - rawTotal) / (questionCount * 3)) * 75 + 25);
}

function overallScoreFromRawTotal(rawTotal, questionCount) {
  return clampScore((((questionCount * 4) - rawTotal) / (questionCount * 3)) * 75 + 25);
}

function rawTotalFromCategoryScore(score) {
  return Math.round((125 - Number(score || 25)) / 5);
}

function buildAssessmentResult(categoryScores) {
  const questionCount = questions.length;
  const totalRawScore = categoryScores.reduce(
    (sum, entry) => sum + rawTotalFromCategoryScore(entry.score),
    0,
  );
  const normalizedScore = overallScoreFromRawTotal(totalRawScore, questionCount);
  const level = levels.find(
    (item) => normalizedScore >= item.range[0] && normalizedScore <= item.range[1],
  ) || levels[0];
  const sortedWeaknesses = [...categoryScores].sort((a, b) => a.score - b.score);
  const primaryWeakness = sortedWeaknesses[0];
  const secondaryWeakness = sortedWeaknesses[1];
  const strongest = [...categoryScores].sort((a, b) => b.score - a.score)[0];

  return {
    overallScore: normalizedScore,
    level,
    totalQuestions: questionCount,
    categoryScores,
    primaryWeakness,
    secondaryWeakness,
    strongest,
    recommendedModules: [primaryWeakness.key, secondaryWeakness.key].map((key) => modules[key]),
    scoringVersion: ASSESSMENT_SCORING_VERSION,
  };
}

export function evaluateAnswers(answers) {
  const categoryScores = categories.map((category) => {
    const related = questions.filter((question) => question.category === category.key);
    const total = related.reduce((sum, question) => sum + (answers[question.id] || 0), 0);

    return {
      ...category,
      score: categoryScoreFromRawTotal(total, related.length),
    };
  });

  return {
    ...buildAssessmentResult(categoryScores),
    answerValues: answers,
  };
}

export function migrateLegacyAssessmentResult(result) {
  if (!result) return result;
  if (Number(result.scoringVersion || 0) >= ASSESSMENT_SCORING_VERSION) {
    return result;
  }

  if (result.answerValues && typeof result.answerValues === "object") {
    return evaluateAnswers(result.answerValues);
  }

  const existingScores = new Map(
    (result.categoryScores || []).map((entry) => [entry.key, Number(entry.score || 25)]),
  );

  const correctedCategoryScores = categories.map((category) => {
    const legacyScore = existingScores.get(category.key);
    const correctedScore = category.key === "preparation"
      ? clampScore(125 - Number(legacyScore || 25))
      : clampScore(legacyScore || 25);

    return {
      ...category,
      score: correctedScore,
    };
  });

  return buildAssessmentResult(correctedCategoryScores);
}
