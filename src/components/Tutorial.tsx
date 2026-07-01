'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Tour step definitions ──────────────────────────────────────────────────────
interface TourStep {
  target: string;           // data-tour attribute value
  title: string;
  body: string;
  tip?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: 'tour-header',
    title: 'Your Dashboard',
    body: 'This is your command centre. All your registered courses appear here as notebook cards, each showing your mastery percentage and processing status.',
    tip: 'Courses turn "READY" once Adwen\'s AI finishes analyzing your study materials.',
    position: 'bottom',
  },
  {
    target: 'tour-new-course',
    title: 'Add a New Course',
    body: 'Click here to register a new course. You\'ll enter the course name, code, description, and your target grade. Adwen uses this to calibrate quizzes and study recommendations.',
    tip: 'Be specific with names — "MATH 263 — Linear Algebra" works better than just "Math".',
    position: 'bottom',
  },
  {
    target: 'tour-course-card',
    title: 'Course Cards',
    body: 'Each card shows your course at a glance — the mastery ring, topic count, readiness score, and exam countdown. Click any card to dive into that course.',
    tip: 'The mastery ring fills up as you answer quiz questions correctly.',
    position: 'bottom',
  },
  {
    target: 'tour-telemetry',
    title: 'Live Telemetry',
    body: 'This panel shows a real-time feed of your learning activity — quiz responses, ability updates, and course events. It helps you track what\'s happening under the hood.',
    tip: 'Watch your θ (theta) score change after each quiz question — that\'s your ability level.',
    position: 'bottom',
  },
  {
    target: 'tour-profile-btn',
    title: 'Profile & Settings',
    body: 'Click your avatar to access your Profile (cognitive diagnostics, academic info) and Settings (consent, data rights, tutorial replay).',
    tip: 'Your 6-dimension cognitive profile from onboarding is always accessible here.',
    position: 'bottom',
  },
];

// Steps shown when inside a course page
export const COURSE_TOUR_STEPS: TourStep[] = [
  {
    target: 'tour-course-nav-study',
    title: 'Study Materials',
    body: 'Upload lecture notes, past exams, and textbook chapters as PDFs. Adwen\'s AI extracts key concepts and builds a knowledge graph from your materials.',
    tip: 'Past exam papers are gold — they teach Adwen exactly what your lecturers test on.',
    position: 'right',
  },
  {
    target: 'tour-course-nav-quiz',
    title: 'Adaptive Quiz Engine',
    body: 'AI-generated questions from YOUR study materials. Each question adapts to your ability level using Item Response Theory (IRT) — too easy gets harder, too hard gets easier.',
    tip: 'Don\'t rush! Your response time is factored into the difficulty calibration.',
    position: 'right',
  },
  {
    target: 'tour-course-nav-analysis',
    title: 'Course Intelligence',
    body: 'Deep AI analysis of your entire course — topic breakdown, difficulty mapping, exam pattern detection, and learning path recommendations.',
    tip: 'Run this after uploading at least 3 documents for the best results.',
    position: 'right',
  },
  {
    target: 'tour-course-nav-insights',
    title: 'Personal Intelligence',
    body: 'YOUR unique learning fingerprint — tracks which topics you struggle with, confidence calibration, response speed trends, and cognitive strengths over time.',
    tip: 'Check this regularly to see which topics need more revision.',
    position: 'right',
  },
  {
    target: 'tour-course-nav-outcome',
    title: 'Outcome Loop',
    body: 'Tracks predicted vs actual exam results. After entering your real grade, Adwen recalibrates everything using Bayesian updating — difficulty estimates, ability level, and study recommendations.',
    tip: 'Always log your actual exam results. This is how Adwen learns to predict more accurately.',
    position: 'right',
  },
];

