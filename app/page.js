import Link from "next/link";
import { HomeHeroCard } from "./components/HomeHeroCard";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import { TypewriterText } from "./components/TypewriterText";

export default function HomePage() {
  return (
    <main className="app-shell home-page">
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
                  Built for one clear job: help traders understand their level, stop repeating the same mistakes, and improve from structure instead of noise.
                </p>
              </div>
            </div>

            <div className="stats-grid stats-grid-compact">
              <div className="stat-card">
                <strong>Assess first</strong>
                <span className="muted">Start with the diagnosis before trying to fix the wrong problem.</span>
              </div>
              <div className="stat-card">
                <strong>See the real weakness</strong>
                <span className="muted">Overtrading, poor risk, inconsistency, loss avoidance, and emotional leaks.</span>
              </div>
              <div className="stat-card">
                <strong>Track the pattern</strong>
                <span className="muted">Use honest review and structured feedback to see what is really improving over time.</span>
              </div>
              <div className="stat-card">
                <strong>Get a tailored action plan</strong>
                <span className="muted">Move into a next step built around your level, behavior, and personal situation.</span>
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
                <TypewriterText
                  className="muted home-typewriter"
                  speed={16}
                  text="When we go to a doctor, we do not all receive the same prescription, because not everyone is suffering from the same pain. Trading is no different. One trader may struggle with overtrading, while another struggles with fear of execution. Albi Trust is here to study your exact pain and give you a more tailored prescription."
                />
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
