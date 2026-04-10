import { LegalPage } from "../components/LegalPage";

const termsCopy = {
  badge: "Terms of Use",
  title: "The rules for using Albi Trust.",
  intro:
    "These Terms of Use govern your access to and use of Albi Trust. By using the website, the assessment, the journaling area, or any related digital products, you agree to these terms.",
  sections: [
    [
      "Use of the service",
      [
        "Albi Trust provides trading assessment, journaling, educational, and self-development tools.",
        "The service is intended to help traders reflect, organize, and improve, not to provide guaranteed financial outcomes.",
      ],
    ],
    [
      "Accounts and eligibility",
      [
        "You are responsible for the accuracy of the information you provide and for protecting your account credentials.",
        "You are responsible for all activity that takes place through your account.",
      ],
    ],
    [
      "Educational purpose only",
      [
        "Nothing on Albi Trust should be interpreted as personalized investment, legal, tax, or financial advice.",
        "Trading involves risk, and past results, examples, or educational material do not guarantee future outcomes.",
        "Any tailored action plan, journal suggestion, or educational framework provided by Albi Trust is intended for educational and self-development purposes only.",
      ],
    ],
    [
      "Acceptable use",
      [
        "You may not misuse the platform, interfere with service operations, bypass access controls, or attempt to copy restricted product logic unlawfully.",
        "You may not use the service for unlawful, abusive, fraudulent, or misleading purposes.",
      ],
    ],
    [
      "Paid products and tailored plans",
      [
        "Albi Trust may offer paid tailored action plans, digital products, journals, or future subscription features.",
        "If paid access is introduced, pricing, renewal terms, and restrictions will be described clearly in the relevant checkout or product area.",
        "Payment for a tailored action plan does not create any guarantee of profitability, trading performance, or financial result.",
      ],
    ],
    [
      "Intellectual property",
      [
        "Albi Trust, its educational materials, assessment structure, journaling system, copy, and original frameworks remain the property of Albi Trust unless otherwise stated.",
        "You retain ownership of the personal trading notes and journal data you lawfully submit to the platform.",
      ],
    ],
    [
      "Disclaimers and liability",
      [
        "The service is provided on an as-is and as-available basis to the extent allowed by law.",
        "Albi Trust does not guarantee uninterrupted availability, error-free operation, profitability, or any particular trading result.",
        "You remain fully responsible for your own trading decisions, execution, risk management, capital allocation, and use of any information provided through the service.",
        "Your use of Albi Trust does not create a fiduciary, advisory, brokerage, or managed-account relationship.",
      ],
    ],
    [
      "Changes to the service",
      [
        "Features may be updated, improved, removed, or restricted over time.",
        "We may also update these terms from time to time by publishing a revised version on this page.",
      ],
    ],
  ],
  updated: "Last updated: April 9, 2026",
};

export default function TermsPage() {
  return <LegalPage {...termsCopy} />;
}
