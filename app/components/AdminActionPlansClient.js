"use client";

import { useEffect, useState } from "react";

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

export function AdminActionPlansClient() {
  const [token, setToken] = useState("");
  const [orders, setOrders] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingOrderId, setUploadingOrderId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadOrders(nextToken = token) {
    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/action-plans", {
        headers: {
          "x-admin-reset-token": nextToken,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to load orders.");
        setIsLoading(false);
        return;
      }

      window.localStorage.setItem("albi-admin-token", nextToken);
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
        headers: {
          "x-admin-reset-token": token,
        },
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
      await loadOrders(token);
    } catch {
      setError("Unable to upload PDF.");
    } finally {
      setUploadingOrderId("");
    }
  }

  useEffect(() => {
    const storedToken = window.localStorage.getItem("albi-admin-token") || "";
    if (storedToken) {
      setToken(storedToken);
      loadOrders(storedToken);
    }
  }, []);

  return (
    <section className="result-shell admin-action-plan-shell">
      <div className="eyebrow">Admin</div>
      <h1 className="page-title">Action plan orders.</h1>
      <p className="page-lead">Upload the finished PDF after the client payment is confirmed.</p>

      <div className="admin-token-row" style={{ marginTop: 24 }}>
        <label className="form-field">
          <input
            type="password"
            placeholder="Admin token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
        </label>
        <button type="button" className="button-primary" onClick={() => loadOrders()} disabled={isLoading || !token}>
          {isLoading ? "Loading..." : "Load paid orders"}
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
                <pre>{JSON.stringify(order.intake || {}, null, 2)}</pre>
              </details>

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
