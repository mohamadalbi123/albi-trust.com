"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentUser } from "./useCurrentUser";

const MAX_SCREENSHOT_BYTES = 800 * 1024;

export function TailoredIntakeClient() {
  const { status, user } = useCurrentUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [form, setForm] = useState({
    tradingYears: "",
    profitableBefore: "",
    previousExperience: "",
    currentWorkStatus: "",
    employmentType: "",
    familyResponsibilities: "",
    country: "",
    originCountry: "",
    tradingSession: "",
    dailyTradingHours: "",
    usualTradingTime: "",
    energyLevel: "",
    dependsOnTradingIncome: "",
    chartStyle: "",
    indicators: [],
    tradedAssets: [],
    riskPerTrade: "",
    averageHoldingTime: "",
    usesTradingSignals: "",
    tradingAccountNotes: "",
    strategyDescription: "",
    personalBackground: "",
  });
  const [accountScreenshots, setAccountScreenshots] = useState([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [successNotice, setSuccessNotice] = useState("");
  const finalizeStartedRef = useRef(false);
  const isPaidStep = searchParams.get("paid") === "1";
  const orderId = searchParams.get("order");
  const stripeSessionId = searchParams.get("session_id");

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateMultiField(key, value) {
    setForm((prev) => {
      const currentValues = Array.isArray(prev[key]) ? prev[key] : [];
      return {
        ...prev,
        [key]: currentValues.includes(value)
          ? currentValues.filter((entry) => entry !== value)
          : [...currentValues, value],
      };
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Unable to read screenshot."));
      reader.readAsDataURL(file);
    });
  }

  function handleScreenshotChange(files) {
    setError("");
    const nextFiles = Array.from(files || []).slice(0, 3);
    const oversized = nextFiles.find((file) => file.size > MAX_SCREENSHOT_BYTES);

    if (oversized) {
      setError("Each screenshot must be smaller than 800KB.");
      setAccountScreenshots([]);
      return;
    }

    setAccountScreenshots(nextFiles);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessNotice("");
    setIsSubmitting(true);

    let screenshotPayload = [];

    try {
      screenshotPayload = await Promise.all(
        accountScreenshots.map(async (file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: await readFileAsDataUrl(file),
        })),
      );
    } catch (readError) {
      setError(readError.message || "Unable to read screenshots.");
      setIsSubmitting(false);
      return;
    }

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        accountScreenshots: screenshotPayload,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Unable to create order.");
      setIsSubmitting(false);
      return;
    }

    const checkoutResponse = await fetch("/api/stripe/checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "card",
        draftOrderId: data.order.id,
      }),
    });
    const checkoutData = await checkoutResponse.json();

    if (!checkoutResponse.ok || !checkoutData?.url) {
      setError(checkoutData.error || "Unable to start payment.");
      setIsSubmitting(false);
      return;
    }

    window.location.href = checkoutData.url;
  }

  const handleFinalize = useCallback(async () => {
    if (!orderId) {
      setError("Missing order reference after payment.");
      return;
    }

    if (!stripeSessionId) {
      setError("Missing Stripe payment reference.");
      return;
    }

    setError("");
    setSuccessNotice("");
    setIsFinalizing(true);

    const response = await fetch("/api/orders/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, sessionId: stripeSessionId }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Unable to finalize your order.");
      setIsFinalizing(false);
      return;
    }

    setSuccessNotice("Thank you. Your payment is confirmed and your action plan is under preparation.");
    setIsFinalizing(false);

    window.setTimeout(() => {
      router.push(`/dashboard?order=${data.order.id}&paid=1`);
      router.refresh();
    }, 1800);
  }, [orderId, router, stripeSessionId]);

  useEffect(() => {
    if (status !== "ready" || !isPaidStep || !orderId || !stripeSessionId || isFinalizing || successNotice) return;
    if (finalizeStartedRef.current) return;
    finalizeStartedRef.current = true;
    handleFinalize();
  }, [status, isPaidStep, orderId, stripeSessionId, isFinalizing, successNotice, handleFinalize]);

  if (status === "loading") {
    return (
      <section className="result-shell">
        <div className="eyebrow">Tailored intake</div>
        <h1 className="page-title">Loading your account.</h1>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="result-shell">
        <div className="eyebrow">Tailored intake</div>
        <h1 className="page-title">Sign in to continue.</h1>
        <p className="page-lead">Your intake and payment need to stay connected to your account.</p>
        <div className="stack-actions">
          <Link href="/login?next=%2Ftailored-intake" className="button-primary">
            Sign in
          </Link>
          <Link href="/signup?next=%2Ftailored-intake" className="button-secondary">
            Create account
          </Link>
        </div>
      </section>
    );
  }

  if (!isPaidStep) {
    return (
      <section className="result-shell">
        <div className="eyebrow">Additional information</div>
        <h1 className="page-title">Add your details before payment.</h1>
        <p className="page-lead">
          These optional details help us tailor the action plan around your trading level, personal situation, and life context before you continue to payment.
        </p>

        <div className="mini-grid" style={{ marginTop: 24 }}>
          <div className="metric">
            <span>User</span>
            <strong>{user.fullName}</strong>
          </div>
          <div className="metric">
            <span>User ID</span>
            <strong>{user.id}</strong>
          </div>
        </div>

        <form className="auth-fields tailored-intake-form" style={{ marginTop: 24 }} onSubmit={handleSubmit}>
          <div className="auth-name-row tailored-intake-row">
            <label className="form-field">
              <select
                className="form-select"
                value={form.tradingYears}
                onChange={(event) => updateField("tradingYears", event.target.value)}
              >
                <option value="">Years trading</option>
                <option value="Less than 1 year">Less than 1 year</option>
                <option value="1-2 years">1-2 years</option>
                <option value="3-5 years">3-5 years</option>
                <option value="6-10 years">6-10 years</option>
                <option value="10+ years">10+ years</option>
              </select>
            </label>
            <label className="form-field">
              <select
                className="form-select"
                value={form.profitableBefore}
                onChange={(event) => updateField("profitableBefore", event.target.value)}
              >
                <option value="">Have you ever been profitable?</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </label>
          </div>

          <div className="auth-name-row tailored-intake-row">
            <label className="form-field">
              <input
                type="text"
                placeholder="Previous experience before trading"
                value={form.previousExperience}
                onChange={(event) => updateField("previousExperience", event.target.value)}
              />
            </label>
            <label className="form-field">
              <select
                className="form-select"
                value={form.currentWorkStatus}
                onChange={(event) => updateField("currentWorkStatus", event.target.value)}
              >
                <option value="">Current work status</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Unemployed">Unemployed</option>
                <option value="Student">Student</option>
              </select>
            </label>
          </div>

          <div className="auth-name-row tailored-intake-row">
            <label className="form-field">
              <select
                className="form-select"
                value={form.employmentType}
                onChange={(event) => updateField("employmentType", event.target.value)}
              >
                <option value="">Employment type</option>
                <option value="Fixed hours">Fixed hours</option>
                <option value="Flexible">Flexible</option>
                <option value="Self-employed">Self-employed</option>
              </select>
            </label>
            <label className="form-field">
              <select
                className="form-select"
                value={form.familyResponsibilities}
                onChange={(event) => updateField("familyResponsibilities", event.target.value)}
              >
                <option value="">Family responsibilities</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </label>
          </div>

          <div className="auth-name-row tailored-intake-row">
            <label className="form-field">
              <input
                type="text"
                placeholder="Country where you live"
                value={form.country}
                onChange={(event) => updateField("country", event.target.value)}
              />
            </label>
            <label className="form-field">
              <input
                type="text"
                placeholder="Country you come from"
                value={form.originCountry}
                onChange={(event) => updateField("originCountry", event.target.value)}
              />
            </label>
          </div>

          <div className="auth-name-row tailored-intake-row">
            <label className="form-field">
              <select
                className="form-select"
                value={form.dependsOnTradingIncome}
                onChange={(event) => updateField("dependsOnTradingIncome", event.target.value)}
              >
                <option value="">Rely on trading income?</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </label>
            <label className="form-field">
              <select
                className="form-select"
                value={form.chartStyle}
                onChange={(event) => updateField("chartStyle", event.target.value)}
              >
                <option value="">Chart style</option>
                <option value="Naked chart">Naked chart</option>
                <option value="Indicators">Indicators</option>
                <option value="Both">Both</option>
              </select>
            </label>
          </div>

          <fieldset className="intake-choice-group">
            <legend>Indicators you use</legend>
            <p className="muted">Select any that apply.</p>
            <div className="intake-choice-grid">
              {["Moving averages", "RSI", "MACD", "Bollinger Bands", "Volume", "VWAP", "Fibonacci", "Other"].map((indicator) => (
                <label key={indicator} className="intake-check">
                  <input
                    type="checkbox"
                    checked={form.indicators.includes(indicator)}
                    onChange={() => updateMultiField("indicators", indicator)}
                  />
                  <span>{indicator}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="intake-choice-group">
            <legend>Assets you trade most</legend>
            <p className="muted">Choose the markets you trade most often.</p>
            <div className="intake-choice-grid">
              {["Gold", "Silver", "Forex", "Indices", "Crypto", "Futures indices"].map((asset) => (
                <label key={asset} className="intake-check">
                  <input
                    type="checkbox"
                    checked={form.tradedAssets.includes(asset)}
                    onChange={() => updateMultiField("tradedAssets", asset)}
                  />
                  <span>{asset}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="auth-name-row tailored-intake-row">
            <label className="form-field">
              <select
                className="form-select"
                value={form.riskPerTrade}
                onChange={(event) => updateField("riskPerTrade", event.target.value)}
              >
                <option value="">Risk per trade</option>
                <option value="Less than 0.5%">Less than 0.5%</option>
                <option value="0.5% - 1%">0.5% - 1%</option>
                <option value="1% - 2%">1% - 2%</option>
                <option value="More than 2%">More than 2%</option>
                <option value="I do not use fixed risk">I do not use fixed risk</option>
              </select>
            </label>
            <label className="form-field">
              <select
                className="form-select"
                value={form.averageHoldingTime}
                onChange={(event) => updateField("averageHoldingTime", event.target.value)}
              >
                <option value="">Average holding time</option>
                <option value="Minutes">Minutes</option>
                <option value="Less than 1 hour">Less than 1 hour</option>
                <option value="1-4 hours">1-4 hours</option>
                <option value="Same day">Same day</option>
                <option value="Several days">Several days</option>
              </select>
            </label>
          </div>

          <div className="auth-name-row tailored-intake-row">
            <label className="form-field">
              <select
                className="form-select"
                value={form.usesTradingSignals}
                onChange={(event) => updateField("usesTradingSignals", event.target.value)}
              >
                <option value="">Signals or your own trades?</option>
                <option value="I trade on my own">I trade on my own</option>
                <option value="I rely on trading signals">I rely on trading signals</option>
                <option value="Both">Both</option>
              </select>
            </label>
            <label className="form-field">
              <input
                type="text"
                placeholder="Trading account notes (optional)"
                value={form.tradingAccountNotes}
                onChange={(event) => updateField("tradingAccountNotes", event.target.value)}
              />
            </label>
          </div>

          <label className="form-field form-field-full intake-file-field">
            <span>Last 1-3 account screenshots</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(event) => handleScreenshotChange(event.target.files)}
            />
            <small>Optional. Upload up to 3 screenshots from recent trading accounts. Each screenshot must be under 800KB.</small>
          </label>

          <label className="form-field form-field-full">
            <textarea
              className="tailored-textarea tailored-textarea-compact"
              placeholder="Describe your trading strategy in brief. Example: I trade London session gold breakouts, wait for pullbacks, risk 1%, and usually hold 30-90 minutes."
              value={form.strategyDescription}
              maxLength={2000}
              onChange={(event) => updateField("strategyDescription", event.target.value)}
            />
          </label>

          <div className="auth-name-row tailored-intake-row">
            <label className="form-field">
              <select
                className="form-select"
                value={form.tradingSession}
                onChange={(event) => updateField("tradingSession", event.target.value)}
              >
                <option value="">Usual trading session</option>
                <option value="Asia">Asia</option>
                <option value="London">London</option>
                <option value="New York">New York</option>
                <option value="No fixed session">No fixed session</option>
              </select>
            </label>
            <label className="form-field">
              <select
                className="form-select"
                value={form.dailyTradingHours}
                onChange={(event) => updateField("dailyTradingHours", event.target.value)}
              >
                <option value="">Trading hours per day</option>
                <option value="<1h">&lt;1h</option>
                <option value="1-2h">1-2h</option>
                <option value="2-4h">2-4h</option>
                <option value="4h+">4h+</option>
              </select>
            </label>
          </div>

          <div className="auth-name-row tailored-intake-row">
            <label className="form-field">
              <select
                className="form-select"
                value={form.usualTradingTime}
                onChange={(event) => updateField("usualTradingTime", event.target.value)}
              >
                <option value="">When do you usually trade?</option>
                <option value="Before work">Before work</option>
                <option value="During work">During work</option>
                <option value="After work">After work</option>
                <option value="Random">Random</option>
              </select>
            </label>
            <label className="form-field">
              <select
                className="form-select"
                value={form.energyLevel}
                onChange={(event) => updateField("energyLevel", event.target.value)}
              >
                <option value="">Energy level after daily responsibilities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </label>
          </div>

          <label className="form-field form-field-full">
            <textarea
              className="tailored-textarea"
              placeholder="Tell me about your daily life and trading situation. Example: I work full time, trade in the evening, have 2 kids, feel tired after work, and struggle with discipline after losses."
              value={form.personalBackground}
              maxLength={6000}
              onChange={(event) => updateField("personalBackground", event.target.value)}
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <div className="stack-actions">
            <button type="submit" className="button-primary" disabled={isSubmitting}>
              {isSubmitting ? "Preparing payment..." : "Continue to payment - $99"}
            </button>
            <Link href="/results" className="button-secondary">
              Back to result
            </Link>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="result-shell">
      {successNotice ? (
        <div className="assessment-start-overlay">
          <div className="assessment-start-modal">
            <div className="eyebrow">Payment confirmed</div>
            <h1 className="page-title assessment-start-title">Thank you for your purchase.</h1>
            <p className="page-lead">{successNotice}</p>
          </div>
        </div>
      ) : null}

      <div className="eyebrow">Payment confirmed</div>
      <h1 className="page-title">Finalizing your tailored action-plan order.</h1>
      <p className="page-lead">
        Your payment was successful. We are confirming the order and taking you back to your dashboard.
      </p>

      {error ? <p className="auth-error">{error}</p> : null}

      <div className="stack-actions" style={{ marginTop: 24 }}>
        <button type="button" className="button-primary" onClick={handleFinalize} disabled={isFinalizing || Boolean(successNotice)}>
          {isFinalizing ? "Finalizing order..." : "Finalize now"}
        </button>
      </div>
    </section>
  );
}
