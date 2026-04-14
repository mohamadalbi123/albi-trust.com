import { NextResponse } from "next/server";
import {
  createTailoredPlanDraft,
  getSessionCookieName,
  getUserFromSessionToken,
} from "../../lib/localAuth";

const MAX_SCREENSHOT_BYTES = 800 * 1024;

function stringArray(value) {
  return Array.isArray(value) ? value.map((entry) => String(entry || "").trim()).filter(Boolean) : [];
}

function stringOrJoinedArray(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "").trim()).filter(Boolean).join(", ");
  }

  return String(value || "");
}

function accountScreenshots(value) {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, 3)
    .map((entry) => ({
      name: String(entry?.name || "account-screenshot").slice(0, 120),
      type: String(entry?.type || ""),
      size: Number(entry?.size || 0),
      dataUrl: String(entry?.dataUrl || ""),
    }))
    .filter((entry) => entry.dataUrl.startsWith("data:image/") && entry.size <= MAX_SCREENSHOT_BYTES);
}

export async function POST(request) {
  try {
    const token = request.cookies.get(getSessionCookieName())?.value;
    const user = await getUserFromSessionToken(token);

    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    if (!user.latestAssessment) {
      return NextResponse.json(
        { error: "Please complete the assessment before buying an action plan." },
        { status: 400 },
      );
    }

    const body = await request.json();

    const order = await createTailoredPlanDraft({
      userId: user.id,
      tradingYears: String(body.tradingYears || ""),
      profitableBefore: String(body.profitableBefore || ""),
      traderWeaknesses: stringArray(body.traderWeaknesses),
      otherTraderWeakness: String(body.otherTraderWeakness || ""),
      previousExperience: String(body.previousExperience || ""),
      currentWorkStatus: String(body.currentWorkStatus || ""),
      employmentType: String(body.employmentType || ""),
      familyResponsibilities: String(body.familyResponsibilities || ""),
      country: String(body.country || ""),
      originCountry: String(body.originCountry || ""),
      tradingSession: stringOrJoinedArray(body.tradingSession),
      dailyTradingHours: String(body.dailyTradingHours || ""),
      usualTradingTime: String(body.usualTradingTime || ""),
      energyLevel: String(body.energyLevel || ""),
      dependsOnTradingIncome: String(body.dependsOnTradingIncome || ""),
      chartStyle: String(body.chartStyle || ""),
      indicators: stringArray(body.indicators),
      tradedAssets: stringArray(body.tradedAssets),
      riskPerTrade: String(body.riskPerTrade || ""),
      averageHoldingTime: String(body.averageHoldingTime || ""),
      usesTradingSignals: String(body.usesTradingSignals || ""),
      chartTradeDecision: String(body.chartTradeDecision || ""),
      chartReasoning: String(body.chartReasoning || ""),
      tradingAccountNotes: String(body.tradingAccountNotes || ""),
      strategyDescription: String(body.strategyDescription || ""),
      accountScreenshots: accountScreenshots(body.accountScreenshots),
      personalBackground: String(body.personalBackground || ""),
    });

    return NextResponse.json({ ok: true, order });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to create order." }, { status: 400 });
  }
}
