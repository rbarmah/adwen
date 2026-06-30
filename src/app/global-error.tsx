'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          textAlign: 'center',
          fontFamily: '-apple-system, sans-serif',
          background: '#FBFBF7',
          color: '#0E0E0E',
        }}
      >
        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔧</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '12px' }}>
          Critical Error
        </h2>
        <p style={{ color: '#5C5C57', maxWidth: '420px', marginBottom: '24px' }}>
          Something went seriously wrong. Please try refreshing the page.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '13px 22px',
            borderRadius: '999px',
            fontSize: '14px',
            fontWeight: 800,
            border: '2px solid #0E0E0E',
            background: '#2A3BC9',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </body>
    </html>
  );
}
