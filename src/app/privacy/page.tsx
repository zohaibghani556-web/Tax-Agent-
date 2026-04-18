import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — TaxAgent.ai',
  description:
    'How TaxAgent.ai collects, uses, and protects your personal information under PIPEDA.',
};

const LAST_UPDATED = 'April 4, 2025';
const CONTACT_EMAIL = 'privacy@taxagent.ai';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pt-28 pb-16">
      <p className="text-sm text-white/40 mb-2">Last updated: {LAST_UPDATED}</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
        Privacy Policy
      </h1>
      <p className="text-white/60 mb-10 leading-relaxed">
        TaxAgent.ai (&quot;<strong>we</strong>&quot;, &quot;<strong>us</strong>&quot;, or &quot;
        <strong>our</strong>&quot;) is committed to protecting your personal
        information. This policy explains what we collect, why we collect it, how
        we protect it, and your rights under Canada&apos;s{' '}
        <em>Personal Information Protection and Electronic Documents Act</em>{' '}
        (PIPEDA).
      </p>

      <Section title="1. Who we are">
        <p>
          TaxAgent.ai is a Canadian software service that helps individuals
          prepare and understand their Canadian income tax returns. We are subject
          to PIPEDA and operate exclusively within Canada.
        </p>
        <p className="mt-3">
          Our Privacy Officer can be reached at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--emerald)] hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section title="2. What personal information we collect">
        <p>We collect only the information needed to provide our service:</p>
        <ul className="mt-3 space-y-2 list-disc list-inside text-white/60">
          <li>
            <strong>Identity &amp; contact:</strong> name, email address, date of
            birth, province of residence.
          </li>
          <li>
            <strong>Tax information:</strong> income figures, deduction amounts,
            slip data (T4, T5, etc.), RRSP contribution room, and other
            CRA-relevant figures you provide or that are extracted from uploaded
            documents.
          </li>
          <li>
            <strong>Account data:</strong> hashed password, account creation
            date, login history.
          </li>
          <li>
            <strong>Usage data:</strong> pages visited, features used, and error
            logs — collected anonymously to improve the service.
          </li>
        </ul>
        <p className="mt-3">
          We do <strong>not</strong> collect your Social Insurance Number (SIN)
          unless you explicitly provide it for slip-matching purposes. If
          provided, it is masked immediately and stored only in encrypted form.
        </p>
      </Section>

      <Section title="3. Why we collect it (purposes)">
        <ul className="space-y-2 list-disc list-inside text-white/60">
          <li>To generate a personalised tax assessment and filing guide.</li>
          <li>To extract data from uploaded tax slips via OCR.</li>
          <li>To authenticate your account and keep it secure.</li>
          <li>To communicate service updates, if you opt in.</li>
          <li>To comply with applicable law.</li>
        </ul>
        <p className="mt-3">
          We will not use your information for any new purpose without first
          obtaining your consent.
        </p>
      </Section>

      <Section title="4. How we protect your information">
        <ul className="space-y-2 list-disc list-inside text-white/60">
          <li>All data is encrypted in transit using TLS 1.3.</li>
          <li>All data is encrypted at rest using AES-256.</li>
          <li>
            Data is stored exclusively on servers located in Canada (via
            Supabase&apos;s Canadian region).
          </li>
          <li>Access to production data is restricted to authorised personnel only.</li>
          <li>
            We conduct regular security reviews and apply software patches
            promptly.
          </li>
        </ul>
      </Section>

      <Section title="5. Who we share your information with">
        <p>
          We do <strong>not</strong> sell, rent, or trade your personal
          information. Period.
        </p>
        <p className="mt-3">
          We share data only with trusted sub-processors needed to run the
          service:
        </p>
        <ul className="mt-3 space-y-2 list-disc list-inside text-white/60">
          <li>
            <strong>Supabase</strong> — database and authentication (Canadian
            data region).
          </li>
          <li>
            <strong>Anthropic</strong> — AI processing for tax assessment chat
            (data sent is limited to tax-relevant fields; no SIN or full name).
          </li>
        </ul>
        <p className="mt-3">
          We may disclose information if required by law or a valid court order,
          and will notify you if legally permitted to do so.
        </p>
      </Section>

      <Section title="6. Cookies and analytics">
        <p>
          We use strictly necessary cookies for session management. We do{' '}
          <strong>not</strong> use third-party advertising cookies or tracking
          pixels. Anonymous usage analytics help us improve the product; these
          do not identify you personally.
        </p>
      </Section>

      <Section title="7. Retention">
        <p>
          We retain your account data for as long as your account is active. If
          you delete your account, all personal data is permanently deleted
          within 30 days, except where retention is required by law.
        </p>
      </Section>

      <Section title="8. Your rights under PIPEDA">
        <p>You have the right to:</p>
        <ul className="mt-3 space-y-2 list-disc list-inside text-white/60">
          <li>
            <strong>Access</strong> the personal information we hold about you.
          </li>
          <li>
            <strong>Correct</strong> inaccurate information.
          </li>
          <li>
            <strong>Withdraw consent</strong> for non-essential processing at any
            time (note: this may limit your ability to use the service).
          </li>
          <li>
            <strong>Delete</strong> your account and all associated data.
          </li>
          <li>
            <strong>Complain</strong> to the Office of the Privacy Commissioner
            of Canada if you believe we have mishandled your information.
          </li>
        </ul>
        <p className="mt-3">
          To exercise any of these rights, email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--emerald)] hover:underline">
            {CONTACT_EMAIL}
          </a>
          . We will respond within 30 days.
        </p>
      </Section>

      <Section title="9. Children">
        <p>
          TaxAgent.ai is not intended for individuals under the age of 18. We do
          not knowingly collect personal information from minors.
        </p>
      </Section>

      <Section title="10. Changes to this policy">
        <p>
          If we make material changes, we will notify you by email or by
          displaying a prominent notice on the site at least 14 days before the
          change takes effect. Continued use after that date constitutes
          acceptance.
        </p>
      </Section>

      <div className="mt-12 pt-8 border-t border-white/10 text-sm text-white/40">
        <p>
          Questions? Contact our Privacy Officer at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--emerald)] hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <p className="mt-2">
          <Link href="/" className="text-[var(--emerald)] hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold text-white mb-3">{title}</h2>
      <div className="text-white/60 leading-relaxed">{children}</div>
    </section>
  );
}
