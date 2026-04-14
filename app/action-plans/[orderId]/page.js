import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";

export default async function ActionPlanViewPage({ params }) {
  const { orderId } = await params;
  const reportUrl = `/api/action-plans/${orderId}/download`;

  return (
    <main className="app-shell action-plan-view-page">
      <SiteHeader />
      <section className="result-shell action-plan-view-shell">
        <div className="eyebrow">Your report</div>
        <h1 className="page-title">Review your personalized trading report.</h1>
        <p className="page-lead">
          Open it here, then print or save it as PDF if you want a downloadable copy.
        </p>

        <div className="stack-actions action-plan-view-actions">
          <a href={reportUrl} target="_blank" rel="noreferrer" className="button-secondary">
            Open raw report
          </a>
        </div>

        <div className="action-plan-view-frame-wrap">
          <iframe
            src={reportUrl}
            title="Action plan report"
            className="action-plan-view-frame"
          />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
