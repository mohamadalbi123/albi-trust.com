import { LegalPage } from "../components/LegalPage";

const disclaimerCopy = {
  badge: "Disclaimer",
  title: "Important trading and educational disclaimer.",
  intro:
    "This disclaimer explains the limits of Albi Trust, the nature of the guidance provided, and your own responsibility when using the platform.",
  sections: [
    [
      "No guarantee of results",
      [
        "Albi Trust does not guarantee profitability, trading success, or any specific financial outcome.",
        "Any action plan, framework, or suggestion provided through the platform may help you improve, but results depend on your own execution, discipline, experience, and risk management.",
      ],
    ],
    [
      "Educational use only",
      [
        "Albi Trust is an educational and self-development tool for traders.",
        "Nothing on the platform should be interpreted as investment advice, financial advice, legal advice, or tax advice.",
      ],
    ],
    [
      "Tailored plans and personal responsibility",
      [
        "Tailored action plans are built around the information you provide, your assessment result, and your current trading profile.",
        "You remain fully responsible for your own trades, execution decisions, capital, and risk.",
      ],
    ],
    [
      "Examples and experience",
      [
        "Examples, educational material, and practical frameworks may be based on real trading experience, but your own outcome may be different.",
        "Past experience, past examples, or previous performance do not guarantee future results.",
      ],
    ],
    [
      "Personalized paid work",
      [
        "Tailored action plans are prepared manually and personally by Albi Trust based on your assessment and intake details.",
        "Because the service is custom and work begins specifically for your order, paid tailored action plan purchases are non-refundable.",
      ],
    ],
  ],
  updated: "Last updated: April 10, 2026",
};

export default function DisclaimerPage() {
  return <LegalPage {...disclaimerCopy} />;
}
