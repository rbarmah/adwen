'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { STUDY_DEPTHS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────
type Rating  = 'know' | 'shaky' | 'no-idea' | null;
type PStatus = 'idle' | 'fetching' | 'ready';

// ─── Module-level in-memory cache (L1 — survives route changes within session) ─
// Supabase (via the API) is L2 — persists across devices and sessions.
const cardCache = new Map<string, any[]>();

const DEPTH_COLORS = ['var(--green)', 'var(--cobalt)', 'var(--tangerine)', 'var(--magenta)', 'var(--navy)'];
const DEPTH_BG     = ['rgba(47,163,106,0.08)', 'rgba(42,59,201,0.08)', 'rgba(245,130,31,0.08)', 'rgba(236,63,143,0.08)', 'rgba(22,24,43,0.08)'];

// ─── Session summary ──────────────────────────────────────────────────────────
function SessionSummary({ cards, ratings, onReviewWeak, onNewTopic, onBack }: {
  cards: any[]; ratings: Record<number, Rating>;
  onReviewWeak: () => void; onNewTopic: () => void; onBack: () => void;
}) {
  const know   = cards.filter((_, i) => ratings[i] === 'know').length;
  const shaky  = cards.filter((_, i) => ratings[i] === 'shaky').length;
  const noIdea = cards.filter((_, i) => ratings[i] === 'no-idea').length;
  const total  = cards.length;
  const weakCards = cards.filter((_, i) => ratings[i] === 'shaky' || ratings[i] === 'no-idea');

  const r = 52; const circ = 2 * Math.PI * r;
  const knowArc   = (know / total)   * circ;
  const shakyArc  = (shaky / total)  * circ;
  const noIdeaArc = (noIdea / total) * circ;

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Session <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--cobalt)', fontSize: '1.2em' }}>Done</span>
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>Here's how you did across {total} cards</p>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '40px', padding: '36px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="70" cy="70" r={r} fill="none" stroke="var(--line)" strokeWidth="14" />
            <circle cx="70" cy="70" r={r} fill="none" stroke="var(--green)"     strokeWidth="14" strokeDasharray={`${knowArc} ${circ}`}   strokeDashoffset={0} />
            <circle cx="70" cy="70" r={r} fill="none" stroke="var(--tangerine)" strokeWidth="14" strokeDasharray={`${shakyArc} ${circ}`}  strokeDashoffset={-knowArc} />
            <circle cx="70" cy="70" r={r} fill="none" stroke="var(--magenta)"   strokeWidth="14" strokeDasharray={`${noIdeaArc} ${circ}`} strokeDashoffset={-(knowArc + shakyArc)} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>{total ? Math.round((know / total) * 100) : 0}</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em' }}>% SOLID</span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {([['Know it', know, 'var(--green)', '✅'], ['Shaky', shaky, 'var(--tangerine)', '⚠️'], ['No idea', noIdea, 'var(--magenta)', '❌']] as const).map(([label, count, color, icon]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>{icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>{label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color }}>{count}</span>
                </div>
                <div style={{ height: '4px', borderRadius: '99px', background: 'var(--line)' }}>
                  <div style={{ height: '100%', borderRadius: '99px', background: color, width: `${total ? (count / total) * 100 : 0}%`, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {weakCards.length > 0 && (
        <div className="card" style={{ marginBottom: '20px', padding: '24px' }}>
          <div style={{ fontWeight: 800, fontSize: 'var(--text-sm)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: 'var(--lime)', border: '2px solid var(--ink)', borderRadius: '6px', padding: '2px 8px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>REVIEW</span>
            Cards to revisit
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {weakCards.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', border: '1.5px solid var(--line)', borderRadius: '10px', background: 'var(--surface)' }}>
                <span>{ratings[cards.indexOf(c)] === 'shaky' ? '⚠️' : '❌'}</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{c.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <button onClick={onBack} style={{ flex: 1, padding: '14px', border: '2px solid var(--ink)', borderRadius: 'var(--r-sm)', background: 'var(--paper-2)', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>← Back</button>
        {weakCards.length > 0 && (
          <button onClick={onReviewWeak} style={{ flex: 2, padding: '14px', border: '2px solid var(--ink)', borderRadius: 'var(--r-sm)', background: 'var(--cobalt)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 0 var(--ink)' }}>
            Review {weakCards.length} weak card{weakCards.length > 1 ? 's' : ''} →
          </button>
        )}
        <button onClick={onNewTopic} style={{ flex: 1, padding: '14px', border: '2px solid var(--ink)', borderRadius: 'var(--r-sm)', background: 'var(--lime)', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 0 var(--ink)' }}>Next topic →</button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StudyCardsPage() {
  const params   = useParams();
  const router   = useRouter();
  const courseId = params.id as string;

  const [depth,        setDepth]        = useState(2);
  const [currentTopic, setCurrentTopic] = useState(0);
  const [currentCard,  setCurrentCard]  = useState(0);
  const [topics,       setTopics]       = useState<any[]>([]);
  const [courseName,   setCourseName]   = useState('');
  const [loading,      setLoading]      = useState(true);

  const [cards,        setCards]        = useState<any[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardError,    setCardError]    = useState<string | null>(null);
  const [isFlipped,    setIsFlipped]    = useState(false);
  const [ratings,      setRatings]      = useState<Record<number, Rating>>({});
  const [showSummary,  setShowSummary]  = useState(false);
  const [reviewMode,   setReviewMode]   = useState<number[] | null>(null);

  // Background prefetch tracking
  const [prefetchStatus, setPrefetchStatus] = useState<Record<string, PStatus>>({});
  const prefetchQueue   = useRef<string[]>([]);
  const isPrefetching   = useRef(false);
  const activeTopicRef  = useRef<string>('');

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

  // ─── Background prefetch orchestrator ─────────────────────────────────────
  const prefetchOne = useCallback(async (topicName: string, d: number) => {
    const key = `${topicName}|${d}`;

    // L1: in-memory
    if (cardCache.has(key)) { setPrefetchStatus(p => ({ ...p, [topicName]: 'ready' })); return; }

    // L2: API (which internally checks Supabase before calling OpenAI)
    setPrefetchStatus(p => ({ ...p, [topicName]: 'fetching' }));
    try {
      const res = await fetch(`/api/courses/${courseId}/tutor`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicName, depth: d }),
      });
      if (!res.ok) { setPrefetchStatus(p => ({ ...p, [topicName]: 'idle' })); return; }
      const data = await res.json();
      if (data?.cards?.length) {
        cardCache.set(key, data.cards);
        setPrefetchStatus(p => ({ ...p, [topicName]: 'ready' }));

        // If this is the active topic and cards haven't loaded yet, render them
        if (topicName === activeTopicRef.current) {
          setCards(data.cards);
          setCurrentCard(0);
          setIsFlipped(false);
          setLoadingCards(false);
          setCardError(null);
        }
      } else {
        setPrefetchStatus(p => ({ ...p, [topicName]: 'idle' }));
      }
    } catch {
      setPrefetchStatus(p => ({ ...p, [topicName]: 'idle' }));
    }
  }, [courseId]);

  const drainQueue = useCallback(async (d: number) => {
    if (isPrefetching.current) return;
    isPrefetching.current = true;
    while (prefetchQueue.current.length > 0) {
      const name = prefetchQueue.current.shift()!;
      await prefetchOne(name, d);
      // Small gap between requests to avoid rate limiting
      if (prefetchQueue.current.length > 0) await new Promise(r => setTimeout(r, 800));
    }
    isPrefetching.current = false;
  }, [prefetchOne]);

  // Kick off background prefetch whenever topics or depth changes
  useEffect(() => {
    if (!topics.length || !courseId) return;

    // Seed status from in-memory cache
    const statusUpdate: Record<string, PStatus> = {};
    topics.forEach(t => {
      const key = `${t.name}|${depth}`;
      statusUpdate[t.name] = cardCache.has(key) ? 'ready' : 'idle';
    });
    setPrefetchStatus(statusUpdate);

    // Queue topics that still need generation (skip active — that's handled explicitly)
    prefetchQueue.current = topics
      .filter(t => statusUpdate[t.name] === 'idle' && t.name !== activeTopicRef.current)
      .map(t => t.name);

    // Start draining (non-blocking)
    drainQueue(depth);
  }, [topics, depth, courseId, drainQueue]);

  // ─── Load the active topic's cards ────────────────────────────────────────
  useEffect(() => {
    if (!topics.length) return;
    const topicName = topics[currentTopic]?.name;
    if (!topicName) return;
    activeTopicRef.current = topicName;

    const key = `${topicName}|${depth}`;

    // L1: in-memory hit — instant
    if (cardCache.has(key)) {
      setCards(cardCache.get(key)!); setCurrentCard(0); setIsFlipped(false);
      setRatings({}); setShowSummary(false); setReviewMode(null);
      setLoadingCards(false); setCardError(null);
      return;
    }

    // L2: API (checks Supabase DB, then OpenAI if needed)
    setCards([]); setLoadingCards(true); setCardError(null);
    setRatings({}); setShowSummary(false); setReviewMode(null);

    // Remove from queue if present (we're fetching it now explicitly)
    prefetchQueue.current = prefetchQueue.current.filter(n => n !== topicName);

    fetch(`/api/courses/${courseId}/tutor`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topicName, depth }),
    })
      .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
      .then(data => {
        if (topicName !== activeTopicRef.current) return; // stale — topic switched
        if (data?.cards?.length) {
          cardCache.set(key, data.cards);
          setPrefetchStatus(p => ({ ...p, [topicName]: 'ready' }));
          setCards(data.cards); setCurrentCard(0); setIsFlipped(false);
          setLoadingCards(false); setCardError(null);
        } else { throw new Error('No cards returned.'); }
      })
      .catch((e: any) => {
        if (topicName !== activeTopicRef.current) return;
        setCardError(e?.error || e?.message || 'Failed to load cards.');
        setLoadingCards(false);
      });
  }, [currentTopic, depth, topics, courseId]); // eslint-disable-line

  // Reset flip on card change
  useEffect(() => { setIsFlipped(false); }, [currentCard]);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  const deck = reviewMode ?? cards.map((_, i) => i);
  const deckPos = deck.indexOf(currentCard);

  const rate = useCallback((r: Rating) => {
    setRatings(prev => ({ ...prev, [currentCard]: r }));
    const d = reviewMode ?? cards.map((_, i) => i);
    const pos = d.indexOf(currentCard);
    if (pos < d.length - 1) setTimeout(() => setCurrentCard(d[pos + 1]), 160);
    else setTimeout(() => setShowSummary(true), 200);
  }, [currentCard, cards, reviewMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (showSummary || loadingCards) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setIsFlipped(f => !f); }
      if ((e.key === 'ArrowRight' || e.key === 'j') && deckPos < deck.length - 1) setCurrentCard(deck[deckPos + 1]);
      if ((e.key === 'ArrowLeft'  || e.key === 'k') && deckPos > 0)               setCurrentCard(deck[deckPos - 1]);
      if (isFlipped) {
        if (e.key === '1') rate('know');
        if (e.key === '2') rate('shaky');
        if (e.key === '3') rate('no-idea');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentCard, deck, deckPos, isFlipped, showSummary, loadingCards, rate]);

  const handleReviewWeak = useCallback(() => {
    const weak = cards.map((_, i) => i).filter(i => ratings[i] === 'shaky' || ratings[i] === 'no-idea');
    if (!weak.length) return;
    setReviewMode(weak);
    setCurrentCard(weak[0]);
    setIsFlipped(false);
    setShowSummary(false);
    setRatings(prev => { const n = { ...prev }; weak.forEach(i => { n[i] = null; }); return n; });
  }, [cards, ratings]);

  const card       = cards[currentCard];
  const topicName  = topics[currentTopic]?.name || '';
  const depthColor = DEPTH_COLORS[depth];
  const depthBg    = DEPTH_BG[depth];

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="skeleton" style={{ height: '36px', width: '200px', borderRadius: '8px' }} />
      <div className="skeleton" style={{ height: '400px', borderRadius: '20px' }} />
    </div>
  );

  const readyCount  = Object.values(prefetchStatus).filter(s => s === 'ready').length;
  const totalTopics = topics.length;

  return (
    <div className="animate-fade-in">
      {/* ─── Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button onClick={() => router.push(`/courses/${courseId}/study`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-body)', padding: 0 }}>
          ← Study Room
        </button>
        <span style={{ color: 'var(--line)', fontWeight: 700 }}>·</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>STUDY CARDS</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Background generation status */}
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

      {/* ─── Keyboard hints ──────────────────────────────── */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[['Space', 'Flip'], ['← →', 'Navigate'], ['1', '✅ Know'], ['2', '⚠️ Shaky'], ['3', '❌ No idea']].map(([key, label]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <kbd style={{ background: 'var(--paper-2)', border: '2px solid var(--ink)', borderRadius: '5px', padding: '1px 7px', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, boxShadow: '0 2px 0 var(--ink)' }}>{key}</kbd>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ─── Main layout ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '232px 1fr', gap: '24px', alignItems: 'start' }}>

        {/* ── Left sidebar ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Depth */}
          <div className="card" style={{ padding: '18px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '12px', fontWeight: 700 }}>Depth Level</div>
            <div style={{ display: 'flex', gap: '3px', marginBottom: '12px' }}>
              {STUDY_DEPTHS.map((d, i) => <div key={d.level} style={{ flex: 1, height: '3px', borderRadius: '99px', background: i <= depth ? DEPTH_COLORS[depth] : 'var(--line)', transition: 'all 0.3s' }} />)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {STUDY_DEPTHS.map((d, i) => (
                <button key={d.level} onClick={() => { setDepth(d.level); setCurrentCard(0); setRatings({}); setShowSummary(false); }} style={{
                  display: 'flex', flexDirection: 'column', padding: '8px 10px', borderRadius: '10px',
                  border: depth === d.level ? `2px solid ${DEPTH_COLORS[i]}` : '2px solid transparent',
                  background: depth === d.level ? DEPTH_BG[i] : 'transparent',
                  fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: depth === d.level ? 700 : 500,
                  cursor: 'pointer', textAlign: 'left', width: '100%', color: 'var(--ink)', transition: 'all 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: depth === d.level ? DEPTH_COLORS[i] : 'var(--line)', flexShrink: 0 }} />
                    {d.label}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', marginLeft: '14px', lineHeight: 1.4 }}>{d.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Topics */}
          <div className="card" style={{ padding: '18px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px', fontWeight: 700 }}>Topics</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {topics.map((topic, i) => {
                const status = prefetchStatus[topic.name] ?? 'idle';
                return (
                  <button key={i} onClick={() => { setCurrentTopic(i); setCurrentCard(0); }} style={{
                    padding: '9px 10px', borderRadius: '10px',
                    border: currentTopic === i ? '2px solid var(--cobalt)' : '2px solid transparent',
                    background: currentTopic === i ? 'var(--cobalt-soft)' : 'transparent',
                    color: currentTopic === i ? 'var(--cobalt-ink)' : 'var(--ink)',
                    cursor: 'pointer', fontSize: '12.5px', fontWeight: currentTopic === i ? 700 : 500,
                    textAlign: 'left', fontFamily: 'var(--font-body)', width: '100%',
                    display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.15s',
                  }}>
                    {/* Prefetch status dot */}
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
        </div>

        {/* ── Main area ─── */}
        <div>
          {/* Topic title + progress dots */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', textTransform: 'uppercase', margin: 0 }}>{topicName}</h2>
              {cards.length > 0 && !showSummary && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em' }}>
                  {reviewMode ? `REVIEW ${deckPos + 1}/${deck.length}` : `${deckPos + 1} / ${deck.length}`}
                </span>
              )}
            </div>
            {cards.length > 0 && !showSummary && (
              <div className="dots" style={{ flexWrap: 'wrap', gap: '5px' }}>
                {cards.map((_, i) => {
                  const r = ratings[i];
                  return (
                    <button key={i} onClick={() => setCurrentCard(i)} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
                      <div className={`d ${r ?? ''} ${i === currentCard ? 'on' : ''}`} style={{ width: i === currentCard ? '22px' : '8px', height: '8px', transition: 'all 0.25s' }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Content */}
          {showSummary ? (
            <SessionSummary cards={cards} ratings={ratings} onReviewWeak={handleReviewWeak}
              onNewTopic={() => { if (currentTopic + 1 < topics.length) setCurrentTopic(currentTopic + 1); }}
              onBack={() => { setShowSummary(false); setCurrentCard(deck[0]); }} />
          ) : loadingCards ? (
            <div className="slide">
              <div className="slide-top" style={{ background: depthColor }}>
                <span className="slide-kicker">Generating cards...</span>
                <span className="slide-kicker" style={{ opacity: 0.7 }}>⏳</span>
              </div>
              <div className="slide-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', fontStyle: 'italic' }}>🤖 Adwen is writing cards for this topic...</div>
                <div className="skeleton" style={{ height: '26px', width: '240px' }} />
                <div className="skeleton" style={{ height: '90px' }} />
                <div className="skeleton" style={{ height: '60px' }} />
              </div>
            </div>
          ) : cardError ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
              <p style={{ color: 'var(--muted)', marginBottom: '20px', fontSize: 'var(--text-sm)' }}>{cardError}</p>
              <button onClick={() => { setCurrentTopic(t => { const same = t; return same; }); }} style={{ padding: '10px 24px', border: '2px solid var(--ink)', borderRadius: 'var(--pill)', background: 'var(--cobalt)', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 0 var(--ink)' }}>
                Retry →
              </button>
            </div>
          ) : card ? (
            <>
              {/* ── Flip card ── */}
              <div className="flip-scene" onClick={() => setIsFlipped(f => !f)}>
                <div className={`flip-card ${isFlipped ? 'is-flipped' : ''}`} style={{ minHeight: '420px' }}>

                  {/* FRONT */}
                  <div className="flip-face slide" style={{ position: 'absolute', inset: 0 }}>
                    <div className="slide-top" style={{ background: depthColor }}>
                      <span className="slide-kicker">{STUDY_DEPTHS[depth]?.label}</span>
                      <span className="slide-count">{deckPos + 1} / {deck.length}</span>
                    </div>
                    <div className="slide-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '340px', padding: '48px 40px' }}>
                      <div style={{ display: 'inline-block', background: 'var(--lime)', border: '2px solid var(--ink)', borderRadius: '8px', padding: '3px 12px', fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '20px' }}>
                        {topicName}
                      </div>
                      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.3rem, 3vw, 2rem)', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '24px', lineHeight: 1.15 }}>
                        {card.title}
                      </h2>
                      <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', marginBottom: '28px', maxWidth: '300px', lineHeight: 1.7 }}>
                        Think about it first — then click to reveal
                      </p>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: '2px solid var(--ink)', borderRadius: 'var(--pill)', padding: '8px 20px', background: 'var(--paper-2)', boxShadow: '0 3px 0 var(--ink)', fontSize: '13px', fontWeight: 700 }}>
                        🔄 Click to reveal
                      </div>
                      {ratings[currentCard] && (
                        <div style={{ marginTop: '20px', fontSize: '12px', fontWeight: 700, color: ratings[currentCard] === 'know' ? 'var(--green)' : ratings[currentCard] === 'shaky' ? 'var(--tangerine)' : 'var(--magenta)' }}>
                          {ratings[currentCard] === 'know' ? '✅ Know it' : ratings[currentCard] === 'shaky' ? '⚠️ Shaky' : '❌ No idea'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BACK */}
                  <div className="flip-face flip-face-back slide" style={{ position: 'absolute', inset: 0 }}>
                    <div className="slide-top" style={{ background: 'var(--ink)' }}>
                      <span className="slide-kicker">Explanation</span>
                      <span className="slide-count">{deckPos + 1} / {deck.length}</span>
                    </div>
                    <div className="slide-body" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 320px)' }} onClick={e => e.stopPropagation()}>
                      <h2 style={{ marginBottom: '14px', fontSize: 'var(--text-xl)', lineHeight: 1.3 }}>{card.title}</h2>
                      <p style={{ lineHeight: 1.85, marginBottom: '20px' }}>{card.body}</p>

                      {card.key_points?.length > 0 && (
                        <div style={{ background: 'var(--cobalt-soft)', border: '2px solid var(--ink)', borderLeft: '6px solid var(--cobalt)', borderRadius: '0 12px 12px 0', padding: '14px 18px', marginBottom: '14px' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 700, color: 'var(--cobalt-ink)', textTransform: 'uppercase', marginBottom: '8px' }}>📌 Key Points</div>
                          <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {card.key_points.map((pt: string, i: number) => <li key={i} style={{ fontSize: '13.5px', lineHeight: 1.7 }}>{pt}</li>)}
                          </ul>
                        </div>
                      )}

                      {card.worked_example && (
                        <div style={{ background: 'var(--green-soft)', border: '2px solid var(--ink)', borderLeft: '6px solid var(--green)', borderRadius: '0 12px 12px 0', padding: '14px 18px', marginBottom: '14px' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', marginBottom: '8px' }}>📐 Worked Example</div>
                          <pre style={{ fontSize: '13px', lineHeight: 1.8, fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', margin: 0 }}>{card.worked_example}</pre>
                        </div>
                      )}

                      {(card.common_mistake || card.exam_tip) && (
                        <div style={{ display: 'grid', gridTemplateColumns: card.common_mistake && card.exam_tip ? '1fr 1fr' : '1fr', gap: '10px', marginBottom: '14px' }}>
                          {card.common_mistake && (
                            <div style={{ background: '#FFF0EE', border: '2px solid var(--ink)', borderLeft: '6px solid var(--tangerine)', borderRadius: '0 10px 10px 0', padding: '12px 14px' }}>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, color: 'var(--tangerine)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>⚠️ Common Mistake</div>
                              <p style={{ fontSize: '12.5px', lineHeight: 1.6, margin: 0 }}>{card.common_mistake}</p>
                            </div>
                          )}
                          {card.exam_tip && (
                            <div style={{ background: '#FDFDE0', border: '2px solid var(--ink)', borderLeft: '6px solid var(--lime-deep)', borderRadius: '0 10px 10px 0', padding: '12px 14px' }}>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, color: '#6b7a00', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>🎯 Exam Tip</div>
                              <p style={{ fontSize: '12.5px', lineHeight: 1.6, margin: 0 }}>{card.exam_tip}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {card.analogy && (
                        <div className="analogy">{card.analogy}</div>
                      )}

                      {/* Rating buttons */}
                      <div style={{ display: 'flex', gap: '10px', marginTop: '24px', paddingTop: '20px', borderTop: '2px solid var(--ink)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', marginRight: '4px', whiteSpace: 'nowrap' }}>Rate:</div>
                        {([['know', '✅', 'Know it', '1'], ['shaky', '⚠️', 'Shaky', '2'], ['no-idea', '❌', 'No idea', '3']] as const).map(([k, emoji, label, key]) => (
                          <button key={k} className={`rating-btn ${ratings[currentCard] === k ? k : ''}`} onClick={() => rate(k)}>
                            <span style={{ fontSize: '18px' }}>{emoji}</span>
                            <span>{label}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', opacity: 0.5 }}>({key})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="slide-nav" style={{ borderRadius: '0 0 var(--r) var(--r)', border: '2px solid var(--ink)', borderTop: '2px solid var(--ink)', marginTop: '-2px' }}>
                <button onClick={() => deckPos > 0 && setCurrentCard(deck[deckPos - 1])} disabled={deckPos === 0}
                  style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, border: '2px solid var(--ink)', borderRadius: '8px', padding: '8px 16px', background: 'var(--paper-2)', cursor: deckPos > 0 ? 'pointer' : 'not-allowed', opacity: deckPos === 0 ? 0.35 : 1, boxShadow: deckPos > 0 ? '0 2px 0 var(--ink)' : 'none', transition: 'all 0.15s' }}>
                  ← Prev
                </button>
                <button onClick={() => setIsFlipped(f => !f)}
                  style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, border: '2px solid var(--ink)', borderRadius: '8px', padding: '8px 20px', background: isFlipped ? 'var(--ink)' : 'var(--lime)', color: isFlipped ? '#fff' : 'var(--ink)', cursor: 'pointer', boxShadow: '0 2px 0 var(--ink)', transition: 'all 0.15s' }}>
                  {isFlipped ? 'Show front' : '🔄 Flip card'}
                </button>
                <button onClick={() => deckPos < deck.length - 1 ? setCurrentCard(deck[deckPos + 1]) : setShowSummary(true)}
                  style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, border: '2px solid var(--ink)', borderRadius: '8px', padding: '8px 16px', background: deckPos === deck.length - 1 ? 'var(--cobalt)' : 'var(--paper-2)', color: deckPos === deck.length - 1 ? '#fff' : 'var(--ink)', cursor: 'pointer', boxShadow: '0 2px 0 var(--ink)', transition: 'all 0.15s' }}>
                  {deckPos === deck.length - 1 ? 'Finish ✓' : 'Next →'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
