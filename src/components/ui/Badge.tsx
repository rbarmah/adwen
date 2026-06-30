'use client';

import React from 'react';

type BadgeVariant = 'cobalt' | 'tangerine' | 'magenta' | 'green' | 'muted' | 'danger';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  cobalt: { background: 'var(--cobalt-soft)', color: 'var(--cobalt-ink)', border: '1.5px solid var(--ink)' },
  tangerine: { background: '#FCE6D2', color: '#9A4F12', border: '1.5px solid var(--ink)' },
  magenta: { background: '#FBDCEC', color: '#A8246B', border: '1.5px solid var(--ink)' },
  green: { background: 'var(--green-soft)', color: '#1f6b45', border: '1.5px solid var(--ink)' },
  muted: { background: '#EFEEE6', color: 'var(--muted)', border: '1.5px solid var(--ink)' },
  danger: { background: '#FBDCEC', color: '#8C1F5A', border: '1.5px solid var(--ink)' },
};

export default function Badge({ children, variant = 'cobalt', size = 'sm', style }: BadgeProps) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: size === 'sm' ? '3px 10px' : '5px 14px',
      borderRadius: 'var(--pill)',
      fontSize: size === 'sm' ? '10.5px' : '12px',
      fontWeight: 700,
      fontFamily: 'var(--font-mono)',
      whiteSpace: 'nowrap',
      ...variantStyles[variant],
      ...style,
    }}>
      {children}
    </span>
  );
}

/** Magenta 4-point sparkle burst SVG — the brand accent marker */
export function Sparkle({ size = 16, color = 'var(--magenta)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M12 0c1.2 6.8 5 10.8 12 12-7 1.2-10.8 5.2-12 12-1.2-6.8-5-10.8-12-12 7-1.2 10.8-5.2 12-12Z"
        fill={color}
      />
    </svg>
  );
}

/** Cognitive-type tag — auto-colored by type key */
export function CogTag({ type }: { type: string }) {
  const cls = `tag tag-${type}`;
  const labels: Record<string, string> = {
    memory: 'memory',
    application: 'application',
    maths: 'maths',
    recall: 'recall',
  };
  return <span className={cls}>{labels[type] || type}</span>;
}

/** Difficulty tag — auto-colored by level */
export function DiffTag({ level }: { level: number }) {
  return <span className={`diff d${level}`}>diff {level}</span>;
}
