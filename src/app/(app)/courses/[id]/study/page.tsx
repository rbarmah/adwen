'use client';

import { useParams, useRouter } from 'next/navigation';

const STUDY_MODES = [
  {
    id: 'cards',
    icon: '📚',
    label: 'Study Cards',
    description: 'Flip cards with active recall. Rate each card — Know it, Shaky, or No idea.',
    accent: 'var(--cobalt)',
    accentSoft: 'var(--cobalt-soft)',
    status: 'active' as const,
    route: '/study/cards',
    badge: null,
  },
  {
    id: 'chat',
    icon: '💬',
    label: 'Chat with Adwen',
    description: 'Ask anything about your course material. Every answer is grounded in your uploaded notes.',
    accent: 'var(--navy)',
    accentSoft: '#E8EAF6',
    status: 'active' as const,
    route: '/study/chat',
    badge: null,
  },
  {
    id: 'teach',
    icon: '🎤',
    label: 'Teach It Back',
    description: "Explain a topic to Adwen in your own words. Get a Feynman Score + honest critique.",
    accent: 'var(--magenta)',
    accentSoft: '#FCEEF5',
    status: 'active' as const,
    route: '/study/teach',
    badge: 'NEW',
  },

  {
    id: 'visual',
    icon: '🎨',
    label: 'Visual Notes',
    description: 'AI-generated diagrams — flowcharts, mind maps, timelines, and process diagrams for every topic.',
    accent: 'var(--green)',
    accentSoft: 'var(--green-soft)',
    status: 'active' as const,
    route: '/study/visual',
    badge: 'NEW',
  },
];

export default function StudyRoom() {
  const params   = useParams();
  const router   = useRouter();
  const courseId = params.id as string;

  return (
    <div className="animate-fade-in">
      {/* ─── Header ─────────────────────────────────────── */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'var(--lime)', border: '2px solid var(--ink)', borderRadius: 'var(--pill)',
          padding: '4px 14px', fontFamily: 'var(--font-mono)', fontSize: '10px',
          fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          boxShadow: '0 2px 0 var(--ink)', marginBottom: '16px',
        }}>
          Stage 5
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-5xl)',
          textTransform: 'uppercase', lineHeight: 1.05, margin: '0 0 12px',
          letterSpacing: '0.01em',
        }}>
          STUDY{' '}
          <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--cobalt)', fontSize: '1.1em' }}>
            room
          </span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 'var(--text-base)', maxWidth: '480px', lineHeight: 1.7, fontWeight: 500 }}>
          Four ways to study. Pick your mode. Each is a different room built around how students actually learn.
        </p>
      </div>

      {/* ─── Mode grid ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
        {STUDY_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              if (!m.route) return;
              router.push(`/courses/${courseId}${m.route}`);
            }}
            style={{
              padding: '24px',
              borderRadius: 'var(--r)',
              border: '2px solid var(--ink)',
              borderTop: `5px solid ${m.accent}`,
              background: 'var(--paper-2)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
              position: 'relative',
              fontFamily: 'var(--font-body)',
              boxShadow: 'var(--shadow)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-hard-lg)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'none';
              (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)';
            }}
          >
            {/* Badge */}
            {m.badge && (
              <div style={{
                position: 'absolute', top: '12px', right: '12px',
                fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700,
                letterSpacing: '0.08em',
                background: 'var(--lime)',
                border: `2px solid var(--ink)`,
                color: 'var(--ink)',
                padding: '2px 8px', borderRadius: '6px',
                boxShadow: '0 2px 0 var(--ink)',
              }}>
                {m.badge}
              </div>
            )}

            {/* Icon in accent bg */}
            <div style={{
              width: '52px', height: '52px', borderRadius: '12px',
              background: m.accentSoft, border: '2px solid var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem', marginBottom: '16px',
            }}>
              {m.icon}
            </div>

            {/* Title */}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--ink)', marginBottom: '8px', lineHeight: 1.1 }}>
              {m.label}
            </div>

            {/* Description */}
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.65, margin: '0 0 20px', fontWeight: 500 }}>
              {m.description}
            </p>

            {/* CTA */}
            {m.status === 'active' && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: m.accentSoft, border: `2px solid var(--ink)`,
                borderRadius: 'var(--pill)', padding: '6px 14px',
                fontSize: '12px', fontWeight: 800, color: 'var(--ink)',
                boxShadow: '0 2px 0 var(--ink)',
              }}>
                Enter room →
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
