import crypto from "crypto";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app-db.json");
const SESSION_COOKIE = "albi_trust_session";

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
  };
}

function normalizeDbShape(db) {
  return {
    users: Array.isArray(db?.users) ? db.users : [],
    sessions: Array.isArray(db?.sessions) ? db.sessions : [],
    orders: Array.isArray(db?.orders) ? db.orders : [],
    outbox: Array.isArray(db?.outbox) ? db.outbox : [],
  };
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

function readDb() {
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8").trim();
    if (!raw) {
      const emptyDb = makeEmptyDb();
      writeDb(emptyDb);
      return emptyDb;
    }

    const db = normalizeDbShape(JSON.parse(raw));
    if (ensureUserPublicIds(db)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    }
    return db;
  } catch {
    const emptyDb = makeEmptyDb();
    writeDb(emptyDb);
    return emptyDb;
  }
}

function writeDb(db) {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(normalizeDbShape(db), null, 2));
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
  return process.env.NEXTAUTH_URL || "http://localhost:3002";
}

function getLatestPaidOrderForUser(db, internalUserId) {
  return (db.orders || []).find((entry) => entry.userId === internalUserId && entry.status === "paid") || null;
}

function findUserByAnyId(db, userId) {
  const normalized = String(userId || "");
  return (
    (db.users || []).find(
      (entry) => entry.id === normalized || String(entry.publicId || "") === normalized,
    ) || null
  );
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

export function publicUser(user) {
  if (!user) return null;

  const db = readDb();
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
    latestPaidOrderAt: latestPaidOrder?.createdAt || null,
  };
}

export function signupUser({ fullName, email, password }) {
  const db = readDb();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date().toISOString();
  const verificationToken = makeToken();
  const verificationTokenHash = makeTokenHash(verificationToken);
  const verificationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

  let user = db.users.find((entry) => entry.email === normalizedEmail);

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

  const verifyUrl = `${appBaseUrl()}/api/verify-email?token=${verificationToken}`;

  db.outbox.unshift({
    id: makeId("mail"),
    to: normalizedEmail,
    subject: "Confirm your Albi Trust email",
    html: `Click to confirm your email: ${verifyUrl}`,
    createdAt: now,
    verifyUrl,
  });

  writeDb(db);

  return {
    user: publicUser(user),
    verifyUrl,
  };
}

export function verifyEmailToken(token) {
  const db = readDb();
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

  writeDb(db);
  return {
    user: publicUser(user),
    internalUserId: user.id,
  };
}

export function loginUser({ email, password }) {
  const db = readDb();
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
    user: publicUser(user),
    internalUserId: user.id,
  };
}

export function updateUserPassword({ userId, currentPassword, newPassword }) {
  const db = readDb();
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
  writeDb(db);

  return publicUser(user);
}

export function upsertGoogleUser({ fullName, email }) {
  const db = readDb();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date().toISOString();

  if (!normalizedEmail) {
    throw new Error("Google account email is missing.");
  }

  let user = db.users.find((entry) => entry.email === normalizedEmail);

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

  writeDb(db);

  return {
    user: publicUser(user),
    internalUserId: user.id,
  };
}

export function createSession(userId) {
  const db = readDb();
  const token = makeToken();
  const tokenHash = makeTokenHash(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

  db.sessions = db.sessions.filter((session) => new Date(session.expiresAt) > new Date());
  db.sessions.push({
    id: makeId("session"),
    userId,
    tokenHash,
    createdAt: new Date().toISOString(),
    expiresAt,
  });

  writeDb(db);

  return {
    token,
    expiresAt,
  };
}

export function getUserFromSessionToken(token) {
  if (!token) return null;

  const db = readDb();
  const tokenHash = makeTokenHash(token);
  const session = db.sessions.find(
    (entry) => entry.tokenHash === tokenHash && new Date(entry.expiresAt) > new Date(),
  );

  if (!session) return null;

  const user = db.users.find((entry) => entry.id === session.userId);
  return publicUser(user);
}

export function destroySession(token) {
  if (!token) return;
  const db = readDb();
  const tokenHash = makeTokenHash(token);
  db.sessions = db.sessions.filter((entry) => entry.tokenHash !== tokenHash);
  writeDb(db);
}

export function saveAssessmentForUser({ email, result }) {
  const db = readDb();
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

  const nextAssessmentDate = new Date(now);
  nextAssessmentDate.setMonth(nextAssessmentDate.getMonth() + 1);

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

  writeDb(db);
  return assessmentRecord;
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function createTailoredPlanDraft({
  userId,
  tradingYears,
  profitableBefore,
  previousExperience,
  currentWorkStatus,
  employmentType,
  hasChildren,
  childrenCount,
  country,
  originCountry,
  tradingSession,
  dailyTradingHours,
  usualTradingTime,
  energyLevel,
  dependsOnTradingIncome,
  personalBackground,
}) {
  const db = readDb();
  const user = findUserByAnyId(db, userId);

  if (!user) {
    throw new Error("User not found.");
  }

  const now = new Date().toISOString();
  const orderId = makeId("order");

  const order = {
    id: orderId,
    userId: user.id,
    fullName: user.fullName,
    email: user.email,
    priceUsd: 99,
    status: "pending",
    createdAt: now,
    paidAt: null,
    assessmentSnapshot: user.latestAssessment || null,
    intake: {
      tradingYears,
      profitableBefore,
      previousExperience,
      currentWorkStatus,
      employmentType,
      hasChildren,
      childrenCount,
      country,
      originCountry,
      tradingSession,
      dailyTradingHours,
      usualTradingTime,
      energyLevel,
      dependsOnTradingIncome,
      personalBackground,
    },
  };

  db.orders = db.orders || [];
  db.orders.unshift(order);

  writeDb(db);
  return order;
}

export function finalizeTailoredPlanOrder({ orderId }) {
  const db = readDb();
  const order = (db.orders || []).find((entry) => entry.id === orderId);

  if (!order) {
    throw new Error("Order not found.");
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

  writeDb(db);
  return order;
}
