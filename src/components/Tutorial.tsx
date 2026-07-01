'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';

// ── Tutorial Steps ─────────────────────────────────────────────────────────────
const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    icon: '🎓',
    title: 'Welcome to Adwen',
    subtitle: 'Your AI-powered learning companion',
    body: 'Adwen uses cognitive science and AI to help you master your university courses. Let\u2019s walk you through the key features so you can hit the ground running.',
    tip: 'This tour takes about 2 minutes. You can revisit it anytime from Settings.',
    visual: 'welcome',
  },
  {
    id: 'dashboard',
    icon: '📚',
    title: 'Your Course Library',
    subtitle: 'The command centre for all your courses',
    body: 'The dashboard shows every course you\u2019ve registered as a notebook card. Each card displays your mastery percentage, course code, and processing status. Courses turn "READY" once Adwen\u2019s AI finishes analyzing your study materials.',
    tip: 'Click the \u201c+ New course\u201d button to register a new course anytime.',
    visual: 'dashboard',
  },
  {
    id: 'add-course',
    icon: '➕',
    title: 'Adding a New Course',
    subtitle: 'Register a course in 30 seconds',
    body: 'When you add a course, you\u2019ll provide the course name, code, a brief description, and your target grade. Adwen uses this information to calibrate AI-generated quizzes and study recommendations to your goals.',
    tip: 'Be specific with course names. "MATH 263 \u2014 Linear Algebra" works better than just "Math".',
    visual: 'add-course',
  },
  {
    id: 'study',
    icon: '📖',
    title: 'Study Materials',
    subtitle: 'Upload your notes. Adwen does the rest.',
    body: 'Upload lecture notes, past exams, and textbook chapters as PDFs. Adwen\u2019s AI extracts key concepts, learning objectives, and generates a comprehensive knowledge graph from your materials. The more you upload, the smarter Adwen gets for that course.',
    tip: 'Past exam papers are gold \u2014 they teach Adwen exactly what your lecturers test on.',
    visual: 'study',
  },
  {
    id: 'quiz',
    icon: '🧠',
    title: 'Adaptive Quiz Engine',
    subtitle: 'Quizzes that get harder as you get smarter',
    body: 'Adwen generates questions directly from YOUR study materials using Item Response Theory (IRT). Each question adapts to your current ability level \u2014 too easy questions get harder, too hard ones get easier. This keeps you in the optimal learning zone.',
    tip: 'Don\u2019t rush! Your response time is factored into the difficulty calibration.',
    visual: 'quiz',
  },
  {
    id: 'intelligence',
    icon: '📊',
    title: 'Course Intelligence',
    subtitle: 'AI-powered analysis of your course',
    body: 'Course Intelligence gives you a deep synthesis of your entire course \u2014 topic breakdown, difficulty analysis, exam pattern detection, and learning path recommendations. Think of it as an AI teaching assistant that\u2019s read all your materials.',
    tip: 'Run the analysis after uploading at least 3 documents for the best results.',
    visual: 'intelligence',
  },
  {
    id: 'personal',
    icon: '🔍',
    title: 'Personal Intelligence',
    subtitle: 'Your learning fingerprint',
    body: 'Personal Intelligence tracks YOUR unique learning patterns: which topics you struggle with, your confidence calibration, response speed trends, and cognitive strengths. It combines your onboarding cognitive test results with live quiz performance data.',
    tip: 'Check this regularly to see which topics need more revision.',
    visual: 'personal',
  },
  {
    id: 'outcome',
    icon: '🔄',
    title: 'Outcome Loop',
    subtitle: 'Close the gap between effort and results',
    body: 'The Outcome Loop tracks your predicted vs actual exam results and uses Bayesian updating to refine your readiness estimate over time. After entering your real exam grade, Adwen recalibrates everything \u2014 difficulty estimates, your ability level, and study recommendations.',
    tip: 'Always log your actual exam results. This is how Adwen learns to predict more accurately.',
    visual: 'outcome',
  },
  {
    id: 'profile',
    icon: '👤',
    title: 'Your Profile & Cognitive Map',
    subtitle: 'See your complete learning profile',
    body: 'Your profile stores your cognitive diagnostic results (the 6 tests from onboarding), academic background, and a radar chart of your cognitive strengths. These inform how Adwen calibrates quiz difficulty and study recommendations specifically for you.',
    tip: 'Your cognitive scores improve over time as you use the platform.',
    visual: 'profile',
  },
  {
    id: 'ready',
    icon: '🚀',
    title: 'You\u2019re All Set!',
    subtitle: 'Time to add your first course',
    body: 'Start by adding a course and uploading your study materials. Adwen will handle the rest \u2014 generating quizzes, analyzing content, and tracking your progress. The more you engage, the smarter and more personalized everything becomes.',
    tip: 'Pro tip: Start with your hardest course. That\u2019s where Adwen makes the biggest difference.',
    visual: 'ready',
  },
];

