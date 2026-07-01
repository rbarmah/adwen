'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Sparkle } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!agreedToTerms) {
      setError('You must agree to the Terms and Conditions and Privacy Policy');
      setLoading(false);
      return;
    }

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

      // Check waitlist approval before allowing signup
      const { data: waitlistRow } = await (supabase
        .from('waitlist')
        .select('status')
        .eq('email', email.toLowerCase().trim())
        .single() as any);

      if (!waitlistRow || waitlistRow.status !== 'approved') {
        setError('This email hasn\'t been approved yet. Please join the waitlist first.');
        setLoading(false);
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // If email confirmation is required
      if (data.user && !data.session) {
        setSuccess(true);
        setLoading(false);
        return;
      }

      // If auto-confirmed (dev mode), redirect to consent
      router.push('/consent');
    } catch {
      setError('Something went wrong. Please try again.');
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
            Create your account and start studying smarter.
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
                We sent a confirmation link to <strong>{email}</strong>. 
                Click it to activate your account.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Input
                label="Email"
                type="email"
                placeholder="your.email@st.knust.edu.gh"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                id="signup-email"
              />
              <Input
                label="Password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                id="signup-password"
              />
              <Input
                label="Confirm password"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                id="signup-confirm"
              />
              
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: 'var(--text-sm)', color: 'var(--muted)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  style={{ marginTop: '4px', accentColor: 'var(--magenta)', transform: 'scale(1.2)' }}
                />
                <span style={{ lineHeight: 1.5 }}>
                  I agree to the{' '}
                  <Link href="/terms" target="_blank" style={{ color: 'var(--cobalt)', textDecoration: 'underline' }}>Terms and Conditions</Link>
                  {' '}and{' '}
                  <Link href="/privacy" target="_blank" style={{ color: 'var(--cobalt)', textDecoration: 'underline' }}>Privacy Policy</Link>.
                </span>
              </label>

              {error && (
                <div style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>
                  {error}{' '}
                  {error.includes('waitlist') && (
                    <Link href="/waitlist" style={{ color: 'var(--cobalt)', fontWeight: 700 }}>Join the waitlist →</Link>
                  )}
                </div>
              )}
              <Button type="submit" loading={loading} style={{ width: '100%' }} size="lg">
                Create account
              </Button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--cobalt)', fontWeight: 600 }}>
            Log in
          </Link>
          {' · '}
          <Link href="/waitlist" style={{ color: 'var(--cobalt)', fontWeight: 600 }}>
            Join waitlist
          </Link>
        </p>
      </div>
    </div>
  );
}
