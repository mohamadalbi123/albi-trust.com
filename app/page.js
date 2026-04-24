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
                <h2 className="section-title">Why traders stay stuck</h2>
                <p className="page-lead">
                  Most traders are not stuck because they need more information. They stay stuck because they do not yet know the exact weakness damaging their execution, risk behavior, or consistency.
                </p>
              </div>
            </div>

            <div className="stuck-grid">
              <div className="stuck-card">
                <strong>One trader overtrades.</strong>
                <span className="muted">Good ideas get destroyed by impulse and the need to always be in the market.</span>
              </div>
              <div className="stuck-card">
                <strong>Another hesitates.</strong>
                <span className="muted">The setup is there, but fear of execution keeps turning clarity into missed trades.</span>
              </div>
              <div className="stuck-card">
                <strong>Another breaks risk after losses.</strong>
                <span className="muted">A single emotional reaction can undo days of patient work and discipline.</span>
              </div>
            </div>
          </section>

          <section className="section section-split-clean">
            <div className="insight-grid insight-grid-clean levels-preview-grid">
              <div className="split-card split-card-plain">
                <div className="eyebrow">Trader levels</div>
                <h2 className="section-title" style={{ fontSize: "2.25rem", marginTop: 18 }}>
                  A simple level system with clear meaning.
                </h2>
                <div className="levels-list">
                  <div className="level-row">
                    <strong>Level 1: Reactive Trader</strong>
                    <span className="muted">Emotions, inconsistency, and impulse still control too many decisions.</span>
                  </div>
                  <div className="level-row">
                    <strong>Level 2: Developing Trader</strong>
                    <span className="muted">There is real potential, but weak structure and repeated habits still create leaks.</span>
                  </div>
                  <div className="level-row">
                    <strong>Level 3: Structured Trader</strong>
                    <span className="muted">The foundation is strong, but a few recurring behaviors are still limiting consistency.</span>
                  </div>
                  <div className="level-row">
                    <strong>Level 4: Advanced Trader</strong>
                    <span className="muted">Execution is disciplined and mature, with refinement focused on higher-level improvement.</span>
                  </div>
                </div>
              </div>

              <div className="split-card split-card-plain sample-result-card">
                <div className="eyebrow">Sample result preview</div>
                <div className="sample-result-shell">
                  <div className="sample-result-meta">Professional checklist preview</div>
                  <h3>Trader Level: Developing Trader</h3>
                  <ul className="sample-result-list sample-result-checklist">
                    <li>Trader profile overview</li>
                    <li>Observation based on core trading pillars</li>
                    <li>Biggest blocker and solution</li>
                    <li>Daily routine</li>
                    <li>Weekly routine</li>
                    <li>Risk management</li>
                    <li>Economic calendar</li>
                    <li>Chart analysis process</li>
                    <li>Golden advice</li>
                    <li>Execution at the right level</li>
                  </ul>
                </div>
                <div className="stack-actions">
                  <Link href="/assessment" className="button-primary">
                    Start with free assessment
                  </Link>
                </div>
              </div>
            </div>
          </section>

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
