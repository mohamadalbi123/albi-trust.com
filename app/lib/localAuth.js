import crypto from "crypto";
import fs from "fs";
import { neon } from "@neondatabase/serverless";
import path from "path";

const DATA_DIR =
  process.env.VERCEL || process.env.NODE_ENV === "production"
    ? path.join("/tmp", "albi-trust-data")
    : path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app-db.json");
const SESSION_COOKIE = "albi_trust_session";
const STATELESS_SESSION_PREFIX = "v2";
let sqlClient = null;
let databaseReady = false;

function shouldUsePostgres() {
  return Boolean(process.env.DATABASE_URL);
}

function getSqlClient() {
  if (!sqlClient) {
    sqlClient = neon(process.env.DATABASE_URL);
  }

  return sqlClient;
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function isRetryablePostgresError(error) {
  const message = String(error?.message || "");
  return Boolean(
    error?.["neon:retryable"] ||
      message.includes("Couldn't connect to compute node") ||
      message.includes("fetch failed") ||
      message.includes("ECONNRESET") ||
      message.includes("ETIMEDOUT"),
  );
}

async function runPostgresQuery(queryFn) {
  let lastError = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await queryFn(getSqlClient());
    } catch (error) {
      lastError = error;

      if (!isRetryablePostgresError(error) || attempt === 3) {
        throw error;
      }

      sqlClient = null;
      databaseReady = false;
      await wait(350 * (attempt + 1));
    }
  }

  throw lastError;
}

