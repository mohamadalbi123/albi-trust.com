import { SiteFooter } from "../components/SiteFooter";
import { ResultsClient } from "../components/ResultsClient";
import { SiteHeader } from "../components/SiteHeader";

export const metadata = {
  title: "Assessment Results",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResultsPage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <ResultsClient />
      <SiteFooter />
    </main>
  );
}
