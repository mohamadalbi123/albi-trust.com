import { Suspense } from "react";
import { AssessmentClient } from "../components/AssessmentClient";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

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
