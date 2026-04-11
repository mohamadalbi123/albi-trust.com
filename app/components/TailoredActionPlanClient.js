"use client";

import Link from "next/link";
import { useCurrentUser } from "./useCurrentUser";

export function TailoredActionPlanClient() {
  const { status, user } = useCurrentUser();

  if (status === "loading") {
    return (
      <section className="result-shell">
        <div className="eyebrow">Tailored action plan</div>
        <h1 className="page-title">Loading your account.</h1>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="result-shell">
        <div className="eyebrow">Tailored action plan</div>
        <h1 className="page-title">Sign in to continue.</h1>
        <p className="page-lead">Your personalized action plan is tied to your account and assessment record.</p>
        <div className="stack-actions">
          <Link href="/login?next=%2Ftailored-action-plan" className="button-primary">
            Sign in
          </Link>
          <Link href="/signup?next=%2Ftailored-action-plan" className="button-secondary">
            Create account
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="result-shell">
      <div className="eyebrow">Tailored action plan</div>
      <h1 className="page-title">Add your details before payment.</h1>
      <p className="page-lead">
        Your plan is built around your assessment and personal trading situation. Complete the intake first, then Stripe will handle the secure card checkout.
      </p>

      <div className="stack-actions">
        <Link href="/tailored-intake" className="button-primary">
          Continue to intake
        </Link>
        <Link href="/results" className="button-secondary">
          Back to result
        </Link>
      </div>
    </section>
  );
}
