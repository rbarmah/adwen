import Link from 'next/link';
import { Sparkle } from '@/components/ui/Badge';
import { BookOpen, Target, BarChart3, Brain, Timer, Globe, Dices, TrendingDown, Search, Dna, Ruler } from 'lucide-react';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ========== HEADER ========== */}
      <header className="landing-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkle color="var(--magenta)" size={24} />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-xl)',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
            }}
          >
            ADWEN
          </span>
        </div>
        <nav style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link
            href="/login"
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-pill)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              color: 'var(--ink)',
              border: '2px solid var(--ink)',
              background: 'transparent',
              textDecoration: 'none',
              transition: 'all var(--transition-fast)',
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Log in
          </Link>
          <Link
            href="/waitlist"
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-pill)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              color: 'var(--ink)',
              background: 'var(--tangerine)',
              textDecoration: 'none',
              transition: 'all var(--transition-fast)',
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Join waitlist
          </Link>
        </nav>
      </header>

      {/* ========== HERO ========== */}
      <section
        style={{
          background: 'var(--lime)',
          padding: '80px 32px 100px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Sunburst rays behind hero */}
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '800px',
            height: '800px',
            background: 'conic-gradient(from 0deg, transparent 0deg, var(--cobalt) 2deg, transparent 4deg, transparent 20deg, var(--cobalt) 22deg, transparent 24deg, transparent 40deg, var(--cobalt) 42deg, transparent 44deg, transparent 60deg, var(--cobalt) 62deg, transparent 64deg, transparent 80deg, var(--cobalt) 82deg, transparent 84deg, transparent 100deg, var(--cobalt) 102deg, transparent 104deg, transparent 120deg, var(--cobalt) 122deg, transparent 124deg, transparent 140deg, var(--cobalt) 142deg, transparent 144deg, transparent 160deg, var(--cobalt) 162deg, transparent 164deg, transparent 180deg, var(--cobalt) 182deg, transparent 184deg, transparent 200deg, var(--cobalt) 202deg, transparent 204deg, transparent 220deg, var(--cobalt) 222deg, transparent 224deg, transparent 240deg, var(--cobalt) 242deg, transparent 244deg, transparent 260deg, var(--cobalt) 262deg, transparent 264deg, transparent 280deg, var(--cobalt) 282deg, transparent 284deg, transparent 300deg, var(--cobalt) 302deg, transparent 304deg, transparent 320deg, var(--cobalt) 322deg, transparent 324deg, transparent 340deg, var(--cobalt) 342deg, transparent 344deg)',
            opacity: 0.06,
            borderRadius: '50%',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '720px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '24px',
              padding: '6px 16px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(14,14,14,0.08)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
            }}
          >
            <Sparkle color="var(--magenta)" size={14} />
            AI-powered study intelligence for university students
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              textTransform: 'uppercase',
              lineHeight: 1.05,
              color: 'var(--ink)',
              marginBottom: '8px',
              letterSpacing: '-0.03em',
            }}
          >
            STUDY
            <br />
            <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', fontSize: '1.1em' }}>
              smarter
            </span>
            <br />
            NOT HARDER
          </h1>

          {/* Black scribble underline effect */}
          <div
            style={{
              width: '200px',
              height: '6px',
              background: 'var(--ink)',
              borderRadius: 'var(--radius-pill)',
              margin: '16px auto 32px',
              opacity: 0.7,
            }}
          />

          <p
            style={{
              fontSize: 'var(--text-lg)',
              color: 'var(--ink)',
              lineHeight: 1.7,
              maxWidth: '560px',
              margin: '0 auto 40px',
              opacity: 0.85,
            }}
          >
            Upload your course materials. Get adaptive quizzes that find your gaps.
            Watch your exam readiness sharpen with every practice session.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/waitlist"
              style={{
                padding: '16px 40px',
                borderRadius: 'var(--radius-pill)',
                fontWeight: 700,
                fontSize: 'var(--text-lg)',
                color: 'var(--ink)',
                background: 'var(--tangerine)',
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(245,130,31,0.3)',
                transition: 'all var(--transition-fast)',
                minHeight: '52px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Join the waitlist →
            </Link>
            <Link
              href="#how-it-works"
              style={{
                padding: '16px 40px',
                borderRadius: 'var(--radius-pill)',
                fontWeight: 700,
                fontSize: 'var(--text-lg)',
                color: 'var(--ink)',
                background: 'transparent',
                border: '2px solid var(--ink)',
                textDecoration: 'none',
                transition: 'all var(--transition-fast)',
                minHeight: '52px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      {/* ========== SOCIAL PROOF TICKER ========== */}
      <section style={{ background: 'var(--ink)', padding: '20px 32px', overflow: 'hidden' }}>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '48px', alignItems: 'center', flexWrap: 'wrap',
          color: 'rgba(255,255,255,0.5)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          <span>✦ AI-Generated Questions</span>
          <span>✦ Real-Time Readiness Tracking</span>
          <span>✦ 25-Point Deep Intelligence</span>
          <span>✦ Adaptive Difficulty</span>
          <span>✦ Cognitive Profiling</span>
        </div>
      </section>

      {/* ========== HOW IT WORKS (3 Steps) ========== */}
      <section
        id="how-it-works"
        style={{ background: 'var(--surface)', padding: '100px 32px' }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              textTransform: 'uppercase',
              marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}
          >
            HOW{' '}
            <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)' }}>
              it works
            </span>
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 'var(--text-base)', marginBottom: '64px', maxWidth: '500px', margin: '0 auto 64px' }}>
            Three steps. Zero fluff. You bring the notes — we bring the intelligence.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '32px' }}>
            {[
              {
                step: '01',
                title: 'Upload your materials',
                description: 'Drag in your lecture slides, notes, or past papers. Adwen reads them and maps every topic, weight, and concept.',
                accent: 'var(--cobalt)',
              },
              {
                step: '02',
                title: 'Take adaptive quizzes',
                description: 'The AI generates targeted questions that probe your real weaknesses — not random trivia. Each question adapts to your level.',
                accent: 'var(--tangerine)',
              },
              {
                step: '03',
                title: 'Watch your readiness sharpen',
                description: 'Your Exam Readiness Score tightens with every session. See exactly which topics are dragging you down and why.',
                accent: 'var(--magenta)',
              },
            ].map((item, i) => (
              <div key={i} style={{
                background: 'var(--surface-2)', borderRadius: 'var(--radius-card)', padding: '40px 28px',
                boxShadow: 'var(--shadow-card)', border: '1px solid var(--line)',
                textAlign: 'left', position: 'relative', overflow: 'hidden',

              }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '4rem', color: item.accent, opacity: 0.12,
                  position: 'absolute', top: '-8px', right: '12px', lineHeight: 1,
                }}>
                  {item.step}
                </div>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', background: item.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700,
                  marginBottom: '20px',
                }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ color: 'var(--muted)', lineHeight: 1.6, fontSize: 'var(--text-sm)' }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FEATURES GRID ========== */}
      <section style={{ background: 'var(--lime)', padding: '100px 32px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              textTransform: 'uppercase',
              textAlign: 'center',
              marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}
          >
            YOUR LEARNING,{' '}
            <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)' }}>
              amplified
            </span>
          </h2>
          <p style={{ color: 'var(--ink)', opacity: 0.65, fontSize: 'var(--text-base)', textAlign: 'center', marginBottom: '64px', maxWidth: '500px', margin: '0 auto 64px' }}>
            Every feature exists to do one thing: get you exam-ready, fast.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
            }}
          >
            {[
              {
                icon: <BookOpen size={32} color="var(--magenta)" />,
                title: 'Your material, your way',
                description: 'Upload your own lecture slides, handouts, and past papers. Adwen analyses them to build a study plan around YOUR course — not generic content.',
              },
              {
                icon: <Target size={32} color="var(--magenta)" />,
                title: 'Adaptive quizzes',
                description: 'Smart questions that target your actual gaps. Each distractor tests a real misconception. Targeted items, not random ones.',
              },
              {
                icon: <BarChart3 size={32} color="var(--magenta)" />,
                title: 'Readiness that tightens',
                description: 'Your readiness is a range, not a number. With each practice, the range tightens. See exactly where you have the most room to grow.',
              },
              {
                icon: <Brain size={32} color="var(--magenta)" />,
                title: 'Deep intelligence',
                description: '25 AI-generated psychological insights about your learning behaviour — from guessing patterns to cognitive blind spots — explained in plain English.',
              },
              {
                icon: <Timer size={32} color="var(--magenta)" />,
                title: 'Behavioural telemetry',
                description: 'We track how long you take, when you guess, which question types trip you up, and how your confidence maps to actual performance.',
              },
              {
                icon: <Globe size={32} color="var(--magenta)" />,
                title: 'Built for African universities',
                description: 'Designed for tertiary students across Africa. Understands CWA grading, local curricula, and the exam formats you actually face.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--radius-card)',
                  padding: 'var(--space-7)',
                  boxShadow: 'var(--shadow-card)',
                  border: '1px solid var(--line)',
                  transition: 'all var(--transition-smooth)',

                }}
              >
                <div style={{ marginBottom: '16px' }}>{feature.icon}</div>
                <h3
                  style={{
                    fontSize: 'var(--text-lg)',
                    fontWeight: 700,
                    marginBottom: '8px',
                  }}
                >
                  {feature.title}
                </h3>
                <p style={{ color: 'var(--muted)', lineHeight: 1.6, fontSize: 'var(--text-sm)' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== THE AI DIFFERENCE ========== */}
      <section style={{ background: 'var(--navy)', padding: '100px 32px', color: 'var(--white)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              textTransform: 'uppercase',
              textAlign: 'center',
              marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}
          >
            NOT JUST{' '}
            <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--lime)' }}>
              quizzes
            </span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--text-base)', textAlign: 'center', marginBottom: '64px', maxWidth: '560px', margin: '0 auto 64px' }}>
            Adwen is a personal intelligence system for your brain. Here is what it sees that you cannot.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            {[
              { icon: <Dices size={24} color="var(--lime)" />, label: 'Panic Guessing', detail: 'Detects when you answer in under 4 seconds and get it wrong — a sign of guessing, not knowing.' },
              { icon: <Timer size={24} color="var(--lime)" />, label: 'Thinking Speed', detail: 'Measures your average response latency to reveal whether you are overthinking or underthinking.' },
              { icon: <TrendingDown size={24} color="var(--lime)" />, label: 'Stamina Drops', detail: 'Tracks accuracy decline within a session — showing exactly when your focus runs out.' },
              { icon: <Search size={24} color="var(--lime)" />, label: 'Blind Spots', detail: 'Finds topics where you are confident but wrong — the most dangerous kind of gap.' },
              { icon: <Dna size={24} color="var(--lime)" />, label: 'Cognitive Type', detail: 'Maps your accuracy across Bloom\'s taxonomy — recall, application, analysis, synthesis, evaluation.' },
              { icon: <Ruler size={24} color="var(--lime)" />, label: 'Exam Weight Alignment', detail: 'Checks if your strongest topics are actually the ones worth the most marks on the exam.' },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '24px', borderRadius: 'var(--radius-card)',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',

              }}>
                <div style={{ marginBottom: '12px' }}>{item.icon}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--lime)', marginBottom: '8px', fontWeight: 700 }}>
                  {item.label}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== STATS BAR ========== */}
      <section style={{ background: 'var(--cobalt)', padding: '48px 32px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '32px', textAlign: 'center' }}>
          {[
            { value: '25', label: 'Deep Insights per analysis' },
            { value: '6', label: 'Cognitive skill types tracked' },
            { value: '∞', label: 'AI-generated questions' },
            { value: '<4s', label: 'Guess detection threshold' },
          ].map((stat, i) => (
            <div key={i}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)', color: 'var(--lime)', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '8px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ========== WHO IT'S FOR ========== */}
      <section style={{ background: 'var(--surface)', padding: '100px 32px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              textTransform: 'uppercase',
              marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}
          >
            BUILT FOR{' '}
            <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--cobalt)' }}>
              you
            </span>
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 'var(--text-base)', marginBottom: '64px', maxWidth: '500px', margin: '0 auto 64px' }}>
            Whether you are in your first year or final year, Adwen adapts to where you are.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', textAlign: 'left' }}>
            {[
              {
                who: 'The Struggling Student',
                description: 'You have the notes but nothing sticks. Adwen identifies exactly what you are missing and drills it until it clicks.',
                colour: 'var(--magenta)',
              },
              {
                who: 'The Consistent Student',
                description: 'You study regularly but do not know if it is enough. Adwen gives you a real-time readiness score so you never wonder.',
                colour: 'var(--cobalt)',
              },
              {
                who: 'The Last-Minute Crammer',
                description: 'You have 48 hours. Adwen shows you the 3 highest-weight topics you are weakest in — maximum marks for minimum time.',
                colour: 'var(--tangerine)',
              },
            ].map((persona, i) => (
              <div key={i} style={{
                background: 'var(--surface-2)', borderRadius: 'var(--radius-card)', padding: '32px 28px',
                border: '1px solid var(--line)', borderTop: `4px solid ${persona.colour}`,

              }}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 800, marginBottom: '8px', color: persona.colour }}>{persona.who}</h3>
                <p style={{ color: 'var(--muted)', lineHeight: 1.6, fontSize: 'var(--text-sm)' }}>{persona.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section
        style={{
          background: 'var(--cobalt)',
          padding: '80px 32px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-3xl)',
            textTransform: 'uppercase',
            color: 'var(--white)',
            marginBottom: '16px',
          }}
        >
          READY TO{' '}
          <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--lime)' }}>
            excel?
          </span>
        </h2>
        <p
          style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: 'var(--text-lg)',
            marginBottom: '32px',
            maxWidth: '500px',
            margin: '0 auto 32px',
          }}
        >
          Join university students across Africa who are studying with confidence, clarity, and intelligence.
        </p>
        <Link
          href="/waitlist"
          style={{
            padding: '16px 48px',
            borderRadius: 'var(--radius-pill)',
            fontWeight: 700,
            fontSize: 'var(--text-lg)',
            color: 'var(--ink)',
            background: 'var(--lime)',
            textDecoration: 'none',
            boxShadow: 'var(--shadow-glow-lime)',
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: '52px',
          }}
        >
          Join the waitlist →
        </Link>
      </section>

      {/* ========== FOOTER ========== */}
      <footer
        style={{
          background: 'var(--ink)',
          padding: '48px 32px',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '32px', marginBottom: '40px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Sparkle color="var(--magenta)" size={18} />
                <span style={{ fontFamily: 'var(--font-display)', color: 'var(--white)', fontSize: 'var(--text-base)' }}>
                  ADWEN
                </span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'var(--text-sm)', maxWidth: '280px', lineHeight: 1.6 }}>
                AI-powered adaptive learning for tertiary students. Your material, your pace, your growth.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '12px' }}>Platform</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Link href="/waitlist" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--text-sm)', textDecoration: 'none' }}>Join Waitlist</Link>
                  <Link href="/login" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--text-sm)', textDecoration: 'none' }}>Log In</Link>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '12px' }}>Legal</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Link href="/terms" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--text-sm)', textDecoration: 'none' }}>Terms &amp; Conditions</Link>
                  <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--text-sm)', textDecoration: 'none' }}>Privacy Policy</Link>
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'var(--text-sm)' }}>© 2026 Adwen. All rights reserved.</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'var(--text-sm)' }}>Compliant with Ghana Data Protection Act, 2012 (Act 843)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
