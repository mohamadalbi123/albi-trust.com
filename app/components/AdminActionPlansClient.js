"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { renderActionPlanReportHtml } from "../lib/actionPlanReport";

const ADMIN_EMAIL = "mohalbi123@hotmail.com";

function formatDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(value) {
  if (value === "ready") return "Delivered";
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
  const [activeUserAction, setActiveUserAction] = useState("");
  const [generatingOrderId, setGeneratingOrderId] = useState("");
  const [applyingAdjustment, setApplyingAdjustment] = useState(false);
  const [deliveringDraft, setDeliveringDraft] = useState(false);
  const [generatorDraft, setGeneratorDraft] = useState("");
  const [generatorOrder, setGeneratorOrder] = useState(null);
  const [generatorPrompt, setGeneratorPrompt] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [adminEmail, setAdminEmail] = useState(ADMIN_EMAIL);
  const [adminPassword, setAdminPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isAdmin = String(user?.email || "").toLowerCase() === ADMIN_EMAIL;
  const generatorOrders = orders.filter((order) => order.actionPlanStatus !== "ready");

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

  async function handleUserAction({ userId, action, confirmMessage }) {
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    setError("");
    setNotice("");
    setActiveUserAction(`${action}:${userId}`);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to update user.");
        return;
      }

      setOrders(data.orders || []);
      setUsers(data.users || []);
      setActiveView("users");
      setNotice("User updated. The change is now live on the website.");
    } catch {
      setError("Unable to update user.");
    } finally {
      setActiveUserAction("");
    }
  }

  async function generateActionPlanDraft(orderId) {
    setError("");
    setNotice("");
    setGeneratorDraft("");
    setGeneratorOrder(null);
    setGeneratingOrderId(orderId);

    try {
      const response = await fetch("/api/admin/action-plan-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to generate action plan draft.");
        return;
      }

      setGeneratorDraft(data.draft || "");
      setGeneratorOrder(data.order || null);
      setNotice("Draft generated. Review the report, then apply any adjustment you want.");
    } catch {
      setError("Unable to generate action plan draft.");
    } finally {
      setGeneratingOrderId("");
    }
  }

  async function applyAiAdjustment() {
    if (!generatorOrder?.id || !generatorDraft.trim()) {
      setError("Generate a draft first.");
      return;
    }

    const revisionInstruction = generatorPrompt.trim();

    if (!revisionInstruction) {
      setError("Type the adjustment you want first.");
      return;
    }

    setError("");
    setNotice("");
    setApplyingAdjustment(true);

    try {
      const response = await fetch("/api/admin/action-plan-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revise_draft",
          orderId: generatorOrder.id,
          draft: generatorDraft,
          instructions: revisionInstruction,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to revise action plan draft.");
        return;
      }

      setGeneratorDraft(data.draft || generatorDraft);
      setGeneratorOrder(data.order || generatorOrder);
      setGeneratorPrompt("");
      setNotice("Adjustment applied to the report.");
    } catch {
      setError("Unable to revise action plan draft.");
    } finally {
      setApplyingAdjustment(false);
    }
  }

  function openPrintableReport() {
    if (!generatorOrder?.id || !generatorDraft.trim()) {
      setError("Generate a draft first.");
      return;
    }

    setError("");
    setNotice("");
    const reportHtml = renderActionPlanReportHtml({
      draft: generatorDraft,
      clientName: generatorOrder.fullName || generatorOrder.email || "Albi Trust Report",
      reportLabel: "Client Report",
      showToolbar: true,
    });
    const previewWindow = window.open("", "_blank");

    if (!previewWindow) {
      setError("Unable to open the printable report window.");
      return;
    }

    previewWindow.opener = null;
    previewWindow.document.open();
    previewWindow.document.write(reportHtml);
    previewWindow.document.close();
    setNotice("Printable report opened. You can print or save it as PDF from your browser.");
  }

  async function deliverGeneratedDraft() {
    if (!generatorOrder?.id || !generatorDraft.trim()) {
      setError("Generate or paste a draft first.");
      return;
    }

    if (!window.confirm("Deliver this report to the client dashboard?")) {
      return;
    }

    setError("");
    setNotice("");
    setDeliveringDraft(true);

    try {
      const response = await fetch("/api/admin/action-plan-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deliver_draft",
          orderId: generatorOrder.id,
          draft: generatorDraft,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to deliver draft.");
        return;
      }

      await loadAdminData("generator");
      setGeneratorOrder(data.order || generatorOrder);
      setNotice("Report delivered to the client dashboard.");
    } catch {
      setError("Unable to deliver draft.");
    } finally {
      setDeliveringDraft(false);
    }
  }

  const reportPreviewHtml =
    generatorOrder?.id && generatorDraft.trim()
      ? renderActionPlanReportHtml({
          draft: generatorDraft,
          clientName: generatorOrder.fullName || generatorOrder.email || "Albi Trust Report",
          reportLabel: "Client Report",
          showToolbar: false,
        })
      : "";

  useEffect(() => {
    if (isAdmin) {
      loadAdminData("orders");
    }
  }, [isAdmin]);

  if (status === "loading") {
    return (
      <section className="result-shell admin-action-plan-shell">
        <h1 className="page-title">Loading admin access.</h1>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="result-shell admin-action-plan-shell">
        <h1 className="page-title">Sign in as admin.</h1>
        <p className="page-lead">
          Use the admin email and password to manage action-plan reports.
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
      <h1 className="page-title">Admin page.</h1>
      <p className="page-lead">Manage paid orders, client records, and action-plan reports.</p>

      <div className="stack-actions" style={{ marginTop: 24 }}>
        <button
          type="button"
          className={activeView === "orders" ? "button-primary" : "button-secondary"}
          onClick={() => loadAdminData("orders")}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Paid orders"}
        </button>
        <div className={activeView === "users" ? "admin-tab-group is-active" : "admin-tab-group"}>
          <button
            type="button"
            className={activeView === "users" ? "button-primary admin-tab-main" : "button-secondary admin-tab-main"}
            onClick={() => loadAdminData("users")}
            disabled={isLoading}
          >
            User list
          </button>
          <button
            type="button"
            className="button-secondary admin-tab-download"
            onClick={() => downloadUsersCsv(users)}
            disabled={!users.length}
          >
            CSV
          </button>
        </div>
        <button
          type="button"
          className={activeView === "generator" ? "button-primary" : "button-secondary"}
          onClick={() => loadAdminData("generator")}
          disabled={isLoading}
        >
          Action Plan Generator
        </button>
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
                  <th>Actions</th>
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
                    <td>
                      <div className="admin-table-actions">
                        {!client.emailVerified ? (
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() => handleUserAction({ userId: client.id, action: "verify_email" })}
                            disabled={Boolean(activeUserAction)}
                          >
                            Verify email
                          </button>
                        ) : null}
                        {client.latestAssessmentAt ? (
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() =>
                              handleUserAction({
                                userId: client.id,
                                action: "reset_assessment",
                                confirmMessage: `Reset assessment for ${client.email}? They will be able to take it again.`,
                              })
                            }
                            disabled={Boolean(activeUserAction)}
                          >
                            Reset assessment
                          </button>
                        ) : null}
                        {client.email !== ADMIN_EMAIL ? (
                          <button
                            type="button"
                            className="button-secondary admin-danger-button"
                            onClick={() =>
                              handleUserAction({
                                userId: client.id,
                                action: "delete_user",
                                confirmMessage: `Delete ${client.email}? This removes the user, sessions, and their orders from the live website.`,
                              })
                            }
                            disabled={Boolean(activeUserAction)}
                          >
                            Delete user
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeView === "generator" && generatorOrders.length ? (
          <div className="admin-generator-layout">
            <div className="action-card admin-generator-orders">
              <div className="admin-generator-section-head">
                <strong>Orders Needing Action Plan</strong>
                <p className="muted">Pick a client, generate the first draft, then refine it in the workspace.</p>
              </div>
              <div className="admin-generator-order-list">
                {generatorOrders.map((order) => (
                  <button
                    key={`generator-${order.id}`}
                    type="button"
                    className="admin-generator-order-button"
                    onClick={() => generateActionPlanDraft(order.id)}
                    disabled={Boolean(generatingOrderId)}
                  >
                    <span>
                      <strong>{order.fullName || order.email}</strong>
                      <small>{order.displayId || order.id} - {order.traderLevel || "Trader level not available"}</small>
                    </span>
                    <span>{generatingOrderId === order.id ? "Generating..." : "Generate"}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-generator-workspace">
              <div className="action-card admin-generator-workspace-head">
                <div className="admin-generator-section-head">
                  <strong>AI Action Plan Workspace</strong>
                  <p className="muted">
                    {generatorOrder
                      ? `Working on ${generatorOrder.fullName || generatorOrder.email} - ${generatorOrder.displayId || generatorOrder.id}`
                      : "Select a paid order and generate the first draft to begin."}
                  </p>
                </div>
                <div className="admin-generator-actions">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={openPrintableReport}
                    disabled={!generatorOrder?.id || !generatorDraft.trim() || applyingAdjustment || deliveringDraft}
                  >
                    Open printable report
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={deliverGeneratedDraft}
                    disabled={!generatorOrder?.id || !generatorDraft.trim() || applyingAdjustment || deliveringDraft}
                  >
                    {deliveringDraft ? "Delivering..." : "Deliver report"}
                  </button>
                </div>
              </div>

              <div className="admin-generator-panels">
                <div className="action-card admin-generator-chat-panel">
                  <div className="admin-generator-subhead">
                    <strong>Adjustment Request</strong>
                    <p className="muted">Type one clear instruction and the AI will update the report draft directly.</p>
                  </div>
                  <div className="admin-generator-prompt">
                    <label className="form-field">
                      <span>What should change?</span>
                      <textarea
                        className="admin-generator-small-textarea"
                        value={generatorPrompt}
                        onChange={(event) => setGeneratorPrompt(event.target.value)}
                        placeholder="Example: Make the psychology section more direct, mention London session timing, and tighten the blocker solution."
                      />
                    </label>
                    <div className="admin-generator-prompt-actions">
                      <button
                        type="button"
                        className="button-primary"
                        onClick={applyAiAdjustment}
                        disabled={!generatorOrder?.id || !generatorDraft.trim() || !generatorPrompt.trim() || applyingAdjustment || deliveringDraft}
                      >
                        {applyingAdjustment ? "Applying..." : "Apply AI adjustment"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="action-card admin-generator-draft-card">
                  <div className="admin-generator-subhead">
                    <strong>Live Report Preview</strong>
                    <p className="muted">This is the professional HTML report layout that can be printed or saved as PDF.</p>
                  </div>
                  {reportPreviewHtml ? (
                    <iframe
                      title="Action plan report preview"
                      className="admin-generator-preview-frame"
                      srcDoc={reportPreviewHtml}
                    />
                  ) : (
                    <div className="admin-generator-chat-empty">
                      <strong>No report yet</strong>
                      <p className="muted">Select a paid order and generate the first draft to see the final report layout.</p>
                    </div>
                  )}
                  <div className="admin-generator-subhead" style={{ marginTop: 18 }}>
                    <strong>Report Draft</strong>
                    <p className="muted">You can still edit the source text manually if you want.</p>
                  </div>
                  <textarea
                    className="admin-generator-draft"
                    value={generatorDraft}
                    onChange={(event) => setGeneratorDraft(event.target.value)}
                    placeholder="Select a paid order and click Generate."
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {((activeView === "orders" && !orders.length) ||
          (activeView === "users" && !users.length) ||
          (activeView === "generator" && !generatorOrders.length)) ? (
          <div className="action-card">
            <strong>No records yet</strong>
            <p className="muted">
              {activeView === "generator"
                ? "No paid orders need an action plan right now."
                : "Nothing to show in this admin view yet."}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
