import { Suspense } from "react";
import { ResetPasswordClient } from "../components/ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-page-wrap">
        <Suspense fallback={null}>
          <ResetPasswordClient />
        </Suspense>
      </section>
    </main>
  );
}
