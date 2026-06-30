'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import {
  SYMBOL_DIGIT_KEY,
  generateSymbolSequence,
  ATTENTION_CONFIG,
  generateAttentionSequence,
  LOGICAL_REASONING_QUESTIONS,
  ANALYTICAL_QUESTIONS,
  METACOGNITIVE_QUESTIONS,
  CONFIDENCE_LEVELS,
  TESTS_CONFIG,
} from '../data';

// ── Shuffle utility: randomizes question order AND option positions ──────
type MCQ = { q: string; o: string[]; c: number; domain?: string };

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function shuffleQuestions(questions: MCQ[]): MCQ[] {
  // 1. Shuffle question order
  const shuffled = shuffleArray(questions);
  // 2. For each question, shuffle option positions and update correct index
  return shuffled.map(q => {
    const indices = q.o.map((_, i) => i);
    const shuffledIndices = shuffleArray(indices);
    const newOptions = shuffledIndices.map(i => q.o[i]);
    const newCorrect = shuffledIndices.indexOf(q.c);
    return { ...q, o: newOptions, c: newCorrect };
  });
}

interface CognitiveTestsStepProps {
  programme: string;
  initialScores?: Record<string, number | null>;
  onComplete: (scores: Record<string, number | null>) => void;
  onSkipAll: () => void;
}

