/**
 * Email service — nodemailer wrapper.
 *
 * REQUIRES: npm install nodemailer @types/nodemailer
 *
 * When SMTP_HOST is not set the service logs the email body to stdout instead
 * of sending. This lets the reset/verify flows work in dev without an email
 * server — just copy the link from the server log.
 *
 * Env vars needed for real email sending:
 *   SMTP_HOST   – e.g. smtp.gmail.com  (required for real sending)
 *   SMTP_PORT   – e.g. 587             (default 587)
 *   SMTP_SECURE – "true" for port 465  (default false)
 *   SMTP_USER   – your SMTP login
 *   SMTP_PASS   – your SMTP password / app password
 *   SMTP_FROM   – e.g. "FitAI Coach <noreply@fitai.example.com>"
 */

// @ts-expect-error — run: npm install nodemailer @types/nodemailer
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import logger from "./logger.js";

// ── Transport ─────────────────────────────────────────────────────────────────

function createTransport() {
  if (!env.SMTP_HOST) return null;

  return nodemailer.createTransport({
    host:   env.SMTP_HOST,
    port:   env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

const transport = createTransport();

// ── Core send helper ──────────────────────────────────────────────────────────

interface MailOptions {
  to:      string;
  subject: string;
  text:    string;
  html:    string;
}

async function sendMail(opts: MailOptions): Promise<void> {
  if (!transport) {
    // Dev fallback — log to console so developers can copy-paste the link
    logger.info("─── [DEV EMAIL — no SMTP configured] ───────────────────────");
    logger.info(`To:      ${opts.to}`);
    logger.info(`Subject: ${opts.subject}`);
    logger.info(opts.text);
    logger.info("─────────────────────────────────────────────────────────────");
    return;
  }

  await transport.sendMail({
    from:    env.SMTP_FROM ?? "FitAI Coach <noreply@fitai.local>",
    to:      opts.to,
    subject: opts.subject,
    text:    opts.text,
    html:    opts.html,
  });
}

// ── Specific email templates ───────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  to:       string,
  username: string,
  token:    string,
): Promise<void> {
  const clientUrl = env.CLIENT_URL ?? "http://localhost:5173";
  const link = `${clientUrl}/reset-password?token=${token}`;

  await sendMail({
    to,
    subject: "Reset your FitAI Coach password",
    text: [
      `Hi ${username},`,
      "",
      "You requested a password reset. Click the link below to choose a new password.",
      "The link expires in 1 hour.",
      "",
      link,
      "",
      "If you did not request this, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <p>Hi <strong>${username}</strong>,</p>
      <p>You requested a password reset. Click the link below to choose a new password.<br>
      The link expires in <strong>1 hour</strong>.</p>
      <p><a href="${link}" style="color:#6366f1;font-weight:bold;">Reset my password</a></p>
      <p style="color:#888;font-size:12px;">If you did not request this, you can safely ignore this email.</p>
    `,
  });

  logger.info(`Password reset email sent to ${to}`);
}

export async function sendEmailVerificationEmail(
  to:       string,
  username: string,
  token:    string,
): Promise<void> {
  const clientUrl = env.CLIENT_URL ?? "http://localhost:5173";
  const link = `${clientUrl}/verify-email?token=${token}`;

  await sendMail({
    to,
    subject: "Verify your FitAI Coach email address",
    text: [
      `Hi ${username},`,
      "",
      "Thanks for registering! Please verify your email address by clicking the link below.",
      "The link expires in 24 hours.",
      "",
      link,
    ].join("\n"),
    html: `
      <p>Hi <strong>${username}</strong>,</p>
      <p>Thanks for registering! Please verify your email address to unlock full access.</p>
      <p><a href="${link}" style="color:#6366f1;font-weight:bold;">Verify my email</a></p>
      <p style="color:#888;font-size:12px;">This link expires in 24 hours.</p>
    `,
  });

  logger.info(`Verification email sent to ${to}`);
}
