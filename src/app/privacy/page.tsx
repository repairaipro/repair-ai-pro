import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'RepairAI Pro privacy policy — how we collect, use, and protect your data.',
};

const LAST_UPDATED = 'June 1, 2026';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Privacy Policy</h1>
        <p className="text-sm mb-10" style={{ color: 'var(--color-text-4)' }}>Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: 'var(--color-text-3)' }}>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>1. Information We Collect</h2>
            <p className="mb-2">We collect the following categories of personal information:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account info:</strong> Name, email address, phone number, profile photo</li>
              <li><strong>Location data:</strong> City, ZIP code, and (for active jobs) real-time location if you grant permission</li>
              <li><strong>Payment data:</strong> Processed by Stripe — we do not store raw card numbers</li>
              <li><strong>Job content:</strong> Descriptions, photos, AI diagnoses, bids, chat messages, reviews</li>
              <li><strong>Usage data:</strong> Pages visited, features used, funnel events, device/browser info</li>
              <li><strong>Social content:</strong> Work posts, likes, comments, follows you make on the Platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Operate the marketplace — match homeowners with contractors</li>
              <li>Process payments and disburse contractor earnings</li>
              <li>Send transactional notifications (email, SMS, push) about your jobs</li>
              <li>Improve AI models for diagnosis, pricing, and matching</li>
              <li>Display your contractor profile and work feed publicly</li>
              <li>Analyze platform usage to improve features and fix bugs</li>
              <li>Comply with legal obligations and enforce our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>3. How We Share Your Information</h2>
            <p className="mb-2">We share information with:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Other users:</strong> Your name, trade, location (city level), rating, and work posts are visible to other users per your privacy settings</li>
              <li><strong>Service providers:</strong> Firebase (database/auth), Stripe (payments), Resend (email), Twilio (SMS), OpenAI (AI features), Cloudinary (media storage)</li>
              <li><strong>Law enforcement:</strong> When required by law or to protect safety</li>
              <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
            <p className="mt-2">We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>4. Location Privacy</h2>
            <p>When you post a job, you control your location privacy mode: Full address (visible to matched contractors), City only, or ZIP code only. Real-time contractor location tracking only occurs during active jobs with your consent.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>5. Data Retention</h2>
            <p>We retain your data for as long as your account is active. Job records and payment data are retained for 7 years for tax and legal compliance. You may request deletion of non-financial data at any time.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>6. Your Rights</h2>
            <p className="mb-2">Depending on your location, you may have rights to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data (subject to legal retention requirements)</li>
              <li>Opt out of marketing communications</li>
              <li>Data portability (California residents under CCPA)</li>
            </ul>
            <p className="mt-2">To exercise these rights, <Link href="/contact" style={{ color: 'var(--color-brand)' }}>contact us</Link>.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>7. Cookies and Tracking</h2>
            <p>We use essential cookies for authentication and session management. We may use analytics cookies to understand platform usage. You can control cookies through your browser settings.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>8. Children's Privacy</h2>
            <p>Our Platform is not intended for users under 18. We do not knowingly collect data from children. If you believe a child has provided us data, contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>9. Security</h2>
            <p>We use industry-standard security measures including encryption in transit (TLS), encrypted storage, and access controls. No system is 100% secure — if you suspect a breach, contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>10. Contact</h2>
            <p>Privacy questions: <Link href="/contact" style={{ color: 'var(--color-brand)' }}>Contact us</Link> or email privacy@repairai.pro.</p>
          </section>

        </div>
      </div>
    </div>
  );
}
