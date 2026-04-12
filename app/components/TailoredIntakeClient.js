"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentUser } from "./useCurrentUser";

const MAX_SCREENSHOT_BYTES = 800 * 1024;
const INDICATOR_OPTIONS = ["Moving averages", "RSI", "MACD", "Bollinger Bands", "Volume", "VWAP", "Fibonacci", "Other"];
const ASSET_OPTIONS = ["Gold", "Silver", "Forex", "Indices", "Crypto", "Futures indices"];

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

  if (!isPaidStep && !user.latestAssessment) {
    return (
      <section className="result-shell">
        <div className="eyebrow">Tailored intake</div>
        <h1 className="page-title">Complete the assessment first.</h1>
        <p className="page-lead">
          Your action plan needs your saved assessment result before payment can start.
        </p>
        <div className="stack-actions">
          <Link href="/assessment" className="button-primary">
            Take assessment
          </Link>
        </div>
      </section>
    );
  }

  if (!isPaidStep) {
    return (
      <section className="result-shell">
        <div className="eyebrow">Tailored intake</div>
        <h1 className="page-title">Help us tailor your action plan.</h1>
        <p className="page-lead">
          This short intake helps us understand how you trade, what your routine looks like, and what personal context matters most before you continue to payment.
        </p>

        <div className="tailored-intake-summary-grid" style={{ marginTop: 24 }}>
          <div className="metric tailored-intake-summary-card">
            <span>Client</span>
            <strong>{user.fullName}</strong>
          </div>
          <div className="metric tailored-intake-summary-card">
            <span>User ID</span>
            <strong>{user.id}</strong>
          </div>
        </div>

        <form className="auth-fields tailored-intake-form" style={{ marginTop: 24 }} onSubmit={handleSubmit}>
          <section className="tailored-intake-section">
            <div className="tailored-intake-section-head">
              <div>
                <h2 className="tailored-intake-section-title">Trader Snapshot</h2>
                <p className="muted">
                  Start with the core facts about how you trade right now so the diagnosis matches your real habits.
                </p>
              </div>
            </div>

            <div className="auth-name-row tailored-intake-row">
              <label className="form-field">
                <span className="intake-field-label">Years trading</span>
                <select
                  className="form-select"
                  value={form.tradingYears}
                  onChange={(event) => updateField("tradingYears", event.target.value)}
                >
                  <option value="">Select years trading</option>
                  <option value="Less than 1 year">Less than 1 year</option>
                  <option value="1-2 years">1-2 years</option>
                  <option value="3-5 years">3-5 years</option>
                  <option value="6-10 years">6-10 years</option>
                  <option value="10+ years">10+ years</option>
                </select>
              </label>
              <label className="form-field">
                <span className="intake-field-label">Have you ever been profitable?</span>
                <select
                  className="form-select"
                  value={form.profitableBefore}
                  onChange={(event) => updateField("profitableBefore", event.target.value)}
                >
                  <option value="">Select one</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </label>
            </div>

            <div className="auth-name-row tailored-intake-row">
              <label className="form-field">
                <span className="intake-field-label">Risk per trade</span>
                <select
                  className="form-select"
                  value={form.riskPerTrade}
                  onChange={(event) => updateField("riskPerTrade", event.target.value)}
                >
                  <option value="">Select risk per trade</option>
                  <option value="Less than 0.5%">Less than 0.5%</option>
                  <option value="0.5% - 1%">0.5% - 1%</option>
                  <option value="1% - 2%">1% - 2%</option>
                  <option value="More than 2%">More than 2%</option>
                  <option value="I do not use fixed risk">I do not use fixed risk</option>
                </select>
              </label>
              <label className="form-field">
                <span className="intake-field-label">Average holding time</span>
                <select
                  className="form-select"
                  value={form.averageHoldingTime}
                  onChange={(event) => updateField("averageHoldingTime", event.target.value)}
                >
                  <option value="">Select holding time</option>
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
                <span className="intake-field-label">Usual trading session</span>
                <select
                  className="form-select"
                  value={form.tradingSession}
                  onChange={(event) => updateField("tradingSession", event.target.value)}
                >
                  <option value="">Select session</option>
                  <option value="Asia">Asia</option>
                  <option value="London">London</option>
                  <option value="New York">New York</option>
                  <option value="No fixed session">No fixed session</option>
                </select>
              </label>
              <label className="form-field">
                <span className="intake-field-label">When do you usually trade?</span>
                <select
                  className="form-select"
                  value={form.usualTradingTime}
                  onChange={(event) => updateField("usualTradingTime", event.target.value)}
                >
                  <option value="">Select timing</option>
                  <option value="Before work">Before work</option>
                  <option value="During work">During work</option>
                  <option value="After work">After work</option>
                  <option value="Random">Random</option>
                </select>
              </label>
            </div>

            <div className="auth-name-row tailored-intake-row">
              <label className="form-field">
                <span className="intake-field-label">Chart style</span>
                <select
                  className="form-select"
                  value={form.chartStyle}
                  onChange={(event) => updateField("chartStyle", event.target.value)}
                >
                  <option value="">Select chart style</option>
                  <option value="Naked chart">Naked chart</option>
                  <option value="Indicators">Indicators</option>
                  <option value="Both">Both</option>
                </select>
              </label>
              <label className="form-field">
                <span className="intake-field-label">Signals or your own trades?</span>
                <select
                  className="form-select"
                  value={form.usesTradingSignals}
                  onChange={(event) => updateField("usesTradingSignals", event.target.value)}
                >
                  <option value="">Select one</option>
                  <option value="I trade on my own">I trade on my own</option>
                  <option value="I rely on trading signals">I rely on trading signals</option>
                  <option value="Both">Both</option>
                </select>
              </label>
            </div>

            <fieldset className="intake-choice-group tailored-intake-subgroup">
              <legend>Indicators you use</legend>
              <p className="muted">Select anything that plays a real role in your current execution.</p>
              <div className="intake-choice-grid">
                {INDICATOR_OPTIONS.map((indicator) => (
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

            <fieldset className="intake-choice-group tailored-intake-subgroup">
              <legend>Assets you trade most</legend>
              <p className="muted">Choose the markets you trade most often so the plan fits your environment.</p>
              <div className="intake-choice-grid">
                {ASSET_OPTIONS.map((asset) => (
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
          </section>

          <section className="tailored-intake-section">
            <div className="tailored-intake-section-head">
              <div>
                <h2 className="tailored-intake-section-title">Trading Method</h2>
                <p className="muted">
                  Give us a clearer picture of your current strategy, background, and what might be affecting performance.
                </p>
              </div>
            </div>

            <div className="auth-name-row tailored-intake-row">
              <label className="form-field">
                <span className="intake-field-label">Previous experience before trading</span>
                <input
                  type="text"
                  placeholder="Example: sales, engineering, gambling, finance, business"
                  value={form.previousExperience}
                  onChange={(event) => updateField("previousExperience", event.target.value)}
                />
              </label>
              <label className="form-field">
                <span className="intake-field-label">Trading account notes</span>
                <input
                  type="text"
                  placeholder="Anything useful about your account size, style, or current issues"
                  value={form.tradingAccountNotes}
                  onChange={(event) => updateField("tradingAccountNotes", event.target.value)}
                />
              </label>
            </div>

            <label className="form-field form-field-full">
              <span className="intake-field-label">Describe your trading strategy</span>
              <textarea
                className="tailored-textarea tailored-textarea-compact"
                placeholder="Example: I trade London session gold breakouts, wait for pullbacks, risk 1%, and usually hold 30-90 minutes."
                value={form.strategyDescription}
                maxLength={2000}
                onChange={(event) => updateField("strategyDescription", event.target.value)}
              />
            </label>
          </section>

          <section className="tailored-intake-section">
            <div className="tailored-intake-section-head">
              <div>
                <h2 className="tailored-intake-section-title">Personal Context</h2>
                <p className="muted">
                  This helps us build a plan that fits your life, available energy, work rhythm, and responsibilities.
                </p>
              </div>
            </div>

            <div className="auth-name-row tailored-intake-row">
              <label className="form-field">
                <span className="intake-field-label">Current work status</span>
                <select
                  className="form-select"
                  value={form.currentWorkStatus}
                  onChange={(event) => updateField("currentWorkStatus", event.target.value)}
                >
                  <option value="">Select work status</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Unemployed">Unemployed</option>
                  <option value="Student">Student</option>
                </select>
              </label>
              <label className="form-field">
                <span className="intake-field-label">Employment type</span>
                <select
                  className="form-select"
                  value={form.employmentType}
                  onChange={(event) => updateField("employmentType", event.target.value)}
                >
                  <option value="">Select employment type</option>
                  <option value="Fixed hours">Fixed hours</option>
                  <option value="Flexible">Flexible</option>
                  <option value="Self-employed">Self-employed</option>
                </select>
              </label>
            </div>

            <div className="auth-name-row tailored-intake-row">
              <label className="form-field">
                <span className="intake-field-label">Family responsibilities</span>
                <select
                  className="form-select"
                  value={form.familyResponsibilities}
                  onChange={(event) => updateField("familyResponsibilities", event.target.value)}
                >
                  <option value="">Select one</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </label>
              <label className="form-field">
                <span className="intake-field-label">Rely on trading income?</span>
                <select
                  className="form-select"
                  value={form.dependsOnTradingIncome}
                  onChange={(event) => updateField("dependsOnTradingIncome", event.target.value)}
                >
                  <option value="">Select one</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </label>
            </div>

            <div className="auth-name-row tailored-intake-row">
              <label className="form-field">
                <span className="intake-field-label">Country where you live</span>
                <input
                  type="text"
                  placeholder="Current country of residence"
                  value={form.country}
                  onChange={(event) => updateField("country", event.target.value)}
                />
              </label>
              <label className="form-field">
                <span className="intake-field-label">Country you come from</span>
                <input
                  type="text"
                  placeholder="Country of origin"
                  value={form.originCountry}
                  onChange={(event) => updateField("originCountry", event.target.value)}
                />
              </label>
            </div>

            <div className="auth-name-row tailored-intake-row">
              <label className="form-field">
                <span className="intake-field-label">Trading hours per day</span>
                <select
                  className="form-select"
                  value={form.dailyTradingHours}
                  onChange={(event) => updateField("dailyTradingHours", event.target.value)}
                >
                  <option value="">Select hours</option>
                  <option value="<1h">&lt;1h</option>
                  <option value="1-2h">1-2h</option>
                  <option value="2-4h">2-4h</option>
                  <option value="4h+">4h+</option>
                </select>
              </label>
              <label className="form-field">
                <span className="intake-field-label">Energy level after daily responsibilities</span>
                <select
                  className="form-select"
                  value={form.energyLevel}
                  onChange={(event) => updateField("energyLevel", event.target.value)}
                >
                  <option value="">Select energy level</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </label>
            </div>

            <label className="form-field form-field-full">
              <span className="intake-field-label">Tell us about your daily life and trading situation</span>
              <textarea
                className="tailored-textarea"
                placeholder="Example: I work full time, trade in the evening, have 2 kids, feel tired after work, and struggle with discipline after losses."
                value={form.personalBackground}
                maxLength={6000}
                onChange={(event) => updateField("personalBackground", event.target.value)}
              />
            </label>
          </section>

          <section className="tailored-intake-section">
            <div className="tailored-intake-section-head">
              <div>
                <h2 className="tailored-intake-section-title">Supporting Uploads</h2>
                <p className="muted">
                  Upload anything that helps us understand your execution, recent results, or the quality of your current process.
                </p>
              </div>
            </div>

            <label className="form-field form-field-full intake-file-field tailored-intake-upload">
              <span>Recent account screenshots</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(event) => handleScreenshotChange(event.target.files)}
              />
              <small>Optional. Upload up to 3 screenshots from recent trading accounts. Each screenshot must be under 800KB.</small>
            </label>
          </section>

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
