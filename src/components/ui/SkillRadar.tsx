'use client';

import React from 'react';

/** Radar chart — lime strokes on navy. Pure SVG, no library. */
interface SkillRadarProps {
  skills: { name: string; value: number }[];
  size?: number;
}

export default function SkillRadar({ skills, size = 220 }: SkillRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 30;
  const n = skills.length;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (i: number, v: number) => {
    const angle = angleStep * i - Math.PI / 2;
    const dist = (v / 100) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  // Grid circles
  const gridCircles = [0.25, 0.5, 0.75, 1].map((scale) => (
    <circle key={scale} cx={cx} cy={cy} r={r * scale}
      stroke="rgba(255,255,255,.12)" strokeWidth="1" fill="none" />
  ));

  // Axis lines
  const axes = skills.map((_, i) => {
    const p = getPoint(i, 100);
    return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,.12)" strokeWidth="1" />;
  });

  // Data polygon
  const points = skills.map((s, i) => getPoint(i, s.value));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Labels
  const labels = skills.map((s, i) => {
    const p = getPoint(i, 120);
    return (
      <text key={i} x={p.x} y={p.y}
        textAnchor="middle" dominantBaseline="middle"
        fill="#A8ACE0" fontSize="10" fontFamily="'Space Mono', monospace"
        letterSpacing="0.08em" style={{ textTransform: 'uppercase' }}>
        {s.name}
      </text>
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridCircles}
      {axes}
      <path d={pathD} fill="rgba(212,237,42,.15)" stroke="var(--lime)" strokeWidth="2" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--lime)" stroke="var(--navy)" strokeWidth="2" />
      ))}
      {labels}
    </svg>
  );
}
