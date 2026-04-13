"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { TradingViewGoldChart } from "./TradingViewGoldChart";
import { useCurrentUser } from "./useCurrentUser";

const MAX_SCREENSHOT_BYTES = 800 * 1024;
const INDICATOR_OPTIONS = ["None / naked chart", "Moving averages", "RSI", "MACD", "Bollinger Bands", "Volume", "VWAP", "Fibonacci", "Other"];
const ASSET_OPTIONS = ["Gold", "Silver", "Forex", "Indices", "Crypto", "Futures indices"];
const STEP_OPTIONS = {
  tradingYears: ["Less than 1 year", "1-2 years", "3-5 years", "6-10 years", "10+ years"],
  profitableBefore: ["Yes", "No"],
  riskPerTrade: ["Less than 0.5%", "0.5% - 1%", "1% - 2%", "More than 2%", "I do not use fixed risk"],
  averageHoldingTime: ["Minutes", "Less than 1 hour", "1-4 hours", "Same day", "Several days"],
  tradingSession: ["Asia", "London", "New York", "No fixed session"],
  usualTradingTime: ["Before work", "During work", "After work", "Random"],
  chartStyle: ["Naked chart", "Indicators", "Both"],
  usesTradingSignals: ["I trade on my own", "I rely on trading signals", "Both"],
  currentWorkStatus: ["Full-time", "Part-time", "Unemployed", "Student"],
  employmentType: ["Fixed hours", "Flexible", "Self-employed"],
  familyResponsibilities: ["Yes", "No", "Prefer not to say"],
  dependsOnTradingIncome: ["Yes", "No"],
  dailyTradingHours: ["<1h", "1-2h", "2-4h", "4h+"],
  energyLevel: ["High", "Medium", "Low"],
};
const INTAKE_STEPS = [
  {
    id: "style",
    eyebrow: "Step 1",
    title: "How do you actually trade?",
    description: "We start with the essentials so your plan fits your real trading style instead of assumptions.",
  },
  {
    id: "chart",
    eyebrow: "Step 2",
    title: "How would you trade this gold chart?",
    description: "Use the chart, mark levels if you want, choose the indicators you actually use, and tell us your trade idea.",
  },
  {
    id: "reality",
    eyebrow: "Step 3",
    title: "What does your daily reality look like?",
    description: "A strong plan has to fit your work, energy, responsibilities, and available time.",
  },
  {
    id: "extras",
    eyebrow: "Step 4",
    title: "Anything else that helps us diagnose better?",
    description: "Optional screenshots and context can make the final plan much more specific.",
  },
];

