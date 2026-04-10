import { Suspense } from "react";
import { AuthClient } from "../components/AuthClient";

export default function SignupPage() {
  return (
    <main className="auth-page">
      <section className="auth-page-wrap">
        <Suspense fallback={null}>
          <AuthClient mode="signup" />
        </Suspense>
      </section>
    </main>
  );
}
