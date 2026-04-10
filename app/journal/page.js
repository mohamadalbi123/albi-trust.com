import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { JournalClient } from "../components/JournalClient";

export default function JournalPage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <JournalClient />
      <SiteFooter />
    </main>
  );
}
