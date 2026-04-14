import { Suspense } from "react";
import { DashboardClient } from "../components/DashboardClient";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata = {
  title: "Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardPage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <Suspense
        fallback={
          <section className="result-shell">
            <div className="eyebrow">Account dashboard</div>
            <h1 className="page-title">Loading your account.</h1>
          </section>
        }
      >
        <DashboardClient />
      </Suspense>
      <SiteFooter />
    </main>
  );
}
