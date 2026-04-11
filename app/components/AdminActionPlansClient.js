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

function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadUsersCsv(users) {
  const headers = [
    "User ID",
    "Name",
    "Email",
    "Email verified",
    "Trader level",
    "Main blocker",
    "Joined",
    "Assessment taken",
    "Next retake",
    "Paid action plan",
    "Paid order ID",
    "Paid order date",
  ];
  const rows = users.map((client) => [
    client.id,
    client.fullName,
    client.email,
    client.emailVerified ? "Yes" : "No",
    client.traderLevel || "",
    client.primaryWeakness || "",
    client.createdAt || "",
    client.latestAssessmentAt || "",
    client.nextAssessmentAt || "",
    client.hasPaidTailoredPlan ? "Yes" : "No",
    client.latestOrderDisplayId || "",
    client.latestPaidOrderAt || "",
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");

  link.href = url;
  link.download = "albi-trust-users.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminActionPlansClient() {
  const { status, user, refresh } = useCurrentUser();
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeView, setActiveView] = useState("orders");
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

  async function loadAdminData(nextView = activeView) {
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
      setUsers(data.users || []);
      setActiveView(nextView);
    } catch {
      setError("Unable to load admin data.");
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
      await loadAdminData("orders");
    } catch {
      setError("Unable to upload PDF.");
    } finally {
      setUploadingOrderId("");
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadAdminData("orders");
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
        <button
          type="button"
          className={activeView === "orders" ? "button-primary" : "button-secondary"}
          onClick={() => loadAdminData("orders")}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Paid orders"}
        </button>
        <button
          type="button"
          className={activeView === "users" ? "button-primary" : "button-secondary"}
          onClick={() => loadAdminData("users")}
          disabled={isLoading}
        >
          User list
        </button>
        {activeView === "users" ? (
          <button type="button" className="button-secondary" onClick={() => downloadUsersCsv(users)} disabled={!users.length}>
            Download CSV
          </button>
        ) : null}
        <button type="button" className="button-secondary" onClick={handleAdminLogout} disabled={isSigningOut}>
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>

      {error ? <p className="auth-error" style={{ marginTop: 16 }}>{error}</p> : null}
      {notice ? <p className="auth-notice" style={{ marginTop: 16 }}>{notice}</p> : null}

      <div className="admin-order-list">
        {activeView === "orders" && orders.length ? (
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
                  <span>Order number</span>
                  <strong>{order.displayId || order.id}</strong>
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
        ) : null}

        {activeView === "users" && users.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Email verified</th>
                  <th>Trader level</th>
                  <th>Main blocker</th>
                  <th>Joined</th>
                  <th>Assessment taken</th>
                  <th>Paid order</th>
                </tr>
              </thead>
              <tbody>
                {users.map((client) => (
                  <tr key={client.id}>
                    <td>{client.id}</td>
                    <td>{client.fullName || "No name"}</td>
                    <td>{client.email}</td>
                    <td>{client.emailVerified ? "Yes" : "No"}</td>
                    <td>{client.traderLevel || "Not available"}</td>
                    <td>{client.primaryWeakness || "Not available"}</td>
                    <td>{formatDate(client.createdAt)}</td>
                    <td>{formatDate(client.latestAssessmentAt)}</td>
                    <td>{client.latestOrderDisplayId || "No order"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {((activeView === "orders" && !orders.length) ||
          (activeView === "users" && !users.length)) ? (
          <div className="action-card">
            <strong>No records yet</strong>
            <p className="muted">Nothing to show in this admin view yet.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
