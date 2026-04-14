export const SITE_NAME = "Albitrust";
export const SITE_URL = "https://albi-trust.com";
export const DEFAULT_OG_IMAGE = "/brand/albitrust-face-wordmark.png";

export function absoluteUrl(path = "/") {
  const normalized = String(path || "/");
  return new URL(normalized.startsWith("/") ? normalized : `/${normalized}`, SITE_URL).toString();
}
