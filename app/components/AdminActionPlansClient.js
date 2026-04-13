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
  const [revisingDraft, setRevisingDraft] = useState(false);
  const [previewingPdf, setPreviewingPdf] = useState(false);
  const [deliveringDraft, setDeliveringDraft] = useState(false);
  const [generatorDraft, setGeneratorDraft] = useState("");
  const [generatorOrder, setGeneratorOrder] = useState(null);
  const [generatorInstructions, setGeneratorInstructions] = useState("");
  const [generatorKnowledge, setGeneratorKnowledge] = useState("");
  const [generatorChat, setGeneratorChat] = useState([]);
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
    setGeneratorChat([]);
    setGeneratingOrderId(orderId);

    try {
      const response = await fetch("/api/admin/action-plan-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          instructions: generatorInstructions,
          knowledge: generatorKnowledge,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to generate action plan draft.");
        return;
      }

      setGeneratorDraft(data.draft || "");
      setGeneratorOrder(data.order || null);
      setGeneratorChat(
        generatorInstructions.trim()
          ? [
              {
                role: "admin",
                content: generatorInstructions.trim(),
              },
              {
                role: "model",
                content: "Draft generated from your instruction. Review it and send another message if you want changes.",
              },
            ]
          : [
              {
                role: "model",
                content: "Draft generated. Review it and send a message if you want anything changed.",
              },
            ],
      );
      setNotice("Draft generated. Review and edit it before creating the PDF.");
    } catch {
      setError("Unable to generate action plan draft.");
    } finally {
      setGeneratingOrderId("");
    }
  }

  async function reviseActionPlanDraft() {
    if (!generatorOrder?.id || !generatorDraft.trim()) {
      setError("Generate a draft first.");
      return;
    }

    if (!generatorInstructions.trim() && !generatorKnowledge.trim()) {
      setError("Add an instruction or method notes before asking the AI to revise.");
      return;
    }

    setError("");
    setNotice("");
    setRevisingDraft(true);
    const revisionInstruction = generatorInstructions.trim();

    try {
      const response = await fetch("/api/admin/action-plan-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revise_draft",
          orderId: generatorOrder.id,
          draft: generatorDraft,
          instructions: generatorInstructions,
          knowledge: generatorKnowledge,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to revise action plan draft.");
        return;
      }

      setGeneratorDraft(data.draft || generatorDraft);
      setGeneratorOrder(data.order || generatorOrder);
      setGeneratorChat((prev) => [
        ...prev,
        ...(revisionInstruction
          ? [
              {
                role: "admin",
                content: revisionInstruction,
              },
            ]
          : []),
        {
          role: "model",
          content: "Draft updated. Review the new version or send another change request.",
        },
      ]);
      setGeneratorInstructions("");
      setNotice("Draft revised. Review it before delivery.");
    } catch {
      setError("Unable to revise action plan draft.");
    } finally {
      setRevisingDraft(false);
    }
  }

  function openBase64Pdf({ dataBase64, fileName, previewWindow }) {
    const binary = window.atob(dataBase64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    if (previewWindow && !previewWindow.closed) {
      previewWindow.location.href = url;
      previewWindow.document.title = fileName || "albi-trust-action-plan-preview.pdf";
    } else {
      const link = document.createElement("a");

      link.href = url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.title = fileName || "albi-trust-action-plan-preview.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function previewGeneratedPdf() {
    if (!generatorOrder?.id || !generatorDraft.trim()) {
      setError("Generate or paste a draft first.");
      return;
    }

    setError("");
    setNotice("");
    setPreviewingPdf(true);
    const previewWindow = window.open("", "_blank");

    if (previewWindow) {
      previewWindow.opener = null;
      previewWindow.document.write("<title>Preparing PDF preview...</title><p style=\"font-family:system-ui;padding:24px\">Preparing PDF preview...</p>");
      previewWindow.document.close();
    }

    try {
      const response = await fetch("/api/admin/action-plan-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview_pdf",
          orderId: generatorOrder.id,
          draft: generatorDraft,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (previewWindow && !previewWindow.closed) {
          previewWindow.close();
        }
        setError(data.error || "Unable to preview PDF.");
        return;
      }

      openBase64Pdf({ ...data, previewWindow });
      setNotice("PDF preview opened. Review it before delivery.");
    } catch {
      if (previewWindow && !previewWindow.closed) {
        previewWindow.close();
      }
      setError("Unable to preview PDF.");
    } finally {
      setPreviewingPdf(false);
    }
  }

  async function uploadGeneratorKnowledge(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!/\.(txt|md|markdown|csv)$/i.test(file.name) && !file.type.startsWith("text/")) {
      setError("For now, upload a text, Markdown, or CSV file. For PDF/book upload we will add a proper knowledge base next.");
      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      setGeneratorKnowledge((prev) => [prev, `Notes from ${file.name}:\n${text}`].filter(Boolean).join("\n\n"));
      setNotice("Notes uploaded into the generator context.");
    } catch {
      setError("Unable to read this file.");
    } finally {
      event.target.value = "";
    }
  }

  async function deliverGeneratedDraft() {
    if (!generatorOrder?.id || !generatorDraft.trim()) {
      setError("Generate or paste a draft first.");
      return;
    }

    if (!window.confirm("Deliver this draft as the client's PDF action plan?")) {
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
      setNotice("Draft saved as PDF and delivered to the client dashboard.");
    } catch {
      setError("Unable to deliver draft.");
    } finally {
      setDeliveringDraft(false);
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
        <h1 className="page-title">Loading admin access.</h1>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="result-shell admin-action-plan-shell">
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
      <h1 className="page-title">Admin page.</h1>
      <p className="page-lead">Manage paid orders, client records, and action-plan PDFs.</p>

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
              <strong>Orders needing action plan</strong>
              <p className="muted">Delivered orders are removed from this list and stay in Paid orders.</p>
              <div className="admin-generator-control-block">
                <label className="form-field">
                  <span>Message the AI</span>
                  <textarea
                    className="admin-generator-small-textarea"
                    value={generatorInstructions}
                    onChange={(event) => setGeneratorInstructions(event.target.value)}
                    placeholder="Example: Make this more direct. Focus on risk control, remove generic language, and strengthen the weekly plan."
                  />
                </label>
                <label className="form-field">
                  <span>Your method notes</span>
                  <textarea
                    className="admin-generator-small-textarea"
                    value={generatorKnowledge}
                    onChange={(event) => setGeneratorKnowledge(event.target.value)}
                    placeholder="Paste your book/course notes, rules, or framework here."
                  />
                </label>
                <label className="button-secondary admin-generator-upload">
                  Upload text notes
                  <input type="file" accept=".txt,.md,.markdown,.csv,text/*" onChange={uploadGeneratorKnowledge} />
                </label>
              </div>
              {generatorChat.length ? (
                <div className="admin-generator-chat">
                  {generatorChat.map((entry, index) => (
                    <div
                      key={`${entry.role}-${index}`}
                      className={`admin-generator-chat-bubble ${entry.role === "admin" ? "is-admin" : "is-model"}`}
                    >
                      <strong>{entry.role === "admin" ? "You" : "Model"}</strong>
                      <p>{entry.content}</p>
                    </div>
                  ))}
                </div>
              ) : null}
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

            <div className="action-card admin-generator-draft-card">
              <div className="admin-order-heading">
                <div>
                  <strong>Draft action plan</strong>
                  <p className="muted">
                    {generatorOrder
                      ? `${generatorOrder.fullName || generatorOrder.email} - ${generatorOrder.displayId || generatorOrder.id}`
                      : "Generated text will appear here."}
                  </p>
                </div>
              </div>
              <textarea
                className="admin-generator-draft"
                value={generatorDraft}
                onChange={(event) => setGeneratorDraft(event.target.value)}
                placeholder="Select a paid order and click Generate."
              />
              <div className="stack-actions" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={reviseActionPlanDraft}
                  disabled={!generatorOrder?.id || !generatorDraft.trim() || revisingDraft || previewingPdf || deliveringDraft}
                >
                  {revisingDraft ? "Revising..." : "Revise with my instructions"}
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={previewGeneratedPdf}
                  disabled={!generatorOrder?.id || !generatorDraft.trim() || revisingDraft || previewingPdf || deliveringDraft}
                >
                  {previewingPdf ? "Opening preview..." : "Preview PDF"}
                </button>
                <button
                  type="button"
                  className="button-primary"
                  onClick={deliverGeneratedDraft}
                  disabled={!generatorOrder?.id || !generatorDraft.trim() || revisingDraft || previewingPdf || deliveringDraft}
                >
                  {deliveringDraft ? "Delivering..." : "Save as PDF and deliver"}
                </button>
              </div>
              <p className="muted" style={{ marginTop: 12 }}>
                Review this draft and add your final thinking before delivery. You can still replace the PDF later from Paid orders.
              </p>
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