function ChoicePill({ active, label, onClick }) {
  return (
    <button type="button" className={`intake-pill ${active ? "is-active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

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
    chartTradeDecision: "",
    chartReasoning: "",
  });
  const [accountScreenshots, setAccountScreenshots] = useState([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [successNotice, setSuccessNotice] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [stepError, setStepError] = useState("");
  const finalizeStartedRef = useRef(false);
  const isPaidStep = searchParams.get("paid") === "1";
  const orderId = searchParams.get("order");
  const stripeSessionId = searchParams.get("session_id");
  const activeStep = INTAKE_STEPS[currentStep];
  const isLastStep = currentStep === INTAKE_STEPS.length - 1;
  const progress = ((currentStep + 1) / INTAKE_STEPS.length) * 100;

  function updateField(key, value) {
    setStepError("");
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateMultiField(key, value) {
    setStepError("");
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
    setStepError("");
    const nextFiles = Array.from(files || []).slice(0, 3);
    const oversized = nextFiles.find((file) => file.size > MAX_SCREENSHOT_BYTES);

    if (oversized) {
      setError("Each screenshot must be smaller than 800KB.");
      setAccountScreenshots([]);
      return;
    }

    setAccountScreenshots(nextFiles);
  }

  function isFilled(value) {
    return Boolean(String(value || "").trim());
  }

  function validateStep(stepId = activeStep.id) {
    if (stepId === "style") {
      if (!form.tradingYears || !form.profitableBefore || !form.tradingSession || !form.usualTradingTime) {
        return "Complete the core trading profile first so we can diagnose your style properly.";
      }

      if (!form.tradedAssets.length) {
        return "Choose at least one market you trade most.";
      }

      return "";
    }

    if (stepId === "chart") {
      if (!form.chartStyle || !form.usesTradingSignals || !form.riskPerTrade || !form.averageHoldingTime) {
        return "Answer the chart execution questions before moving on.";
      }

      if (!form.indicators.length) {
        return "Choose the indicator style you used on the chart, or select None / naked chart.";
      }

      if (!form.chartTradeDecision || !isFilled(form.chartReasoning)) {
        return "Tell us how you would trade this chart and why.";
      }

      return "";
    }

    if (stepId === "reality") {
      if (
        !form.currentWorkStatus ||
        !form.employmentType ||
        !form.familyResponsibilities ||
        !form.dependsOnTradingIncome ||
        !form.dailyTradingHours ||
        !form.energyLevel
      ) {
        return "Complete the personal reality questions so the plan can fit your routine.";
      }

      if (!isFilled(form.country) || !isFilled(form.personalBackground)) {
        return "Tell us where you live and give a short picture of your daily reality before continuing.";
      }

      return "";
    }

    return "";
  }

  function nextStep() {
    const validationMessage = validateStep();

    if (validationMessage) {
      setStepError(validationMessage);
      return;
    }

    setStepError("");
    setCurrentStep((prev) => Math.min(prev + 1, INTAKE_STEPS.length - 1));
  }

  function previousStep() {
    setStepError("");
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessNotice("");

    const validationMessage = validateStep("style") || validateStep("chart") || validateStep("reality");

    if (validationMessage) {
      setStepError(validationMessage);
      setIsSubmitting(false);
      return;
    }

    setStepError("");
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

  function renderStepContent() {
    if (activeStep.id === "style") {
      return (
        <>
          <div className="tailored-question-block">
            <span className="intake-field-label">How long have you really been trading?</span>
            <div className="intake-pill-grid">
              {STEP_OPTIONS.tradingYears.map((option) => (
                <ChoicePill
                  key={option}
                  active={form.tradingYears === option}
                  label={option}
                  onClick={() => updateField("tradingYears", option)}
                />
              ))}
            </div>
          </div>

          <div className="tailored-question-block">
            <span className="intake-field-label">Have you ever been profitable?</span>
            <div className="intake-pill-grid intake-pill-grid-compact">
              {STEP_OPTIONS.profitableBefore.map((option) => (
                <ChoicePill
                  key={option}
                  active={form.profitableBefore === option}
                  label={option}
                  onClick={() => updateField("profitableBefore", option)}
                />
              ))}
            </div>
          </div>

          <div className="tailored-question-block">
            <span className="intake-field-label">What do you trade most?</span>
            <div className="intake-pill-grid">
              {ASSET_OPTIONS.map((option) => (
                <ChoicePill
                  key={option}
                  active={form.tradedAssets.includes(option)}
                  label={option}
                  onClick={() => updateMultiField("tradedAssets", option)}
                />
              ))}
            </div>
          </div>

          <div className="tailored-question-grid">
            <div className="tailored-question-block">
              <span className="intake-field-label">Usual trading session</span>
              <div className="intake-pill-grid intake-pill-grid-compact">
                {STEP_OPTIONS.tradingSession.map((option) => (
                  <ChoicePill
                    key={option}
                    active={form.tradingSession === option}
                    label={option}
                    onClick={() => updateField("tradingSession", option)}
                  />
                ))}
              </div>
            </div>

            <div className="tailored-question-block">
              <span className="intake-field-label">When do you usually trade?</span>
              <div className="intake-pill-grid intake-pill-grid-compact">
                {STEP_OPTIONS.usualTradingTime.map((option) => (
                  <ChoicePill
                    key={option}
                    active={form.usualTradingTime === option}
                    label={option}
                    onClick={() => updateField("usualTradingTime", option)}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      );
    }

    if (activeStep.id === "chart") {
      return (
        <>
          <div className="tailored-chart-hero">
            <div>
              <span className="intake-field-label">Interactive gold chart</span>
              <h3 className="tailored-chart-title">Review XAUUSD the way you normally would.</h3>
              <p className="muted">
                Use the TradingView chart below. If you want, add a simple trend line or level on the chart toolbar, then answer the questions under it.
              </p>
            </div>
          </div>

          <TradingViewGoldChart />

          <div className="tailored-question-grid">
            <div className="tailored-question-block">
              <span className="intake-field-label">Chart style</span>
              <div className="intake-pill-grid intake-pill-grid-compact">
                {STEP_OPTIONS.chartStyle.map((option) => (
                  <ChoicePill
                    key={option}
                    active={form.chartStyle === option}
                    label={option}
                    onClick={() => updateField("chartStyle", option)}
                  />
                ))}
              </div>
            </div>

            <div className="tailored-question-block">
              <span className="intake-field-label">Signals or your own trades?</span>
              <div className="intake-pill-grid intake-pill-grid-compact">
                {STEP_OPTIONS.usesTradingSignals.map((option) => (
                  <ChoicePill
                    key={option}
                    active={form.usesTradingSignals === option}
                    label={option}
                    onClick={() => updateField("usesTradingSignals", option)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="tailored-question-grid">
            <div className="tailored-question-block">
              <span className="intake-field-label">Risk per trade</span>
              <div className="intake-pill-grid">
                {STEP_OPTIONS.riskPerTrade.map((option) => (
                  <ChoicePill
                    key={option}
                    active={form.riskPerTrade === option}
                    label={option}
                    onClick={() => updateField("riskPerTrade", option)}
                  />
                ))}
              </div>
            </div>

            <div className="tailored-question-block">
              <span className="intake-field-label">Average holding time</span>
              <div className="intake-pill-grid">
                {STEP_OPTIONS.averageHoldingTime.map((option) => (
                  <ChoicePill
                    key={option}
                    active={form.averageHoldingTime === option}
                    label={option}
                    onClick={() => updateField("averageHoldingTime", option)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="tailored-question-block">
            <span className="intake-field-label">Which indicators did you use on this chart?</span>
            <div className="intake-pill-grid">
              {INDICATOR_OPTIONS.map((option) => (
                <ChoicePill
                  key={option}
                  active={form.indicators.includes(option)}
                  label={option}
                  onClick={() => {
                    if (option === "None / naked chart") {
                      updateField("chartStyle", "Naked chart");
                      setStepError("");
                      setForm((prev) => ({
                        ...prev,
                        indicators: prev.indicators.includes(option) ? [] : [option],
                      }));
                      return;
                    }

                    setStepError("");
                    setForm((prev) => {
                      const currentValues = Array.isArray(prev.indicators) ? prev.indicators : [];
                      const withoutNone = currentValues.filter((entry) => entry !== "None / naked chart");

                      return {
                        ...prev,
                        indicators: withoutNone.includes(option)
                          ? withoutNone.filter((entry) => entry !== option)
                          : [...withoutNone, option],
                      };
                    });
                  }}
                />
              ))}
            </div>
          </div>

          <div className="tailored-question-grid">
            <div className="tailored-question-block">
              <span className="intake-field-label">How would you trade this chart?</span>
              <div className="intake-pill-grid intake-pill-grid-compact">
                {["Buy", "Sell", "Wait for confirmation", "Skip this setup", "Not sure"].map((option) => (
                  <ChoicePill
                    key={option}
                    active={form.chartTradeDecision === option}
                    label={option}
                    onClick={() => updateField("chartTradeDecision", option)}
                  />
                ))}
              </div>
            </div>

            <label className="form-field tailored-question-block">
              <span className="intake-field-label">Why would you take that decision?</span>
              <textarea
                className="tailored-textarea tailored-textarea-compact"
                placeholder="Tell us what you see: levels, structure, confirmation, risk, session context, or why you would stay out."
                value={form.chartReasoning}
                maxLength={2000}
                onChange={(event) => updateField("chartReasoning", event.target.value)}
              />
            </label>
          </div>

          <label className="form-field form-field-full tailored-question-block">
            <span className="intake-field-label">Describe your trading strategy in simple words</span>
            <textarea
              className="tailored-textarea tailored-textarea-compact"
              placeholder="Example: I trade London session gold breakouts, wait for pullbacks, risk 1%, and usually hold 30-90 minutes."
              value={form.strategyDescription}
              maxLength={2000}
              onChange={(event) => updateField("strategyDescription", event.target.value)}
            />
          </label>
        </>
      );
    }

    if (activeStep.id === "reality") {
      return (
        <>
          <div className="tailored-question-grid">
            <div className="tailored-question-block">
              <span className="intake-field-label">Current work status</span>
              <div className="intake-pill-grid intake-pill-grid-compact">
                {STEP_OPTIONS.currentWorkStatus.map((option) => (
                  <ChoicePill
                    key={option}
                    active={form.currentWorkStatus === option}
                    label={option}
                    onClick={() => updateField("currentWorkStatus", option)}
                  />
                ))}
              </div>
            </div>

            <div className="tailored-question-block">
              <span className="intake-field-label">Employment type</span>
              <div className="intake-pill-grid intake-pill-grid-compact">
                {STEP_OPTIONS.employmentType.map((option) => (
                  <ChoicePill
                    key={option}
                    active={form.employmentType === option}
                    label={option}
                    onClick={() => updateField("employmentType", option)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="tailored-question-grid">
            <div className="tailored-question-block">
              <span className="intake-field-label">Family responsibilities</span>
              <div className="intake-pill-grid intake-pill-grid-compact">
                {STEP_OPTIONS.familyResponsibilities.map((option) => (
                  <ChoicePill
                    key={option}
                    active={form.familyResponsibilities === option}
                    label={option}
                    onClick={() => updateField("familyResponsibilities", option)}
                  />
                ))}
              </div>
            </div>

            <div className="tailored-question-block">
              <span className="intake-field-label">Do you depend on trading income?</span>
              <div className="intake-pill-grid intake-pill-grid-compact">
                {STEP_OPTIONS.dependsOnTradingIncome.map((option) => (
                  <ChoicePill
                    key={option}
                    active={form.dependsOnTradingIncome === option}
                    label={option}
                    onClick={() => updateField("dependsOnTradingIncome", option)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="tailored-question-grid">
            <label className="form-field tailored-question-block">
              <span className="intake-field-label">Country where you live</span>
              <input
                type="text"
                placeholder="Current country of residence"
                value={form.country}
                onChange={(event) => updateField("country", event.target.value)}
              />
            </label>

            <label className="form-field tailored-question-block">
              <span className="intake-field-label">Country you come from</span>
              <input
                type="text"
                placeholder="Country of origin"
                value={form.originCountry}
                onChange={(event) => updateField("originCountry", event.target.value)}
              />
            </label>
          </div>

          <div className="tailored-question-grid">
            <div className="tailored-question-block">
              <span className="intake-field-label">How much time can you trade per day?</span>
              <div className="intake-pill-grid intake-pill-grid-compact">
                {STEP_OPTIONS.dailyTradingHours.map((option) => (
                  <ChoicePill
                    key={option}
                    active={form.dailyTradingHours === option}
                    label={option}
                    onClick={() => updateField("dailyTradingHours", option)}
                  />
                ))}
              </div>
            </div>

            <div className="tailored-question-block">
              <span className="intake-field-label">What is your energy usually like?</span>
              <div className="intake-pill-grid intake-pill-grid-compact">
                {STEP_OPTIONS.energyLevel.map((option) => (
                  <ChoicePill
                    key={option}
                    active={form.energyLevel === option}
                    label={option}
                    onClick={() => updateField("energyLevel", option)}
                  />
                ))}
              </div>
            </div>
          </div>

          <label className="form-field form-field-full tailored-question-block">
            <span className="intake-field-label">Tell us about your daily life and trading reality</span>
            <textarea
              className="tailored-textarea"
              placeholder="Example: I work full time, trade in the evening, have 2 kids, feel tired after work, and struggle with discipline after losses."
              value={form.personalBackground}
              maxLength={6000}
              onChange={(event) => updateField("personalBackground", event.target.value)}
            />
          </label>
        </>
      );
    }

    return (
      <>
        <label className="form-field form-field-full tailored-question-block">
          <span className="intake-field-label">Previous experience before trading</span>
          <input
            type="text"
            placeholder="Example: finance, gambling, sales, engineering, entrepreneurship"
            value={form.previousExperience}
            onChange={(event) => updateField("previousExperience", event.target.value)}
          />
        </label>

        <label className="form-field form-field-full tailored-question-block">
          <span className="intake-field-label">Anything important about your current account or execution?</span>
          <input
            type="text"
            placeholder="Optional notes about your account, execution style, or current issue"
            value={form.tradingAccountNotes}
            onChange={(event) => updateField("tradingAccountNotes", event.target.value)}
          />
        </label>

        <label className="form-field form-field-full intake-file-field tailored-intake-upload tailored-question-block">
          <span>Recent account screenshots</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(event) => handleScreenshotChange(event.target.files)}
          />
          <small>Optional. Upload up to 3 screenshots from recent trading accounts. Each screenshot must be under 800KB.</small>
        </label>

        <div className="tailored-intake-note-card">
          <strong>Almost there.</strong>
          <p className="muted">
            You already gave us the important trading and lifestyle context. Add anything extra here if it helps us understand your situation better, then continue to secure payment.
          </p>
        </div>
      </>
    );
  }

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
        <h1 className="page-title">Let&apos;s shape your action plan.</h1>
        <p className="page-lead">
          This guided intake keeps the important questions mandatory, while uploads and extra notes stay optional so the flow still feels fast before payment.
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

        <form className="auth-fields tailored-intake-form tailored-intake-wizard" style={{ marginTop: 24 }} onSubmit={handleSubmit}>
          <section className="tailored-intake-stage">
            <div className="tailored-intake-stage-top">
              <div>
                <div className="eyebrow">{activeStep.eyebrow}</div>
                <h2 className="tailored-intake-stage-title">{activeStep.title}</h2>
                <p className="muted">{activeStep.description}</p>
              </div>
              <div className="tailored-intake-stage-meta">
                <strong>{currentStep + 1}/{INTAKE_STEPS.length}</strong>
                <span>Tailored diagnostic flow</span>
              </div>
            </div>

            <div className="tailored-intake-progress">
              <div className="tailored-intake-progress-bar">
                <div className="tailored-intake-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="tailored-intake-step-row">
                {INTAKE_STEPS.map((step, index) => (
                  <button
                    key={step.id}
                    type="button"
                    className={`tailored-intake-step-chip ${index === currentStep ? "is-active" : ""} ${index < currentStep ? "is-complete" : ""}`}
                    onClick={() => {
                      if (index > currentStep) {
                        const validationMessage = validateStep();

                        if (validationMessage) {
                          setStepError(validationMessage);
                          return;
                        }
                      }

                      setStepError("");
                      setCurrentStep(index);
                    }}
                  >
                    {step.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="tailored-intake-stage-card">
              <div className="tailored-intake-stage-callout">
                <strong>What matters here</strong>
                <span>
                  The core answers are required because they shape the diagnosis. Screenshots and extra notes stay optional.
                </span>
              </div>
              {renderStepContent()}
            </div>
          </section>

          {stepError ? <p className="auth-error tailored-step-error">{stepError}</p> : null}
          {error ? <p className="auth-error">{error}</p> : null}

          <div className="tailored-intake-nav">
            <div className="stack-actions" style={{ marginTop: 0 }}>
              {currentStep > 0 ? (
                <button type="button" className="button-secondary" onClick={previousStep}>
                  Back
                </button>
              ) : (
                <Link href="/results" className="button-secondary">
                  Back to result
                </Link>
              )}
            </div>

            <div className="stack-actions" style={{ marginTop: 0 }}>
              {!isLastStep ? (
                <button type="button" className="button-primary" onClick={nextStep}>
                  Continue
                </button>
              ) : (
                <button type="submit" className="button-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Preparing payment..." : "Continue to payment - $99"}
                </button>
              )}
            </div>
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
