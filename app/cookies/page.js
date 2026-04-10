import { LegalPage } from "../components/LegalPage";

const cookieCopy = {
  badge: "Cookie Policy",
  title: "How Albi Trust uses cookies.",
  intro:
    "This Cookie Policy explains how Albi Trust uses cookies and similar technologies for essential website functions, security, and future product features.",
  sections: [
    [
      "What cookies are",
      [
        "Cookies are small text files stored on your device or browser when you visit a website.",
        "They help websites remember sessions, preferences, and security-related information.",
      ],
    ],
    [
      "How Albi Trust uses cookies",
      [
        "Albi Trust may use cookies for login sessions, saved preferences, security controls, and essential product behavior.",
        "Cookies may also support diagnostics and analytics that help improve site reliability and product quality.",
      ],
    ],
    [
      "What happens if you block cookies",
      [
        "Blocking essential cookies may prevent parts of the website, login flow, or future journaling features from working correctly.",
      ],
    ],
    [
      "Third-party services",
      [
        "Some infrastructure or embedded services may use their own cookies where needed for authentication, hosting, analytics, or security.",
      ],
    ],
    [
      "Updates",
      [
        "This Cookie Policy may be updated as Albi Trust grows and adds new product features or tracking controls.",
      ],
    ],
  ],
  updated: "Last updated: April 9, 2026",
};

export default function CookiesPage() {
  return <LegalPage {...cookieCopy} />;
}
