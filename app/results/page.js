import { SiteFooter } from "../components/SiteFooter";
import { ResultsClient } from "../components/ResultsClient";
import { SiteHeader } from "../components/SiteHeader";

export default function ResultsPage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <ResultsClient />
      <SiteFooter />
    </main>
  );
}
