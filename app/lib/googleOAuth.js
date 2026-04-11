export const GOOGLE_AUTH_STATE_COOKIE = "albi_google_oauth_state";

export function safeGoogleReturnPath(value) {
  const path = String(value || "").trim();
  return path && path.startsWith("/") && !path.startsWith("//") ? path : "";
}
