"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "./useCurrentUser";

const ADMIN_EMAIL = "mohalbi123@hotmail.com";

function formatDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(value) {
  if (value === "ready") return "Ready";
  if (value === "final_review") return "Final review";
  return "Under preparation";
}

function visibleIntake(intake) {
  const { accountScreenshots, ...rest } = intake || {};
  return rest;
}

export function AdminActionPlansClient() {
  const { status, user, refresh } = useCurrentUser();
  const [orders, setOrders] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingOrderId, setUploadingOrderId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [adminEmail, setAdminEmail] = useState(ADMIN_EMAIL);
  const [adminPassword, setAdminPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isAdmin = String(user?.email || "").toLowerCase() === ADMIN_EMAIL;

  async function handleAdminLogin(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSigningIn(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to sign in.");
        return;
      }

      setAdminPassword("");
      await refresh();
    } catch {
      setError("Unable to sign in.");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleAdminLogout() {
    setError("");
    setNotice("");
    setIsSigningOut(true);

    try {
      await fetch("/api/logout", { method: "POST" });
      setOrders([]);
      await refresh();
    } catch {
      setError("Unable to sign out.");
    } finally {
      setIsSigningOut(false);
    }
  }

  async function loadOrders() {
    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/action-plans");
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to load orders.");
        setIsLoading(false);
        return;
      }

      setOrders(data.orders || []);
    } catch {
      setError("Unable to load orders.");
    } finally {
      setIsLoading(false);
    }
  }

  async function uploadPdf(orderId) {
    const file = selectedFiles[orderId];

    if (!file) {
      setError("Choose a PDF first.");
      return;
    }

    setError("");
    setNotice("");
    setUploadingOrderId(orderId);

    const formData = new FormData();
    formData.append("orderId", orderId);
    formData.append("pdf", file);

    try {
      const response = await fetch("/api/admin/action-plans", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to upload PDF.");
        setUploadingOrderId("");
        return;
      }

      setNotice("PDF uploaded. The client can download it from the dashboard now.");
      setSelectedFiles((prev) => ({ ...prev, [orderId]: null }));
      await loadOrders();
    } catch {
      setError("Unable to upload PDF.");
    } finally {
      setUploadingOrderId("");
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadOrders();
    }
  }, [isAdmin]);

  if (status === "loading") {
    return (
      <section className="result-shell admin-action-plan-shell">
        <div className="eyebrow">Admin</div>
        <h1 className="page-title">Loading admin access.</h1>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="result-shell admin-action-plan-shell">
        <div className="eyebrow">Admin</div>
        <h1 className="page-title">Sign in as admin.</h1>
        <p className="page-lead">
          Use the admin email and password to manage action-plan PDFs.
        </p>
        <form className="auth-fields admin-login-form" style={{ marginTop: 24 }} onSubmit={handleAdminLogin}>
          <label className="form-field">
            <input
              type="email"
              placeholder="Admin email"
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
            />
          </label>
          <label className="form-field">
            <input
              type="password"
              placeholder="Admin password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
            />
          </label>
          {error ? <p className="auth-error">{error}</p> : null}
          <div className="stack-actions">
            <button type="submit" className="button-primary" disabled={isSigningIn}>
              {isSigningIn ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="result-shell admin-action-plan-shell">
      <div className="eyebrow">Admin</div>
      <h1 className="page-title">Action plan orders.</h1>
      <p className="page-lead">Upload the finished PDF after the client payment is confirmed.</p>

      <div className="stack-actions" style={{ marginTop: 24 }}>
        <button type="button" className="button-primary" onClick={() => loadOrders()} disabled={isLoading}>
          {isLoading ? "Loading..." : "Refresh paid orders"}
        </button>
        <button type="button" className="button-secondary" onClick={handleAdminLogout} disabled={isSigningOut}>
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>

      {error ? <p className="auth-error" style={{ marginTop: 16 }}>{error}</p> : null}
      {notice ? <p className="auth-notice" style={{ marginTop: 16 }}>{notice}</p> : null}

      <div className="admin-order-list">
        {orders.length ? (
          orders.map((order) => (
            <article className="action-card admin-order-card" key={order.id}>
              <div className="admin-order-heading">
                <div>
                  <strong>{order.fullName || order.email}</strong>
                  <p className="muted">{order.email}</p>
                </div>
                <span className={`status-pill status-pill-${order.actionPlanStatus}`}>
                  {statusLabel(order.actionPlanStatus)}
                </span>
              </div>

              <div className="mini-grid" style={{ marginTop: 16 }}>
                <div className="metric">
                  <span>User ID</span>
                  <strong>{order.publicUserId}</strong>
                </div>
                <div className="metric">
                  <span>Trader level</span>
                  <strong>{order.traderLevel || "Not available"}</strong>
                </div>
                <div className="metric">
                  <span>Paid on</span>
                  <strong>{formatDate(order.paidAt)}</strong>
                </div>
                <div className="metric">
                  <span>Estimated ready</span>
                  <strong>{formatDate(order.estimatedReadyAt)}</strong>
                </div>
              </div>

              <details className="admin-order-details">
                <summary>View intake answers</summary>
                <pre>{JSON.stringify(visibleIntake(order.intake), null, 2)}</pre>
              </details>

              {order.intake?.accountScreenshots?.length ? (
                <div className="admin-screenshot-list">
                  {order.intake.accountScreenshots.map((screenshot, index) => (
                    <a
                      key={`${order.id}-${screenshot.name}-${index}`}
                      href={screenshot.dataUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Screenshot {index + 1}: {screenshot.name}
                    </a>
                  ))}
                </div>
              ) : null}

              <div className="admin-upload-row">
                <label className="form-field">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) =>
                      setSelectedFiles((prev) => ({ ...prev, [order.id]: event.target.files?.[0] || null }))
                    }
                  />
                </label>
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => uploadPdf(order.id)}
                  disabled={uploadingOrderId === order.id}
                >
                  {uploadingOrderId === order.id ? "Uploading..." : order.pdfUploadedAt ? "Replace PDF" : "Upload PDF"}
                </button>
              </div>

              {order.pdfUploadedAt ? (
                <p className="muted" style={{ marginTop: 12 }}>
                  Uploaded {formatDate(order.pdfUploadedAt)}: {order.pdfFileName}
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <div className="action-card">
            <strong>No paid orders yet</strong>
            <p className="muted">Paid action-plan orders will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}
