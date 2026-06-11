/**
 * Email notification system powered by Resend.
 * All emails use inline-styled HTML so they render correctly
 * across Gmail, Outlook, Apple Mail, etc.
 *
 * Setup:
 *   1. Create account at resend.com (free — 3,000 emails/month)
 *   2. Add your domain or use onboarding@resend.dev for testing
 *   3. Set RESEND_API_KEY and RESEND_FROM in .env.local
 */

import { Resend } from "resend";
import { adminAuth } from "@/lib/firebaseAdmin";

/* ── Client ──────────────────────────────────────────────────────────────── */

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null; // silently skip if not configured
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.RESEND_FROM ?? "Repair AI Pro <noreply@resend.dev>";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

/** Exported constant used by direct-send helpers below. */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "https://repair-ai-pro.com";

/* ── HTML template shell ─────────────────────────────────────────────────── */

function emailShell(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Header -->
        <tr><td style="background:#0f172a;border-radius:12px 12px 0 0;padding:20px 28px;">
          <span style="color:#818cf8;font-size:20px;font-weight:700;">⚡ Repair AI Pro</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:0 0 12px 12px;padding:16px 28px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            You're receiving this because you have an account on Repair AI Pro.<br>
            <a href="${BASE_URL}" style="color:#6366f1;text-decoration:none;">Visit app</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ── Reusable blocks ─────────────────────────────────────────────────────── */

function heading(text: string): string {
  return `<h1 style="margin:0 0 12px;color:#111827;font-size:22px;font-weight:700;line-height:1.3;">${text}</h1>`;
}

function para(text: string): string {
  return `<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">${text}</p>`;
}

function ctaButton(label: string, href: string): string {
  return `
  <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="background:#4f46e5;border-radius:10px;">
      <a href="${href}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
        ${label}
      </a>
    </td></tr>
  </table>`;
}

function infoBox(label: string, value: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:16px 0;">
    <tr>
      <td style="padding:12px 16px;">
        <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">${label}</span><br>
        <span style="color:#111827;font-size:15px;font-weight:600;">${value}</span>
      </td>
    </tr>
  </table>`;
}

function stars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

/* ── Email templates ─────────────────────────────────────────────────────── */

export type EmailTemplate =
  | { type: "contractor_invited"; trade: string; city: string; jobId: string }
  | { type: "job_accepted"; contractorName: string; jobId: string }
  | { type: "job_started"; jobDescription: string; jobId: string }
  | { type: "job_completed"; jobId: string }
  | { type: "job_confirmed"; jobId: string }
  | { type: "new_message"; senderName: string; jobId: string }
  | { type: "review_received"; rating: number; jobId: string }
  | { type: "dispute_opened"; category: string; reporterRole: string; jobId: string }
  | { type: "job_cancelled"; cancelledByRole: string; jobId: string }
  | { type: "payout_failed"; failureReason?: string; jobId: string };

function buildEmail(tpl: EmailTemplate): { subject: string; html: string } {
  const chatUrl = (jobId: string) => `${BASE_URL}/jobs/${jobId}`;

  switch (tpl.type) {
    case "contractor_invited":
      return {
        subject: `New job invitation — ${tpl.trade} in ${tpl.city}`,
        html: emailShell(
          heading("You have a new job invitation") +
          para(`A ${tpl.trade} job is available in <strong>${tpl.city}</strong>. Be the first to accept and win the job.`) +
          infoBox("Service", tpl.trade) +
          infoBox("Location", tpl.city) +
          ctaButton("View & Accept Job →", `${BASE_URL}/contractor-inbox`) +
          para(`<span style="color:#9ca3af;font-size:13px;">Invitations are sent to the top-rated pros in your area. Accept quickly to claim the job.</span>`)
        ),
      };

    case "job_accepted":
      return {
        subject: "A contractor accepted your job 🎉",
        html: emailShell(
          heading("Your job has been accepted!") +
          para(`<strong>${tpl.contractorName}</strong> has accepted your job and is ready to coordinate. Open the chat to say hello and schedule a time.`) +
          ctaButton("Open Job Chat →", chatUrl(tpl.jobId)) +
          para(`<span style="color:#9ca3af;font-size:13px;">You can message, schedule, and track progress all from the chat.</span>`)
        ),
      };

    case "job_started":
      return {
        subject: "Work has started on your job 🔧",
        html: emailShell(
          heading("Your contractor has started work") +
          para("Your contractor marked the job as <strong>in progress</strong>. You'll receive another update when the work is complete.") +
          (tpl.jobDescription ? infoBox("Job", tpl.jobDescription.slice(0, 120)) : "") +
          ctaButton("Track Progress →", chatUrl(tpl.jobId))
        ),
      };

    case "job_completed":
      return {
        subject: "Work is done — please confirm ✅",
        html: emailShell(
          heading("Your contractor marked the job complete") +
          para("Please confirm that the work is done to your satisfaction. This releases payment and lets you leave a review.") +
          ctaButton("Confirm Work is Done →", chatUrl(tpl.jobId)) +
          para(`<span style="color:#9ca3af;font-size:13px;">If there's an issue, you can open a dispute from the job chat.</span>`)
        ),
      };

    case "job_confirmed":
      return {
        subject: "Job confirmed — great work! 🌟",
        html: emailShell(
          heading("The homeowner confirmed your work!") +
          para("Your work was confirmed. Payment has been released. The homeowner may also leave you a review — keep up the great work!") +
          ctaButton("View Job →", chatUrl(tpl.jobId)) +
          para(`<span style="color:#9ca3af;font-size:13px;">Reviews build your trust score and help you rank higher in future matches.</span>`)
        ),
      };

    case "new_message":
      return {
        subject: `New message from ${tpl.senderName}`,
        html: emailShell(
          heading(`${tpl.senderName} sent you a message`) +
          para("You have a new message waiting in your job chat. Reply to keep the conversation going.") +
          ctaButton("Read & Reply →", chatUrl(tpl.jobId))
        ),
      };

    case "review_received":
      return {
        subject: `You received a ${tpl.rating}★ review`,
        html: emailShell(
          heading("A new review was left for you") +
          para(`You received a <strong style="color:#f59e0b;">${stars(tpl.rating)} (${tpl.rating}/5)</strong> rating from a homeowner.`) +
          ctaButton("View Your Profile →", `${BASE_URL}/contractor-profile`) +
          para(`<span style="color:#9ca3af;font-size:13px;">Reviews directly impact your trust score and how often you appear in job matches.</span>`)
        ),
      };

    case "dispute_opened": {
      const who = tpl.reporterRole === "homeowner" ? "the homeowner" : "the contractor";
      return {
        subject: "A dispute has been opened on your job ⚠️",
        html: emailShell(
          heading("A dispute was opened on your job") +
          para(`<strong>${who}</strong> has opened a dispute on this job.`) +
          infoBox("Dispute Category", tpl.category) +
          para("Payment has been frozen until the dispute is resolved. Our team will review the case and reach out to both parties.") +
          ctaButton("View Job →", `${BASE_URL}/jobs/${tpl.jobId}`) +
          para(`<span style="color:#9ca3af;font-size:13px;">If you need to add more details, open the job chat and describe the situation clearly.</span>`)
        ),
      };
    }

    case "job_cancelled": {
      const who = tpl.cancelledByRole === "homeowner" ? "The homeowner" : "The contractor";
      return {
        subject: "Job has been cancelled",
        html: emailShell(
          heading("Your job was cancelled") +
          para(`${who} has cancelled this job. If a payment was held, it will be fully refunded within 5–10 business days.`) +
          ctaButton("Post a New Job →", `${BASE_URL}/jobs/new`) +
          para(`<span style="color:#9ca3af;font-size:13px;">If you believe this cancellation was made in error, please contact support.</span>`)
        ),
      };
    }

    case "payout_failed": {
      return {
        subject: "Payout failed for your completed job",
        html: emailShell(
          heading("Your payout couldn't go through") +
          para("The payment for your recently completed job couldn't be transferred to your bank account.") +
          (tpl.failureReason ? infoBox("Reason", tpl.failureReason) : para("This may be due to a temporary issue with your bank or account.")) +
          ctaButton("Check Payment Settings →", `${BASE_URL}/dashboard/contractor/settings`) +
          para(`<span style="color:#9ca3af;font-size:13px;">If the issue persists, please verify your bank details in your payment settings or contact support.</span>`)
        ),
      };
    }
  }
}

