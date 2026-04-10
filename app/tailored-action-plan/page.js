import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { TailoredActionPlanClient } from "../components/TailoredActionPlanClient";

export default function TailoredActionPlanPage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <TailoredActionPlanClient />
      <SiteFooter />
    </main>
  );
}
