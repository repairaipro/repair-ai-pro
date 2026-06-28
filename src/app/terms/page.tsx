import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'RepairAI Pro terms of service — your rights and obligations as a user.',
};

const LAST_UPDATED = 'June 1, 2026';

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Terms of Service</h1>
        <p className="text-sm mb-10" style={{ color: 'var(--color-text-4)' }}>Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: 'var(--color-text-3)' }}>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>1. Acceptance of Terms</h2>
            <p>By accessing or using RepairAI Pro ("Platform", "we", "us"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>2. Description of Service</h2>
            <p>RepairAI Pro is a two-sided marketplace connecting homeowners with independent contractors for home repair services. We use artificial intelligence to assist with job diagnosis, cost estimation, and contractor matching. We are not a contractor and do not perform repair services directly.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>3. User Accounts</h2>
            <p className="mb-2">You must create an account to use most Platform features. You are responsible for maintaining the confidentiality of your account credentials. You agree to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide accurate and complete information when registering</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Not share your credentials with third parties</li>
              <li>Be at least 18 years old to create an account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>4. Contractor Terms</h2>
            <p className="mb-2">Contractors using the Platform acknowledge that they are independent contractors, not employees of RepairAI Pro. You represent and warrant that you:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Hold all required licenses, certifications, and insurance for your trade and jurisdiction</li>
              <li>Will perform all work in a professional and workmanlike manner</li>
              <li>Will not solicit homeowners to transact outside the Platform to circumvent fees</li>
              <li>Authorize RepairAI Pro to collect payment on your behalf and disburse funds minus platform fees</li>
              <li>Accept that RepairAI Pro charges a platform fee (currently 12%) on all completed transactions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>5. Payments and Escrow</h2>
            <p className="mb-2">Payments are processed by Stripe. Homeowner funds are held in escrow and released to contractors upon job confirmation. RepairAI Pro is not responsible for disputes between homeowners and contractors beyond facilitating our dispute resolution process. Refunds are subject to our Refund Policy available at <Link href="/guarantee" style={{ color: 'var(--color-brand)' }}>/guarantee</Link>.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>6. AI-Generated Content</h2>
            <p>Our AI tools provide estimates, diagnoses, and recommendations as informational guidance only. These are not professional advice and may not be accurate. RepairAI Pro makes no warranty regarding the accuracy of AI-generated content. Always consult a licensed professional before making repair decisions.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>7. Prohibited Conduct</h2>
            <p className="mb-2">You may not:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Post false, misleading, or fraudulent content</li>
              <li>Circumvent the Platform to avoid fees</li>
              <li>Harass, threaten, or discriminate against other users</li>
              <li>Use automated tools to scrape or manipulate the Platform</li>
              <li>Post work you did not perform or reviews for services not rendered</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>8. Intellectual Property</h2>
            <p>You retain ownership of content you post. By posting content, you grant RepairAI Pro a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content for Platform purposes including marketing. We own all Platform software, designs, and AI models.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>9. Disclaimer of Warranties</h2>
            <p>THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT WARRANT THAT CONTRACTORS ARE LICENSED, INSURED, OR QUALIFIED. WE DO NOT GUARANTEE JOB QUALITY, TIMELINESS, OR PRICING ACCURACY.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>10. Limitation of Liability</h2>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, REPAIRAI PRO'S TOTAL LIABILITY SHALL NOT EXCEED THE GREATER OF $100 OR THE AMOUNT PAID TO US IN THE THREE MONTHS PRECEDING THE CLAIM. WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>11. Dispute Resolution</h2>
            <p>Any disputes arising from these Terms shall be resolved by binding arbitration in Harris County, Texas, under AAA rules. You waive the right to a jury trial and class action participation.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>12. Termination</h2>
            <p>We may suspend or terminate your account at any time for violations of these Terms. You may close your account by contacting us at <Link href="/contact" style={{ color: 'var(--color-brand)' }}>support</Link>.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>13. Changes to Terms</h2>
            <p>We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance. Material changes will be communicated via email.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>14. Contact</h2>
            <p>Questions? <Link href="/contact" style={{ color: 'var(--color-brand)' }}>Contact us</Link> or email legal@repairai.pro.</p>
          </section>

        </div>
      </div>
    </div>
  );
}
