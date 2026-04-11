import { NextResponse } from "next/server";
import {
  createTailoredPlanDraft,
  getSessionCookieName,
  getUserFromSessionToken,
} from "../../lib/localAuth";

export async function POST(request) {
  try {
    const token = request.cookies.get(getSessionCookieName())?.value;
    const user = await getUserFromSessionToken(token);

    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const body = await request.json();

    const order = await createTailoredPlanDraft({
      userId: user.id,
      tradingYears: String(body.tradingYears || ""),
      profitableBefore: String(body.profitableBefore || ""),
      previousExperience: String(body.previousExperience || ""),
      currentWorkStatus: String(body.currentWorkStatus || ""),
      employmentType: String(body.employmentType || ""),
      hasChildren: String(body.hasChildren || ""),
      childrenCount: String(body.childrenCount || ""),
      country: String(body.country || ""),
      originCountry: String(body.originCountry || ""),
      tradingSession: String(body.tradingSession || ""),
      dailyTradingHours: String(body.dailyTradingHours || ""),
      usualTradingTime: String(body.usualTradingTime || ""),
      energyLevel: String(body.energyLevel || ""),
      dependsOnTradingIncome: String(body.dependsOnTradingIncome || ""),
      personalBackground: String(body.personalBackground || ""),
    });

    return NextResponse.json({ ok: true, order });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to create order." }, { status: 400 });
  }
}
