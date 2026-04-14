import { Suspense } from "react";
import { CheckoutClient } from "../components/CheckoutClient";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata = {
  title: "Checkout",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutPage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <Suspense
        fallback={
          <section className="result-shell">
            <div className="eyebrow">Checkout</div>
            <h1 className="page-title">Loading checkout.</h1>
          </section>
        }
      >
        <CheckoutClient />
      </Suspense>
      <SiteFooter />
    </main>
  );
}
