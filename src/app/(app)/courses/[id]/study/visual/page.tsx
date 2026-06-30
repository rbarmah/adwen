'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import MermaidDiagram from '@/components/ui/MermaidDiagram';

// ─── Types ───────────────────────────────────────────────────────────────────
type PStatus = 'idle' | 'fetching' | 'ready';

interface Generation {
  version: number;
  panels_json: any[];
  created_at: string;
}

// Module-level in-memory cache (L1 — survives route changes within session)
// Keyed by `topic` → all generations for that topic
const generationsCache = new Map<string, Generation[]>();

const TYPE_LABEL: Record<string, string> = {
  flowchart:       'Flowchart',
  mindmap:         'Mind Map',
  sequenceDiagram: 'Sequence',
  classDiagram:    'Comparison',
  timeline:        'Timeline',
  block:           'Architecture',
};

const TYPE_COLOR: Record<string, string> = {
  flowchart:       'var(--cobalt)',
  mindmap:         'var(--green)',
  sequenceDiagram: 'var(--magenta)',
  classDiagram:    'var(--tangerine)',
  timeline:        'var(--navy)',
  block:           'var(--cobalt-deep)',
};

const TYPE_BG: Record<string, string> = {
  flowchart:       'var(--cobalt-soft)',
  mindmap:         'var(--green-soft)',
  sequenceDiagram: '#FBDCEC',
  classDiagram:    '#FDEBD7',
  timeline:        '#E8EAF6',
  block:           'var(--cobalt-soft)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      + ' · '
      + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function VisualNotesPage() {
  const params   = useParams();
  const router   = useRouter();
  const courseId = params.id as string;

  const [currentTopic, setCurrentTopic] = useState(0);
  const [topics,       setTopics]       = useState<any[]>([]);
  const [courseName,   setCourseName]   = useState('');
  const [loading,      setLoading]      = useState(true);

  const [panels,       setPanels]       = useState<any[]>([]);
  const [loadingPanels, setLoadingPanels] = useState(false);
  const [panelError,   setPanelError]   = useState<string | null>(null);

  // Version history state
  const [generations,   setGenerations]   = useState<Generation[]>([]);
  const [activeVersion, setActiveVersion] = useState(0); // index into generations array
  const [regenerating,  setRegenerating]  = useState(false);

  // Background prefetch tracking
  const [prefetchStatus, setPrefetchStatus] = useState<Record<string, PStatus>>({});
  const prefetchQueue   = useRef<string[]>([]);
  const isPrefetching   = useRef(false);
  const activeTopicRef  = useRef<string>('');
  const [mobileTopicsOpen, setMobileTopicsOpen] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<number | null>(null);

  // ─── Load topics ───────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: c } = await supabase.from('courses').select('name').eq('id', courseId).single();
      if (c) setCourseName((c as any).name);

      const { data: ms } = await supabase.from('mastery_states').select('skill_or_topic,p_mastered').eq('course_id', courseId).order('id');
      const list = (ms as any[]) || [];
      const seen = new Set<string>();
      const deduped = list.filter(m => { if (seen.has(m.skill_or_topic)) return false; seen.add(m.skill_or_topic); return true; });

      let topicList: any[];
      if (deduped.length > 0) {
        topicList = deduped.map(m => ({ name: m.skill_or_topic, mastery: Math.round(m.p_mastered * 100) }));
      } else {
        const { data: u } = await supabase.from('content_units').select('topic').eq('course_id', courseId);
        const seen2 = new Set<string>();
        topicList = ((u as any[]) || []).filter(x => { if (seen2.has(x.topic)) return false; seen2.add(x.topic); return true; }).map(x => ({ name: x.topic, mastery: 35 }));
      }

      setTopics(topicList);
      setLoading(false);
    };
    load();
  }, [courseId]);

  // ─── Fetch or generate panels for a topic ──────────────────────────────────
  const fetchTopicPanels = useCallback(async (topicName: string, forceRegenerate = false) => {
    // L1: in-memory cache hit (only when not regenerating)
    if (!forceRegenerate && generationsCache.has(topicName)) {
      const cached = generationsCache.get(topicName)!;
      setGenerations(cached);
      const lastIdx = cached.length - 1;
      setActiveVersion(lastIdx);
      setPanels(cached[lastIdx].panels_json);
      setLoadingPanels(false);
      setPanelError(null);
      setPrefetchStatus(p => ({ ...p, [topicName]: 'ready' }));
      return;
    }

    if (forceRegenerate) {
      setRegenerating(true);
    } else {
      setPanels([]);
      setLoadingPanels(true);
    }
    setPanelError(null);

    try {
      const res = await fetch(`/api/courses/${courseId}/visual-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicName, regenerate: forceRegenerate }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to generate visual notes.');
      }

      const data = await res.json();
      const allGens: Generation[] = data.allGenerations || [];

      if (allGens.length === 0 && data.panels) {
        // Fallback: build a single generation from the response
        allGens.push({ version: data.version || 1, panels_json: data.panels, created_at: new Date().toISOString() });
      }

      if (allGens.length === 0) throw new Error('No panels returned.');

      // Update L1 cache
      generationsCache.set(topicName, allGens);

      // Only update UI if this is still the active topic
      if (topicName === activeTopicRef.current) {
        setGenerations(allGens);
        const lastIdx = allGens.length - 1;
        setActiveVersion(lastIdx);
        setPanels(allGens[lastIdx].panels_json);
        setLoadingPanels(false);
        setPanelError(null);
      }

      setPrefetchStatus(p => ({ ...p, [topicName]: 'ready' }));
    } catch (e: any) {
      if (topicName === activeTopicRef.current) {
        setPanelError(e?.message || 'Failed to generate visual notes.');
        setLoadingPanels(false);
      }
      setPrefetchStatus(p => ({ ...p, [topicName]: 'idle' }));
    } finally {
      setRegenerating(false);
    }
  }, [courseId]);

  // ─── Prefetch orchestrator ─────────────────────────────────────────────────
  const drainQueue = useCallback(async () => {
    if (isPrefetching.current) return;
    isPrefetching.current = true;
    while (prefetchQueue.current.length > 0) {
      const name = prefetchQueue.current.shift()!;
      await fetchTopicPanels(name);
      if (prefetchQueue.current.length > 0) await new Promise(r => setTimeout(r, 1200));
    }
    isPrefetching.current = false;
  }, [fetchTopicPanels]);

  // Kick off background prefetch whenever topics change
  useEffect(() => {
    if (!topics.length || !courseId) return;

    const statusUpdate: Record<string, PStatus> = {};
    topics.forEach(t => {
      statusUpdate[t.name] = generationsCache.has(t.name) ? 'ready' : 'idle';
    });
    setPrefetchStatus(statusUpdate);

    prefetchQueue.current = topics
      .filter(t => statusUpdate[t.name] === 'idle' && t.name !== activeTopicRef.current)
      .map(t => t.name);

    drainQueue();
  }, [topics, courseId, drainQueue]);

  // ─── Load active topic panels ──────────────────────────────────────────────
  useEffect(() => {
    if (!topics.length) return;
    const topicName = topics[currentTopic]?.name;
    if (!topicName) return;
    activeTopicRef.current = topicName;

    // Remove from prefetch queue (we'll handle it directly)
    prefetchQueue.current = prefetchQueue.current.filter(n => n !== topicName);

    fetchTopicPanels(topicName);
  }, [currentTopic, topics, fetchTopicPanels]);

  // ─── Version navigation handlers ──────────────────────────────────────────
  const handlePrevVersion = () => {
    if (activeVersion <= 0) return;
    const newIdx = activeVersion - 1;
    setActiveVersion(newIdx);
    setPanels(generations[newIdx].panels_json);
  };

  const handleNextVersion = () => {
    if (activeVersion >= generations.length - 1) return;
    const newIdx = activeVersion + 1;
    setActiveVersion(newIdx);
    setPanels(generations[newIdx].panels_json);
  };

  const handleRegenerate = () => {
    const topicName = topics[currentTopic]?.name;
    if (!topicName || regenerating) return;
    fetchTopicPanels(topicName, true);
  };

  const topicName = topics[currentTopic]?.name || '';

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="skeleton" style={{ height: '36px', width: '200px', borderRadius: '8px' }} />
      <div className="skeleton" style={{ height: '400px', borderRadius: '20px' }} />
    </div>
  );

  const readyCount  = Object.values(prefetchStatus).filter(s => s === 'ready').length;
  const totalTopics = topics.length;
  const currentGen  = generations[activeVersion];

  const renderTopics = () => (
    <div className="card" style={{ padding: '18px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px', fontWeight: 700 }}>Topics</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {topics.map((topic, i) => {
          const status = prefetchStatus[topic.name] ?? 'idle';
          return (
            <button key={i} onClick={() => { setCurrentTopic(i); setMobileTopicsOpen(false); }} style={{
              padding: '9px 10px', borderRadius: '10px',
              border: currentTopic === i ? '2px solid var(--cobalt)' : '2px solid transparent',
              background: currentTopic === i ? 'var(--cobalt-soft)' : 'transparent',
              color: currentTopic === i ? 'var(--cobalt-ink)' : 'var(--ink)',
              cursor: 'pointer', fontSize: '12.5px', fontWeight: currentTopic === i ? 700 : 500,
              textAlign: 'left', fontFamily: 'var(--font-body)', width: '100%',
              display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.15s',
            }}>
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                background: status === 'ready' ? 'var(--green)' : status === 'fetching' ? 'var(--tangerine)' : 'var(--line)',
                animation: status === 'fetching' ? 'pulse 1s ease infinite' : 'none',
                transition: 'background 0.4s',
              }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic.name}</span>
              <div style={{ width: '26px', height: '3px', borderRadius: '3px', background: 'var(--line)', flexShrink: 0 }}>
                <div style={{ height: '100%', borderRadius: '3px', width: `${topic.mastery}%`, background: topic.mastery >= 60 ? 'var(--green)' : topic.mastery >= 30 ? 'var(--cobalt)' : 'var(--tangerine)' }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      {/* ─── Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => router.push(`/courses/${courseId}/study`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-body)', padding: 0 }}>
            ← Study Room
          </button>
          <span className="desktop-only" style={{ color: 'var(--line)', fontWeight: 700 }}>·</span>
          <h1 className="desktop-only" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>
            VISUAL{' '}
            <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)', fontSize: '1.15em' }}>notes</span>
          </h1>
          <div className="desktop-only" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {readyCount < totalTopics && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--paper-2)', border: '1.5px solid var(--line)', borderRadius: 'var(--pill)', padding: '4px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--tangerine)', display: 'inline-block', animation: 'pulse 1s ease infinite' }} />
                Preparing {readyCount}/{totalTopics} topics
              </div>
            )}
            {readyCount === totalTopics && totalTopics > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--green-soft)', border: '1.5px solid var(--green)', borderRadius: 'var(--pill)', padding: '4px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
                ✓ All {totalTopics} topics ready
              </div>
            )}
            {courseName && <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>{courseName.toUpperCase()}</span>}
          </div>
        </div>
        <button 
          className="mobile-only"
          onClick={() => setMobileTopicsOpen(true)} 
          style={{ background: 'var(--paper-2)', border: '2px solid var(--ink)', padding: '6px 14px', borderRadius: '99px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '10.5px', fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          Topics <span style={{ color: 'var(--ink)', fontSize: '14px' }}>▾</span>
        </button>
      </div>

      {/* ─── Diagram type legend (desktop only — too crowded on mobile) ─── */}
      <div className="desktop-only" style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {Object.entries(TYPE_LABEL).map(([type, label]) => (
          <div key={type} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: TYPE_BG[type], border: '1.5px solid var(--ink)', borderRadius: 'var(--pill)',
            padding: '3px 10px', fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em', color: TYPE_COLOR[type],
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: TYPE_COLOR[type] }} />
            {label}
          </div>
        ))}
      </div>

      {/* ─── Main layout ─────────────────────────────────── */}
      <div className="responsive-grid-1" style={{ display: 'grid', gridTemplateColumns: '232px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* ── Left sidebar ─── */}
        <div className="desktop-only" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {renderTopics()}
        </div>

        {/* ── Main area ─── */}
        <div>
          {/* Topic title + version controls */}
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', textTransform: 'uppercase', margin: '0 0 12px 0' }}>
              {topicName}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Version navigation */}
              {generations.length > 0 && !loadingPanels && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0',
                  background: 'var(--paper-2)', border: '1.5px solid var(--line)',
                  borderRadius: 'var(--pill)', overflow: 'hidden',
                }}>
                  <button
                    onClick={handlePrevVersion}
                    disabled={activeVersion <= 0}
                    style={{
                      background: 'none', border: 'none', cursor: activeVersion <= 0 ? 'default' : 'pointer',
                      padding: '5px 8px', fontSize: '13px', fontWeight: 700,
                      color: activeVersion <= 0 ? 'var(--line)' : 'var(--ink)',
                      fontFamily: 'var(--font-body)', transition: 'color 0.15s',
                    }}
                    aria-label="Previous version"
                  >
                    ←
                  </button>
                  <div style={{
                    padding: '5px 6px',
                    borderLeft: '1.5px solid var(--line)', borderRight: '1.5px solid var(--line)',
                    fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700,
                    color: 'var(--ink)', letterSpacing: '0.04em',
                    whiteSpace: 'nowrap', userSelect: 'none',
                  }}>
                    v{generations[activeVersion]?.version ?? 1}/{generations.length}
                  </div>
                  <button
                    onClick={handleNextVersion}
                    disabled={activeVersion >= generations.length - 1}
                    style={{
                      background: 'none', border: 'none',
                      cursor: activeVersion >= generations.length - 1 ? 'default' : 'pointer',
                      padding: '5px 8px', fontSize: '13px', fontWeight: 700,
                      color: activeVersion >= generations.length - 1 ? 'var(--line)' : 'var(--ink)',
                      fontFamily: 'var(--font-body)', transition: 'color 0.15s',
                    }}
                    aria-label="Next version"
                  >
                    →
                  </button>
                </div>
              )}

              {/* Regenerate button */}
              {!loadingPanels && (
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 12px', borderRadius: 'var(--pill)',
                    border: '2px solid var(--ink)',
                    background: regenerating ? 'var(--paper-2)' : 'var(--magenta)',
                    color: regenerating ? 'var(--muted)' : '#fff',
                    fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700,
                    cursor: regenerating ? 'not-allowed' : 'pointer',
                    boxShadow: regenerating ? 'none' : '0 2px 0 var(--ink)',
                    transition: 'all 0.15s',
                  }}
                >
                  {regenerating ? (
                    <>
                      <span style={{
                        width: '10px', height: '10px',
                        border: '2px solid var(--muted)', borderTopColor: 'transparent',
                        borderRadius: '50%', display: 'inline-block',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      …
                    </>
                  ) : (
                    <>✨ Regenerate</>
                  )}
                </button>
              )}

              {/* Generation timestamp — desktop only */}
              {currentGen && !loadingPanels && (
                <span className="desktop-only" style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)',
                  fontWeight: 600, letterSpacing: '0.03em',
                }}>
                  {formatTimestamp(currentGen.created_at)}
                </span>
              )}

              {/* Panel count — desktop only */}
              {panels.length > 0 && !loadingPanels && (
                <span className="desktop-only" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em' }}>
                  {panels.length} DIAGRAMS
                </span>
              )}
            </div>
          </div>

          {/* Loading state */}
          {loadingPanels && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{
                  width: '40px', height: '40px', margin: '0 auto 16px',
                  border: '4px solid var(--cobalt)', borderTopColor: 'transparent',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                }} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Generating diagrams…
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '13px', maxWidth: '360px', margin: '0 auto', lineHeight: 1.6 }}>
                  Adwen is creating flowcharts, mind maps, and visual diagrams for <strong>{topicName}</strong>. This takes ~15-30 seconds.
                </p>
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: '240px', borderRadius: 'var(--r)' }} />
              ))}
            </div>
          )}

          {/* Error state */}
          {panelError && (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
              <p style={{ color: 'var(--muted)', marginBottom: '20px', fontSize: 'var(--text-sm)' }}>{panelError}</p>
              <button onClick={() => { setCurrentTopic(t => t); }} style={{
                padding: '10px 24px', border: '2px solid var(--ink)', borderRadius: 'var(--pill)',
                background: 'var(--cobalt)', color: '#fff', fontFamily: 'var(--font-body)',
                fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 0 var(--ink)',
              }}>
                Retry →
              </button>
            </div>
          )}

          {/* Panels */}
          {!loadingPanels && !panelError && panels.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Regenerating overlay indicator */}
              {regenerating && (
                <div className="card" style={{
                  padding: '14px 20px', textAlign: 'center',
                  background: 'var(--magenta)', borderColor: 'var(--ink)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                }}>
                  <span style={{
                    width: '14px', height: '14px',
                    border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                    borderRadius: '50%', display: 'inline-block',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  <span style={{ color: '#fff', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700 }}>
                    Generating a new version… Your current diagrams are still visible below.
                  </span>
                </div>
              )}

              {panels.map((panel, i) => (
                <React.Fragment key={i}>
                  {/* Desktop: full inline diagram */}
                  <div className="desktop-only card" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Panel header */}
                    <div style={{
                      padding: '10px 14px',
                      background: TYPE_COLOR[panel.diagram_type] || 'var(--cobalt)',
                      borderBottom: '2px solid var(--ink)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 800,
                        color: '#fff', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {panel.title}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700,
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--pill)',
                        padding: '3px 8px', color: '#fff', flexShrink: 0,
                      }}>
                        {TYPE_LABEL[panel.diagram_type] || panel.diagram_type}
                      </span>
                    </div>
                    <div style={{ background: '#fff', padding: '12px' }}>
                      <MermaidDiagram
                        code={panel.mermaid_code}
                        id={`panel-${i}-${topicName.replace(/\s+/g, '-')}-v${currentGen?.version ?? 1}`}
                      />
                    </div>
                    <div style={{ padding: '18px 22px', borderTop: '2px solid var(--ink)', background: 'var(--surface)' }}>
                      <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--ink)', margin: 0 }}>
                        {panel.explanation}
                      </p>
                      {panel.exam_relevance && (
                        <div style={{
                          marginTop: '12px', padding: '10px 14px',
                          background: '#FDFDE0', border: '1.5px solid var(--lime-deep)',
                          borderLeft: '4px solid var(--lime-deep)', borderRadius: '0 8px 8px 0',
                        }}>
                          <div style={{
                            fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700,
                            color: '#6b7a00', textTransform: 'uppercase', letterSpacing: '0.08em',
                            marginBottom: '4px',
                          }}>
                            🎯 Exam Relevance
                          </div>
                          <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--ink)', margin: 0 }}>
                            {panel.exam_relevance}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile: compact card with tap to view */}
                  <div className="mobile-only card" style={{ padding: 0, overflow: 'hidden' }}>
                    <button
                      onClick={() => setExpandedPanel(i)}
                      style={{
                        width: '100%', border: 'none', cursor: 'pointer', background: 'none',
                        padding: 0, textAlign: 'left',
                      }}
                    >
                      <div style={{
                        padding: '12px 14px',
                        background: TYPE_COLOR[panel.diagram_type] || 'var(--cobalt)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{
                            fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 800,
                            color: '#fff', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {panel.title}
                          </span>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 600,
                            color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em',
                          }}>
                            {TYPE_LABEL[panel.diagram_type] || panel.diagram_type}
                          </span>
                        </div>
                        <div style={{
                          background: 'rgba(255,255,255,0.25)', borderRadius: '8px',
                          padding: '6px 12px', flexShrink: 0,
                          fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700,
                          color: '#fff', letterSpacing: '0.04em',
                        }}>
                          View →
                        </div>
                      </div>
                    </button>
                    {/* Compact explanation */}
                    <div style={{ padding: '10px 14px', background: 'var(--surface)' }}>
                      <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--muted)', margin: 0,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                      }}>
                        {panel.explanation}
                      </p>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Topics Drawer ── */}
      {mobileTopicsOpen && (
        <div className="mobile-only">
          <div className="sidebar-overlay open" onClick={() => setMobileTopicsOpen(false)} style={{ zIndex: 9998 }} />
          <aside className="sidebar-drawer open" style={{ background: 'var(--surface-2)', padding: '24px 20px', zIndex: 9999 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>Topics</span>
              <button onClick={() => setMobileTopicsOpen(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--ink)' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 80px)', paddingBottom: '24px' }}>
              {renderTopics()}
            </div>
          </aside>
        </div>
      )}

      {/* ── Mobile Fullscreen Diagram Modal ── */}
      {expandedPanel !== null && panels[expandedPanel] && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: '#fff',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Modal header */}
          <div style={{
            padding: '12px 16px',
            background: TYPE_COLOR[panels[expandedPanel].diagram_type] || 'var(--cobalt)',
            borderBottom: '2px solid var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
            flexShrink: 0,
          }}>
            <button
              onClick={() => setExpandedPanel(null)}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px',
                padding: '6px 12px', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700,
                color: '#fff', flexShrink: 0,
              }}
            >
              ← Back
            </button>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800,
              color: '#fff', flex: 1, textAlign: 'center', minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {panels[expandedPanel].title}
            </span>
            <button
              onClick={() => {
                const wrapper = document.getElementById('fullscreen-diagram-svg');
                const svgEl = wrapper?.querySelector('svg');
                if (!svgEl) return;
                const svgData = new XMLSerializer().serializeToString(svgEl);
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                const img = new Image();
                img.onload = () => {
                  canvas.width = img.naturalWidth * 2;
                  canvas.height = img.naturalHeight * 2;
                  ctx.fillStyle = '#fff';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  const a = document.createElement('a');
                  a.download = `${panels[expandedPanel!].title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
                  a.href = canvas.toDataURL('image/png');
                  a.click();
                };
                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
              }}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px',
                padding: '6px 12px', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700,
                color: '#fff', flexShrink: 0, letterSpacing: '0.04em',
              }}
            >
              ↓ Save
            </button>
          </div>

          {/* Diagram area — pinch-to-zoom with overflow scroll */}
          <div
            id="fullscreen-diagram-svg"
            style={{
              flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch',
              padding: '16px', background: '#fff',
            }}
          >
            <MermaidDiagram
              code={panels[expandedPanel].mermaid_code}
              id={`fullscreen-${expandedPanel}-${topicName.replace(/\s+/g, '-')}`}
            />
          </div>

          {/* Explanation at bottom */}
          <div style={{
            padding: '12px 16px', borderTop: '2px solid var(--ink)',
            background: 'var(--surface)', flexShrink: 0,
            maxHeight: '30vh', overflowY: 'auto',
          }}>
            <p style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--ink)', margin: 0 }}>
              {panels[expandedPanel].explanation}
            </p>
            {panels[expandedPanel].exam_relevance && (
              <div style={{
                marginTop: '10px', padding: '8px 12px',
                background: '#FDFDE0', border: '1.5px solid var(--lime-deep)',
                borderLeft: '4px solid var(--lime-deep)', borderRadius: '0 8px 8px 0',
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700,
                  color: '#6b7a00', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px',
                }}>🎯 Exam Relevance</div>
                <p style={{ fontSize: '11px', lineHeight: 1.4, color: 'var(--ink)', margin: 0 }}>
                  {panels[expandedPanel].exam_relevance}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
