'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '4rem', marginBottom: '16px' }}>⚡</div>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-2xl)',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}
      >
        Something went wrong
      </h2>
      <p
        style={{
          color: 'var(--muted)',
          fontSize: 'var(--text-sm)',
          maxWidth: '420px',
          marginBottom: '24px',
          lineHeight: 1.6,
        }}
      >
        An unexpected error occurred. This has been logged automatically.
      </p>
      <button
        onClick={reset}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '13px 22px',
          borderRadius: '999px',
          fontSize: '14px',
          fontWeight: 800,
          border: '2px solid var(--ink)',
          background: 'var(--cobalt)',
          color: '#fff',
          boxShadow: '0 4px 0 var(--ink)',
          cursor: 'pointer',
          transition: '0.14s',
          fontFamily: 'var(--font-body)',
        }}
      >
        Try again
      </button>
    </div>
  );
}
