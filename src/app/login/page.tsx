'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Sparkle } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Successful login — full navigation to bust stale Router Cache
      window.location.href = '/courses';
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
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Sparkle color="var(--magenta)" size={28} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase', color: 'var(--ink)' }}>ADWEN</span>
          </Link>
          <p style={{ marginTop: '12px', color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
            Welcome back. Let&apos;s continue learning.
          </p>
        </div>

        {/* Form card */}
        <div
          style={{
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-card)',
            padding: 'var(--space-8)',
            boxShadow: 'var(--shadow-elevated)',
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Input
              label="Email"
              type="email"
              placeholder="your.email@st.knust.edu.gh"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              id="login-email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              id="login-password"
            />
            <div style={{ textAlign: 'right', marginTop: '-4px', position: 'relative', zIndex: 10 }}>
              <Link href="/forgot-password" style={{ color: 'var(--cobalt)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                Forgot password?
              </Link>
            </div>
            {error && (
              <p style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>{error}</p>
            )}
            <Button type="submit" loading={loading} style={{ width: '100%' }} size="lg">
              Log in
            </Button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--cobalt)', fontWeight: 600 }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
