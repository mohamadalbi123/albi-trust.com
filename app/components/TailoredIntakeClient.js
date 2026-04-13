"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { TradingViewGoldChart } from "./TradingViewGoldChart";
import { useCurrentUser } from "./useCurrentUser";

const MAX_SCREENSHOT_BYTES = 800 * 1024;
const ASSET_OPTIONS = ["Metals", "Forex", "Indices", "Crypto", "Commodities", "Futures"];
const COUNTRY_OPTIONS = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Democratic Republic of the Congo",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];
const STEP_OPTIONS = {
  tradingYears: ["Less than 1 year", "1-2 years", "3-5 years", "6-10 years", "10+ years"],
  profitableBefore: ["Yes", "No"],
  riskPerTrade: ["Less than 0.5%", "0.5% - 1%", "1% - 2%", "More than 2%", "I do not use fixed risk"],
  averageHoldingTime: ["Minutes", "1-4 hours", "4-12 hours", "Several days"],
  tradingSession: ["Asia", "London", "New York"],
  usualTradingTime: ["Before work", "During work", "After work", "Random"],
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
    description: "Start with the essentials so the plan fits how you really trade.",
  },
  {
    id: "chart",
    eyebrow: "Step 2",
    title: "How would you trade this gold chart?",
    description: "Use the chart the way you normally would, then tell us your trade idea.",
  },
  {
    id: "reality",
    eyebrow: "Step 3",
    title: "What does your daily reality look like?",
    description: "Your plan needs to fit your work, energy, time, and any extra context you want to share.",
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
    tradingSession: [],
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
  const [isMobileLayout, setIsMobileLayout] = useState(false);
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

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const syncLayout = () => setIsMobileLayout(mediaQuery.matches);

    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);
    return () => mediaQuery.removeEventListener("change", syncLayout);
  }, []);

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
      if (!form.tradingYears || !form.profitableBefore || !form.tradingSession.length || !form.usualTradingTime) {
        return "Complete the core trading profile first so we can diagnose your style properly.";
      }

      if (!form.tradedAssets.length) {
        return "Choose at least one market you trade most.";
      }

      return "";
    }

    if (stepId === "chart") {
      if (!form.usesTradingSignals || !form.riskPerTrade || !form.averageHoldingTime) {
        return "Answer the chart execution questions before moving on.";
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
    function renderSingleChoiceField({
      label,
      value,
      options,
      onSelect,
      compact = false,
      placeholder = "Select one",
      wrapperClassName = "tailored-question-block",
    }) {
      return (
        <div className={wrapperClassName}>
          <span className="intake-field-label">{label}</span>
          {isMobileLayout ? (
            <select
              className="tailored-mobile-select"
              value={value}
              onChange={(event) => onSelect(event.target.value)}
            >
              <option value="">{placeholder}</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <div className={`intake-pill-grid ${compact ? "intake-pill-grid-compact" : ""}`}>
              {options.map((option) => (
                <ChoicePill
                  key={option}
                  active={value === option}
                  label={option}
                  onClick={() => onSelect(option)}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeStep.id === "style") {
      return (
        <>
          {renderSingleChoiceField({
            label: "How long have you really been trading?",
            value: form.tradingYears,
            options: STEP_OPTIONS.tradingYears,
            onSelect: (value) => updateField("tradingYears", value),
            placeholder: "Select trading experience",
          })}

          {renderSingleChoiceField({
            label: "Have you ever been profitable?",
            value: form.profitableBefore,
            options: STEP_OPTIONS.profitableBefore,
            onSelect: (value) => updateField("profitableBefore", value),
            compact: true,
            placeholder: "Select one",
          })}

          <label className="form-field form-field-full tailored-question-block">
            <span className="intake-field-label">Previous experience before trading</span>
            <input
              type="text"
              placeholder="Optional: finance, gambling, sales, engineering, entrepreneurship"
              value={form.previousExperience}
              onChange={(event) => updateField("previousExperience", event.target.value)}
            />
          </label>

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
                    active={form.tradingSession.includes(option)}
                    label={option}
                    onClick={() => updateMultiField("tradingSession", option)}
                  />
                ))}
              </div>
            </div>

            {renderSingleChoiceField({
              label: "When do you usually trade?",
              value: form.usualTradingTime,
              options: STEP_OPTIONS.usualTradingTime,
              onSelect: (value) => updateField("usualTradingTime", value),
              compact: true,
              placeholder: "Select timing",
            })}
          </div>
        </>
      );
    }

    if (activeStep.id === "chart") {
      return (
        <>
          <TradingViewGoldChart />

          <section className="tailored-chart-panel">
            <div className="tailored-chart-field-grid tailored-chart-field-grid-triple">
              {renderSingleChoiceField({
                label: "Signals or your own trades?",
                value: form.usesTradingSignals,
                options: STEP_OPTIONS.usesTradingSignals,
                onSelect: (value) => updateField("usesTradingSignals", value),
                compact: true,
                placeholder: "Select one",
                wrapperClassName: "tailored-chart-field",
              })}

              {renderSingleChoiceField({
                label: "Risk per trade",
                value: form.riskPerTrade,
                options: STEP_OPTIONS.riskPerTrade,
                onSelect: (value) => updateField("riskPerTrade", value),
                placeholder: "Select risk",
                wrapperClassName: "tailored-chart-field",
              })}

              {renderSingleChoiceField({
                label: "Average holding time",
                value: form.averageHoldingTime,
                options: STEP_OPTIONS.averageHoldingTime,
                onSelect: (value) => updateField("averageHoldingTime", value),
                placeholder: "Select holding time",
                wrapperClassName: "tailored-chart-field",
              })}
            </div>
          </section>

          <section className="tailored-chart-panel tailored-chart-panel-split">
            <div className="tailored-chart-field">
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

            <label className="form-field tailored-chart-field">
              <span className="intake-field-label">Why would you take that decision?</span>
              <textarea
                className="tailored-textarea tailored-textarea-compact"
                placeholder="Tell us what you see: levels, structure, confirmation, risk, session context, or why you would stay out."
                value={form.chartReasoning}
                maxLength={2000}
                onChange={(event) => updateField("chartReasoning", event.target.value)}
              />
            </label>
          </section>

          <section className="tailored-chart-panel">
            <label className="form-field form-field-full tailored-chart-field">
            <span className="intake-field-label">Describe your trading strategy in simple words</span>
            <textarea
              className="tailored-textarea tailored-textarea-compact"
              placeholder="Example: I trade London session gold breakouts, wait for pullbacks, risk 1%, and usually hold 30-90 minutes."
              value={form.strategyDescription}
              maxLength={2000}
              onChange={(event) => updateField("strategyDescription", event.target.value)}
            />
          </label>
          </section>
        </>
      );
    }

    if (activeStep.id === "reality") {
      return (
        <>
          <div className="tailored-question-grid">
            {renderSingleChoiceField({
              label: "Current work status",
              value: form.currentWorkStatus,
              options: STEP_OPTIONS.currentWorkStatus,
              onSelect: (value) => updateField("currentWorkStatus", value),
              compact: true,
              placeholder: "Select status",
            })}

            {renderSingleChoiceField({
              label: "Employment type",
              value: form.employmentType,
              options: STEP_OPTIONS.employmentType,
              onSelect: (value) => updateField("employmentType", value),
              compact: true,
              placeholder: "Select type",
            })}
          </div>

          <div className="tailored-question-grid">
            {renderSingleChoiceField({
              label: "Family responsibilities",
              value: form.familyResponsibilities,
              options: STEP_OPTIONS.familyResponsibilities,
              onSelect: (value) => updateField("familyResponsibilities", value),
              compact: true,
              placeholder: "Select one",
            })}

            {renderSingleChoiceField({
              label: "Do you depend on trading income?",
              value: form.dependsOnTradingIncome,
              options: STEP_OPTIONS.dependsOnTradingIncome,
              onSelect: (value) => updateField("dependsOnTradingIncome", value),
              compact: true,
              placeholder: "Select one",
            })}
          </div>

          <div className="tailored-question-grid">
            <label className="form-field tailored-question-block">
              <span className="intake-field-label">Country where you live</span>
              <input
                type="text"
                list="country-options"
                placeholder="Current country of residence"
                value={form.country}
                onChange={(event) => updateField("country", event.target.value)}
              />
            </label>

            <label className="form-field tailored-question-block">
              <span className="intake-field-label">Country you come from</span>
              <input
                type="text"
                list="country-options"
                placeholder="Country of origin"
                value={form.originCountry}
                onChange={(event) => updateField("originCountry", event.target.value)}
              />
            </label>
          </div>

          <datalist id="country-options">
            {COUNTRY_OPTIONS.map((country) => (
              <option key={country} value={country} />
            ))}
          </datalist>

          <div className="tailored-question-grid">
            {renderSingleChoiceField({
              label: "How much time can you trade per day?",
              value: form.dailyTradingHours,
              options: STEP_OPTIONS.dailyTradingHours,
              onSelect: (value) => updateField("dailyTradingHours", value),
              compact: true,
              placeholder: "Select hours",
            })}

            {renderSingleChoiceField({
              label: "What is your energy usually like?",
              value: form.energyLevel,
              options: STEP_OPTIONS.energyLevel,
              onSelect: (value) => updateField("energyLevel", value),
              compact: true,
              placeholder: "Select energy",
            })}
          </div>

          <label className="form-field form-field-full tailored-question-block">
            <span className="intake-field-label">Tell us your weekly and daily routine, personal and trading related</span>
            <textarea
              className="tailored-textarea"
              placeholder="Shortly: what your week looks like, what your trading days look like, and what affects your trading personally."
              value={form.personalBackground}
              maxLength={6000}
              onChange={(event) => updateField("personalBackground", event.target.value)}
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
          <strong>Optional extra context</strong>
          <p className="muted">
            Add anything else that helps us understand your situation better, then continue to payment.
          </p>
        </div>
        </>
      );
    }

    return null;
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
          Short guided questions before payment. Core answers are required, extra context stays optional.
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
