'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkle } from '@/components/ui/Badge';

export default function PrivacyPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface)',
        padding: '32px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          animation: 'fadeIn var(--transition-smooth) ease-out forwards',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png" alt="Adwen" style={{ height: '56px', width: 'auto' }} />
          </Link>
        </div>

        <div
          style={{
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-card)',
            padding: 'var(--space-8)',
            boxShadow: 'var(--shadow-elevated)',
          }}
        >
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: '24px' }}>
            Privacy Policy
          </h1>

          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <p><strong style={{ color: 'var(--ink)' }}>Effective Date:</strong> June 2025</p>

            <section>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>1. What We Collect</h2>
              <p>When you use Adwen, we collect the following data to personalise your learning experience:</p>
              <ul style={{ paddingLeft: '20px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong style={{ color: 'var(--ink)' }}>Account Information:</strong> Your email address and encrypted password.</li>
                <li><strong style={{ color: 'var(--ink)' }}>Academic Profile:</strong> Your programme, level, CWA/GPA, and WASSCE grades (provided voluntarily during onboarding).</li>
                <li><strong style={{ color: 'var(--ink)' }}>Learning Telemetry:</strong> Your quiz responses, response times, accuracy rates, confidence levels, and session patterns.</li>
                <li><strong style={{ color: 'var(--ink)' }}>Cognitive Constructs:</strong> Derived metrics such as working memory capacity, processing speed, and self-regulation scores, calculated from your interaction patterns.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>2. How We Use Your Data</h2>
              <p>Your data is used exclusively to:</p>
              <ul style={{ paddingLeft: '20px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Generate personalised adaptive quiz questions tailored to your learning gaps.</li>
                <li>Predict your exam readiness and provide study recommendations.</li>
                <li>Produce AI-driven behavioural insights about your study patterns.</li>
                <li>Improve the platform&apos;s algorithms and user experience.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>3. Data Storage and Security</h2>
              <p>Your data is stored securely using Supabase (powered by PostgreSQL) with row-level security policies. Passwords are hashed and never stored in plain text. We use HTTPS encryption for all data in transit.</p>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>4. AI Processing</h2>
              <p>Some of your data is processed by third-party AI services (OpenAI) to generate quiz questions and personalised insights. We send only anonymised learning metrics — never your name, email, or personally identifiable information — to these services.</p>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>5. Data Sharing</h2>
              <p>We do not sell, rent, or share your personal data with any third parties for marketing purposes. Your data may only be shared with:</p>
              <ul style={{ paddingLeft: '20px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>AI service providers (anonymised data only, for question generation).</li>
                <li>Law enforcement, if required by law.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul style={{ paddingLeft: '20px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Access a copy of your stored data at any time.</li>
                <li>Request correction of inaccurate data.</li>
                <li>Request deletion of your account and all associated data.</li>
                <li>Withdraw consent for data collection (which may limit platform functionality).</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>7. Cookies</h2>
              <p>Adwen uses essential cookies for authentication and session management. We do not use tracking or advertising cookies.</p>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>8. Changes to This Policy</h2>
              <p>We may update this privacy policy from time to time. We will notify you of significant changes via email or an in-app notification.</p>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>9. Contact</h2>
              <p>If you have questions about your privacy or wish to exercise your rights, contact us at <strong style={{ color: 'var(--ink)' }}>privacy@adwen.study</strong>.</p>
            </section>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
          <Link href="/signup" style={{ color: 'var(--cobalt)', fontWeight: 600 }}>
            ← Back to Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