/* ── Main send function (uid-based) ─────────────────────────────────────── */

export async function sendEmail(
  recipientId: string,
  tpl: EmailTemplate
): Promise<void> {
  const resend = getResend();
  if (!resend) return; // Resend not configured — skip silently

  // Look up recipient's email from Firebase Auth
  let recipientEmail: string | undefined;
  try {
    const user = await adminAuth.getUser(recipientId);
    recipientEmail = user.email ?? undefined;
  } catch {
    return; // user not found — skip
  }

  if (!recipientEmail) return;

  const { subject, html } = buildEmail(tpl);

  try {
    await resend.emails.send({
      from:    FROM,
      to:      recipientEmail,
      subject,
      html,
    });
  } catch (err) {
    // Non-fatal — log but never throw
    console.error("Email send error:", err);
  }
}

/* ── Direct-address send helper ─────────────────────────────────────────── */

/**
 * Low-level helper: send to a known email address with arbitrary subject/html.
 * Used by the specific typed helpers below and by the Stripe release route.
 */
export async function sendEmailDirect({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email send");
    return;
  }
  const resend = getResend()!;
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("Email send failed:", err);
  }
}

/* ── Shared layout for direct-send helpers ───────────────────────────────── */

function directLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RepairAI Pro</title>
</head>
<body style="margin:0;padding:0;background-color:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1117;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:22px;font-weight:700;color:#6366f1;letter-spacing:-0.5px;">RepairAI Pro</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border-radius:16px;padding:32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#6b7280;">
                RepairAI Pro &nbsp;&middot;&nbsp;
                <a href="${APP_URL}/unsubscribe" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function directBtn(href: string, label: string): string {
  return `<div style="text-align:center;margin-top:28px;">
  <a href="${href}"
     style="display:inline-block;background-color:#6366f1;color:#ffffff;font-size:15px;font-weight:600;
            text-decoration:none;border-radius:8px;padding:12px 24px;">
    ${label}
  </a>
</div>`;
}

