import { LegalPage } from "../components/LegalPage";

const privacyCopy = {
  badge: "Privacy Policy",
  title: "How Albi Trust handles your data.",
  intro:
    "This Privacy Policy explains how Albi Trust may collect, use, and protect information when you use the trading assessment, journaling tools, login area, and related services on this website.",
  sections: [
    [
      "Who this policy applies to",
      [
        "This policy applies to visitors, assessment users, account holders, and anyone who contacts Albi Trust through the website.",
        "It also applies to trading-journal information, behavior notes, progress data, and related account information you choose to enter into the platform.",
      ],
    ],
    [
      "What information Albi Trust may collect",
      [
        "Basic account information such as name, email address, login details, and subscription status.",
        "Assessment data such as answers, level results, category scores, and tailored plan selections.",
        "Journal data such as daily reflections, risk notes, discipline notes, pre-market state, and performance-related entries.",
        "Technical information such as device, browser, IP address, and cookies needed to keep the service secure and functional.",
      ],
    ],
    [
      "How information may be used",
      [
        "To run the assessment, calculate results, generate tailored guidance, and support your journaling workflow.",
        "To improve product quality, user support, security, and platform reliability.",
        "To communicate important service, billing, or account-related updates where relevant.",
      ],
    ],
    [
      "Trading content and responsibility",
      [
        "Albi Trust is designed as an educational and self-development tool, not as financial advice or a promise of performance.",
        "You remain responsible for your own trading decisions, execution, risk, and capital management.",
      ],
    ],
    [
      "Data sharing",
      [
        "Albi Trust may use service providers for hosting, authentication, analytics, and product infrastructure.",
        "We do not sell your personal data.",
        "Information may be shared where required by law or where needed to protect the service and its users.",
      ],
    ],
    [
      "Retention and deletion",
      [
        "We keep data for as long as needed to run the service, maintain security, and support legitimate business operations.",
        "You may request deletion of your account data, subject to information we may need to keep for legal, security, or accounting reasons.",
      ],
    ],
    [
      "Your rights",
      [
        "Depending on where you live, you may have rights to access, correct, export, or delete certain personal information.",
        "For privacy requests, contact Albi Trust through the support details published on the site.",
      ],
    ],
  ],
  updated: "Last updated: April 9, 2026",
};

export default function PrivacyPage() {
  return <LegalPage {...privacyCopy} />;
}
