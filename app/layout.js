import "./globals.css";
import { CookieConsentBanner } from "./components/CookieConsentBanner";
import Providers from "./providers";

export const metadata = {
  title: "Albi Trust | Trader Assessment & Growth",
  description:
    "A serious trading assessment experience built from real trader experience, discipline work, and behavioral data.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <CookieConsentBanner />
        </Providers>
      </body>
    </html>
  );
}
