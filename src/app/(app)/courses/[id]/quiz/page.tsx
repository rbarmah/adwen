'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Badge, { Sparkle } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { selectNextItem, shouldStop, getDefaultStopCriteria } from '@/lib/engine/cat';
import { estimateTheta, estimateMultidimensionalTheta } from '@/lib/engine/irt';
import { updateMastery, propagatePrerequisites, predictForgetTime } from '@/lib/engine/bkt';
import type { Item } from '@/types/database.types';

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [phase, setPhase] = useState<'intro' | 'quiz' | 'results'>('intro');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Database Items
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [quizCount, setQuizCount] = useState(0); // number of items answered in session
  const [administeredIds, setAdministeredIds] = useState<string[]>([]);
  
  // Quiz State
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [latencyMs, setLatencyMs] = useState(0);

  // Stats / Telemetry
  const [theta, setTheta] = useState(0.0);
  const [se, setSe] = useState(1.0);
  const [dimThetas, setDimThetas] = useState<Record<string, number>>({
    recall: 0.0,
    comprehension: 0.0,
    application: 0.0,
    analysis: 0.0,
    evaluation: 0.0,
    maths: 0.0,
  });
  const [cbwCount, setCbwCount] = useState(0); // confident but wrong
  const [totalTime, setTotalTime] = useState(0); // accumulated ms
  const [difficultyPath, setDifficultyPath] = useState<{ d: number; correct: boolean }[]>([]);

  // Response History (for IRT estimation)
  const [responseHistory, setResponseHistory] = useState<any[]>([]);

  // Timers
  const [timed, setTimed] = useState(true);
  const [timeLeft, setTimeLeft] = useState(720); // 12 minutes
  const [timerDisplay, setTimerDisplay] = useState('12:00');
  
  const startTimeRef = useRef<number>(0);
  const quizTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pageTimeRef = useRef<number>(0);
  const [liveQTime, setLiveQTime] = useState('0.0s');

  const sessionIdRef = useRef<string | null>(null);
  const generationLoopRef = useRef<boolean>(false);

  const [generatingItems, setGeneratingItems] = useState(false);
  const [itemBankSize, setItemBankSize] = useState(0);

  // ── Fetch items from DB and update state ─────────────────────────────────────
  const refreshItems = async (supabase: any) => {
    const { data: items } = await (supabase
      .from('items') as any)
      .select('*')
      .eq('course_id', courseId)
      .in('status', ['live', 'draft']);
    if (items) {
      setAllItems(items);
      setItemBankSize(items.length);
      return items as any[];
    }
    return [];
  };

  useEffect(() => {
    const init = async () => {
      if (!courseId) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Load existing items first
      await refreshItems(supabase);

      // Load all previously answered items for this user to prevent repetition
      if (user) {
        const { data: pastResponses } = await (supabase.from('response_events') as any)
          .select('item_id')
          .eq('user_id', user.id);
        
        if (pastResponses && pastResponses.length > 0) {
          const pastIds = pastResponses.map((r: any) => r.item_id);
          setAdministeredIds(pastIds);
        }
      }
    };
    init();
  }, [courseId]);

  // Quiz Timer loops
  useEffect(() => {
    if (phase === 'quiz') {
      startTimeRef.current = performance.now();
      pageTimeRef.current = Date.now();

      quizTimerRef.current = setInterval(() => {
        // Decrement session timer
        if (timed) {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(quizTimerRef.current!);
              handleEndQuiz();
              return 0;
            }
            const nextTime = prev - 1;
            const m = Math.floor(nextTime / 60);
            const s = nextTime % 60;
            setTimerDisplay(`${m}:${String(s).padStart(2, '0')}`);
            return nextTime;
          });
        } else {
          setTimerDisplay('off · still timing');
        }

        // Increment current question live time
        const elapsed = (performance.now() - startTimeRef.current) / 1000;
        setLiveQTime(`${elapsed.toFixed(0)}s`);
      }, 1000);
    }

    return () => {
      if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    };
  }, [phase, currentItem, timed]);

  const handleStartQuiz = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const supabase = createClient();
      // Refresh items from DB in case the background loop added more since page load
      const items = await refreshItems(supabase);

      if (items.length === 0) {
        alert('Questions are still being generated. Please wait a moment and try again.');
        setLoading(false);
        return;
      }



      // 1. Create quiz session
      const { data: sessionData, error: sessError } = await (supabase.from('quiz_sessions') as any)
        .insert({
          user_id: user.id,
          course_id: courseId,
          timed: timed
        })
        .select()
        .single();

      if (sessError) throw sessError;
      const session = sessionData as any;
      sessionIdRef.current = session.id;

      // 2. Select first item
      const first = selectNextItem(0.0, items, { excludeItemIds: administeredIds, budget: 30 });
      if (first) {
        setCurrentItem(first);
        setAdministeredIds((prev) => [...prev, first.id]);
        setQuizCount(1);
        setTheta(0.0);
        setSe(1.0);
        setPhase('quiz');
      } else {
        alert('Could not select a starting question. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error starting quiz session.');
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async () => {
    if (selectedOption === null || !confidence || !currentItem || !user) return;

    const latMs = Date.now() - pageTimeRef.current;
    setLatencyMs(latMs);
    setTotalTime((prev) => prev + latMs);

    const correct = selectedOption === currentItem.correct_index;
    setIsCorrect(correct);
    setShowFeedback(true);

    // Track CBW (confident but wrong)
    const isCbw = !correct && (confidence === 'certain' || confidence === 'fairly');
    if (isCbw) setCbwCount((prev) => prev + 1);

    // Record response parameters for IRT calculation
    const responseObj = {
      itemId: currentItem.id,
      correct: correct,
      itemParams: {
        a: Number(currentItem.discrimination_a || 1.0),
        b: Number(currentItem.difficulty_b || 0.0),
        c: Number(currentItem.guessing_c || 0.25),
      },
    };

    const newHistory = [...responseHistory, responseObj];
    setResponseHistory(newHistory);

    // Estimate new theta using deterministic IRT integration
    const estimate = estimateTheta(newHistory, 0.0, 1.0);
    const newTheta = estimate.theta;
    const newSe = estimate.se;

    setTheta(newTheta);
    setSe(newSe);

    // Estimate multidimensional ability dimensions
    const historyWithTypes = newHistory.map(item => {
      const origItem = allItems.find(x => x.id === item.itemId);
      return {
        ...item,
        cognitiveType: origItem?.cognitive_type || 'memory'
      };
    });

    const dimEstimates = estimateMultidimensionalTheta(historyWithTypes, 0.0, 1.0);
    const updatedDimThetas = {
      recall:        dimEstimates.recall.theta,
      comprehension: dimEstimates.comprehension.theta,
      application:   dimEstimates.application.theta,
      analysis:      dimEstimates.analysis.theta,
      evaluation:    dimEstimates.evaluation.theta,
      maths:         dimEstimates.maths.theta,
    };
    setDimThetas(updatedDimThetas);

    // Save path history for difficulty ladder
    setDifficultyPath((prev) => [...prev, { d: Number(currentItem.difficulty_b || 3), correct }]);

    try {
      // 3. Save response event to database
      const supabase = createClient();
      await (supabase.from('response_events') as any).insert({
        session_id: sessionIdRef.current,
        user_id: user.id,
        item_id: currentItem.id,
        chosen_index: selectedOption,
        is_correct: correct,
        latency_ms: latMs,
        stated_confidence: confidence,
        timer_mode: timed ? 'on' : 'off',
        theta_before: theta,
        theta_after: newTheta,
        item_b_at_time: Number(currentItem.difficulty_b || 0)
      });
    } catch (err) {
      console.error('Error logging event:', err);
    }
  };

  const handleNext = () => {
    setShowFeedback(false);
    setSelectedOption(null);
    setConfidence(null);

    const stopCriteria = getDefaultStopCriteria(); // min 10, max 30, se threshold
    const shouldStopSession = shouldStop(se, quizCount, stopCriteria);

    if (shouldStopSession) {
      handleEndQuiz();
    } else {
      // Select next item based on current ability theta (adaptive branch)
      const next = selectNextItem(theta, allItems, {
        excludeItemIds: administeredIds,
        budget: 30,
      });

      if (next) {
        setCurrentItem(next);
        setAdministeredIds((prev) => [...prev, next.id]);
        setQuizCount((prev) => prev + 1);
      } else {
        handleEndQuiz();
      }
    }
  };

  async function handleEndQuiz() {
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    setLoading(true);

    try {
      // Build response data for the server
      const responsesForServer = responseHistory.map((resp: any) => {
        const itemObj = allItems.find(x => x.id === resp.itemId);
        return {
          itemId: resp.itemId,
          correct: resp.correct,
          contentUnitId: itemObj?.content_unit_id || undefined,
          cognitiveType: itemObj?.cognitive_type || 'recall',
          latencyMs: resp.latencyMs,
          confidence: resp.confidence,
        };
      });

      // Single server call handles all post-quiz updates atomically
      const res = await fetch(`/api/courses/${courseId}/end-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          responses: responsesForServer,
          theta,
          se,
        }),
      });

      if (!res.ok) {
        console.error('[quiz] End-quiz API failed:', await res.text());
      }

      router.push(`/courses/${courseId}/results`);
    } catch (err) {
      console.error(err);
      router.push(`/courses/${courseId}/results`);
    }
  };

  // ========== INTRO SCREEN ==========
  if (phase === 'intro') {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '580px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Badge variant="cobalt" size="sm" style={{ marginBottom: '12px', fontFamily: 'var(--font-mono)' }}>Stage 6</Badge>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)', textTransform: 'uppercase', lineHeight: 1.1 }}>
            ADAPTIVE{' '}
            <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)', fontSize: '1.15em' }}>quiz</span>
          </h1>
        </div>

        <div className="card-premium card-glow" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎯</div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: '12px' }}>Ready to test your knowledge?</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '28px', lineHeight: 1.7, maxWidth: '400px', margin: '0 auto 28px' }}>
            Each item adapts to your performance. Time is logged whether or not the countdown is active.
          </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
            <button
              onClick={() => setTimed(!timed)}
              className={`chip ${timed ? 'on' : ''}`}
              style={{ border: '2px solid var(--ink)', cursor: 'pointer' }}
            >
              ⏱️ Timed Quiz ({timed ? 'ON' : 'OFF'})
            </button>
          </div>

          {/* Item bank status */}
          <div style={{
            marginBottom: '20px',
            padding: '16px 20px',
            borderRadius: 'var(--radius-sm)',
            background: generatingItems
              ? 'linear-gradient(135deg, rgba(65,105,225,0.08) 0%, rgba(65,105,225,0.04) 100%)'
              : 'rgba(0,180,100,0.07)',
            border: `1.5px solid ${generatingItems ? 'var(--cobalt)' : 'var(--lime)'}`,
            textAlign: 'left',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: generatingItems ? 10 : 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: generatingItems ? 'var(--cobalt)' : 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {generatingItems
                  ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span> Building question bank…</>
                  : <>✅ Question bank ready</>
                }
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                {itemBankSize} questions
              </span>
            </div>
            {generatingItems && (
              <>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                  Writing personalised questions for every topic and skill type. You can start now or wait for a larger bank.
                </div>
                {/* Animated progress bar */}
                <div style={{ height: 4, borderRadius: 99, background: 'rgba(65,105,225,0.15)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    borderRadius: 99,
                    background: 'var(--cobalt)',
                    width: `${Math.min(99, (itemBankSize / 135) * 100)}%`,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  Target: ~135 questions across all topics
                </div>
              </>
            )}
          </div>

          <Button
            size="lg"
            onClick={handleStartQuiz}
            loading={loading}
            disabled={itemBankSize === 0}
            style={{ width: '100%' }}
          >
            {itemBankSize === 0
              ? 'Generating questions…'
              : `Start quiz → (${itemBankSize} questions ready)`
            }
          </Button>
        </div>
      </div>
    );
  }


  // ========== ACTIVE QUIZ SCREEN ==========
  if (!currentItem) return null;
  const { maxItems } = getDefaultStopCriteria();
  const progress = ((quizCount - 1) / maxItems) * 100;
  // Pre-compute whether the CAT would stop after this question (for button label)
  const willStopNext = shouldStop(se, quizCount, getDefaultStopCriteria());
  const confidenceOptions = [
    { value: 'guessing', label: 'Guessing', emoji: '🤔' },
    { value: 'unsure', label: 'Unsure', emoji: '😐' },
    { value: 'fairly', label: 'Fairly sure', emoji: '😏' },
    { value: 'certain', label: 'Certain', emoji: '😎' }
  ];

  return (
    <div className="animate-fade-in" style={{ maxWidth: '740px', margin: '0 auto' }}>
      {/* Top progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--muted)', flexShrink: 0 }}>
          Question {quizCount} · adaptive
        </span>
        <div style={{ flex: 1, height: '6px', borderRadius: 'var(--radius-pill)', background: 'var(--line)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 'var(--radius-pill)',
            background: 'var(--tangerine)',
            width: `${progress}%`,
            transition: 'width 0.5s ease-out',
          }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="note">Timed</span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 13px', borderRadius: 'var(--pill)',
            background: 'var(--ink)', color: '#fff', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)'
          }}>
            {timerDisplay}
          </div>
          <Button variant="ghost" onClick={() => setTimed(!timed)} style={{ padding: '6px 12px', fontSize: '11px' }}>
            Toggle Timer
          </Button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="telemetry">
        <div className="tele"><span className="k">Time on Q</span><span className="v live">{liveQTime}</span></div>
        <div className="tele"><span className="k">Avg / Q</span><span className="v">{quizCount > 1 ? `${((totalTime + latencyMs) / (quizCount * 1000)).toFixed(1)}s` : '—'}</span></div>
        <div className="tele"><span className="k">Ability θ</span><span className="v live">{theta >= 0 ? '+' : ''}{theta.toFixed(2)}</span></div>
        <div className="tele"><span className="k">Conf-but-wrong</span><span className="v">{cbwCount}</span></div>
        <div className="tele" style={{ marginLeft: 'auto' }}>
          <span className="k">Difficulty path (adaptive)</span>
          <div className="ladder">
            {difficultyPath.map((p, i) => (
              <div
                key={i}
                className="rung"
                style={{
                  height: `${p.d * 8 + 6}px`,
                  background: p.correct ? 'var(--green)' : 'var(--magenta)',
                  border: '1px solid var(--ink)',
                  width: '12px'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="card-premium" style={{ padding: '40px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
          background: 'var(--tangerine)',
        }} />

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <Badge variant="cobalt" size="sm">Q{quizCount}</Badge>
          <Badge variant="muted" size="sm">Difficulty {currentItem.difficulty_bucket}/5</Badge>
          <Badge variant="muted" size="sm" style={{ textTransform: 'uppercase' }}>{currentItem.cognitive_type}</Badge>
        </div>

        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, lineHeight: 1.6, marginBottom: '28px' }}>
          {currentItem.stem}
        </h2>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
          {currentItem.options?.map((option: string, i: number) => {
            const isSelected = selectedOption === i;
            const isCorrect = showFeedback && i === currentItem.correct_index;
            const isWrong = showFeedback && isSelected && i !== currentItem.correct_index;

            return (
              <button
                key={i}
                onClick={() => !showFeedback && setSelectedOption(i)}
                disabled={showFeedback}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '18px 22px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${isCorrect ? 'var(--green)' : isWrong ? 'var(--magenta)' : isSelected ? 'var(--cobalt)' : 'var(--ink)'}`,
                  background: isCorrect ? 'var(--green-soft)' : isWrong ? '#FBDCEC' : isSelected ? 'var(--lime)' : '#fff',
                  cursor: showFeedback ? 'default' : 'pointer',
                  transition: 'all var(--transition-fast)',
                  textAlign: 'left',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-body)',
                  lineHeight: 1.6,
                  width: '100%',
                  color: 'var(--ink)',
                  fontWeight: 600,
                  boxShadow: isSelected && !showFeedback ? '0 3px 0 var(--ink)' : 'none',
                }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  border: '2px solid var(--ink)',
                  background: isCorrect ? 'var(--green)' : isWrong ? 'var(--magenta)' : isSelected ? 'var(--ink)' : '#EFEEE6',
                  color: isSelected || isCorrect || isWrong ? '#fff' : 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 'var(--text-xs)', flexShrink: 0,
                }}>
                  {isCorrect ? '✓' : isWrong ? '✗' : String.fromCharCode(65 + i)}
                </div>
                <span style={{ flex: 1 }}>{option}</span>
                {showFeedback && currentItem.options_misconception?.[i] && (
                  <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontStyle: 'italic' }}>
                    {currentItem.options_misconception[i]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Misconception Feedback */}
        {showFeedback && selectedOption !== null && (
          <div style={{
            padding: '16px 20px', borderRadius: 'var(--radius-sm)',
            border: '2px solid var(--ink)',
            background: isCorrect ? 'var(--green-soft)' : '#FBDCEC',
            color: isCorrect ? '#1f6b45' : '#A8246B',
            marginBottom: '24px', fontSize: 'var(--text-sm)', lineHeight: 1.7,
          }}>
            {isCorrect ? (
              <strong>✓ Correct! Well reasoned. Next item will adapt to be harder.</strong>
            ) : (
              <div>
                <strong>Misconception detected:</strong>{' '}
                {currentItem.options_misconception?.[selectedOption] || 'Wrong conceptual step.'}
              </div>
            )}
          </div>
        )}

        {/* Confidence rating */}
        {!showFeedback && (
          <div style={{ marginBottom: '24px', borderTop: '1px dashed var(--line)', paddingTop: '15px' }}>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: '12px', color: 'var(--ink)' }}>
              How sure are you?
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {confidenceOptions.map((cl) => (
                <button
                  key={cl.value}
                  onClick={() => setConfidence(cl.value)}
                  style={{
                    flex: 1, padding: '12px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: `2px solid var(--ink)`,
                    background: confidence === cl.value ? 'var(--lime)' : '#fff',
                    boxShadow: confidence === cl.value ? '0 3px 0 var(--ink)' : 'none',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontFamily: 'var(--font-body)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    transition: 'all var(--transition-fast)',
                    color: 'var(--ink)',
                  }}
                >
                  <span style={{ fontSize: '1.4em' }}>{cl.emoji}</span>
                  <span style={{ fontWeight: 700, fontSize: '11px' }}>{cl.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit / Next */}
        {!showFeedback ? (
          <Button onClick={handleSubmit} disabled={selectedOption === null || !confidence} style={{ width: '100%' }} size="lg">
            Submit answer
          </Button>
        ) : (
          <Button onClick={handleNext} style={{ width: '100%' }} size="lg">
            {willStopNext ? 'Finish & see results →' : 'Next question →'}
          </Button>
        )}
      </div>
    </div>
  );
}
