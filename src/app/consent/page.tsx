'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Sparkle } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';

export default function ConsentPage() {
  const router = useRouter();
  const [consentMeasure, setConsentMeasure] = useState(false);
  const [consentData, setConsentData] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Save consent choices + username to the profiles table
        const usernameFromMeta = user.user_metadata?.username || null;
        await (supabase.from('profiles') as any).upsert({
          id: user.id,
          consent_measure: consentMeasure,
          consent_data: consentData,
          is_minor: isMinor,
          ...(usernameFromMeta ? { username: usernameFromMeta } : {}),
        }, { onConflict: 'id' });
      }
      router.push('/onboarding');
    } catch (err) {
      console.error('Failed to save consent:', err);
      router.push('/onboarding');
    } finally {
      setSaving(false);
    }
  };

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
          maxWidth: '560px',
          animation: 'fadeIn var(--transition-smooth) ease-out forwards',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Sparkle color="var(--magenta)" size={28} />
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-2xl)',
              textTransform: 'uppercase',
              marginTop: '12px',
            }}
          >
            BEFORE WE BEGIN
          </h1>
          <p style={{ marginTop: '8px', color: 'var(--muted)', fontSize: 'var(--text-sm)', maxWidth: '420px', margin: '8px auto 0' }}>
            We want to be transparent about what Adwen measures and how your data is handled.
            In accordance with Ghana&apos;s Data Protection Act, 2012 (Act 843).
          </p>
        </div>

        <Card variant="default" padding="lg" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '20px' }}>
            What we measure and why
          </h2>

          <div
            style={{
              background: 'var(--surface-3)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-5)',
              marginBottom: '24px',
              fontSize: 'var(--text-sm)',
              lineHeight: 1.7,
            }}
          >
            <p style={{ marginBottom: '12px' }}>
              <strong>We measure how best to help you learn this material</strong> — not who you are.
              Adwen tracks things like how you respond to quiz questions, how long concepts take you,
              and which topics need more practice.
            </p>
            <p style={{ marginBottom: '12px' }}>
              These measurements are <strong>malleable and course-specific</strong>. They change as you
              learn. They are <strong>not</strong> IQ tests or intelligence measures — they estimate
              your current strengths in specific areas so we can help you grow.
            </p>
            <p>
              You can decline any cognitive assessment and still use the app — you&apos;ll just get
              wider confidence ranges (which will tighten as you practice).
            </p>
          </div>

          {/* Consent checkboxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                cursor: 'pointer',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                border: `2px solid ${consentMeasure ? 'var(--cobalt)' : 'var(--line)'}`,
                background: consentMeasure ? 'rgba(42,59,201,0.04)' : 'transparent',
                transition: 'all var(--transition-fast)',
              }}
            >
              <input
                type="checkbox"
                checked={consentMeasure}
                onChange={(e) => setConsentMeasure(e.target.checked)}
                style={{ marginTop: '2px', width: '20px', height: '20px', accentColor: 'var(--cobalt)' }}
                id="consent-measure"
              />
              <div>
                <strong style={{ fontSize: 'var(--text-sm)' }}>
                  I consent to diagnostic measurement
                </strong>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginTop: '4px' }}>
                  Adwen will run short cognitive baseline assessments (Working Memory, Processing Speed,
                  Attention) to personalize your learning path. These can be skipped.
                </p>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                cursor: 'pointer',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                border: `2px solid ${consentData ? 'var(--cobalt)' : 'var(--line)'}`,
                background: consentData ? 'rgba(42,59,201,0.04)' : 'transparent',
                transition: 'all var(--transition-fast)',
              }}
            >
              <input
                type="checkbox"
                checked={consentData}
                onChange={(e) => setConsentData(e.target.checked)}
                style={{ marginTop: '2px', width: '20px', height: '20px', accentColor: 'var(--cobalt)' }}
                id="consent-data"
              />
              <div>
                <strong style={{ fontSize: 'var(--text-sm)' }}>
                  I consent to data storage and processing
                </strong>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginTop: '4px' }}>
                  Your study data (quiz responses, progress, and mastery states) will be stored and processed to improve your experience.
                  You can request access to or deletion of your data at any time (Act 843 rights).
                </p>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                cursor: 'pointer',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                border: `2px solid ${isMinor ? 'var(--tangerine)' : 'var(--line)'}`,
                background: isMinor ? 'rgba(245,130,31,0.04)' : 'transparent',
                transition: 'all var(--transition-fast)',
              }}
            >
              <input
                type="checkbox"
                checked={isMinor}
                onChange={(e) => setIsMinor(e.target.checked)}
                style={{ marginTop: '2px', width: '20px', height: '20px', accentColor: 'var(--tangerine)' }}
                id="consent-minor"
              />
              <div>
                <strong style={{ fontSize: 'var(--text-sm)' }}>
                  I am under 18 years old
                </strong>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginTop: '4px' }}>
                  If selected, we apply stricter data minimisation defaults and may require guardian consent for some features.
                </p>
              </div>
            </label>
          </div>
        </Card>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/signup" style={{ flex: 1 }}>
            <Button variant="ghost" style={{ width: '100%' }}>
              Back
            </Button>
          </Link>
          <Button
            onClick={handleContinue}
            disabled={!consentData || saving}
            size="lg"
            style={{ flex: 2 }}
          >
            {saving ? 'Saving…' : consentMeasure ? 'Continue to profile →' : 'Continue (limited mode) →'}
          </Button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: 'var(--text-xs)', color: 'var(--muted-light)' }}>
          You can change these settings at any time from your profile.
        </p>
      </div>
    </div>
  );
}
