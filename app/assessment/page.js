import { Suspense } from "react";
import { AssessmentClient } from "../components/AssessmentClient";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { absoluteUrl, DEFAULT_OG_IMAGE } from "../lib/site";

export const metadata = {
  title: "Take The Free Trading Assessment",
  description:
    "Take the Albitrust trading assessment to discover your current trader level, biggest blocker, and next improvement path.",
  alternates: {
    canonical: "/assessment",
  },
  openGraph: {
    title: "Take The Free Trading Assessment",
    description:
      "A free assessment to help traders understand their level and biggest blocker.",
    url: absoluteUrl("/assessment"),
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Take The Free Trading Assessment",
    description:
      "Discover your level, your biggest blocker, and your next step as a trader.",
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function AssessmentPage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <Suspense
        fallback={
          <section className="assessment-shell">
            <div className="eyebrow">Assessment</div>
            <h1 className="page-title">Loading assessment.</h1>
          </section>
        }
      >
        <AssessmentClient />
      </Suspense>
      <SiteFooter />
    </main>
  );
}
