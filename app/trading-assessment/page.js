import Link from "next/link";
import Script from "next/script";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { SITE_NAME, absoluteUrl, DEFAULT_OG_IMAGE } from "../lib/site";

export const metadata = {
  title: "Free Trading Assessment | Discover Your Biggest Trading Blocker",
  description:
    "Take the free Albitrust trading assessment and discover your biggest blocker as a trader. Understand your level, discipline issues, and next improvement path.",
  alternates: {
    canonical: "/trading-assessment",
  },
  openGraph: {
    title: "Free Trading Assessment | Albitrust",
    description:
      "A free trading assessment for traders who feel stuck, inconsistent, or not yet profitable.",
    url: absoluteUrl("/trading-assessment"),
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Trading Assessment | Albitrust",
    description:
      "Take the free assessment and discover your biggest trading blocker.",
    images: [DEFAULT_OG_IMAGE],
  },
};

const faqs = [
  {
    question: "What is this trading assessment for?",
    answer:
      "It helps traders understand their current level, identify behavior patterns, and spot the biggest blocker holding them back.",
  },
  {
    question: "Is this for beginners only?",
    answer:
      "No. It is for traders at different stages, especially those who feel stuck, inconsistent, or frustrated by repeated mistakes.",
  },
  {
    question: "Does it focus on strategy or psychology?",
    answer:
      "It focuses primarily on trader behavior, discipline, emotional control, decision-making, and execution habits.",
  },
  {
    question: "How long does the assessment take?",
    answer:
      "It is designed to be quick enough to complete in one sitting while still giving meaningful feedback.",
  },
];

const assessmentSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Free Trading Assessment",
  description:
    "A free trading assessment by Albitrust to help traders identify their biggest blocker and understand their current trading level.",
  url: absoluteUrl("/trading-assessment"),
  mainEntity: {
    "@type": "Service",
    name: "Albitrust Trading Assessment",
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    areaServed: "Worldwide",
    serviceType: "Trading assessment",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function TradingAssessmentLandingPage() {
  return (
    <main className="app-shell">
      <Script id="assessment-schema" type="application/ld+json">
        {JSON.stringify(assessmentSchema)}
      </Script>
      <Script id="assessment-faq-schema" type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </Script>

      <SiteHeader />

      <section className="result-shell seo-landing-shell">
        <div className="eyebrow">Free Trading Assessment</div>
        <h1 className="page-title">Discover your biggest trading blocker before it keeps costing you more money.</h1>
        <p className="page-lead">
          If you are not consistently profitable, the problem is often not one more strategy. It is the behavior behind your decisions.
          Albitrust helps you understand your current level, your repeated mistakes, and what is really holding you back.
        </p>

        <div className="stack-actions">
          <Link href="/assessment" className="button-primary">
            Take the free assessment
          </Link>
          <Link href="/tailored-action-plan" className="button-secondary">
            See how the action plan works
          </Link>
        </div>

        <div className="mini-grid seo-metric-grid" style={{ marginTop: 26 }}>
          <div className="metric">
            <span>Who it is for</span>
            <strong>Struggling traders</strong>
          </div>
          <div className="metric">
            <span>What it identifies</span>
            <strong>Your biggest blocker</strong>
          </div>
          <div className="metric">
            <span>Main focus</span>
            <strong>Behavior and discipline</strong>
          </div>
        </div>
      </section>

      <section className="section seo-section">
        <div className="section-head">
          <div>
            <h2 className="section-title">Why traders stay stuck</h2>
            <p className="muted">
              Most traders do not fail because they never learned a setup. They fail because they repeat the same behavioral mistake under pressure.
            </p>
          </div>
        </div>

        <div className="action-grid">
          <article className="action-card">
            <strong>Overtrading</strong>
            <p className="muted">You know you should wait, but you still take trades just to feel active.</p>
          </article>
          <article className="action-card">
            <strong>Revenge trading</strong>
            <p className="muted">One bad trade turns into several because you want the money back immediately.</p>
          </article>
          <article className="action-card">
            <strong>Poor discipline</strong>
            <p className="muted">You make a plan, then abandon it the moment the market becomes emotional.</p>
          </article>
          <article className="action-card">
            <strong>Low self-awareness</strong>
            <p className="muted">You feel stuck but cannot clearly explain what keeps going wrong.</p>
          </article>
        </div>
      </section>

      <section className="section seo-section">
        <div className="section-head">
          <div>
            <h2 className="section-title">What the assessment helps you understand</h2>
          </div>
        </div>

        <div className="action-grid">
          <article className="action-card">
            <strong>Your current trader level</strong>
            <p className="muted">See where you stand instead of guessing whether you are progressing.</p>
          </article>
          <article className="action-card">
            <strong>Your strongest area</strong>
            <p className="muted">Understand what is already working so you can build from a real strength.</p>
          </article>
          <article className="action-card">
            <strong>Your biggest blocker</strong>
            <p className="muted">Find the one issue that is doing the most damage to your consistency.</p>
          </article>
          <article className="action-card">
            <strong>Your next step</strong>
            <p className="muted">Move from confusion to a clearer improvement path.</p>
          </article>
        </div>
      </section>

      <section className="section seo-section">
        <div className="section-head">
          <div>
            <h2 className="section-title">Frequently asked questions</h2>
          </div>
        </div>

        <div className="action-grid">
          {faqs.map((item) => (
            <article key={item.question} className="action-card">
              <strong>{item.question}</strong>
              <p className="muted">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section seo-section seo-cta-section">
        <div className="section-head">
          <div>
            <h2 className="section-title">Start with self-awareness</h2>
            <p className="page-lead">
              If you keep repeating the same mistake, guessing will not fix it. The first step is to identify it clearly.
            </p>
          </div>
        </div>
        <div className="stack-actions">
          <Link href="/assessment" className="button-primary">
            Take the free trading assessment
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
