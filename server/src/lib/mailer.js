/**
 * Gmail / Google Workspace SMTP mailer (nodemailer).
 *
 * Requires a Google App Password (not the account password):
 *   Google Account → Security → 2-Step Verification → App passwords
 * Set SMTP_USER / SMTP_PASS in server/.env.
 *
 * When SMTP is not configured the mailer logs the message (and any action
 * link) to the console instead of throwing, so local development still works.
 */
import nodemailer from "nodemailer";
import { config } from "../config.js";

let transporter = null;

function getTransporter() {
  if (!config.mail.user || !config.mail.pass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.port === 465,
      auth: { user: config.mail.user, pass: config.mail.pass },
    });
  }
  return transporter;
}

export async function verifyMailer() {
  const t = getTransporter();
  if (!t)
    return {
      ok: false,
      reason:
        "SMTP_USER/SMTP_PASS not set in server/.env — verification & reset links are printed in this console instead of being emailed",
    };
  try {
    await t.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1f2933">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="border-bottom:3px solid #0891b2;padding-bottom:12px;margin-bottom:24px">
      <span style="font-size:20px;font-weight:bold;letter-spacing:1px">HYDRO SATHI</span>
      <span style="color:#64748b;font-size:12px;display:block">Hydropower spare parts marketplace</span>
    </div>
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    ${bodyHtml}
    <p style="color:#94a3b8;font-size:12px;margin-top:32px">If you did not request this email you can safely ignore it.</p>
  </div></body></html>`;
}

function button(url, label) {
  return `<p style="margin:24px 0"><a href="${url}" style="background:#0891b2;color:#ffffff;padding:12px 20px;text-decoration:none;font-weight:bold;display:inline-block">${label}</a></p>
  <p style="font-size:12px;color:#64748b;word-break:break-all">Or paste this link into your browser:<br>${url}</p>`;
}

async function send({ to, subject, html }) {
  const t = getTransporter();
  if (!t) {
    const links = [...new Set(html.match(/https?:\/\/\S+?(?=")/g) ?? [])];
    console.log(
      `\n📧 EMAIL NOT SENT — SMTP is not configured (set SMTP_USER + SMTP_PASS in server/.env).\n` +
        `   to=${to}\n   subject=${subject}\n` +
        (links.length ? `   link: ${links.join("\n   link: ")}\n` : ""),
    );
    return { sent: false };
  }
  await t.sendMail({ from: `"${config.mail.fromName}" <${config.mail.from}>`, to, subject, html });
  return { sent: true };
}

export function sendVerificationEmail(user, token) {
  const url = `${config.appUrl}/verify-email?token=${token}`;
  return send({
    to: user.email,
    subject: "Verify your Hydro Sathi email address",
    html: layout(
      `Welcome, ${user.full_name}`,
      `<p>Confirm this email address to activate your Hydro Sathi account. The link expires in 24 hours.</p>${button(url, "Verify email address")}`,
    ),
  });
}

export function sendPasswordResetEmail(user, token, portal = "user") {
  const url = `${config.appUrl}/reset-password?token=${token}${portal === "admin" ? "&portal=admin" : ""}`;
  return send({
    to: user.email,
    subject: "Reset your Hydro Sathi password",
    html: layout(
      "Password reset request",
      `<p>Use the button below to choose a new password. The link expires in 60 minutes and can be used once.</p>${button(url, "Reset password")}`,
    ),
  });
}

export function sendSellerStatusEmail(user, status, reason) {
  return send({
    to: user.email,
    subject: `Your Hydro Sathi seller account is ${status}`,
    html: layout(
      `Seller account ${status.toLowerCase()}`,
      `<p>Your seller verification status has been updated to <strong>${status}</strong>.</p>${
        reason ? `<p>Note from the review team: ${reason}</p>` : ""
      }${button(`${config.appUrl}/seller/dashboard`, "Open seller portal")}`,
    ),
  });
}

const escape = (s) =>
  String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

/** New help/support request → admin inbox (falls back to ADMIN_EMAIL). */
export function sendSupportTicketEmail(ticket, adminEmails = []) {
  const to = (adminEmails.length ? adminEmails : [config.admin.email]).join(", ");
  return send({
    to,
    subject: `[${ticket.ticketNumber}] ${ticket.subject}`,
    html: layout(
      `Support request from ${escape(ticket.name)}`,
      `<p><strong>Ticket:</strong> ${ticket.ticketNumber}<br>
        <strong>From:</strong> ${escape(ticket.name)} (${escape(ticket.email)})${ticket.phone ? ` · ${escape(ticket.phone)}` : ""}<br>
        <strong>Account:</strong> ${ticket.role}<br>
        <strong>Category:</strong> ${ticket.category}${ticket.orderNumber ? `<br><strong>Order:</strong> ${escape(ticket.orderNumber)}` : ""}</p>
       <p style="white-space:pre-wrap">${escape(ticket.message)}</p>
       ${button(`${config.appUrl}/admin/support`, "Open support desk")}`,
    ),
  });
}

/** Admin reply → the person who raised the ticket. */
export function sendSupportReplyEmail(ticket, reply) {
  return send({
    to: ticket.email,
    subject: `Re: [${ticket.ticket_number}] ${ticket.subject}`,
    html: layout(
      "Reply from Hydro Sathi support",
      `<p style="white-space:pre-wrap">${escape(reply)}</p>
       <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
       <p style="font-size:12px;color:#64748b">Your original message:<br><span style="white-space:pre-wrap">${escape(ticket.message)}</span></p>`,
    ),
  });
}

/** Seller-submitted master product reviewed by an admin. */
export function sendProductReviewEmail(user, productName, status, reason) {
  return send({
    to: user.email,
    subject: `Your product “${productName}” was ${status.toLowerCase()}`,
    html: layout(
      `Product ${status.toLowerCase()}`,
      `<p><strong>${escape(productName)}</strong> has been ${status.toLowerCase()} by the Hydro Sathi review team.${
        status === "APPROVED" ? " It is now visible to buyers." : ""
      }</p>${reason ? `<p>Note: ${escape(reason)}</p>` : ""}${button(`${config.appUrl}/seller/products`, "Open seller portal")}`,
    ),
  });
}

export { send as sendMail };
