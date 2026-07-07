'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MathText from '@/components/ui/MathText';

interface Item {
  id: string;
  stem: string;
  options: string[];
  correct_index: number;
}

type Phase = 'loading' | 'pending' | 'ready' | 'playing' | 'submitted' | 'results' | 'error';

export default function DuelPlayPage() {
  const params = useParams();
  const router = useRouter();
  const duelId = params.id as string;

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [duel, setDuel] = useState<any>(null);
  const [userId, setUserId] = useState('');
  const [isChallenger, setIsChallenger] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});

  // Quiz state
  const [items, setItems] = useState<Item[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(40);
  const [totalTimeMs, setTotalTimeMs] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startRef = useRef(0);
  const answeredRef = useRef(false); // guard against double-answer

  // Fetch duel info
  const fetchDuel = useCallback(async () => {
    try {
      const res = await fetch(`/api/duels/${duelId}`);
      const data = await res.json();

      if (data.error) {
        setErrorMsg(data.error);
        setPhase('error');
        return;
      }

      setDuel(data.duel);
      setUserId(data.userId);
      setIsChallenger(data.isChallenger);
      setHasPlayed(data.hasPlayed);

      // Get display names (username or email)
      try {
        const res2 = await fetch('/api/users/search?q=@');
        const d2 = await res2.json();
        const map: Record<string, string> = {};
        for (const u of (d2.users || [])) map[u.id] = u.username || u.email;
        setEmailMap(map);
      } catch { /* lookup is best-effort */ }

      const status = data.duel?.status;
      if (status === 'completed' || data.hasPlayed) {
        setPhase('results');
      } else if (status === 'pending' && !data.isChallenger) {
        setPhase('pending');
      } else if (['accepted', 'in_progress'].includes(status)) {
        setPhase('ready');
      } else if (status === 'pending' && data.isChallenger) {
        // Challenger can't play until opponent accepts
        setPhase('results');
      } else {
        setPhase('results');
      }
    } catch (err) {
      console.error('Failed to fetch duel:', err);
      setErrorMsg('Failed to load duel. Please try again.');
      setPhase('error');
    }
  }, [duelId]);

  useEffect(() => { fetchDuel(); }, [fetchDuel]);

  // Timer — runs only during playing phase
  useEffect(() => {
    if (phase !== 'playing' || items.length === 0) return;

    answeredRef.current = false;
    const intervalId = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          // Time's up — auto-skip
          if (!answeredRef.current) {
            answeredRef.current = true;
            clearInterval(intervalId);
            handleTimeUp();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    timerRef.current = intervalId;
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIdx, items.length]);

  const handleTimeUp = () => {
    // Auto-skip with wrong answer
    const item = items[currentIdx];
    if (!item) return;

    const latencyMs = 40000; // max time
    const answer = {
      itemId: item.id,
      chosenIndex: -1,
      isCorrect: false,
      latencyMs,
      questionNumber: currentIdx + 1,
    };

    setTotalTimeMs(prev => prev + latencyMs);
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    setSelectedOption(-1);
    setShowFeedback(true);

    setTimeout(() => {
      setShowFeedback(false);
      setSelectedOption(null);
      if (currentIdx + 1 >= items.length) {
        submitDuel(newAnswers);
      } else {
        setCurrentIdx(prev => prev + 1);
        setTimeLeft(40);
        startRef.current = Date.now();
      }
    }, 1000);
  };

  const startQuiz = async () => {
    try {
      const res = await fetch(`/api/duels/${duelId}/play`);
      const data = await res.json();
      if (data.error) {
        setErrorMsg(data.error);
        setPhase('error');
        return;
      }
      if (!data.items || data.items.length === 0) {
        setErrorMsg('No questions available for this duel.');
        setPhase('error');
        return;
      }
      setItems(data.items);
      setCurrentIdx(0);
      setAnswers([]);
      setTotalTimeMs(0);
      setTimeLeft(40);
      startRef.current = Date.now();
      setPhase('playing');
    } catch (err) {
      console.error('Failed to start duel:', err);
      setErrorMsg('Failed to start duel. Please try again.');
      setPhase('error');
    }
  };

  const handleAnswer = (chosenIndex: number) => {
    if (showFeedback || answeredRef.current) return;
    answeredRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    const latencyMs = Date.now() - startRef.current;
    const item = items[currentIdx];
    if (!item) return;

    const isCorrect = chosenIndex === item.correct_index;
    const answer = {
      itemId: item.id,
      chosenIndex,
      isCorrect,
      latencyMs,
      questionNumber: currentIdx + 1,
    };

    setSelectedOption(chosenIndex);
    setShowFeedback(true);
    setTotalTimeMs(prev => prev + latencyMs);

    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    setTimeout(() => {
      setShowFeedback(false);
      setSelectedOption(null);
      if (currentIdx + 1 >= items.length) {
        submitDuel(newAnswers);
      } else {
        setCurrentIdx(prev => prev + 1);
        setTimeLeft(40);
        startRef.current = Date.now();
      }
    }, 1200);
  };

  const submitDuel = async (finalAnswers: any[]) => {
    setPhase('submitted');
    try {
      const total = finalAnswers.reduce((s, a) => s + a.latencyMs, 0);
      await fetch(`/api/duels/${duelId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers, totalTimeMs: total }),
      });
    } catch (err) {
      console.error('Failed to submit duel:', err);
    }
    fetchDuel();
  };

  const getEmail = (uid: string) => emailMap[uid] || uid.slice(0, 8) + '...';

  const handleAccept = async () => {
    await fetch(`/api/duels/${duelId}/accept`, { method: 'POST' });
    fetchDuel();
  };

  // ── Error ──────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '80px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', marginBottom: 8 }}>Something went wrong</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>{errorMsg}</p>
        <button onClick={() => router.push('/duels')} className="btn btn-primary" style={{ padding: '10px 24px' }}>Back to Duels</button>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────
  if (phase === 'loading' || !duel) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid var(--line)', borderTop: '4px solid var(--magenta)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  // ── Pending (opponent needs to accept) ─────────────────────────
  if (phase === 'pending') {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '60px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚔️</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase', marginBottom: 8 }}>
          DUEL <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)' }}>Challenge</span>
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 4 }}>
          <strong>{getEmail(duel.challenger_id)}</strong> challenged you!
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
          📚 {duel.courses?.name} · 20 questions · 40 seconds each
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={handleAccept} className="btn btn-primary" style={{ padding: '12px 32px', fontSize: 15 }}>
            Accept ⚔️
          </button>
          <button onClick={() => router.push('/duels')} style={{ padding: '12px 32px', borderRadius: 'var(--pill)', border: '2px solid var(--ink)', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // ── Ready (about to start) ─────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '60px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚔️</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase', marginBottom: 8 }}>
          READY TO <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)' }}>Duel?</span>
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 4 }}>
          vs <strong>{getEmail(isChallenger ? duel.opponent_id : duel.challenger_id)}</strong>
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>
          📚 {duel.courses?.name}
        </p>
        <div className="card" style={{ padding: '16px 20px', marginBottom: 24, display: 'inline-block' }}>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--muted)' }}>
            20 QUESTIONS · 40 SEC EACH · FASTEST WINS TIES
          </div>
        </div>
        <div>
          <button onClick={startQuiz} className="btn btn-primary" style={{ padding: '14px 40px', fontSize: 16 }}>
            Start Duel ⚔️
          </button>
        </div>
      </div>
    );
  }

  // ── Playing ────────────────────────────────────────────────────
  if (phase === 'playing') {
    if (items.length === 0 || currentIdx >= items.length) {
      return (
        <div style={{ maxWidth: 500, margin: '0 auto', padding: '80px 16px', textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '4px solid var(--line)', borderTop: '4px solid var(--magenta)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--muted)' }}>Loading questions...</p>
        </div>
      );
    }

    const item = items[currentIdx];
    const progress = ((currentIdx) / items.length) * 100;
    const timerPct = (timeLeft / 40) * 100;

    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
            ⚔️ DUEL · Q{currentIdx + 1}/{items.length}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800,
            color: timeLeft <= 10 ? 'var(--magenta)' : timeLeft <= 20 ? 'var(--tangerine)' : 'var(--ink)',
          }}>
            {timeLeft}s
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, borderRadius: 3, background: 'var(--line)', marginBottom: 4 }}>
          <div style={{ height: '100%', borderRadius: 3, background: 'var(--cobalt)', width: `${progress}%`, transition: 'width 0.3s' }} />
        </div>

        {/* Timer bar */}
        <div style={{ height: 4, borderRadius: 2, background: 'var(--line)', marginBottom: 24 }}>
          <div style={{
            height: '100%', borderRadius: 2, width: `${timerPct}%`, transition: 'width 1s linear',
            background: timeLeft <= 10 ? 'var(--magenta)' : timeLeft <= 20 ? 'var(--tangerine)' : 'var(--green)',
          }} />
        </div>

        {/* Question */}
        <div className="card" style={{ padding: '24px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5 }}>
            <MathText text={item.stem} />
          </div>
        </div>

        {/* Options */}
        <div style={{ display: 'grid', gap: 10 }}>
          {(item.options || []).map((opt: string, i: number) => {
            const isSelected = selectedOption === i;
            const isCorrect = i === item.correct_index;
            let bg = '#fff';
            let borderColor = 'var(--ink)';
            if (showFeedback) {
              if (isCorrect) { bg = 'var(--green-soft)'; borderColor = 'var(--green)'; }
              else if (isSelected && !isCorrect) { bg = '#FDEAEA'; borderColor = 'var(--magenta)'; }
            }

            return (
              <button key={i} onClick={() => handleAnswer(i)}
                disabled={showFeedback}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 12, border: `2px solid ${borderColor}`,
                  background: bg, textAlign: 'left', cursor: showFeedback ? 'default' : 'pointer',
                  fontSize: 14, fontWeight: isSelected ? 700 : 500, transition: 'all 0.15s',
                }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800, color: 'var(--muted)', marginRight: 10 }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <MathText text={opt} />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Submitted (waiting) ─────────────────────────────────────────
  if (phase === 'submitted') {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '80px 16px', textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '4px solid var(--line)', borderTop: '4px solid var(--magenta)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Submitting your answers...</p>
      </div>
    );
  }

  // ── Results ─────────────────────────────────────────────────────
  const challengerEmail = getEmail(duel.challenger_id);
  const opponentEmail = getEmail(duel.opponent_id);
  const isComplete = duel.status === 'completed';
  const iWon = duel.winner_id === userId;
  const isDraw = isComplete && !duel.winner_id;
  const isPendingForChallenger = duel.status === 'pending' && isChallenger;

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
      <button onClick={() => router.push('/duels')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cobalt)', fontWeight: 700, fontSize: 13, marginBottom: 20 }}>
        ← Back to Duels
      </button>

      <div style={{ fontSize: 48, marginBottom: 12 }}>
        {isComplete ? (iWon ? '🏆' : isDraw ? '🤝' : '💔') : isPendingForChallenger ? '⏳' : '⏳'}
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase', marginBottom: 4 }}>
        {isComplete ? (iWon ? 'YOU WIN!' : isDraw ? 'DRAW' : 'YOU LOST') : isPendingForChallenger ? 'WAITING FOR OPPONENT' : 'WAITING'}
      </h2>
      {isPendingForChallenger && (
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>
          Your challenge has been sent to <strong>{opponentEmail}</strong>. You can play once they accept.
        </p>
      )}
      {hasPlayed && !isComplete && (
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>
          You&apos;ve played! Waiting for your opponent to finish...
        </p>
      )}
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
        📚 {duel.courses?.name}
      </p>

      {/* Scoreboard */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', borderBottom: '2px solid var(--ink)' }}>
          {/* Challenger */}
          <div style={{ padding: '20px 16px', textAlign: 'center', background: duel.winner_id === duel.challenger_id ? 'rgba(34,197,94,0.08)' : 'transparent' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
              {duel.challenger_id === userId ? 'YOU' : 'CHALLENGER'}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {challengerEmail}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', color: duel.challenger_correct !== null ? 'var(--ink)' : 'var(--line)' }}>
              {duel.challenger_correct ?? '—'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>/ 20</div>
            {duel.challenger_time_ms != null && (
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                {(duel.challenger_time_ms / 1000).toFixed(1)}s total
              </div>
            )}
          </div>

          {/* VS */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', color: 'var(--muted)', borderLeft: '2px solid var(--ink)', borderRight: '2px solid var(--ink)' }}>
            VS
          </div>

          {/* Opponent */}
          <div style={{ padding: '20px 16px', textAlign: 'center', background: duel.winner_id === duel.opponent_id ? 'rgba(34,197,94,0.08)' : 'transparent' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
              {duel.opponent_id === userId ? 'YOU' : 'OPPONENT'}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {opponentEmail}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', color: duel.opponent_correct !== null ? 'var(--ink)' : 'var(--line)' }}>
              {duel.opponent_correct ?? '—'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>/ 20</div>
            {duel.opponent_time_ms != null && (
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                {(duel.opponent_time_ms / 1000).toFixed(1)}s total
              </div>
            )}
          </div>
        </div>
      </div>

      <button onClick={() => router.push('/duels')} className="btn btn-primary" style={{ marginTop: 24, padding: '12px 32px', fontSize: 14 }}>
        Back to Duels
      </button>
    </div>
  );
}
