import Link from "next/link";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function LegalPage({ badge, title, intro, sections, updated }) {
  return (
    <main className="app-shell">
      <SiteHeader />
      <section className="legal-shell">
        <div style={{ marginBottom: 18 }}>
          <Link href="/" className="muted">
            ← Back to home
          </Link>
        </div>

        <div className="eyebrow">{badge}</div>
        <h1 className="page-title">{title}</h1>
        <p className="page-lead">{intro}</p>

        <div className="legal-grid">
          {sections.map(([heading, points]) => (
            <section key={heading} className="legal-card">
              <h2>{heading}</h2>
              <div className="legal-points">
                {points.map((point) => (
                  <p key={point}>{point}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="footer-note" style={{ marginTop: 28, paddingTop: 0 }}>
          {updated}
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}
