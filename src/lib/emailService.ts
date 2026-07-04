/**
 * Email service wrapper for Resend.
 * Handles all transactional emails for the platform.
 * Set RESEND_API_KEY and RESEND_FROM in .env.local to enable.
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = from || process.env.RESEND_FROM || 'noreply@repairaipro.com';

  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured — skipping email send');
    return false;
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return false;
    }

    console.log(`✓ Email sent to ${to} (${subject})`);
    return true;
  } catch (err) {
    console.error('Email send failed:', err);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
  const { passwordResetEmail } = await import('./emailTemplates');
  return sendEmail({
    to: email,
    subject: 'Reset your RepairAI Pro password',
    html: passwordResetEmail(resetLink),
  });
}

export async function sendContactFormConfirmation(
  name: string,
  email: string
): Promise<boolean> {
  const { contactFormConfirmationEmail } = await import('./emailTemplates');
  return sendEmail({
    to: email,
    subject: 'We received your message — RepairAI Pro',
    html: contactFormConfirmationEmail(name, email),
  });
}

export async function sendJobAcceptedEmail(
  homeownerEmail: string,
  homeownerName: string,
  contractorName: string,
  jobTitle: string,
  price: number
): Promise<boolean> {
  const { jobAcceptedEmail } = await import('./emailTemplates');
  return sendEmail({
    to: homeownerEmail,
    subject: `${contractorName} accepted your job!`,
    html: jobAcceptedEmail(homeownerName, contractorName, jobTitle, price),
  });
}

export async function sendWeeklyDigestEmail(
  contractorEmail: string,
  contractorName: string,
  jobsCount: number,
  earnings: number
): Promise<boolean> {
  const { weeklyDigestEmail } = await import('./emailTemplates');
  return sendEmail({
    to: contractorEmail,
    subject: `Your weekly summary — ${jobsCount} jobs, $${earnings}`,
    html: weeklyDigestEmail(contractorName, jobsCount, earnings),
  });
}
