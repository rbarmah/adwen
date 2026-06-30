import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface)',
        padding: '32px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '6rem', marginBottom: '16px' }}>📭</div>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-4xl)',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}
      >
        404
      </h1>
      <p
        style={{
          color: 'var(--muted)',
          fontSize: 'var(--text-lg)',
          maxWidth: '420px',
          marginBottom: '32px',
          lineHeight: 1.6,
        }}
      >
        This page doesn&apos;t exist — maybe it was moved, or the link is broken.
      </p>
      <Link
        href="/courses"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '13px 22px',
          borderRadius: '999px',
          fontSize: '14px',
          fontWeight: 800,
          border: '2px solid var(--ink)',
          background: 'var(--tangerine)',
          color: 'var(--ink)',
          boxShadow: '0 4px 0 var(--ink)',
          transition: '0.14s',
          textDecoration: 'none',
        }}
      >
        ← Back to courses
      </Link>
    </div>
  );
}
