import { AssessmentClient } from "../components/AssessmentClient";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export default function AssessmentPage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <AssessmentClient />
      <SiteFooter />
    </main>
  );
}
