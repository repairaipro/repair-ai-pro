/**
 * HTML email templates for transactional emails.
 * Used by Resend or other email providers.
 */

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #1f2937;
  line-height: 1.6;
`;

const buttonStyle = `
  display: inline-block;
  padding: 12px 24px;
  background: #4f46e5;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
`;

export function passwordResetEmail(resetLink: string, userName: string = 'there') {
  return `
    <!DOCTYPE html>
    <html>
      <body style="${baseStyles}">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1>Reset your password</h1>
          <p>Hi ${userName},</p>
          <p>We received a request to reset your RepairAI Pro password. Click the button below to set a new password.</p>
          <p style="margin: 30px 0;">
            <a href="${resetLink}" style="${buttonStyle}">Reset Password</a>
          </p>
          <p style="font-size: 14px; color: #6b7280;">
            This link expires in 1 hour. If you didn't request this, you can ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            RepairAI Pro • <a href="https://repairaipro.com/privacy" style="color: #4f46e5;">Privacy Policy</a> •
            <a href="https://repairaipro.com/unsubscribe?email=${userName}" style="color: #4f46e5;">Unsubscribe</a>
          </p>
        </div>
      </body>
    </html>
  `;
}

export function contactFormConfirmationEmail(name: string, email: string) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="${baseStyles}">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1>We got your message</h1>
          <p>Hi ${name},</p>
          <p>Thanks for reaching out to RepairAI Pro. We've received your message and we'll get back to you as soon as possible.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;">
              <strong>Email:</strong> ${email}
            </p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            Our support team typically responds within 4 hours during business hours (Mon–Fri, 8am–6pm CT).
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            RepairAI Pro • <a href="https://repairaipro.com/privacy" style="color: #4f46e5;">Privacy Policy</a>
          </p>
        </div>
      </body>
    </html>
  `;
}

export function jobAcceptedEmail(homeownerName: string, contractorName: string, jobTitle: string, price: number) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="${baseStyles}">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1>Job matched! 🎉</h1>
          <p>Hi ${homeownerName},</p>
          <p><strong>${contractorName}</strong> has accepted your job for <strong>$${price.toLocaleString()}</strong>.</p>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
            <p style="margin: 0;"><strong style="color: #15803d;">Job:</strong> ${jobTitle}</p>
            <p style="margin: 10px 0 0 0;"><strong style="color: #15803d;">Price:</strong> $${price.toLocaleString()}</p>
          </div>
          <p>They'll be in touch shortly to discuss timing and next steps.</p>
          <p style="margin: 30px 0;">
            <a href="https://repairaipro.com/jobs" style="${buttonStyle}">View Job Details</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            RepairAI Pro • <a href="https://repairaipro.com/privacy" style="color: #4f46e5;">Privacy Policy</a>
          </p>
        </div>
      </body>
    </html>
  `;
}

export function weeklyDigestEmail(userName: string, jobsCount: number, earnings: number) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="${baseStyles}">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1>Your week at a glance 📊</h1>
          <p>Hi ${userName},</p>
          <p>Here's what happened this week on RepairAI Pro:</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0;">
            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #1e40af;">${jobsCount}</p>
              <p style="margin: 5px 0 0 0; color: #1e40af;">Jobs completed</p>
            </div>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e;">
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #15803d;">$${earnings.toLocaleString()}</p>
              <p style="margin: 5px 0 0 0; color: #15803d;">Earnings</p>
            </div>
          </div>
          <p style="margin: 30px 0;">
            <a href="https://repairaipro.com/studio/wrapped" style="${buttonStyle}">See Full Stats</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            <a href="https://repairaipro.com/unsubscribe?email=${userName}&type=digest" style="color: #4f46e5;">Unsubscribe from digests</a>
          </p>
        </div>
      </body>
    </html>
  `;
}