/* ── Typed convenience senders (accept email address directly) ───────────── */

/** Sent to homeowner when a contractor accepts their job. */
export async function sendJobMatchedEmail(
  to: string,
  {
    jobDescription,
    tradeType,
    contractorName,
    jobId,
  }: {
    jobDescription: string;
    tradeType: string;
    contractorName: string;
    jobId: string;
  }
): Promise<void> {
  const chatUrl = `${APP_URL}/jobs/${jobId}`;
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">A contractor has been assigned!</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Great news! <strong>${contractorName}</strong> has accepted your <strong>${tradeType}</strong> job.
    </p>
    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;background:#f9fafb;border-radius:8px;padding:12px 16px;">
      ${jobDescription}
    </p>
    <p style="margin:16px 0 0;font-size:15px;color:#374151;line-height:1.6;">
      Click below to chat with them and track progress.
    </p>
    ${directBtn(chatUrl, "Open Job Chat")}
  `;
  await sendEmailDirect({
    to,
    subject: "✅ A contractor has been assigned to your job",
    html: directLayout(content),
  });
}

/** Sent to contractor when a new matching job is posted. */
export async function sendNewJobInvitationEmail(
  to: string,
  {
    jobDescription,
    tradeType,
    estimatedValue,
    jobId,
  }: {
    jobDescription: string;
    tradeType: string;
    estimatedValue: string | number;
    jobId: string;
  }
): Promise<void> {
  const chatUrl = `${APP_URL}/jobs/${jobId}`;
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">New job invitation — ${tradeType}</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      You've been matched with a new <strong>${tradeType}</strong> job worth
      <strong>~$${estimatedValue}</strong>. Accept before another contractor does!
    </p>
    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;background:#f9fafb;border-radius:8px;padding:12px 16px;">
      ${jobDescription}
    </p>
    ${directBtn(chatUrl, "View & Accept Job")}
  `;
  await sendEmailDirect({
    to,
    subject: `🔔 New job invitation — ${tradeType}`,
    html: directLayout(content),
  });
}

