'use client';

import React from 'react';
import katex from 'katex';

// Load mhchem extension for chemical equations (\ce{...})
import 'katex/contrib/mhchem';

/**
 * MathText — renders LaTeX math expressions inline.
 *
 * Supports:
 *   - Display math:  $$...$$
 *   - Inline math:   $...$
 *   - Chemical eqns: \ce{H2SO4} (via mhchem)
 *
 * Non-math text is passed through as-is.
 * Malformed LaTeX gracefully falls back to the raw string.
 */
export default function MathText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;

  // Split on display math ($$...$$) first, then inline math ($...$)
  // Use a regex that captures the delimiters so we can distinguish segments
  const segments = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        // Display math block: $$...$$
        if (seg.startsWith('$$') && seg.endsWith('$$')) {
          const latex = seg.slice(2, -2).trim();
          try {
            const html = katex.renderToString(latex, {
              displayMode: true,
              throwOnError: false,
              trust: true,
            });
            return (
              <span
                key={i}
                dangerouslySetInnerHTML={{ __html: html }}
                style={{ display: 'block', margin: '12px 0', overflowX: 'auto' }}
              />
            );
          } catch {
            return <code key={i} style={{ color: 'var(--tangerine)' }}>{seg}</code>;
          }
        }

        // Inline math: $...$
        if (seg.startsWith('$') && seg.endsWith('$') && seg.length > 2) {
          const latex = seg.slice(1, -1).trim();
          try {
            const html = katex.renderToString(latex, {
              displayMode: false,
              throwOnError: false,
              trust: true,
            });
            return (
              <span
                key={i}
                dangerouslySetInnerHTML={{ __html: html }}
                style={{ display: 'inline' }}
              />
            );
          } catch {
            return <code key={i} style={{ color: 'var(--tangerine)' }}>{seg}</code>;
          }
        }

        // Regular text — pass through
        if (!seg) return null;
        return <span key={i}>{seg}</span>;
      })}
    </span>
  );
}