async function ensurePostgresDb() {
  if (databaseReady) return;

  await runPostgresQuery((sql) => sql`
    CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await runPostgresQuery((sql) => sql`
    INSERT INTO app_state (id, data)
    VALUES ('main', ${JSON.stringify(makeEmptyDb())}::jsonb)
    ON CONFLICT (id) DO NOTHING
  `);
  databaseReady = true;
}

function authSecret() {
  return process.env.NEXTAUTH_SECRET || "albi-trust-auth-secret-2026-local";
}

function encodeBase64Url(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value) {
  return crypto.createHmac("sha256", authSecret()).update(value).digest("base64url");
}

function makeStatelessSessionToken(user, expiresAt) {
  const payload = encodeBase64Url(
    JSON.stringify({
      sub: user.id,
      publicId: user.publicId || null,
      fullName: user.fullName || "",
      email: user.email || "",
      emailVerifiedAt: user.emailVerifiedAt || null,
      createdAt: user.createdAt || new Date().toISOString(),
      latestAssessmentAt: user.latestAssessmentAt || null,
      nextAssessmentAt: user.nextAssessmentAt || null,
      latestAssessment: user.latestAssessment || null,
      expiresAt,
    }),
  );
  const signature = signValue(payload);
  return `${STATELESS_SESSION_PREFIX}.${payload}.${signature}`;
}

function readStatelessSessionToken(token) {
  const [prefix, payload, signature] = String(token || "").split(".");

  if (prefix !== STATELESS_SESSION_PREFIX || !payload || !signature) {
    return null;
  }

  const expectedSignature = signValue(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const session = JSON.parse(decodeBase64Url(payload));
    if (!session.expiresAt || new Date(session.expiresAt) <= new Date()) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function makeSignedPayloadToken(type, payload, expiresAt) {
  const encodedPayload = encodeBase64Url(
    JSON.stringify({
      ...payload,
      type,
      expiresAt,
    }),
  );
  const signature = signValue(encodedPayload);
  return `${STATELESS_SESSION_PREFIX}.${encodedPayload}.${signature}`;
}

function readSignedPayloadToken(token, expectedType) {
  const [prefix, payload, signature] = String(token || "").split(".");

  if (prefix !== STATELESS_SESSION_PREFIX || !payload || !signature) {
    return null;
  }

  const expectedSignature = signValue(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(decodeBase64Url(payload));
    if (data.type !== expectedType || !data.expiresAt || new Date(data.expiresAt) <= new Date()) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function inferBaseUrl() {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3001";
}

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(makeEmptyDb(), null, 2));
  }
}

function makeEmptyDb() {
  return {
    users: [],
    sessions: [],
    orders: [],
    outbox: [],
    deletedSessionEmails: [],
  };
}

function normalizeDbShape(db) {
  return {
    users: Array.isArray(db?.users) ? db.users : [],
    sessions: Array.isArray(db?.sessions) ? db.sessions : [],
    orders: Array.isArray(db?.orders) ? db.orders : [],
    outbox: Array.isArray(db?.outbox) ? db.outbox : [],
    deletedSessionEmails: Array.isArray(db?.deletedSessionEmails) ? db.deletedSessionEmails : [],
  };
}

function parseStoredDb(value) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function nextPublicUserId(db) {
  const maxId = (db.users || []).reduce((highest, user) => {
    const value = Number(user?.publicId || 0);
    return Number.isFinite(value) ? Math.max(highest, value) : highest;
  }, 999);

  return maxId + 1;
}

function ensureUserPublicIds(db) {
  let changed = false;
  let nextId = nextPublicUserId(db);

  db.users = (db.users || []).map((user) => {
    if (user?.publicId) return user;
    changed = true;
    return {
      ...user,
      publicId: nextId++,
    };
  });

  return changed;
}

async function readDb() {
  if (shouldUsePostgres()) {
    await ensurePostgresDb();
    const rows = await runPostgresQuery((sql) => sql`SELECT data FROM app_state WHERE id = 'main'`);
    const db = normalizeDbShape(parseStoredDb(rows[0]?.data));

    if (ensureUserPublicIds(db)) {
      await writeDb(db);
    }

    return db;
  }

  ensureDb();
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8").trim();
    if (!raw) {
      const emptyDb = makeEmptyDb();
      await writeDb(emptyDb);
      return emptyDb;
    }

    const db = normalizeDbShape(JSON.parse(raw));
    if (ensureUserPublicIds(db)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    }
    return db;
  } catch {
    const emptyDb = makeEmptyDb();
    await writeDb(emptyDb);
    return emptyDb;
  }
}

async function writeDb(db) {
  const normalizedDb = normalizeDbShape(db);

  if (shouldUsePostgres()) {
    await ensurePostgresDb();
    await runPostgresQuery((sql) => sql`
      INSERT INTO app_state (id, data, updated_at)
      VALUES ('main', ${JSON.stringify(normalizedDb)}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
    `);
    return;
  }

  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(normalizedDb, null, 2));
}

export async function resetAppData() {
  const emptyDb = makeEmptyDb();
  await writeDb(emptyDb);
  return emptyDb;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function comparePassword(password, storedHash) {
  const [salt] = String(storedHash || "").split(":");
  if (!salt) return false;
  return hashPassword(password, salt) === storedHash;
}

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function makeTokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function appBaseUrl() {
  return inferBaseUrl();
}

function safeReturnPath(value) {
  const pathValue = String(value || "").trim();

  if (!pathValue || !pathValue.startsWith("/") || pathValue.startsWith("//")) {
    return "";
  }

  return pathValue;
}

export function getAppBaseUrl() {
  return inferBaseUrl();
}

export function shouldUseSecureCookies() {
  return process.env.NODE_ENV === "production" && inferBaseUrl().startsWith("https://");
}

function getLatestPaidOrderForUser(db, internalUserId) {
  return (db.orders || []).find((entry) => entry.userId === internalUserId && entry.status === "paid") || null;
}

function getOrderEstimatedReadyAt(order) {
  const baseDate = new Date(order?.paidAt || order?.createdAt || Date.now());
  return new Date(baseDate.getTime() + 1000 * 60 * 60 * 48).toISOString();
}

function getActionPlanStatus(order) {
  if (!order) return null;
  if (order.actionPlanPdf?.dataBase64) return "ready";
  return new Date(getOrderEstimatedReadyAt(order)) <= new Date() ? "final_review" : "under_preparation";
}

function actionPlanStatusRank(status) {
  if (status === "under_preparation") return 0;
  if (status === "final_review") return 1;
  if (status === "ready") return 2;
  return 3;
}

function sortAdminOrders(orders) {
  return [...orders].sort((a, b) => {
    const statusDifference = actionPlanStatusRank(a.actionPlanStatus) - actionPlanStatusRank(b.actionPlanStatus);

    if (statusDifference) {
      return statusDifference;
    }

    return new Date(b.paidAt || b.createdAt || 0).getTime() - new Date(a.paidAt || a.createdAt || 0).getTime();
  });
}

function publicActionPlanOrder(order) {
  if (!order) return null;

  return {
    id: order.id,
    displayId: order.displayId || makeOrderDisplayId(order.id),
    status: getActionPlanStatus(order),
    purchasedAt: order.paidAt || order.createdAt || null,
    estimatedReadyAt: getOrderEstimatedReadyAt(order),
    uploadedAt: order.actionPlanPdf?.uploadedAt || null,
    fileName: order.actionPlanPdf?.fileName || null,
    downloadUrl: order.actionPlanPdf?.dataBase64 ? `/api/action-plans/${order.id}/download` : null,
  };
}

function adminOrderSummary(order, db) {
  const user = findUserByAnyId(db, order.userId);

  return {
    id: order.id,
    displayId: order.displayId || makeOrderDisplayId(order.id),
    publicUserId: user?.publicId ? String(user.publicId) : order.userId,
    fullName: order.fullName,
    email: order.email,
    priceUsd: order.priceUsd,
    status: order.status,
    actionPlanStatus: getActionPlanStatus(order),
    createdAt: order.createdAt || null,
    paidAt: order.paidAt || null,
    estimatedReadyAt: getOrderEstimatedReadyAt(order),
    pdfUploadedAt: order.actionPlanPdf?.uploadedAt || null,
    pdfFileName: order.actionPlanPdf?.fileName || null,
    traderLevel: order.assessmentSnapshot?.level?.title || user?.latestAssessment?.level?.title || null,
    intake: order.intake || null,
  };
}

export async function getAdminActionPlanGeneratorContext(orderId) {
  const db = await readDb();
  const order = (db.orders || []).find((entry) => entry.id === orderId && entry.status === "paid");

  if (!order) {
    throw new Error("Paid order not found.");
  }

  const user = findUserByAnyId(db, order.userId);
  const { accountScreenshots, ...intake } = order.intake || {};

  return {
    order: {
      ...adminOrderSummary(order, db),
      intake,
      screenshotCount: Array.isArray(accountScreenshots) ? accountScreenshots.length : 0,
      assessmentSnapshot: order.assessmentSnapshot || user?.latestAssessment || null,
    },
    user: user ? adminUserSummary(user, db) : null,
  };
}

function adminUserSummary(user, db) {
  const latestPaidOrder = getLatestPaidOrderForUser(db, user.id);

  return {
    id: String(user.publicId ?? user.id),
    fullName: user.fullName || "",
    email: user.email || "",
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt || null,
    latestAssessmentAt: user.latestAssessmentAt || null,
    nextAssessmentAt: user.nextAssessmentAt || null,
    traderLevel: user.latestAssessment?.level?.title || null,
    primaryWeakness: user.latestAssessment?.primaryWeakness?.label || null,
    hasPaidTailoredPlan: Boolean(latestPaidOrder),
    latestPaidOrderAt: latestPaidOrder?.paidAt || latestPaidOrder?.createdAt || null,
    latestOrderId: latestPaidOrder?.id || null,
    latestOrderDisplayId: latestPaidOrder ? latestPaidOrder.displayId || makeOrderDisplayId(latestPaidOrder.id) : null,
  };
}

function makeOrderDisplayId(orderId) {
  return `AT-${String(orderId || "").replace(/^order_/, "").slice(0, 8).toUpperCase()}`;
}

function findUserByAnyId(db, userId) {
  const normalized = String(userId || "");
  return (
    (db.users || []).find(
      (entry) => entry.id === normalized || String(entry.publicId || "") === normalized,
    ) || null
  );
}

async function ensureSessionUser(db, session) {
  if (!session?.sub || !session?.email) {
    return null;
  }

  let user = findUserByAnyId(db, session.sub) || db.users.find((entry) => entry.email === session.email);
  const normalizedEmail = normalizeEmail(session.email);

  if ((db.deletedSessionEmails || []).includes(normalizedEmail)) {
    return null;
  }

  if (!user) {
    user = {
      id: session.sub,
      publicId: session.publicId || nextPublicUserId(db),
      fullName: session.fullName || session.email.split("@")[0],
      email: session.email,
      passwordHash: null,
      createdAt: session.createdAt || new Date().toISOString(),
      emailVerifiedAt: session.emailVerifiedAt || new Date().toISOString(),
      verificationTokenHash: null,
      verificationExpiresAt: null,
      latestAssessmentAt: session.latestAssessmentAt || null,
      nextAssessmentAt: session.nextAssessmentAt || null,
      latestAssessment: session.latestAssessment || null,
      assessments: [],
    };
    db.users.push(user);
    await writeDb(db);
    return user;
  }

  let changed = false;

  if (!user.publicId && session.publicId) {
    user.publicId = session.publicId;
    changed = true;
  }

  if (!user.emailVerifiedAt && session.emailVerifiedAt) {
    user.emailVerifiedAt = session.emailVerifiedAt;
    changed = true;
  }

  if (
    session.latestAssessmentAt &&
    (!user.latestAssessmentAt || new Date(session.latestAssessmentAt) > new Date(user.latestAssessmentAt))
  ) {
    user.latestAssessmentAt = session.latestAssessmentAt;
    user.nextAssessmentAt = session.nextAssessmentAt || user.nextAssessmentAt || null;
    user.latestAssessment = session.latestAssessment || user.latestAssessment || null;
    changed = true;
  }

  if (changed) {
    await writeDb(db);
  }

  return user;
}

function summarizeAssessment(result) {
  if (!result) return "No assessment result stored.";

  const categoryLines = (result.categoryScores || [])
    .map((entry) => `${entry.label}: ${entry.score}/100`)
    .join(" | ");

  return [
    `Level: ${result.level?.title || "Unknown"}`,
    `Overall score: ${result.overallScore || 0}/100`,
    `Primary weakness: ${result.primaryWeakness?.label || "Unknown"}`,
    `Secondary weakness: ${result.secondaryWeakness?.label || "Unknown"}`,
    `Strongest area: ${result.strongest?.label || "Unknown"}`,
    categoryLines ? `Category scores: ${categoryLines}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function publicUserFromDb(db, user) {
  if (!user) return null;

  const latestPaidOrder = getLatestPaidOrderForUser(db, user.id);

  return {
    id: String(user.publicId ?? user.id),
    fullName: user.fullName,
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt,
    latestAssessmentAt: user.latestAssessmentAt || null,
    nextAssessmentAt: user.nextAssessmentAt || null,
    latestAssessment: user.latestAssessment || null,
    hasPaidTailoredPlan: Boolean(latestPaidOrder),
    latestPaidOrderAt: latestPaidOrder?.paidAt || latestPaidOrder?.createdAt || null,
    latestActionPlanOrder: publicActionPlanOrder(latestPaidOrder),
  };
}

export async function publicUser(user) {
  const db = await readDb();
  return publicUserFromDb(db, user);
}

export async function signupUser({ fullName, email, password, returnTo }) {
  const db = await readDb();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date().toISOString();
  const verificationToken = makeToken();
  const verificationTokenHash = makeTokenHash(verificationToken);
  const verificationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

  let user = db.users.find((entry) => entry.email === normalizedEmail);
  db.deletedSessionEmails = (db.deletedSessionEmails || []).filter((entry) => entry !== normalizedEmail);

  if (user && user.emailVerifiedAt) {
    throw new Error("An account with this email already exists.");
  }

  if (!user) {
    user = {
      id: makeId("user"),
      publicId: nextPublicUserId(db),
      fullName,
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      createdAt: now,
      emailVerifiedAt: null,
      verificationTokenHash,
      verificationExpiresAt,
      latestAssessmentAt: null,
      nextAssessmentAt: null,
      latestAssessment: null,
      assessments: [],
    };
    db.users.push(user);
  } else {
    user.fullName = fullName;
    user.passwordHash = hashPassword(password);
    user.verificationTokenHash = verificationTokenHash;
    user.verificationExpiresAt = verificationExpiresAt;
  }

  const nextPath = safeReturnPath(returnTo);
  const verifyUrl = `${appBaseUrl()}/api/verify-email?token=${verificationToken}${
    nextPath ? `&next=${encodeURIComponent(nextPath)}` : ""
  }`;

  db.outbox.unshift({
    id: makeId("mail"),
    to: normalizedEmail,
    subject: "Confirm your Albi Trust email",
    html: `Click to confirm your email: ${verifyUrl}`,
    createdAt: now,
    verifyUrl,
  });

  await writeDb(db);

  return {
    user: publicUserFromDb(db, user),
    verifyUrl,
  };
}

export async function verifyEmailToken(token) {
  const db = await readDb();
  const tokenHash = makeTokenHash(token);
  const user = db.users.find((entry) => entry.verificationTokenHash === tokenHash);

  if (!user) {
    return null;
  }

  if (!user.verificationExpiresAt || new Date(user.verificationExpiresAt) < new Date()) {
    return null;
  }

  user.emailVerifiedAt = new Date().toISOString();
  user.verificationTokenHash = null;
  user.verificationExpiresAt = null;

  await writeDb(db);
  return {
    user: publicUserFromDb(db, user),
    internalUserId: user.id,
  };
}

export async function loginUser({ email, password }) {
  const db = await readDb();
  const normalizedEmail = normalizeEmail(email);
  const user = db.users.find((entry) => entry.email === normalizedEmail);

  if (!user || !comparePassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password.");
  }

  if (!user.emailVerifiedAt) {
    const latestMail = db.outbox.find((entry) => entry.to === normalizedEmail);
    const previewUrl = latestMail?.verifyUrl || null;
    const error = new Error("Please confirm your email before signing in.");
    error.code = "EMAIL_NOT_VERIFIED";
    error.previewUrl = previewUrl;
    throw error;
  }

  return {
    user: publicUserFromDb(db, user),
    internalUserId: user.id,
  };
}

export async function updateUserPassword({ userId, currentPassword, newPassword }) {
  const db = await readDb();
  const user = findUserByAnyId(db, userId);

  if (!user) {
    throw new Error("User not found.");
  }

  if (!newPassword || String(newPassword).length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }

  if (user.passwordHash) {
    if (!currentPassword || !comparePassword(currentPassword, user.passwordHash)) {
      throw new Error("Current password is incorrect.");
    }
  }

  user.passwordHash = hashPassword(newPassword);
  await writeDb(db);

  return publicUserFromDb(db, user);
}

export async function setVerifiedUserPassword({ fullName, email, password }) {
  const db = await readDb();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date().toISOString();
  db.deletedSessionEmails = (db.deletedSessionEmails || []).filter((entry) => entry !== normalizedEmail);

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("Valid email is required.");
  }

  if (!password || String(password).length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  let user = db.users.find((entry) => entry.email === normalizedEmail);

  if (!user) {
    user = {
      id: makeId("user"),
      publicId: nextPublicUserId(db),
      fullName: String(fullName || "").trim(),
      email: normalizedEmail,
      passwordHash: null,
      createdAt: now,
      emailVerifiedAt: now,
      verificationTokenHash: null,
      verificationExpiresAt: null,
      latestAssessmentAt: null,
      nextAssessmentAt: null,
      latestAssessment: null,
      assessments: [],
    };
    db.users.push(user);
  }

  user.fullName = String(fullName || user.fullName || "").trim();
  user.passwordHash = hashPassword(password);
  user.emailVerifiedAt = user.emailVerifiedAt || now;
  user.verificationTokenHash = null;
  user.verificationExpiresAt = null;

  await writeDb(db);
  return {
    user: publicUserFromDb(db, user),
    internalUserId: user.id,
  };
}

export function createPasswordResetToken(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return null;
  }

  return makeSignedPayloadToken(
    "password_reset",
    {
      email: normalizedEmail,
      purpose: "password_reset",
    },
    new Date(Date.now() + 1000 * 60 * 30).toISOString(),
  );
}

export async function resetPasswordWithToken({ token, newPassword }) {
  const resetPayload = readSignedPayloadToken(token, "password_reset");

  if (!resetPayload?.email) {
    throw new Error("This password reset link is invalid or expired.");
  }

  if (!newPassword || String(newPassword).length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }

  const db = await readDb();
  let user = db.users.find((entry) => entry.email === resetPayload.email);
  db.deletedSessionEmails = (db.deletedSessionEmails || []).filter((entry) => entry !== resetPayload.email);

  if (!user) {
    const now = new Date().toISOString();
    user = {
      id: makeId("user"),
      publicId: nextPublicUserId(db),
      fullName: "",
      email: resetPayload.email,
      passwordHash: null,
      createdAt: now,
      emailVerifiedAt: now,
      verificationTokenHash: null,
      verificationExpiresAt: null,
      latestAssessmentAt: null,
      nextAssessmentAt: null,
      latestAssessment: null,
      assessments: [],
    };
    db.users.push(user);
  }

  user.passwordHash = hashPassword(newPassword);
  user.emailVerifiedAt = user.emailVerifiedAt || new Date().toISOString();
  await writeDb(db);

  return {
    user: publicUserFromDb(db, user),
    internalUserId: user.id,
  };
}

export async function upsertGoogleUser({ fullName, email }) {
  const db = await readDb();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date().toISOString();

  if (!normalizedEmail) {
    throw new Error("Google account email is missing.");
  }

  let user = db.users.find((entry) => entry.email === normalizedEmail);
  db.deletedSessionEmails = (db.deletedSessionEmails || []).filter((entry) => entry !== normalizedEmail);

  if (!user) {
    user = {
      id: makeId("user"),
      publicId: nextPublicUserId(db),
      fullName: String(fullName || "").trim() || normalizedEmail.split("@")[0],
      email: normalizedEmail,
      passwordHash: null,
      createdAt: now,
      emailVerifiedAt: now,
      verificationTokenHash: null,
      verificationExpiresAt: null,
      latestAssessmentAt: null,
      nextAssessmentAt: null,
      latestAssessment: null,
      assessments: [],
    };
    db.users.push(user);
  } else {
    if (!user.fullName && fullName) {
      user.fullName = String(fullName).trim();
    }
    if (!user.emailVerifiedAt) {
      user.emailVerifiedAt = now;
    }
    user.verificationTokenHash = null;
    user.verificationExpiresAt = null;
  }

  await writeDb(db);

  return {
    user: publicUserFromDb(db, user),
    internalUserId: user.id,
  };
}

export async function createSession(userId) {
  const db = await readDb();
  const user = findUserByAnyId(db, userId);

  if (!user) {
    throw new Error("User not found.");
  }

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  const token = makeStatelessSessionToken(user, expiresAt);
  const tokenHash = makeTokenHash(token);

  db.sessions = db.sessions.filter((session) => new Date(session.expiresAt) > new Date());
  db.sessions.push({
    id: makeId("session"),
    userId,
    tokenHash,
    createdAt: new Date().toISOString(),
    expiresAt,
  });

  await writeDb(db);

  return {
    token,
    expiresAt,
  };
}

export async function getUserFromSessionToken(token) {
  if (!token) return null;

  const db = await readDb();
  const statelessSession = readStatelessSessionToken(token);

  if (statelessSession) {
    return publicUserFromDb(db, await ensureSessionUser(db, statelessSession));
  }

  const tokenHash = makeTokenHash(token);
  const session = db.sessions.find(
    (entry) => entry.tokenHash === tokenHash && new Date(entry.expiresAt) > new Date(),
  );

  if (!session) return null;

  const user = db.users.find((entry) => entry.id === session.userId);
  return publicUserFromDb(db, user);
}

export async function destroySession(token) {
  if (!token) return;
  const db = await readDb();
  const tokenHash = makeTokenHash(token);
  db.sessions = db.sessions.filter((entry) => entry.tokenHash !== tokenHash);
  await writeDb(db);
}

export async function saveAssessmentForUser({ email, result }) {
  const db = await readDb();
  const normalizedEmail = normalizeEmail(email);
  const user = db.users.find((entry) => entry.email === normalizedEmail);

  if (!user) {
    throw new Error("User not found.");
  }

  const now = new Date();

  if (user.nextAssessmentAt && new Date(user.nextAssessmentAt) > now) {
    const error = new Error("Assessment retake is not available yet.");
    error.code = "ASSESSMENT_LOCKED";
    throw error;
  }

  const nextAssessmentDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

  const assessmentRecord = {
    id: makeId("assessment"),
    takenAt: now.toISOString(),
    nextEligibleAt: nextAssessmentDate.toISOString(),
    result,
  };

  user.latestAssessmentAt = assessmentRecord.takenAt;
  user.nextAssessmentAt = assessmentRecord.nextEligibleAt;
  user.latestAssessment = result;
  user.assessments = user.assessments || [];
  user.assessments.unshift(assessmentRecord);

  await writeDb(db);
  return {
    assessment: assessmentRecord,
    internalUserId: user.id,
    user: publicUserFromDb(db, user),
  };
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export async function createTailoredPlanDraft({
  userId,
  tradingYears,
  profitableBefore,
  traderWeaknesses,
  otherTraderWeakness,
  previousExperience,
  currentWorkStatus,
  employmentType,
  familyResponsibilities,
  country,
  originCountry,
  tradingSession,
  dailyTradingHours,
  usualTradingTime,
  energyLevel,
  dependsOnTradingIncome,
  chartStyle,
  indicators,
  tradedAssets,
  riskPerTrade,
  averageHoldingTime,
  usesTradingSignals,
  chartTradeDecision,
  chartReasoning,
  tradingAccountNotes,
  strategyDescription,
  accountScreenshots,
  personalBackground,
}) {
  const db = await readDb();
  const user = findUserByAnyId(db, userId);

  if (!user) {
    throw new Error("User not found.");
  }

  const now = new Date().toISOString();
  const orderId = makeId("order");
  const displayId = makeOrderDisplayId(orderId);

  const order = {
    id: orderId,
    displayId,
    userId: user.id,
    fullName: user.fullName,
    email: user.email,
    priceUsd: 99,
    status: "pending",
    createdAt: now,
    paidAt: null,
    adminNotificationEmailSentAt: null,
    actionPlanPdf: null,
    assessmentSnapshot: user.latestAssessment || null,
    intake: {
      tradingYears,
      profitableBefore,
      traderWeaknesses,
      otherTraderWeakness,
      previousExperience,
      currentWorkStatus,
      employmentType,
      familyResponsibilities,
      country,
      originCountry,
      tradingSession,
      dailyTradingHours,
      usualTradingTime,
      energyLevel,
      dependsOnTradingIncome,
      chartStyle,
      indicators,
      tradedAssets,
      riskPerTrade,
      averageHoldingTime,
      usesTradingSignals,
      chartTradeDecision,
      chartReasoning,
      tradingAccountNotes,
      strategyDescription,
      accountScreenshots,
      personalBackground,
    },
  };

  db.orders = db.orders || [];
  db.orders.unshift(order);

  await writeDb(db);
  return order;
}

export async function getPaidTailoredPlanOrders() {
  const db = await readDb();
  return sortAdminOrders((db.orders || [])
    .filter((entry) => entry.status === "paid")
    .map((entry) => adminOrderSummary(entry, db)));
}

export async function getAdminClientDashboardData() {
  const db = await readDb();
  const orders = sortAdminOrders((db.orders || [])
    .filter((entry) => entry.status === "paid")
    .map((entry) => adminOrderSummary(entry, db)));
  const users = (db.users || []).map((entry) => adminUserSummary(entry, db));

  return {
    orders,
    users,
  };
}

export async function adminResetUserAssessment(userId) {
  const db = await readDb();
  const user = findUserByAnyId(db, userId);

  if (!user) {
    throw new Error("User not found.");
  }

  user.latestAssessmentAt = null;
  user.nextAssessmentAt = null;
  user.latestAssessment = null;
  user.assessments = [];

  await writeDb(db);
  return adminUserSummary(user, db);
}

export async function adminVerifyUserEmail(userId) {
  const db = await readDb();
  const user = findUserByAnyId(db, userId);

  if (!user) {
    throw new Error("User not found.");
  }

  user.emailVerifiedAt = user.emailVerifiedAt || new Date().toISOString();
  user.verificationTokenHash = null;
  user.verificationExpiresAt = null;

  await writeDb(db);
  return adminUserSummary(user, db);
}

export async function adminDeleteUser(userId) {
  const db = await readDb();
  const user = findUserByAnyId(db, userId);

  if (!user) {
    throw new Error("User not found.");
  }

  if (normalizeEmail(user.email) === normalizeEmail(process.env.ADMIN_EMAIL || "mohalbi123@hotmail.com")) {
    throw new Error("Admin account cannot be deleted here.");
  }

  const normalizedEmail = normalizeEmail(user.email);
  db.deletedSessionEmails = Array.from(new Set([...(db.deletedSessionEmails || []), normalizedEmail]));
  db.users = (db.users || []).filter((entry) => entry.id !== user.id);
  db.sessions = (db.sessions || []).filter((entry) => entry.userId !== user.id);
  db.orders = (db.orders || []).filter((entry) => entry.userId !== user.id);

  await writeDb(db);
  return adminUserSummary(user, db);
}

export async function uploadTailoredPlanPdf({ orderId, fileName, mimeType, dataBase64, size }) {
  const db = await readDb();
  const order = (db.orders || []).find((entry) => entry.id === orderId && entry.status === "paid");

  if (!order) {
    throw new Error("Paid order not found.");
  }

  order.actionPlanPdf = {
    fileName: String(fileName || "albi-trust-action-plan.pdf"),
    mimeType: mimeType === "application/pdf" ? mimeType : "application/pdf",
    dataBase64,
    size: Number(size || 0),
    uploadedAt: new Date().toISOString(),
  };

  await writeDb(db);
  return adminOrderSummary(order, db);
}

export async function getTailoredPlanPdfForUser({ orderId, userId }) {
  const db = await readDb();
  const currentUser = findUserByAnyId(db, userId);

  if (!currentUser) {
    throw new Error("User not found.");
  }

  const order = (db.orders || []).find((entry) => entry.id === orderId && entry.status === "paid");

  if (!order || order.userId !== currentUser.id) {
    throw new Error("Action plan not found.");
  }

  if (!order.actionPlanPdf?.dataBase64) {
    throw new Error("Action plan PDF is not ready yet.");
  }

  return {
    fileName: order.actionPlanPdf.fileName || "albi-trust-action-plan.pdf",
    mimeType: order.actionPlanPdf.mimeType || "application/pdf",
    dataBase64: order.actionPlanPdf.dataBase64,
  };
}

export async function finalizeTailoredPlanOrder({ orderId, currentUserId }) {
  const db = await readDb();
  const order = (db.orders || []).find((entry) => entry.id === orderId);

  if (!order) {
    throw new Error("Order not found.");
  }

  const currentUser = findUserByAnyId(db, currentUserId);

  if (!currentUser) {
    throw new Error("User not found.");
  }

  if (order.userId !== currentUser.id) {
    throw new Error("You cannot finalize an order that does not belong to your account.");
  }

  if (order.status === "paid") {
    return order;
  }

  const user = findUserByAnyId(db, order.userId);
  const now = new Date().toISOString();

  order.status = "paid";
  order.paidAt = now;

  db.outbox.unshift({
    id: makeId("mail"),
    to: "mohalbi123@hotmail.com",
    subject: `New order - ${order.fullName} - ${user?.publicId || order.userId}`,
    html: [
      `New tailored action plan order from ${order.fullName} (${order.email}).`,
      `User ID: ${user?.publicId || order.userId}.`,
      `Order ID: ${order.id}.`,
      `Paid at: ${now}.`,
      "",
      "Client intake:",
      JSON.stringify(order.intake, null, 2),
      "",
      "Assessment result:",
      summarizeAssessment(order.assessmentSnapshot),
    ].join("\n"),
    createdAt: now,
    orderId: order.id,
    userId: user?.publicId || order.userId,
    userName: order.fullName,
  });

  await writeDb(db);
  return order;
}

export async function markAdminOrderNotificationEmailSent(orderId) {
  const db = await readDb();
  const order = (db.orders || []).find((entry) => entry.id === orderId);

  if (!order) {
    throw new Error("Order not found.");
  }

  order.adminNotificationEmailSentAt = new Date().toISOString();
  await writeDb(db);
  return order;
}
