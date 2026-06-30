'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Sparkle } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  // Supabase sends the user here with a session already set via the URL hash
  useEffect(() => {
    const supabase = createClient();
    // Listen for the PASSWORD_RECOVERY event from the URL token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // Also check if user already has a session (e.g. page refresh)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        // Redirect to app after 2 seconds
        setTimeout(() => {
          window.location.href = '/courses';
        }, 2500);
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
            <img src="/logo.png" alt="Adwen" style={{ height: '56px', width: 'auto' }} />
          </Link>
          <p style={{ marginTop: '12px', color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
            Set your new password below.
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
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '8px' }}>
                Password updated!
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                Your password has been changed successfully. Redirecting you now...
              </p>
            </div>
          ) : !ready ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔗</div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '8px' }}>
                Verifying your link...
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                If this page doesn&apos;t load, your reset link may have expired.{' '}
                <Link href="/forgot-password" style={{ color: 'var(--cobalt)', fontWeight: 600 }}>
                  Request a new one
                </Link>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Input
                label="New password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                id="update-password"
              />
              <Input
                label="Confirm new password"
                type="password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                id="update-confirm"
              />
              {error && (
                <p style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>{error}</p>
              )}
              <Button type="submit" loading={loading} style={{ width: '100%' }} size="lg">
                Update password
              </Button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
          <Link href="/login" style={{ color: 'var(--cobalt)', fontWeight: 600 }}>
            ← Back to Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
