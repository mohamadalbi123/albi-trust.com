import { Suspense } from "react";
import { AuthClient } from "../components/AuthClient";

export const metadata = {
  title: "Login",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-page-wrap">
        <Suspense fallback={null}>
          <AuthClient mode="login" />
        </Suspense>
      </section>
    </main>
  );
}
