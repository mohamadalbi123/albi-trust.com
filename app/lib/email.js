import { getAppBaseUrl } from "./localAuth";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendVerificationEmail({ to, fullName, verifyUrl, returnTo }) {
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
  const isAssessmentSignup = returnTo === "/assessment";
  const emailIntro = isAssessmentSignup
    ? "click the button below to confirm your Albi Trust account and continue to your assessment."
    : "click the button below to confirm your Albi Trust account.";

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
          <p style="margin:0 0 18px;">Hi ${safeName}, ${emailIntro}</p>
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

export async function sendPasswordResetEmail({ to, resetUrl }) {
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
  const safeUrl = escapeHtml(resetUrl);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Reset your Albi Trust password",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#10213f;padding:24px;">
          <h2 style="margin:0 0 12px;">Reset your password</h2>
          <p style="margin:0 0 18px;">Click the button below to set a new Albi Trust password. This link expires in 30 minutes.</p>
          <p style="margin:0 0 20px;">
            <a href="${safeUrl}" style="display:inline-block;padding:12px 18px;background:#10213f;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">
              Reset password
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

    throw new Error(message || `Unable to send password reset email. Resend returned ${response.status}.`);
  }

  return { sent: true };
}

export async function sendAdminOrderNotificationEmail({ order }) {
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

  const to = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || "mohalbi123@hotmail.com";
  const appUrl = getAppBaseUrl();
  const adminUrl = `${appUrl}/admin/action-plans`;
  const intake = order?.intake || {};
  const screenshots = Array.isArray(intake.accountScreenshots) ? intake.accountScreenshots : [];
  const intakeRows = Object.entries(intake)
    .filter(([key]) => key !== "accountScreenshots")
    .map(([key, value]) => {
      const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
      const displayValue = Array.isArray(value) ? value.join(", ") : value || "Not provided";
      return `<tr><td style="padding:8px;border-bottom:1px solid #e6edf7;color:#5f6f8f;">${escapeHtml(label)}</td><td style="padding:8px;border-bottom:1px solid #e6edf7;">${escapeHtml(displayValue)}</td></tr>`;
    })
    .join("");
  const traderLevel = order?.assessmentSnapshot?.level?.title || "Not available";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `New action plan order - ${order?.displayId || order?.id || "Albi Trust"}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#10213f;padding:24px;">
          <h2 style="margin:0 0 12px;">New paid action plan order</h2>
          <p style="margin:0 0 18px;">${escapeHtml(order?.fullName || "Client")} has purchased a tailored action plan.</p>
          <table style="border-collapse:collapse;width:100%;max-width:720px;margin:0 0 20px;">
            <tr><td style="padding:8px;border-bottom:1px solid #e6edf7;color:#5f6f8f;">Client</td><td style="padding:8px;border-bottom:1px solid #e6edf7;">${escapeHtml(order?.fullName || "No name")}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e6edf7;color:#5f6f8f;">Email</td><td style="padding:8px;border-bottom:1px solid #e6edf7;">${escapeHtml(order?.email || "")}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e6edf7;color:#5f6f8f;">Order</td><td style="padding:8px;border-bottom:1px solid #e6edf7;">${escapeHtml(order?.displayId || order?.id || "")}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e6edf7;color:#5f6f8f;">Trader level</td><td style="padding:8px;border-bottom:1px solid #e6edf7;">${escapeHtml(traderLevel)}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e6edf7;color:#5f6f8f;">Paid at</td><td style="padding:8px;border-bottom:1px solid #e6edf7;">${escapeHtml(order?.paidAt || "")}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e6edf7;color:#5f6f8f;">Screenshots</td><td style="padding:8px;border-bottom:1px solid #e6edf7;">${screenshots.length}</td></tr>
            ${intakeRows}
          </table>
          <p style="margin:0 0 20px;">
            <a href="${escapeHtml(adminUrl)}" style="display:inline-block;padding:12px 18px;background:#10213f;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
              Open admin page
            </a>
          </p>
          <p style="margin:18px 0 0;color:#7a88a5;font-size:14px;">Sent from <a href="${escapeHtml(appUrl)}" style="color:#10213f;">Albi Trust</a>.</p>
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

    throw new Error(message || `Unable to send admin notification email. Resend returned ${response.status}.`);
  }

  return { sent: true };
}
