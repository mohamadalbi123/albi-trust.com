import Link from "next/link";
import { HomeHeroCard } from "./components/HomeHeroCard";
import { HomeVisitPopup } from "./components/HomeVisitPopup";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import { absoluteUrl, DEFAULT_OG_IMAGE } from "./lib/site";

export const metadata = {
  title: "Free Trading Assessment For Struggling Traders",
  description:
    "A free trading assessment for traders who are not yet consistently profitable. Discover your level, your biggest blocker, and your next step.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Free Trading Assessment For Struggling Traders",
    description:
      "Discover your biggest trading blocker and understand what is really holding you back.",
    url: absoluteUrl("/"),
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Trading Assessment For Struggling Traders",
    description:
      "Take the free assessment and understand your trader level and biggest blocker.",
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function HomePage() {
  return (
    <main className="app-shell home-page">
      <HomeVisitPopup />
      <SiteHeader />

      <section className="hero hero-minimal">
        <HomeHeroCard />
      </section>

      <div className="home-main-board">
        <div className="home-content-wrap">
          <section className="section home-section-light">
            <div className="section-head section-head-compact">
              <div className="home-copy-wrap">
                <h2 className="section-title">One focused system</h2>
                <p className="page-lead">
                  Built to help you understand your level, eliminate repeated mistakes, and take practical, actionable steps to trade with structure instead of noise.
                </p>
              </div>
            </div>

            <div className="stats-grid stats-grid-compact">
              <div className="stat-card">
                <span className="step-number">1</span>
                <strong>Take the Assessment</strong>
                <span className="muted">Answer honestly. This is where real clarity starts.</span>
              </div>
              <div className="stat-card">
                <span className="step-number">2</span>
                <strong>Know Your Level</strong>
                <span className="muted">Understand exactly where you stand based on your behavior and habits.</span>
              </div>
              <div className="stat-card">
                <span className="step-number">3</span>
                <strong>Get Your Tailored Plan</strong>
                <span className="muted">We analyze your weaknesses and build a personalized plan with clear, practical steps to help you improve.</span>
              </div>
              <div className="stat-card">
                <span className="step-number">4</span>
                <strong>Measure Your Progress</strong>
                <span className="muted">Return after 30 days, retake the assessment, and track your improvement.</span>
              </div>
            </div>
          </section>

          <section className="section section-split-clean">
            <div className="insight-grid insight-grid-clean">
              <div className="split-card split-card-plain">
                <div className="eyebrow">What traders need</div>
                <h2 className="section-title" style={{ fontSize: "2.25rem", marginTop: 18 }}>
                  Traders do not need one more generic course. They need a tailored action plan.
                </h2>
                <p className="muted">
                  The goal is not to sell recycled trading lessons. It is to diagnose the real problem, understand the trader’s level and personal situation, and build a clear, doable, personalized action plan.
                </p>
              </div>

              <div className="split-card split-card-plain">
                <div className="eyebrow">Built from experience</div>
                <div className="tag-row" style={{ marginTop: 18 }}>
                  <span className="tag">64 practical intervention ideas</span>
                  <span className="tag">Years of real trader pattern review</span>
                  <span className="tag">Psychology + execution focus</span>
                  <span className="tag">A simpler, cleaner trading philosophy</span>
                </div>
                <div className="stack-actions">
                  <Link href="/assessment" className="button-primary">
                    Start with free assessment
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
