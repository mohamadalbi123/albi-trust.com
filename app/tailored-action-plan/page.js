import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { TailoredActionPlanClient } from "../components/TailoredActionPlanClient";
import { absoluteUrl, DEFAULT_OG_IMAGE } from "../lib/site";

export const metadata = {
  title: "Personalized Trading Action Plan",
  description:
    "See how the Albitrust personalized trading action plan helps traders turn assessment results into a practical improvement path.",
  alternates: {
    canonical: "/tailored-action-plan",
  },
  openGraph: {
    title: "Personalized Trading Action Plan",
    description:
      "A tailored action plan built around the trader’s level, blockers, and real trading situation.",
    url: absoluteUrl("/tailored-action-plan"),
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Personalized Trading Action Plan",
    description:
      "Turn assessment clarity into a practical action plan built around your biggest trading blocker.",
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function TailoredActionPlanPage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <TailoredActionPlanClient />
      <SiteFooter />
    </main>
  );
}