/** Sent to homeowner when contractor marks a job complete. */
export async function sendJobCompletedEmail(
  to: string,
  {
    contractorName,
    jobDescription,
    jobId,
  }: {
    contractorName: string;
    jobDescription: string;
    jobId: string;
  }
): Promise<void> {
  const chatUrl = `${APP_URL}/jobs/${jobId}`;
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Job marked complete</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      <strong>${contractorName}</strong> has marked your job complete. Confirm completion to
      release their payment and leave a review.
    </p>
    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;background:#f9fafb;border-radius:8px;padding:12px 16px;">
      ${jobDescription}
    </p>
    ${directBtn(chatUrl, "Confirm & Review")}
  `;
  await sendEmailDirect({
    to,
    subject: "🏁 Job complete — please confirm and leave a review",
    html: directLayout(content),
  });
}

/** Sent to contractor after a Stripe transfer succeeds. */
export async function sendPayoutSentEmail(
  to: string,
  {
    amount,
    jobDescription,
    jobId,
  }: {
    amount: string | number;
    jobDescription: string;
    jobId: string;
  }
): Promise<void> {
  const earningsUrl = `${APP_URL}/dashboard/contractor/settings`;
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Payout sent — $${amount}</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      Your payout of <strong>$${amount}</strong> for
      <em>&ldquo;${jobDescription}&rdquo;</em> is on its way to your bank account.
      Expect funds in 1&ndash;5 business days.
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;">Job ID: ${jobId}</p>
    ${directBtn(earningsUrl, "View Earnings")}
  `;
  await sendEmailDirect({
    to,
    subject: `💸 Payout sent — $${amount}`,
    html: directLayout(content),
  });
}

/** Sent to homeowner when contractor sends them an invoice. */
export async function sendInvoiceEmail(
  to: string,
  {
    contractorName,
    invoiceNumber,
    total,
    jobDescription,
    payUrl,
  }: {
    contractorName: string;
    invoiceNumber: string;
    total: number;
    jobDescription: string;
    payUrl: string;
  }
): Promise<void> {
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Invoice from ${contractorName}</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      You have a new invoice for work completed on your home repair job.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:0 0 20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Invoice</p>
        <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#111827;">${invoiceNumber}</p>
        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Job</p>
        <p style="margin:0 0 12px;font-size:14px;color:#374151;">${jobDescription.slice(0, 100)}</p>
        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Amount Due</p>
        <p style="margin:0;font-size:28px;font-weight:800;color:#16a34a;">$${total.toFixed(2)}</p>
      </td></tr>
    </table>
    ${directBtn(payUrl, "View & Pay Invoice →")}
    <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;text-align:center;">
      You can also view this invoice at any time from your job page.
    </p>
  `;
  await sendEmailDirect({
    to,
    subject: `Invoice ${invoiceNumber} from ${contractorName} — $${total.toFixed(2)} due`,
    html: directLayout(content),
  });
}

/** Sent to a new user immediately after registration. */
export async function sendWelcomeEmail(
  to: string,
  {
    name,
    role,
  }: {
    name: string;
    role: "homeowner" | "contractor";
  }
): Promise<void> {
  const isContractor = role === "contractor";
  const bodyText = isContractor
    ? "Complete your profile and bank verification to start claiming jobs on RepairAI Pro."
    : "Post your first job and get matched with a verified contractor in minutes.";
  const ctaHref = isContractor
    ? `${APP_URL}/contractor-profile`
    : `${APP_URL}/jobs/new`;
  const ctaLabel = isContractor ? "Set Up Profile" : "Post Your First Job";

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Welcome to RepairAI Pro, ${name}! 🎉</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
      ${bodyText}
    </p>
    ${directBtn(ctaHref, ctaLabel)}
    <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;text-align:center;">
      If you have any questions, reply to this email — we&rsquo;re happy to help.
    </p>
  `;
  await sendEmailDirect({
    to,
    subject: "Welcome to RepairAI Pro 🎉",
    html: directLayout(content),
  });
}