// ── Tooltip positioning ────────────────────────────────────────────────────────
function getTooltipStyle(
  rect: DOMRect,
  position: string,
  tooltipRef: React.RefObject<HTMLDivElement | null>
): React.CSSProperties {
  const pad = 14;
  const tooltipW = tooltipRef.current?.offsetWidth || 340;
  const tooltipH = tooltipRef.current?.offsetHeight || 200;
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;

  // Auto-detect best position
  let pos = position;
  if (pos === 'auto') {
    const spaceBelow = vpH - rect.bottom;
    const spaceAbove = rect.top;
    const spaceRight = vpW - rect.right;
    const spaceLeft = rect.left;
    if (spaceBelow >= tooltipH + pad) pos = 'bottom';
    else if (spaceAbove >= tooltipH + pad) pos = 'top';
    else if (spaceRight >= tooltipW + pad) pos = 'right';
    else if (spaceLeft >= tooltipW + pad) pos = 'left';
    else pos = 'bottom';
  }

  const base: React.CSSProperties = {
    position: 'fixed',
    zIndex: 10002,
    maxWidth: Math.min(380, vpW - 32),
    width: 380,
  };

  switch (pos) {
    case 'bottom': {
      let left = rect.left + rect.width / 2 - 190;
      left = Math.max(16, Math.min(left, vpW - 396));
      return { ...base, top: rect.bottom + pad, left };
    }
    case 'top': {
      let left = rect.left + rect.width / 2 - 190;
      left = Math.max(16, Math.min(left, vpW - 396));
      return { ...base, bottom: vpH - rect.top + pad, left };
    }
    case 'right': {
      const left = Math.min(rect.right + pad, vpW - 396);
      let top = rect.top + rect.height / 2 - tooltipH / 2;
      top = Math.max(16, Math.min(top, vpH - tooltipH - 16));
      return { ...base, top, left };
    }
    case 'left': {
      const right = vpW - rect.left + pad;
      let top = rect.top + rect.height / 2 - tooltipH / 2;
      top = Math.max(16, Math.min(top, vpH - tooltipH - 16));
      return { ...base, top, right };
    }
    default:
      return base;
  }
}

// ── Main GuidedTour Component ──────────────────────────────────────────────────
interface GuidedTourProps {
  steps?: TourStep[];
  onComplete: () => void;
  storageKey?: string;
}

