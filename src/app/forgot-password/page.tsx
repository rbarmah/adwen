'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Sparkle } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (authError) {
        setError(authError.message);
      } else {
        setSuccess(true);
      }
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
        background: 'var(--surface)',
        padding: '32px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          animation: 'fadeIn var(--transition-smooth) ease-out forwards',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Sparkle color="var(--magenta)" size={28} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase', color: 'var(--ink)' }}>ADWEN</span>
          </Link>
          <p style={{ marginTop: '12px', color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
            Reset your password securely.
          </p>
        </div>

        <div
          style={{
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-card)',
            padding: 'var(--space-8)',
            boxShadow: 'var(--shadow-elevated)',
          }}
        >
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📧</div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '8px' }}>
                Check your email
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                We sent a password reset link to <strong>{email}</strong>. 
                Click it to create a new password.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Input
                label="Email address"
                type="email"
                placeholder="your.email@st.knust.edu.gh"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                id="forgot-email"
                hint="We'll send you a reset link"
              />
              {error && (
                <p style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>{error}</p>
              )}
              <Button type="submit" loading={loading} style={{ width: '100%' }} size="lg">
                Send reset link
              </Button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
          Remembered your password?{' '}
          <Link href="/login" style={{ color: 'var(--cobalt)', fontWeight: 600 }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
