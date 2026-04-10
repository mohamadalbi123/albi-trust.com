"use client";

import Link from "next/link";
import { useCurrentUser } from "./useCurrentUser";

const AUTOMATED_METRICS = [
  ["Win rate", "58%"],
  ["Average RR", "1.9R"],
  ["Average losing trade", "-0.82R"],
  ["Average winning trade", "+1.56R"],
  ["Average duration", "2h 14m"],
  ["Average trades / day", "2.4"],
  ["Best session", "London open"],
  ["Most common issue", "Early entries"],
];

const DISCIPLINE_FIELDS = [
  "Date",
  "Mindset",
  "Read the rules / news",
  "Max daily risk 2%",
  "Max 3 trades",
  "Break after a loss",
  "Waited for entries",
  "Executed confidently",
  "Locked in profits",
  "Respected SL for exit",
  "Emotions observed during the trade",
  "Daily result",
];

const RULE_OPTIONS = ["Yes", "No", "N/A"];
const MINDSET_OPTIONS = ["Focused", "Distracted", "Overconfident", "Calm", "Anxious", "Frustrated"];
const EMOTION_OPTIONS = [
  "Didn't wait for proper setup -> entered too early",
  "Fear of loss -> exited before SL",
  "Fear of missing profits -> took profits too early",
  "Executed with confidence -> SL and TP levels respected",
];

export function JournalClient() {
  const { status, user } = useCurrentUser();

  if (status === "loading") {
    return (
      <section className="journal-shell">
        <div className="eyebrow">Journal</div>
        <h1 className="page-title">Loading your journal access.</h1>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="journal-shell">
        <div className="eyebrow">Journal</div>
        <h1 className="page-title">Sign in to access the journal.</h1>
        <p className="page-lead">The journal area is only available inside your account.</p>
        <div className="stack-actions">
          <Link href="/login" className="button-primary">
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  if (!user.hasPaidTailoredPlan) {
    return (
      <section className="journal-shell">
        <div className="eyebrow">Journal</div>
        <h1 className="page-title">Unlock the journal after payment.</h1>
        <p className="page-lead">
          This journaling area is reserved for users who completed payment for the tailored action plan.
        </p>
        <div className="action-grid" style={{ marginTop: 24 }}>
          <div className="action-card">
            <strong>What unlocks here</strong>
            <p className="muted">
              MT5 / cTrader connection, automated trading metrics, and your structured daily discipline journal.
            </p>
          </div>
          <div className="action-card">
            <strong>Access rule</strong>
            <p className="muted">
              Once your tailored action plan is purchased, this page becomes part of your paid member area.
            </p>
          </div>
        </div>
        <div className="stack-actions">
          <Link href="/tailored-action-plan" className="button-primary">
            Unlock with tailored action plan
          </Link>
          <Link href="/dashboard" className="button-secondary">
            Back to dashboard
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="journal-shell">
      <div className="eyebrow">Paid journal area</div>
      <h1 className="page-title">Journal, validate, and study the real pattern.</h1>
      <p className="page-lead">
        This area combines automated platform data with your daily discipline checklist, mindset, and emotional validation.
      </p>

      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: "2rem" }}>
              Trading account connection
            </h2>
            <p className="muted">
              Connect MT5 or cTrader so your statistics can be pulled automatically into the journal.
            </p>
          </div>
        </div>

        <div className="action-grid" style={{ marginTop: 18 }}>
          <div className="action-card">
            <strong>MT5</strong>
            <p className="muted">Connect your MetaTrader 5 account to import trade history and performance metrics.</p>
            <div className="tag-row" style={{ marginTop: 14 }}>
              <span className="tag">History sync</span>
              <span className="tag">Win rate</span>
              <span className="tag">RR</span>
            </div>
          </div>
          <div className="action-card">
            <strong>cTrader</strong>
            <p className="muted">Connect your cTrader account to bring in execution data and session statistics automatically.</p>
            <div className="tag-row" style={{ marginTop: 14 }}>
              <span className="tag">Duration</span>
              <span className="tag">Trade count</span>
              <span className="tag">Session data</span>
            </div>
          </div>
          <div className="action-card">
            <strong>Connection note</strong>
            <p className="muted">This is the product structure first. Platform integrations can be connected next on top of it.</p>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: "2rem" }}>
              Automated performance snapshot
            </h2>
            <p className="muted">These are the kinds of metrics that can be pulled from MT5 and cTrader automatically.</p>
          </div>
        </div>

        <div className="action-grid" style={{ marginTop: 18 }}>
          {AUTOMATED_METRICS.map(([label, value]) => (
            <div className="action-card" key={label}>
              <strong>{label}</strong>
              <p className="journal-metric-value">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: "2rem" }}>
              Daily discipline journal
            </h2>
            <p className="muted">
              Your real manual layer stays here: rules, mindset, execution discipline, and emotional observations.
            </p>
          </div>
        </div>

        <div className="journal-form-shell" style={{ marginTop: 18 }}>
          <div className="journal-field-grid">
            {DISCIPLINE_FIELDS.map((field) => (
              <div className="journal-field-card" key={field}>
                <strong>{field}</strong>
                <p className="muted">
                  {field === "Mindset"
                    ? MINDSET_OPTIONS.join(" / ")
                    : field === "Emotions observed during the trade"
                      ? "Choose from your emotional validation list."
                      : field === "Date"
                        ? "Daily entry date"
                        : field === "Daily result"
                          ? "Example: FP-100K challenge or daily % result"
                          : RULE_OPTIONS.join(" / ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="two-col-grid" style={{ gridTemplateColumns: "1.05fr 1fr" }}>
          <div className="dashboard-card" style={{ padding: 24 }}>
            <strong>Validation options you already use</strong>
            <div className="tag-row" style={{ marginTop: 18 }}>
              {RULE_OPTIONS.map((option) => (
                <span className="tag" key={option}>
                  {option}
                </span>
              ))}
            </div>
            <div className="tag-row" style={{ marginTop: 14 }}>
              {MINDSET_OPTIONS.map((option) => (
                <span className="tag" key={option}>
                  {option}
                </span>
              ))}
            </div>
          </div>

          <div className="dashboard-card" style={{ padding: 24 }}>
            <strong>Emotion observation list</strong>
            <div className="tag-row" style={{ marginTop: 18 }}>
              {EMOTION_OPTIONS.map((option) => (
                <span className="tag" key={option}>
                  {option}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