// ── Visual illustrations for each step ─────────────────────────────────────────
function StepVisual({ id }: { id: string }) {
  const visuals: Record<string, React.ReactNode> = {
    welcome: (
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {['📚', '🧠', '📊', '🔄', '🎯', '🚀'].map((e, i) => (
          <div key={i} style={{
            width: 52, height: 52, borderRadius: 14,
            border: '2.5px solid var(--ink)', display: 'grid', placeItems: 'center',
            fontSize: 24, background: i === 0 ? 'var(--lime)' : i === 1 ? 'var(--cobalt)' : i === 2 ? 'var(--tangerine)' : i === 3 ? 'var(--magenta)' : i === 4 ? 'var(--green)' : '#8B5CF6',
            boxShadow: '0 3px 0 var(--ink)',
            animation: `float ${1.5 + i * 0.3}s ease-in-out infinite alternate`,
          }}>{e}</div>
        ))}
      </div>
    ),
    dashboard: (
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {[{ name: 'MATH 263', color: 'var(--cobalt)', pct: 72 }, { name: 'CHEM 151', color: 'var(--magenta)', pct: 45 }, { name: 'PHYS 241', color: 'var(--lime)', pct: 88 }].map((c, i) => (
          <div key={i} style={{
            width: 90, padding: '14px 10px', borderRadius: 12,
            border: '2.5px solid var(--ink)', background: '#fff',
            boxShadow: '0 3px 0 var(--ink)', textAlign: 'center',
          }}>
            <div style={{ width: 6, height: 32, background: c.color, borderRadius: 3, margin: '0 auto 8px', border: '1.5px solid var(--ink)' }} />
            <div style={{ fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{c.name}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c.color, fontFamily: 'var(--font-mono)' }}>{c.pct}%</div>
          </div>
        ))}
      </div>
    ),
    'add-course': (
      <div style={{
        maxWidth: 220, margin: '0 auto', padding: '16px 20px',
        border: '2.5px solid var(--ink)', borderRadius: 14,
        background: '#fff', boxShadow: '0 4px 0 var(--ink)',
      }}>
        {['Course name', 'Course code', 'Target grade'].map((label, i) => (
          <div key={i} style={{ marginBottom: i < 2 ? 10 : 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
            <div style={{ height: 28, border: '2px solid var(--line)', borderRadius: 6, background: 'var(--surface)' }} />
          </div>
        ))}
      </div>
    ),
    study: (
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'flex-end' }}>
        {[{ label: 'Notes.pdf', h: 44 }, { label: 'Exam_2023.pdf', h: 56 }, { label: 'Ch5.pdf', h: 38 }].map((f, i) => (
          <div key={i} style={{
            width: 72, padding: '8px 6px', borderRadius: 10,
            border: '2.5px solid var(--ink)', background: '#fff',
            boxShadow: '0 2px 0 var(--ink)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>📄</div>
            <div style={{ fontSize: 8, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.label}</div>
          </div>
        ))}
      </div>
    ),
    quiz: (
      <div style={{
        maxWidth: 240, margin: '0 auto', padding: '14px 16px',
        border: '2.5px solid var(--ink)', borderRadius: 14,
        background: '#fff', boxShadow: '0 3px 0 var(--ink)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>What is the derivative of x²?</div>
        {['2x', 'x²', '2', 'x'].map((o, i) => (
          <div key={i} style={{
            padding: '6px 10px', marginBottom: i < 3 ? 5 : 0,
            border: `2px solid ${i === 0 ? 'var(--green)' : 'var(--line)'}`,
            borderRadius: 8, fontSize: 10, fontWeight: 600,
            background: i === 0 ? 'rgba(34,197,94,0.1)' : '#fff',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 8, background: 'var(--ink)', color: '#fff', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)' }}>{'ABCD'[i]}</span>
            {o}
          </div>
        ))}
      </div>
    ),
    intelligence: (
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[{ label: 'Topics', icon: '🗂️', val: '24' }, { label: 'Difficulty', icon: '📈', val: 'Hard' }, { label: 'Patterns', icon: '🔍', val: '8 found' }].map((c, i) => (
          <div key={i} style={{
            width: 80, padding: '12px 8px', borderRadius: 12,
            border: '2.5px solid var(--ink)', background: '#fff',
            boxShadow: '0 2px 0 var(--ink)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--cobalt)' }}>{c.val}</div>
            <div style={{ fontSize: 8, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>{c.label}</div>
          </div>
        ))}
      </div>
    ),
    personal: (
      <div style={{
        maxWidth: 200, margin: '0 auto', padding: '14px',
        border: '2.5px solid var(--ink)', borderRadius: 14,
        background: '#fff', boxShadow: '0 3px 0 var(--ink)',
      }}>
        {[{ label: 'Working Memory', pct: 78, color: 'var(--lime)' }, { label: 'Processing Speed', pct: 65, color: 'var(--tangerine)' }, { label: 'Attention', pct: 85, color: 'var(--cobalt)' }].map((s, i) => (
          <div key={i} style={{ marginBottom: i < 2 ? 10 : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)' }}>{s.label}</span>
              <span style={{ fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{s.pct}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--line)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${s.pct}%`, background: s.color, borderRadius: 3, transition: 'width 1s' }} />
            </div>
          </div>
        ))}
      </div>
    ),
    outcome: (
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{
          padding: '10px 16px', borderRadius: 12,
          border: '2.5px solid var(--ink)', background: '#fff',
          boxShadow: '0 2px 0 var(--ink)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 }}>Predicted</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--cobalt)', fontFamily: 'var(--font-mono)' }}>B+</div>
        </div>
        <div style={{ fontSize: 20 }}>→</div>
        <div style={{
          padding: '10px 16px', borderRadius: 12,
          border: '2.5px solid var(--green)', background: 'rgba(34,197,94,0.08)',
          boxShadow: '0 2px 0 var(--green)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', marginBottom: 2 }}>Actual</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>A</div>
        </div>
      </div>
    ),
    profile: (
      <div style={{
        maxWidth: 200, margin: '0 auto', padding: '14px',
        border: '2.5px solid var(--ink)', borderRadius: 14,
        background: '#fff', boxShadow: '0 3px 0 var(--ink)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', margin: '0 auto 8px',
          background: 'var(--cobalt)', border: '2.5px solid var(--ink)',
          display: 'grid', placeItems: 'center', color: '#fff',
          fontSize: 14, fontWeight: 800,
        }}>JD</div>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>Student Profile</div>
        <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>6 cognitive dimensions</div>
      </div>
    ),
    ready: (
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 64, lineHeight: 1, marginBottom: 8,
          animation: 'float 2s ease-in-out infinite alternate',
        }}>🚀</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cobalt)', fontFamily: 'var(--font-mono)' }}>READY TO LAUNCH</div>
      </div>
    ),
  };

  return (
    <div style={{ padding: '20px 0' }}>
      {visuals[id] || null}
    </div>
  );
}

// ── Main Tutorial Component ────────────────────────────────────────────────────
export default function Tutorial({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const router = useRouter();
  const step = TUTORIAL_STEPS[currentStep];
  const total = TUTORIAL_STEPS.length;

  const goNext = () => {
    if (currentStep < total - 1) {
      setIsExiting(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsExiting(false);
      }, 200);
    } else {
      handleFinish();
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setIsExiting(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsExiting(false);
      }, 200);
    }
  };

  const handleFinish = () => {
    // Mark tutorial as seen in localStorage
    localStorage.setItem('adwen_tutorial_seen', 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('adwen_tutorial_seen', 'true');
    onComplete();
  };

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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      {/* Backdrop */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(14, 14, 14, 0.75)',
        backdropFilter: 'blur(8px)',
      }} onClick={handleSkip} />

      {/* Card */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 480,
        background: '#fff', border: '3px solid var(--ink)',
        borderRadius: 'var(--r)', boxShadow: '0 8px 0 var(--ink)',
        overflow: 'hidden',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'scale(0.96)' : 'scale(1)',
        transition: 'opacity 0.2s, transform 0.2s',
      }}>
        {/* Top accent */}
        <div style={{
          height: 5,
          background: `linear-gradient(90deg, var(--lime), var(--cobalt), var(--tangerine), var(--magenta))`,
        }} />

        {/* Header with skip */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px 0',
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
            color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {currentStep + 1} / {total}
          </span>
          <button onClick={handleSkip} style={{
            fontSize: 11, fontWeight: 700, color: 'var(--muted)',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            padding: '4px 8px', borderRadius: 6,
            transition: '0.15s',
          }}>
            Skip tutorial ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 24px 20px' }}>
          {/* Icon + Title */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>{step.icon}</div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(18px, 5vw, 24px)',
              textTransform: 'uppercase', margin: '0 0 4px', lineHeight: 1.2,
            }}>
              {step.title}
            </h2>
            <p style={{
              fontFamily: 'var(--font-accent)', fontSize: 'clamp(13px, 3.5vw, 16px)',
              color: 'var(--cobalt)', margin: 0, fontStyle: 'italic',
            }}>
              {step.subtitle}
            </p>
          </div>

          {/* Visual */}
          <StepVisual id={step.visual} />

          {/* Body text */}
          <p style={{
            fontSize: 'clamp(13px, 3.5vw, 14px)', lineHeight: 1.65, color: 'var(--ink)',
            margin: '12px 0 14px', textAlign: 'center',
          }}>
            {step.body}
          </p>

          {/* Tip callout */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '10px 14px', borderRadius: 10,
            background: 'rgba(212, 237, 42, 0.12)',
            border: '1.5px solid var(--lime)',
            fontSize: 12, color: 'var(--ink)', lineHeight: 1.5,
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
            <span>{step.tip}</span>
          </div>
        </div>

        {/* Progress dots + nav */}
        <div style={{
          padding: '0 24px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 12,
        }}>
          {/* Prev */}
          <button
            onClick={goPrev}
            disabled={currentStep === 0}
            style={{
              padding: '8px 16px', border: '2px solid var(--ink)',
              borderRadius: 'var(--pill)', background: '#fff',
              fontSize: 12, fontWeight: 700, cursor: currentStep === 0 ? 'default' : 'pointer',
              opacity: currentStep === 0 ? 0.3 : 1,
              fontFamily: 'var(--font-body)', transition: '0.15s',
              boxShadow: currentStep > 0 ? '0 2px 0 var(--ink)' : 'none',
            }}
          >
            ← Back
          </button>

          {/* Dots */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {TUTORIAL_STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === currentStep ? 20 : 8, height: 8, borderRadius: 4,
                background: i < currentStep ? 'var(--green)' : i === currentStep ? 'var(--cobalt)' : 'var(--line)',
                border: '1.5px solid var(--ink)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }} onClick={() => { setIsExiting(true); setTimeout(() => { setCurrentStep(i); setIsExiting(false); }, 200); }} />
            ))}
          </div>

          {/* Next */}
          <button
            onClick={goNext}
            style={{
              padding: '8px 16px', border: '2px solid var(--ink)',
              borderRadius: 'var(--pill)',
              background: currentStep === total - 1 ? 'var(--lime)' : 'var(--cobalt)',
              color: currentStep === total - 1 ? 'var(--ink)' : '#fff',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-body)', transition: '0.15s',
              boxShadow: '0 2px 0 var(--ink)',
            }}
          >
            {currentStep === total - 1 ? 'Let\u2019s go! →' : 'Next →'}
          </button>
        </div>
      </div>

      {/* Floating animation keyframes */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0); }
          100% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
