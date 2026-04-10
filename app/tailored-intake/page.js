import { Suspense } from "react";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { TailoredIntakeClient } from "../components/TailoredIntakeClient";

export default function TailoredIntakePage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <Suspense
        fallback={
          <section className="result-shell">
            <div className="eyebrow">Tailored intake</div>
            <h1 className="page-title">Loading your next step.</h1>
          </section>
        }
      >
        <TailoredIntakeClient />
      </Suspense>
      <SiteFooter />
    </main>
  );
}
