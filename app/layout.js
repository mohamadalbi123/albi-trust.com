import "./globals.css";
import { CookieConsentBanner } from "./components/CookieConsentBanner";
import Providers from "./providers";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, absoluteUrl } from "./lib/site";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Trading Assessment And Trader Growth`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Albitrust helps struggling traders discover their biggest blocker through a free trading assessment and personalized improvement path.",
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Free Trading Assessment For Struggling Traders`,
    description:
      "Discover your biggest trading blocker, understand your level, and start improving with a clearer path.",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Free Trading Assessment For Struggling Traders`,
    description:
      "Take the free trading assessment and discover what is really holding you back.",
    images: [DEFAULT_OG_IMAGE],
  },
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
