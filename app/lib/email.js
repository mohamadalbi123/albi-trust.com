import { getAppBaseUrl } from "./localAuth";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendVerificationEmail({ to, fullName, verifyUrl }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { sent: false, reason: "Missing RESEND_API_KEY." };
  }

  const from =
    process.env.EMAIL_FROM ||
    (process.env.NODE_ENV === "production" ? "" : "Albi Trust <onboarding@resend.dev>");

  if (!from) {
    return {
      sent: false,
      reason:
        "Missing EMAIL_FROM. Use an address on a verified Resend domain, for example Albi Trust <noreply@albi-trust.com>.",
    };
  }

  const appUrl = getAppBaseUrl();
  const safeName = escapeHtml(fullName || "there");
  const safeUrl = escapeHtml(verifyUrl);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Confirm your Albi Trust email",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#10213f;padding:24px;">
          <h2 style="margin:0 0 12px;">Confirm your email</h2>
          <p style="margin:0 0 18px;">Hi ${safeName}, click the button below to confirm your Albi Trust account and continue to your assessment.</p>
          <p style="margin:0 0 20px;">
            <a href="${safeUrl}" style="display:inline-block;padding:12px 18px;background:#10213f;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">
              Confirm email
            </a>
          </p>
          <p style="margin:0 0 10px;color:#5f6f8f;">If the button does not work, use this link:</p>
          <p style="margin:0 0 10px;word-break:break-all;"><a href="${safeUrl}" style="color:#10213f;">${safeUrl}</a></p>
          <p style="margin:18px 0 0;color:#7a88a5;font-size:14px;">Sent from <a href="${appUrl}" style="color:#10213f;">Albi Trust</a>.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;

    try {
      const parsed = JSON.parse(text);
      message = parsed.message || parsed.error || text;
    } catch {}

    throw new Error(message || `Unable to send verification email. Resend returned ${response.status}.`);
  }

  return { sent: true };
}