export default function CognitiveTestsStep({
  programme,
  initialScores,
  onComplete,
}: CognitiveTestsStepProps) {
  const [curTest, setCurTest] = useState(0); // 0-5 for 6 tests
  const [testActiveState, setTestActiveState] = useState<'intro' | 'testing' | 'result'>('intro');

  const [scores, setScores] = useState<Record<string, number | null>>(
    initialScores || { wm: null, speed: null, attention: null, logic: null, analysis: null, metacog: null }
  );

  const [retakeCounts, setRetakeCounts] = useState<Record<number, number>>({});
  const [pendingScore, setPendingScore] = useState<Record<string, number> | null>(null);

  // Shuffled question banks — generated fresh when each test starts
  const [shuffledLogic, setShuffledLogic] = useState<MCQ[]>([]);
  const [shuffledAnalysis, setShuffledAnalysis] = useState<MCQ[]>([]);
  const [shuffledMeta, setShuffledMeta] = useState<MCQ[]>([]);

  // ═══════════════════════════════════════════════════════════════
  // Test 1: Working Memory (18 trials — KEPT AS-IS)
  // ═══════════════════════════════════════════════════════════════
  const [wmTrial, setWmTrial] = useState(0);
  const [wmStatus, setWmStatus] = useState<'idle' | 'ready' | 'showing' | 'input' | 'feedback'>('idle');
  const [wmDisplayChar, setWmDisplayChar] = useState('');
  const [wmSequence, setWmSequence] = useState('');
  const [wmIn, setWmIn] = useState('');
  const [wmSpanLength, setWmSpanLength] = useState(3);
  const [wmCorrectCount, setWmCorrectCount] = useState(0);
  const [wmFeedbackStatus, setWmFeedbackStatus] = useState<'correct' | 'wrong'>('correct');

  const startWMTrial = () => {
    setWmIn('');
    setWmStatus('ready');
    let seq = '';
    const length = wmSpanLength;
    if (wmTrial < 12) {
      seq = Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
    } else {
      const chars = '346789ABCDEFGHJKLMNPRTUVwXY';
      seq = Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    }
    setWmSequence(seq);
    setTimeout(() => {
      setWmStatus('showing');
      let idx = 0;
      setWmDisplayChar(seq[0]);
      const interval = setInterval(() => {
        idx++;
        if (idx < seq.length) { setWmDisplayChar(seq[idx]); }
        else { clearInterval(interval); setWmDisplayChar(''); setTimeout(() => setWmStatus('input'), 300); }
      }, 850);
    }, 1200);
  };

  const submitWM = () => {
    let expected = wmSequence;
    if (wmTrial >= 6 && wmTrial < 12) expected = wmSequence.split('').reverse().join('');
    const isCorrect = wmIn.trim().toUpperCase() === expected;
    setWmFeedbackStatus(isCorrect ? 'correct' : 'wrong');
    setWmStatus('feedback');
    let newCorrect = wmCorrectCount;
    let newSpan = wmSpanLength;
    if (isCorrect) {
      newCorrect++; setWmCorrectCount(newCorrect);
      if (newCorrect % 2 === 0 && wmSpanLength < 9) { newSpan++; setWmSpanLength(newSpan); }
    } else {
      if (wmSpanLength > 2) { newSpan--; setWmSpanLength(newSpan); }
    }
    setTimeout(() => {
      const next = wmTrial + 1;
      if (next < 18) { setWmTrial(next); setWmStatus('idle'); }
      else {
        const score = Math.min(98, Math.round(30 + (newCorrect / 18) * 65 + (newSpan - 3) * 5));
        showResult({ wm: score });
      }
    }, 1200);
  };

  useEffect(() => {
    if (curTest === 0 && testActiveState === 'testing' && wmStatus === 'idle') startWMTrial();
  }, [wmStatus, wmTrial, curTest, testActiveState]);

  // ═══════════════════════════════════════════════════════════════
  // Test 2: Processing Speed — Symbol-Digit Substitution (60s)
  // ═══════════════════════════════════════════════════════════════
  const [sdSequence, setSdSequence] = useState<number[]>([]);
  const [sdCurrent, setSdCurrent] = useState(0);
  const [sdCorrect, setSdCorrect] = useState(0);
  const [sdTimeLeft, setSdTimeLeft] = useState(60);
  const [sdActive, setSdActive] = useState(false);
  const sdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startSpeedTest = () => {
    const seq = generateSymbolSequence(120); // enough for 60s
    setSdSequence(seq);
    setSdCurrent(0);
    setSdCorrect(0);
    setSdTimeLeft(60);
    setSdActive(true);
    setTestActiveState('testing');
  };

  useEffect(() => {
    if (!sdActive) return;
    sdTimerRef.current = setInterval(() => {
      setSdTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(sdTimerRef.current!);
          setSdActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (sdTimerRef.current) clearInterval(sdTimerRef.current); };
  }, [sdActive]);

  // When timer hits 0, calculate score
  useEffect(() => {
    if (sdTimeLeft === 0 && curTest === 1 && testActiveState === 'testing') {
      const score = Math.min(98, Math.max(20, Math.round((sdCorrect / Math.max(sdCurrent, 1)) * 50 + sdCorrect * 1.5)));
      setTimeout(() => showResult({ speed: score }), 800);
    }
  }, [sdTimeLeft]);

  const handleSpeedInput = (digit: number) => {
    if (!sdActive || sdCurrent >= sdSequence.length) return;
    const expected = SYMBOL_DIGIT_KEY[sdSequence[sdCurrent]].digit;
    if (digit === expected) setSdCorrect(prev => prev + 1);
    setSdCurrent(prev => prev + 1);
  };

  // ═══════════════════════════════════════════════════════════════
  // Test 3: Sustained Attention — Go/No-Go
  // ═══════════════════════════════════════════════════════════════
  const [attnSequence, setAttnSequence] = useState<{ letter: string; isTarget: boolean }[]>([]);
  const [attnIdx, setAttnIdx] = useState(0);
  const [attnPhase, setAttnPhase] = useState<'idle' | 'stimulus' | 'gap' | 'done'>('idle');
  const [attnCurrentLetter, setAttnCurrentLetter] = useState('');
  const [attnHits, setAttnHits] = useState(0);
  const [attnFalseAlarms, setAttnFalseAlarms] = useState(0);
  const [attnMisses, setAttnMisses] = useState(0);
  const attnRespondedRef = useRef(false);
  const attnTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startAttentionTest = () => {
    const seq = generateAttentionSequence();
    setAttnSequence(seq);
    setAttnIdx(0);
    setAttnHits(0);
    setAttnFalseAlarms(0);
    setAttnMisses(0);
    setAttnPhase('idle');
    setTestActiveState('testing');
    // Start first stimulus after brief delay
    setTimeout(() => showAttnStimulus(seq, 0), 500);
  };

  const showAttnStimulus = (seq: { letter: string; isTarget: boolean }[], idx: number) => {
    if (idx >= seq.length) {
      setAttnPhase('done');
      return;
    }
    attnRespondedRef.current = false;
    setAttnCurrentLetter(seq[idx].letter);
    setAttnPhase('stimulus');
    setAttnIdx(idx);

    // After stimulus duration, check for miss and show gap
    attnTimerRef.current = setTimeout(() => {
      if (!attnRespondedRef.current && seq[idx].isTarget) {
        setAttnMisses(prev => prev + 1);
      }
      setAttnPhase('gap');
      setAttnCurrentLetter('');

      // After gap, show next stimulus
      attnTimerRef.current = setTimeout(() => {
        showAttnStimulus(seq, idx + 1);
      }, ATTENTION_CONFIG.interStimulusMs);
    }, ATTENTION_CONFIG.stimulusDurationMs);
  };

  const handleAttnResponse = useCallback(() => {
    if (attnPhase !== 'stimulus' || attnRespondedRef.current) return;
    attnRespondedRef.current = true;
    const current = attnSequence[attnIdx];
    if (current?.isTarget) {
      setAttnHits(prev => prev + 1);
    } else {
      setAttnFalseAlarms(prev => prev + 1);
    }
  }, [attnPhase, attnSequence, attnIdx]);

  // Keyboard listener for Space
  useEffect(() => {
    if (curTest !== 2 || testActiveState !== 'testing') return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); handleAttnResponse(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [curTest, testActiveState, handleAttnResponse]);

  // When attention test is done, calculate score
  useEffect(() => {
    if (attnPhase === 'done' && curTest === 2) {
      const totalTargets = attnSequence.filter(s => s.isTarget).length;
      const hitRate = totalTargets > 0 ? attnHits / totalTargets : 0;
      const falseAlarmPenalty = attnFalseAlarms * 3;
      const score = Math.min(98, Math.max(20, Math.round(hitRate * 85 + 15 - falseAlarmPenalty)));
      setTimeout(() => showResult({ attention: score }), 1500);
    }
  }, [attnPhase]);

  // ═══════════════════════════════════════════════════════════════
  // Test 4: Logical Reasoning (12 MCQs)
  // ═══════════════════════════════════════════════════════════════
  const [logicTrial, setLogicTrial] = useState(0);
  const [logicCorrect, setLogicCorrect] = useState(0);
  const [logicStatus, setLogicStatus] = useState<'idle' | 'answered'>('idle');
  const [logicSelected, setLogicSelected] = useState<number | null>(null);

  const startLogicTest = () => {
    setShuffledLogic(shuffleQuestions(LOGICAL_REASONING_QUESTIONS));
    setLogicTrial(0); setLogicCorrect(0); setLogicStatus('idle'); setLogicSelected(null);
    setTestActiveState('testing');
  };

  const submitLogic = (idx: number) => {
    setLogicSelected(idx);
    setLogicStatus('answered');
    const isCorrect = idx === shuffledLogic[logicTrial].c;
    if (isCorrect) setLogicCorrect(prev => prev + 1);
    setTimeout(() => {
      const next = logicTrial + 1;
      if (next < shuffledLogic.length) { setLogicTrial(next); setLogicStatus('idle'); setLogicSelected(null); }
      else {
        const finalCorrect = logicCorrect + (isCorrect ? 1 : 0);
        const score = Math.round(25 + (finalCorrect / shuffledLogic.length) * 70);
        showResult({ logic: score });
      }
    }, 700);
  };

  // ═══════════════════════════════════════════════════════════════
  // Test 5: Analytical Reasoning (12 MCQs)
  // ═══════════════════════════════════════════════════════════════
  const [analysisTrial, setAnalysisTrial] = useState(0);
  const [analysisCorrect, setAnalysisCorrect] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'answered'>('idle');
  const [analysisSelected, setAnalysisSelected] = useState<number | null>(null);

  const startAnalysisTest = () => {
    setShuffledAnalysis(shuffleQuestions(ANALYTICAL_QUESTIONS));
    setAnalysisTrial(0); setAnalysisCorrect(0); setAnalysisStatus('idle'); setAnalysisSelected(null);
    setTestActiveState('testing');
  };

  const submitAnalysis = (idx: number) => {
    setAnalysisSelected(idx);
    setAnalysisStatus('answered');
    const isCorrect = idx === shuffledAnalysis[analysisTrial].c;
    if (isCorrect) setAnalysisCorrect(prev => prev + 1);
    setTimeout(() => {
      const next = analysisTrial + 1;
      if (next < shuffledAnalysis.length) { setAnalysisTrial(next); setAnalysisStatus('idle'); setAnalysisSelected(null); }
      else {
        const finalCorrect = analysisCorrect + (isCorrect ? 1 : 0);
        const score = Math.round(25 + (finalCorrect / shuffledAnalysis.length) * 70);
        showResult({ analysis: score });
      }
    }, 700);
  };

  // ═══════════════════════════════════════════════════════════════
  // Test 6: Metacognitive Calibration (10 MCQs + confidence)
  // ═══════════════════════════════════════════════════════════════
  const [metaTrial, setMetaTrial] = useState(0);
  const [metaStatus, setMetaStatus] = useState<'answering' | 'rating' | 'feedback'>('answering');
  const [metaSelected, setMetaSelected] = useState<number | null>(null);
  const [metaConfidence, setMetaConfidence] = useState(3);
  const [metaResults, setMetaResults] = useState<{ correct: boolean; confidence: number }[]>([]);

  const startMetaTest = () => {
    setShuffledMeta(shuffleQuestions(METACOGNITIVE_QUESTIONS));
    setMetaTrial(0); setMetaStatus('answering'); setMetaSelected(null);
    setMetaConfidence(3); setMetaResults([]);
    setTestActiveState('testing');
  };

  const submitMetaAnswer = (idx: number) => {
    setMetaSelected(idx);
    setMetaStatus('rating');
  };

  const submitMetaConfidence = () => {
    const isCorrect = metaSelected === shuffledMeta[metaTrial].c;
    const newResults = [...metaResults, { correct: isCorrect, confidence: metaConfidence }];
    setMetaResults(newResults);
    setMetaStatus('feedback');

    setTimeout(() => {
      const next = metaTrial + 1;
      if (next < shuffledMeta.length) {
        setMetaTrial(next); setMetaStatus('answering'); setMetaSelected(null); setMetaConfidence(3);
      } else {
        const accuracy = newResults.filter(r => r.correct).length / newResults.length;
        const avgConfidence = newResults.reduce((s, r) => s + r.confidence, 0) / newResults.length / 5;
        const calibrationGap = Math.abs(accuracy - avgConfidence);
        const score = Math.min(98, Math.max(20, Math.round(95 - calibrationGap * 100)));
        showResult({ metacog: score });
      }
    }, 1200);
  };

  // ═══════════════════════════════════════════════════════════════
  // Shared: Result screen & advance
  // ═══════════════════════════════════════════════════════════════

  const showResult = (newScore: Record<string, number>) => {
    const key = Object.keys(newScore)[0];
    const existingVal = pendingScore ? pendingScore[key] : null;
    const newVal = newScore[key];
    const maxVal = existingVal ? Math.max(existingVal, newVal) : newVal;
    setPendingScore({ [key]: maxVal });
    setTestActiveState('result');
  };

  const advanceTest = () => {
    if (pendingScore) {
      setScores(prev => ({ ...prev, ...pendingScore }));
      setPendingScore(null);
    }
    
    if (curTest < 5) {
      setCurTest(curTest + 1);
      setTestActiveState('intro');
    } else {
      onComplete({ ...scores, ...pendingScore });
    }
  };

  const handleSkipTest = () => {
    setPendingScore(null);
    if (curTest < 5) {
      setCurTest(curTest + 1);
      setTestActiveState('intro');
    } else {
      onComplete({ ...scores });
    }
  };

  const startTest = () => {
    setTestActiveState('testing');
    switch (curTest) {
      case 0: 
        setWmTrial(0); 
        setWmCorrectCount(0); 
        setWmSpanLength(3); 
        startWMTrial(); 
        break;
      case 1: startSpeedTest(); break;
      case 2: startAttentionTest(); break;
      case 3: startLogicTest(); break;
      case 4: startAnalysisTest(); break;
      case 5: startMetaTest(); break;
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // Render helpers
  // ═══════════════════════════════════════════════════════════════
  const renderIntro = () => {
    const test = TESTS_CONFIG[curTest];
    const isCompleted = pendingScore !== null || scores[test.key] !== null;
    return (
      <Card padding="lg">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', textTransform: 'uppercase', marginBottom: 12 }}>
            {test.title}
          </h2>
          <p style={{ color: 'var(--muted)' }}>{test.desc}</p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {isCompleted ? (
            <Button onClick={advanceTest} style={{ flex: 1 }}>Test Completed — Next Test →</Button>
          ) : (
            <Button onClick={startTest} style={{ flex: 1 }}>Start Test →</Button>
          )}
        </div>
      </Card>
    );
  };

  const renderResult = () => {
    const retakesUsed = retakeCounts[curTest] || 0;
    const retakesLeft = 2 - retakesUsed;
    const isLastTest = curTest === 5;
    return (
      <Card padding="lg">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', textTransform: 'uppercase', marginBottom: 8 }}>Test Completed</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Your response has been recorded. Lock in your result or retake if you feel you didn't do your best.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button onClick={advanceTest} style={{ background: 'var(--cobalt)', color: '#fff' }}>
            {isLastTest ? 'Finish All Tests & View Profile' : 'Lock Result & Continue →'}
          </Button>
          {retakesLeft > 0 ? (
            <Button onClick={() => { setRetakeCounts(prev => ({ ...prev, [curTest]: retakesUsed + 1 })); startTest(); }} style={{ background: '#f0f0f0' }}>
              🔄 Retake Test ({retakesLeft} remaining)
            </Button>
          ) : <div style={{ textAlign: 'center', color: 'var(--magenta)', fontSize: 13, fontWeight: 700 }}>No retakes remaining.</div>}
        </div>
      </Card>
    );
  };

  const renderMCQ = (
    question: { q: string; o: string[]; c: number },
    selected: number | null,
    status: 'idle' | 'answered',
    onSelect: (idx: number) => void,
  ) => (
    <div>
      <p style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', lineHeight: 1.5 }}>{question.q}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {question.o.map((option, idx) => {
          const isCorrect = idx === question.c;
          const isSel = selected === idx;
          let borderCol = 'var(--ink)', bgCol = '#fff', textCol = 'var(--ink)';
          if (status === 'answered') {
            if (isCorrect) { borderCol = '#15803D'; bgCol = '#DCFCE7'; textCol = '#15803D'; }
            else if (isSel) { borderCol = '#B91C1C'; bgCol = '#FEE2E2'; textCol = '#B91C1C'; }
          }
          return (
            <button key={option} onClick={() => status === 'idle' && onSelect(idx)} disabled={status === 'answered'}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px',
                border: `2.5px solid ${borderCol}`, borderRadius: 'var(--r)', background: bgCol,
                color: textCol, textAlign: 'left', fontSize: '15px', fontWeight: 600,
                cursor: status === 'idle' ? 'pointer' : 'default', width: '100%',
                transition: 'all var(--transition-smooth)'
              }}>
              <span className="mono" style={{ background: 'var(--ink)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                {'ABCD'[idx]}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const getProgress = () => {
    switch (curTest) {
      case 0: return { current: wmTrial + 1, total: 18 };
      case 1: return { current: sdCurrent + 1, total: sdSequence.length || 120 };
      case 2: return { current: attnIdx + 1, total: ATTENTION_CONFIG.totalStimuli };
      case 3: return { current: logicTrial + 1, total: 12 };
      case 4: return { current: analysisTrial + 1, total: 12 };
      case 5: return { current: metaTrial + 1, total: 10 };
      default: return { current: 0, total: 0 };
    }
  };

  const progress = getProgress();

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="animate-fade-in" style={{ maxWidth: 600, margin: '0 auto', paddingTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
        {TESTS_CONFIG.map((_, i) => (
          <div key={i} style={{
            width: 12, height: 12, borderRadius: '50%',
            background: i < curTest ? TESTS_CONFIG[i].color : i === curTest ? TESTS_CONFIG[i].color : 'var(--line)',
            opacity: i === curTest && testActiveState === 'intro' ? 0.5 : 1,
            border: i === curTest ? `2px solid var(--ink)` : 'none'
          }} />
        ))}
      </div>

      {testActiveState === 'intro' && renderIntro()}
      {testActiveState === 'result' && renderResult()}
      {testActiveState === 'testing' && (
        <div>
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between' }}>
            <h1 className="h-lg" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>{TESTS_CONFIG[curTest].icon}</span> {TESTS_CONFIG[curTest].title}
            </h1>
            <span className="mono note" style={{ fontWeight: 700 }}>
              {curTest === 1 ? `⏱ ${sdTimeLeft}s` : `${progress.current} / ${progress.total}`}
            </span>
          </div>

          <Card padding="lg" style={{ minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {curTest === 0 && (
              <div style={{ textAlign: 'center' }}>
                <p className="note" style={{ marginBottom: '12px' }}>{wmTrial < 6 ? 'Memorize sequence...' : wmTrial < 12 ? '⚠️ REVERSE ORDER!' : 'Mixed alphanumeric'}</p>
                {wmStatus === 'showing' && <div style={{ fontSize: '64px', fontWeight: 800 }}>{wmDisplayChar}</div>}
                {wmStatus === 'input' && (
                  <div style={{ maxWidth: '380px', margin: '0 auto' }}>
                    {wmTrial >= 6 && wmTrial < 12 && <p style={{ color: 'var(--magenta)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px' }}>⚠️ REVERSE ORDER</p>}
                    <input className="inp mono" type="text" value={wmIn} onChange={(e) => setWmIn(e.target.value)}
                      maxLength={wmSpanLength} placeholder="type sequence..."
                      style={{ fontSize: '28px', letterSpacing: '.12em', textAlign: 'center', textTransform: 'uppercase', width: '100%', marginBottom: '16px' }}
                      onKeyDown={(e) => e.key === 'Enter' && wmIn.length === wmSpanLength && submitWM()} autoFocus />
                    <Button style={{ width: '100%' }} onClick={submitWM} disabled={wmIn.length !== wmSpanLength}>Submit [Enter]</Button>
                  </div>
                )}
                {wmStatus === 'feedback' && (
                  <div style={{
                    padding: '20px', borderRadius: 'var(--r)', border: '3px solid var(--ink)',
                    background: wmFeedbackStatus === 'correct' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    color: wmFeedbackStatus === 'correct' ? '#14532D' : '#7F1D1D', fontWeight: 700, fontSize: '22px'
                  }}>
                    {wmFeedbackStatus === 'correct' ? '✓ CORRECT' : `✗ INCORRECT (was: ${wmSequence})`}
                  </div>
                )}
              </div>
            )}

            {/* ── TEST 2: Processing Speed — Symbol-Digit Substitution ── */}
            {curTest === 1 && (
              <div>
                {/* Reference key */}
                <div style={{
                  display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px',
                  padding: '12px', background: 'rgba(0,0,0,0.04)', borderRadius: 'var(--r)',
                  border: '2px dashed var(--ink)'
                }}>
                  {SYMBOL_DIGIT_KEY.map(item => (
                    <div key={item.digit} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', lineHeight: 1 }}>{item.symbol}</div>
                      <div className="mono" style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px', color: 'var(--cobalt)' }}>{item.digit}</div>
                    </div>
                  ))}
                </div>

                {sdActive && sdCurrent < sdSequence.length ? (
                  <div style={{ textAlign: 'center' }}>
                    {/* Current symbol to match */}
                    <div style={{
                      fontSize: '72px', lineHeight: 1, margin: '16px 0 24px',
                      background: 'var(--navy)', color: '#fff', display: 'inline-block',
                      padding: '20px 40px', borderRadius: 'var(--r)', border: '3px solid var(--ink)',
                    }}>
                      {SYMBOL_DIGIT_KEY[sdSequence[sdCurrent]].symbol}
                    </div>

                    {/* Digit buttons */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {SYMBOL_DIGIT_KEY.map(item => (
                        <button key={item.digit} onClick={() => handleSpeedInput(item.digit)}
                          style={{
                            width: '56px', height: '56px', fontSize: '24px', fontWeight: 800,
                            border: '2.5px solid var(--ink)', borderRadius: 'var(--r)',
                            background: '#fff', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                            transition: 'transform 0.1s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
                          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                        >
                          {item.digit}
                        </button>
                      ))}
                    </div>

                    <div className="mono" style={{ marginTop: '16px', fontSize: '14px', color: 'var(--muted)' }}>
                      Matched: <strong style={{ color: 'var(--ink)' }}>{sdCorrect}</strong> / {sdCurrent} attempted
                    </div>
                  </div>
                ) : !sdActive && sdTimeLeft === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <h3 style={{ fontSize: '22px', color: 'var(--cobalt)', marginBottom: '8px' }}>⏱ Time&apos;s Up!</h3>
                    <p className="mono" style={{ fontSize: '16px' }}>
                      {sdCorrect} correct out of {sdCurrent} attempted in 60 seconds
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {/* ── TEST 3: Sustained Attention — Go/No-Go ── */}
            {curTest === 2 && (
              <div style={{ textAlign: 'center' }}>
                <p className="note" style={{ marginBottom: '16px' }}>
                  Press <kbd style={{ background: 'var(--ink)', color: '#fff', padding: '2px 10px', borderRadius: '4px', fontWeight: 700 }}>SPACE</kbd> only when you see the letter <strong style={{ color: 'var(--magenta)', fontSize: '18px' }}>X</strong>
                </p>

                {attnPhase === 'stimulus' && (
                  <div style={{
                    fontSize: '96px', fontWeight: 800, fontFamily: 'var(--font-mono)',
                    color: attnCurrentLetter === ATTENTION_CONFIG.targetLetter ? 'var(--magenta)' : 'var(--ink)',
                    background: attnCurrentLetter === ATTENTION_CONFIG.targetLetter ? 'rgba(236,72,153,0.1)' : 'rgba(0,0,0,0.03)',
                    border: '3px solid var(--ink)', borderRadius: 'var(--r)',
                    width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '20px auto', transition: 'background 0.15s',
                  }}>
                    {attnCurrentLetter}
                  </div>
                )}

                {attnPhase === 'gap' && (
                  <div style={{
                    width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '20px auto', border: '3px dashed var(--muted)', borderRadius: 'var(--r)',
                    color: 'var(--muted)', fontSize: '14px'
                  }}>
                    ...
                  </div>
                )}

                {attnPhase === 'idle' && (
                  <div style={{ padding: '40px', color: 'var(--cobalt)', fontWeight: 700, fontSize: '18px' }}>
                    Starting...
                  </div>
                )}

                {attnPhase === 'done' && (
                  <div style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '20px', color: 'var(--cobalt)', marginBottom: '12px' }}>Attention Test Complete</h3>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
                      <div><span className="mono" style={{ fontSize: '24px', fontWeight: 800, color: '#22C55E' }}>{attnHits}</span><br /><span className="note">Hits</span></div>
                      <div><span className="mono" style={{ fontSize: '24px', fontWeight: 800, color: '#EF4444' }}>{attnFalseAlarms}</span><br /><span className="note">False Alarms</span></div>
                      <div><span className="mono" style={{ fontSize: '24px', fontWeight: 800, color: '#F59E0B' }}>{attnMisses}</span><br /><span className="note">Misses</span></div>
                    </div>
                  </div>
                )}

                {/* Mobile tap target */}
                {(attnPhase === 'stimulus' || attnPhase === 'gap') && (
                  <button onClick={handleAttnResponse} style={{
                    marginTop: '16px', padding: '14px 32px', fontSize: '16px', fontWeight: 700,
                    border: '2.5px solid var(--ink)', borderRadius: 'var(--pill)',
                    background: 'var(--lime)', cursor: 'pointer', width: '100%',
                  }}>
                    TAP for &quot;X&quot; (or press Space)
                  </button>
                )}
              </div>
            )}

            {/* ── TEST 4: Logical Reasoning ── */}
            {curTest === 3 && shuffledLogic.length > 0 && renderMCQ(shuffledLogic[logicTrial], logicSelected, logicStatus, submitLogic)}

            {/* ── TEST 5: Analytical Reasoning ── */}
            {curTest === 4 && shuffledAnalysis.length > 0 && renderMCQ(shuffledAnalysis[analysisTrial], analysisSelected, analysisStatus, submitAnalysis)}

            {/* ── TEST 6: Metacognitive Calibration ── */}
            {curTest === 5 && (
              <div>
                {metaStatus === 'answering' && shuffledMeta.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--cobalt)', fontWeight: 700, textTransform: 'uppercase' }}>
                        Domain: {shuffledMeta[metaTrial].domain}
                      </span>
                    </div>
                    <p style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', lineHeight: 1.5 }}>
                      {shuffledMeta[metaTrial].q}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {shuffledMeta[metaTrial].o.map((option, idx) => (
                        <button key={option} onClick={() => submitMetaAnswer(idx)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px',
                            border: '2.5px solid var(--ink)', borderRadius: 'var(--r)', background: '#fff',
                            color: 'var(--ink)', textAlign: 'left', fontSize: '15px', fontWeight: 600,
                            cursor: 'pointer', width: '100%', transition: 'all var(--transition-smooth)',
                          }}>
                          <span className="mono" style={{ background: 'var(--ink)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{'ABCD'[idx]}</span>
                          <span>{option}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {metaStatus === 'rating' && (
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink)' }}>
                      How confident are you in your answer?
                    </h3>
                    <p className="note" style={{ marginBottom: '20px' }}>
                      Be honest — this measures self-awareness, not correctness.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '400px', margin: '0 auto' }}>
                      {CONFIDENCE_LEVELS.map(level => (
                        <button key={level.value} onClick={() => setMetaConfidence(level.value)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                            border: `2.5px solid ${metaConfidence === level.value ? '#8B5CF6' : 'var(--ink)'}`,
                            borderRadius: 'var(--r)',
                            background: metaConfidence === level.value ? 'rgba(139,92,246,0.1)' : '#fff',
                            cursor: 'pointer', fontSize: '15px', fontWeight: metaConfidence === level.value ? 700 : 500,
                            transition: 'all 0.2s', width: '100%',
                          }}>
                          <span style={{ fontSize: '20px' }}>{level.emoji}</span>
                          <span>{level.label}</span>
                        </button>
                      ))}
                    </div>
                    <Button onClick={submitMetaConfidence} size="lg" style={{ marginTop: '20px', width: '100%' }}>
                      Confirm Confidence →
                    </Button>
                  </div>
                )}

                {metaStatus === 'feedback' && (
                  <div style={{ textAlign: 'center' }}>
                    {(() => {
                      const wasCorrect = metaSelected === shuffledMeta[metaTrial].c;
                      const confLabel = CONFIDENCE_LEVELS.find(l => l.value === metaConfidence);
                      return (
                        <div style={{
                          padding: '24px', borderRadius: 'var(--r)', border: '3px solid var(--ink)',
                          background: wasCorrect ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        }}>
                          <div style={{ fontSize: '22px', fontWeight: 700, color: wasCorrect ? '#15803D' : '#B91C1C', marginBottom: '8px' }}>
                            {wasCorrect ? '✓ Correct' : '✗ Incorrect'}
                          </div>
                          <div className="mono" style={{ fontSize: '13px', color: 'var(--muted)' }}>
                            Your confidence: {confLabel?.emoji} {confLabel?.label}
                            {wasCorrect && metaConfidence <= 2 && <span style={{ color: '#F59E0B' }}> — Under-confident!</span>}
                            {!wasCorrect && metaConfidence >= 4 && <span style={{ color: '#EF4444' }}> — Over-confident!</span>}
                            {((wasCorrect && metaConfidence >= 4) || (!wasCorrect && metaConfidence <= 2)) && <span style={{ color: '#22C55E' }}> — Well calibrated</span>}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Progress bar */}
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button variant="ghost" onClick={handleSkipTest}>Skip Test</Button>
            <div style={{ display: 'flex', gap: '3px' }}>
              {Array.from({ length: progress.total > 30 ? 20 : progress.total }).map((_, i) => {
                const scaled = progress.total > 30 ? Math.floor((i / 20) * progress.total) : i;
                return (
                  <div key={i} style={{
                    height: '8px', width: '12px', border: '1.5px solid var(--ink)',
                    background: scaled < (curTest === 1 ? sdCurrent : progress.current - 1) ? TESTS_CONFIG[curTest].color : '#fff',
                    borderRadius: '2px',
                  }} />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
