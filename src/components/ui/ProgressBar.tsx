'use client';

import React from 'react';

/** Standard progress bar (ink border, pill shape) */
interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  color?: string;
  height?: number;
}

export default function ProgressBar({ value, max = 100, label, color = 'var(--tangerine)', height = 8 }: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: 5 }}>
          <span>{label}</span>
          <span className="mono" style={{ fontSize: '11px' }}>{Math.round(pct)}%</span>
        </div>
      )}
      <div style={{
        height, borderRadius: 'var(--pill)',
        background: '#fff', border: '1.5px solid var(--ink)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color,
          borderRadius: 'var(--pill)',
          transition: 'width 0.9s cubic-bezier(.2,.7,.2,1)',
        }} />
      </div>
    </div>
  );
}

/** Readiness gauge — dark track, honey→lime band, white range ticks, white point marker */
interface ReadinessGaugeProps {
  point: number;
  ciLow: number;
  ciHigh: number;
  label?: string;
  confidenceLabel?: string;
}

export function ReadinessGauge({ point, ciLow, ciHigh, label, confidenceLabel }: ReadinessGaugeProps) {
  return (
    <div>
      {/* Range readout */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 4 }}>
        <span className="mono" style={{ fontSize: 44, fontWeight: 700, lineHeight: 1, color: 'var(--lime)' }}>
          {ciLow}–{ciHigh}
        </span>
        <span className="mono" style={{ fontSize: 17, color: 'var(--muted-ink)' }}>%</span>
      </div>
      {label && (
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--lime)', letterSpacing: '.05em', marginBottom: 16, opacity: .85 }}>
          {confidenceLabel || label}
        </div>
      )}
      {/* Track */}
      <div className="track">
        <div className="track-scale">
          {Array.from({ length: 10 }, (_, i) => <span key={i} />)}
        </div>
        <div className="band" style={{ left: `${ciLow}%`, width: `${ciHigh - ciLow}%` }} />
        <div className="point" style={{ left: `${point}%` }} />
      </div>
      <div className="track-axis">
        <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
      </div>
    </div>
  );
}

/** Confidence bar for profile constructs — white card context */
interface ConfidenceBandProps {
  point: number;
  ciLow: number;
  ciHigh: number;
  label: string;
  confidenceLabel?: string;
  color?: string;
  measured?: boolean;
}

export function ConfidenceBand({ point, ciLow, ciHigh, label, confidenceLabel, color = 'var(--cobalt)', measured = true }: ConfidenceBandProps) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
        <span className="mono" style={{ fontSize: 11, color: measured ? 'var(--ink)' : 'var(--muted)' }}>
          {ciLow}–{ciHigh}% {confidenceLabel && `· ${confidenceLabel}`}
        </span>
      </div>
      <div style={{
        position: 'relative', height: 10, borderRadius: 'var(--pill)',
        background: '#EFEEE6', border: '1.5px solid var(--ink)', overflow: 'visible',
      }}>
        {/* Band */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${ciLow}%`, width: `${ciHigh - ciLow}%`,
          background: color, opacity: measured ? 0.3 : 0.12,
          borderRadius: 'var(--pill)',
          transition: 'all 0.9s cubic-bezier(.2,.7,.2,1)',
        }} />
        {/* Point */}
        <div style={{
          position: 'absolute', top: '50%', left: `${point}%`,
          transform: 'translate(-50%, -50%)',
          width: 10, height: 10, borderRadius: '50%',
          background: color, border: '2px solid #fff',
          transition: 'left 0.9s cubic-bezier(.2,.7,.2,1)',
        }} />
      </div>
    </div>
  );
}
