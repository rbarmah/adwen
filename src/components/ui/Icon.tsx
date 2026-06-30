'use client';

import React from 'react';

/** Adwen SVG icon set — replaces all emoji. Inline SVG, 24x24 viewBox. */
const icons: Record<string, (p: { color?: string }) => React.ReactNode> = {
  // Brand
  bulb: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
      <path d="M12 3C7 3 4 6.5 4 11c0 3 1.7 5.3 4 6.5V21h8v-3.5c2.3-1.2 4-3.5 4-6.5 0-4.5-3-8-8-8Z" stroke={color} strokeWidth="1.6"/>
      <path d="M9 11c.8-1.2 4.2-1.2 5 0M9.5 15h5" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  // Navigation / stages
  profile: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2"/>
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  book: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <path d="M4 4h16v16H4z" stroke={color} strokeWidth="2"/>
      <path d="M4 4l8 4 8-4M12 8v12" stroke={color} strokeWidth="2"/>
    </svg>
  ),
  scan: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 12h10" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  target: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2"/>
      <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="2"/>
      <circle cx="12" cy="12" r="1" fill={color}/>
    </svg>
  ),
  brain: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <path d="M12 4a7 7 0 0 0-7 7c0 3 1.5 5 4 6v3h6v-3c2.5-1 4-3 4-6a7 7 0 0 0-7-7Z" stroke={color} strokeWidth="2"/>
      <path d="M9 14h6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  quiz: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth="2"/>
    </svg>
  ),
  chart: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <path d="M4 20h16M8 16V8M12 16V4M16 16v-4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  loop: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <path d="M17 2l4 4-4 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 11V9a4 4 0 0 1 4-4h14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 22l-4-4 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 13v2a4 4 0 0 1-4 4H3" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  // Stat icons
  clock: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2"/>
      <path d="M12 7v5l3 3" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  zap: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
  upload: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <path d="M12 16V4m0 0L8 8m4-4 4 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  settings: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2"/>
      <path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8l2.8-2.8M17 7l2.8-2.8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  info: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2"/>
      <path d="M12 16v-5m0-3h.01" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  alert: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <path d="M12 2L2 20h20L12 2Z" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M12 10v4m0 3h.01" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  check: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <path d="M5 13l4 4L19 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  x: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <path d="M6 6l12 12M6 18L18 6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  plus: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  chevronLeft: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <path d="M15 4l-8 8 8 8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  chevronRight: ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <path d="M9 4l8 8-8 8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

interface IconProps {
  name: keyof typeof icons;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

export default function Icon({ name, size = 16, color = 'currentColor', style }: IconProps) {
  const render = icons[name];
  if (!render) return null;
  return (
    <span style={{ display: 'inline-flex', width: size, height: size, flexShrink: 0, ...style }}>
      {render({ color })}
    </span>
  );
}
