'use client';

import React, { useEffect, useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';

// ─── Global render queue — Mermaid uses shared state, so we serialize renders ──
let renderQueue: Promise<void> = Promise.resolve();
let mermaidInstance: any = null;
let initCount = 0;

async function getMermaid() {
  if (!mermaidInstance) {
    const mod = await import('mermaid');
    mermaidInstance = mod.default;
    mermaidInstance.initialize({
      startOnLoad: false,
      suppressErrorRendering: true,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: {
        primaryColor: '#E4E6FB',
        primaryTextColor: '#0E0E0E',
        primaryBorderColor: '#2A3BC9',
        lineColor: '#0E0E0E',
        secondaryColor: '#D4ED2A',
        tertiaryColor: '#FDEBD7',
        fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif',
        fontSize: '13px',
        actorBkg: '#2A3BC9',
        actorTextColor: '#FFFFFF',
        actorBorder: '#0E0E0E',
      },
      flowchart: { curve: 'basis', padding: 16 },
      sequence: { mirrorActors: false, messageAlign: 'center' },
    });
  }
  return mermaidInstance;
}

/** Enqueue a render — ensures only one mermaid.render() runs at a time */
function enqueueRender(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    renderQueue = renderQueue.then(async () => {
      try {
        const mermaid = await getMermaid();
        const id = `mmd-${++initCount}-${Date.now()}`;
        const { svg } = await mermaid.render(id, code.trim());
        resolve(svg);
      } catch (err) {
        reject(err);
      }
      // Small delay between renders to let Mermaid clean up
      await new Promise(r => setTimeout(r, 50));
    });
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MermaidDiagramProps {
  code: string;
  id: string;
  style?: React.CSSProperties;
}

export default function MermaidDiagram({ code, id, style }: MermaidDiagramProps) {
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setSvgHtml(null);
    setError(null);

    enqueueRender(code)
      .then(svg => {
        if (!cancelled) {
          setSvgHtml(svg);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) {
          const msg = err?.message || err?.str || String(err);
          console.error(`[MermaidDiagram] ${id}:`, msg);
          setError(msg);
        }
      });

    return () => { cancelled = true; };
  }, [code, id]);

  if (error) {
    return (
      <div style={{
        background: '#FFF8F0', border: '2px solid var(--tangerine)',
        borderRadius: 'var(--r-sm)', padding: '16px', ...style,
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700,
          color: 'var(--tangerine)', textTransform: 'uppercase', letterSpacing: '0.08em',
          marginBottom: '8px',
        }}>
          ⚠️ Diagram render issue
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--magenta)',
          marginBottom: '10px', padding: '6px 10px', background: '#FFF0EE',
          borderRadius: '6px', maxHeight: '60px', overflow: 'auto',
        }}>
          {error}
        </div>
        <pre style={{
          fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.6,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          color: 'var(--ink)', margin: 0, maxHeight: '300px', overflow: 'auto',
        }}>
          {code}
        </pre>
      </div>
    );
  }

  if (svgHtml) {
    return (
      <div
        className="mermaid-wrapper"
        style={{ overflow: 'auto', WebkitOverflowScrolling: 'touch', ...style }}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(svgHtml, { USE_PROFILES: { svg: true, svgFilters: true } }) }}
      />
    );
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '180px', ...style,
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
        color: 'var(--muted)',
      }}>
        <div style={{
          width: '24px', height: '24px', border: '3px solid var(--cobalt)',
          borderTopColor: 'transparent', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>Rendering…</span>
      </div>
    </div>
  );
}
