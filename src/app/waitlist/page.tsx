'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Sparkle } from '@/components/ui/Badge';
import Icon from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // Check if already on waitlist
      const { data: existing } = await (supabase
        .from('waitlist')
        .select('status')
        .eq('email', email.toLowerCase().trim())
        .single() as any);

      if (existing) {
        if (existing.status === 'approved') {
          setError('You\'re already approved! Go ahead and sign up.');
          setLoading(false);
          return;
        }
        if (existing.status === 'pending') {
          setSubmitted(true);
          setLoading(false);
          return;
        }
      }

      // Insert into waitlist
      const { error: insertError } = await (supabase
        .from('waitlist')
        .insert({ email: email.toLowerCase().trim() }) as any);

      if (insertError) {
        if (insertError.code === '23505') {
          // Unique constraint — already on waitlist
          setSubmitted(true);
        } else {
          setError('Something went wrong. Please try again.');
          console.error(insertError);
        }
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--lime)',
        padding: '32px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          animation: 'fadeIn var(--transition-smooth) ease-out forwards',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#fff', border: '2px solid var(--ink)',
              display: 'grid', placeItems: 'center',
              boxShadow: '0 2px 0 var(--ink)',
            }}>
              <Icon name="bulb" size={18} color="var(--ink)" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--ink)', lineHeight: 1 }}>Adwen</span>
          </Link>
        </div>

        {/* Card */}
        <div
          style={{
            background: '#fff',
            border: '2px solid var(--ink)',
            borderRadius: 'var(--r)',
            padding: '36px 28px',
            boxShadow: '0 6px 0 var(--ink)',
          }}
        >
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🎉</div>
              <h1 style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)',
                textTransform: 'uppercase', marginBottom: '12px', color: 'var(--ink)',
              }}>
                You're on the list!
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', lineHeight: 1.7, marginBottom: '24px', maxWidth: '340px', margin: '0 auto 24px' }}>
                We'll send you an email at <strong>{email}</strong> as soon as your spot is ready.
                This usually takes less than 24 hours.
              </p>
              <div style={{
                padding: '14px 20px',
                background: 'var(--surface)',
                border: '2px solid var(--line)',
                borderRadius: 'var(--r-sm)',
                fontSize: 'var(--text-xs)',
                color: 'var(--muted)',
                lineHeight: 1.6,
              }}>
                💡 <strong>Already approved?</strong>{' '}
                <Link href="/signup" style={{ color: 'var(--cobalt)', fontWeight: 700 }}>Sign up here</Link>
              </div>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <h1 style={{
                  fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)',
                  textTransform: 'uppercase', marginBottom: '8px', color: 'var(--ink)',
                  lineHeight: 1.1,
                }}>
                  JOIN THE{' '}
                  <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--cobalt)', fontSize: '1.1em' }}>
                    Waitlist
                  </span>
                </h1>
                <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                  Adwen is currently in early access. Drop your email and we'll let you in as soon as a spot opens.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input
                  label="Email address"
                  type="email"
                  placeholder="your.email@university.edu.gh"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  id="waitlist-email"
                />

                {error && (
                  <p style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)', margin: 0 }}>
                    {error}{' '}
                    {error.includes('approved') && (
                      <Link href="/signup" style={{ color: 'var(--cobalt)', fontWeight: 700 }}>→ Sign up</Link>
                    )}
                  </p>
                )}

                <Button type="submit" loading={loading} style={{ width: '100%' }} size="lg">
                  Join the waitlist
                </Button>
              </form>

              {/* Stats strip */}
              <div style={{
                display: 'flex', justifyContent: 'center', gap: '24px',
                marginTop: '24px', paddingTop: '20px',
                borderTop: '2px solid var(--line)',
              }}>
                {[
                  { label: 'EARLY ACCESS', value: 'Limited' },
                  { label: 'RESPONSE', value: '< 24hrs' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--cobalt)' }}>{s.value}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bottom link */}
        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--ink)', fontSize: 'var(--text-sm)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--cobalt)', fontWeight: 700 }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