export default function GuidedTour({
  steps = TOUR_STEPS,
  onComplete,
  storageKey = 'adwen_tutorial_seen',
}: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const step = steps[currentStep];
  const total = steps.length;

  // Find and measure the target element
  const measureTarget = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      // Scroll into view if needed
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => {
        setTargetRect(el.getBoundingClientRect());
        setIsVisible(true);
      }, 350);
    } else {
      // Element not found — skip to next step
      setTargetRect(null);
      setIsVisible(true);
    }
  }, [step]);

  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(measureTarget, 100);
    return () => clearTimeout(timer);
  }, [currentStep, measureTarget]);

  // Re-measure on resize/scroll
  useEffect(() => {
    const handleResize = () => {
      if (step) {
        const el = document.querySelector(`[data-tour="${step.target}"]`);
        if (el) setTargetRect(el.getBoundingClientRect());
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [step]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') handleSkip();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentStep]);

  const goNext = () => {
    if (currentStep < total - 1) {
      setIsVisible(false);
      setTimeout(() => setCurrentStep(prev => prev + 1), 200);
    } else {
      handleFinish();
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setIsVisible(false);
      setTimeout(() => setCurrentStep(prev => prev - 1), 200);
    }
  };

  const handleFinish = () => {
    localStorage.setItem(storageKey, 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem(storageKey, 'true');
    onComplete();
  };

  if (!step) return null;

  const spotlightPad = 8;
  const r = targetRect;

  return (
    <>
      {/* ── Overlay with spotlight cutout ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 10000, pointerEvents: 'none' }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <mask id="tour-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {r && (
                <rect
                  x={r.left - spotlightPad}
                  y={r.top - spotlightPad}
                  width={r.width + spotlightPad * 2}
                  height={r.height + spotlightPad * 2}
                  rx={12}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%" height="100%"
            fill="rgba(14, 14, 14, 0.65)"
            mask="url(#tour-spotlight-mask)"
            style={{ transition: 'opacity 0.3s' }}
          />
        </svg>

        {/* Spotlight border glow */}
        {r && (
          <div style={{
            position: 'fixed',
            left: r.left - spotlightPad,
            top: r.top - spotlightPad,
            width: r.width + spotlightPad * 2,
            height: r.height + spotlightPad * 2,
            border: '2.5px solid var(--lime)',
            borderRadius: 12,
            boxShadow: '0 0 20px rgba(212, 237, 42, 0.35), inset 0 0 20px rgba(212, 237, 42, 0.1)',
            transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* ── Clickable overlay (outside spotlight) ── */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 10001, cursor: 'pointer' }}
        onClick={handleSkip}
      />

      {/* ── Tooltip ── */}
      {r && (
        <div
          ref={tooltipRef}
          style={{
            ...getTooltipStyle(r, step.position || 'auto', tooltipRef),
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.25s, transform 0.25s',
            pointerEvents: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            background: '#fff',
            border: '2.5px solid var(--ink)',
            borderRadius: 16,
            boxShadow: '0 6px 0 var(--ink)',
            overflow: 'hidden',
          }}>
            {/* Accent bar */}
            <div style={{
              height: 4,
              background: `linear-gradient(90deg, var(--lime) ${((currentStep) / total) * 100}%, var(--line) ${((currentStep) / total) * 100}%)`,
            }} />

            <div style={{ padding: '18px 20px 16px' }}>
              {/* Step counter + skip */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: 'var(--cobalt)', textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  Step {currentStep + 1} of {total}
                </span>
                <button onClick={handleSkip} style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', padding: '2px 6px',
                }}>
                  Skip ✕
                </button>
              </div>

              {/* Title */}
              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: 18,
                textTransform: 'uppercase', margin: '0 0 6px', lineHeight: 1.2,
              }}>
                {step.title}
              </h3>

              {/* Body */}
              <p style={{
                fontSize: 13, lineHeight: 1.6, color: 'var(--ink)',
                margin: '0 0 10px', opacity: 0.85,
              }}>
                {step.body}
              </p>

              {/* Tip */}
              {step.tip && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 6,
                  padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(212, 237, 42, 0.12)',
                  border: '1.5px solid var(--lime)',
                  fontSize: 11, color: 'var(--ink)', lineHeight: 1.5,
                  marginBottom: 12,
                }}>
                  <span style={{ flexShrink: 0 }}>💡</span>
                  <span>{step.tip}</span>
                </div>
              )}

              {/* Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={goPrev}
                  disabled={currentStep === 0}
                  style={{
                    padding: '7px 14px', border: '2px solid var(--ink)',
                    borderRadius: 'var(--pill)', background: '#fff',
                    fontSize: 11, fontWeight: 700, cursor: currentStep === 0 ? 'default' : 'pointer',
                    opacity: currentStep === 0 ? 0.3 : 1,
                    fontFamily: 'var(--font-body)',
                    boxShadow: currentStep > 0 ? '0 2px 0 var(--ink)' : 'none',
                  }}
                >
                  ← Back
                </button>

                {/* Dots */}
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                  {steps.map((_, i) => (
                    <div key={i} style={{
                      width: i === currentStep ? 16 : 6, height: 6, borderRadius: 3,
                      background: i < currentStep ? 'var(--green)' : i === currentStep ? 'var(--cobalt)' : 'var(--line)',
                      border: '1px solid var(--ink)',
                      transition: 'all 0.3s',
                    }} />
                  ))}
                </div>

                <button
                  onClick={goNext}
                  style={{
                    padding: '7px 14px', border: '2px solid var(--ink)',
                    borderRadius: 'var(--pill)',
                    background: currentStep === total - 1 ? 'var(--lime)' : 'var(--cobalt)',
                    color: currentStep === total - 1 ? 'var(--ink)' : '#fff',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    boxShadow: '0 2px 0 var(--ink)',
                  }}
                >
                  {currentStep === total - 1 ? 'Done! ✓' : 'Next →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fallback tooltip when no target element found */}
      {!r && isVisible && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10002, width: 380, maxWidth: 'calc(100vw - 32px)',
          pointerEvents: 'auto',
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            background: '#fff', border: '2.5px solid var(--ink)',
            borderRadius: 16, boxShadow: '0 6px 0 var(--ink)',
            padding: '20px',
          }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, margin: '0 0 8px' }}>{step.title}</h3>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 12px' }}>{step.body}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={goPrev} disabled={currentStep === 0} style={{ padding: '7px 14px', border: '2px solid var(--ink)', borderRadius: 99, background: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: currentStep === 0 ? 0.3 : 1 }}>← Back</button>
              <button onClick={goNext} style={{ padding: '7px 14px', border: '2px solid var(--ink)', borderRadius: 99, background: 'var(--cobalt)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{currentStep === total - 1 ? 'Done! ✓' : 'Next →'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
