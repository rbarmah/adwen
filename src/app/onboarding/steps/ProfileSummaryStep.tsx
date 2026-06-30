'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Sparkle } from '@/components/ui/Badge';
import { ConfidenceBand } from '@/components/ui/ProgressBar';
import SkillRadar from '@/components/ui/SkillRadar';

interface ProfileSummaryStepProps {
  scores: Record<string, number | null>;
  programme: string;
  wassceAlerts: { alerts: string[]; strengths: string[] };
}

// Dimension display config
const DIMENSIONS = [
  { key: 'wm', label: 'Working Memory', trials: '18 trials', color: 'var(--lime)' },
  { key: 'speed', label: 'Processing Speed', trials: '60s timed', color: 'var(--tangerine)' },
  { key: 'attention', label: 'Sustained Attention', trials: '30 stimuli', color: 'var(--cobalt)' },
  { key: 'logic', label: 'Logical Reasoning', trials: '12 questions', color: 'var(--magenta)' },
  { key: 'analysis', label: 'Analytical Reasoning', trials: '12 questions', color: 'var(--green)' },
  { key: 'metacog', label: 'Metacognitive Calibration', trials: '10 questions', color: '#8B5CF6' },
];

export default function ProfileSummaryStep({
  scores,
  programme,
  wassceAlerts,
}: ProfileSummaryStepProps) {
  const router = useRouter();

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <h1 className="h-lg">Your cognitive diagnostics.</h1>
        <p className="lede">6-dimension calibration based on your assessments and scholastic history.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="hero">
          <div className="eyebrow" style={{ color: 'var(--lime)' }}>Learner profile · v1 — 6 dimensions</div>
          <div className="hero-grid">
            <div>
              {DIMENSIONS.map(d => (
                <ConfidenceBand
                  key={d.key}
                  point={scores[d.key] ?? 50}
                  ciLow={scores[d.key] ? Math.max(0, (scores[d.key] as number) - 10) : 15}
                  ciHigh={scores[d.key] ? Math.min(100, (scores[d.key] as number) + 10) : 85}
                  label={d.label}
                  confidenceLabel={scores[d.key] ? `Measured (${d.trials})` : 'Estimated (skipped)'}
                  color={d.color}
                />
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <SkillRadar
                skills={[
                  { name: 'Memory', value: scores.wm ?? 50 },
                  { name: 'Speed', value: scores.speed ?? 50 },
                  { name: 'Attention', value: scores.attention ?? 50 },
                  { name: 'Logic', value: scores.logic ?? 50 },
                  { name: 'Analysis', value: scores.analysis ?? 50 },
                  { name: 'Meta', value: scores.metacog ?? 50 },
                ]}
                size={250}
              />
              <span className="mono note" style={{ color: 'var(--muted-ink)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: '8px' }}>
                Cognitive baseline · 6 axes
              </span>
            </div>
          </div>
        </div>

        {/* WASSCE Diagnostic Insights */}
        <Card padding="lg">
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px', color: 'var(--ink)' }}>
            Scholastic Strength &amp; Alignment
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h4 className="mono" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#15803D', marginBottom: '8px' }}>
                ✓ Scholastic Strengths
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {wassceAlerts.strengths.map((str, idx) => (
                  <div key={idx} style={{
                    fontSize: '14px', padding: '10px 12px',
                    background: 'rgba(34, 197, 94, 0.08)',
                    border: '1.5px solid #22C55E',
                    borderRadius: 'var(--r)',
                    color: '#14532D', fontWeight: 500
                  }}>
                    ⚡ {str}
                  </div>
                ))}
              </div>
            </div>

            {wassceAlerts.alerts.length > 0 ? (
              <div>
                <h4 className="mono" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--magenta)', marginBottom: '8px' }}>
                  ⚠️ Program Alignment Gaps Detected
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {wassceAlerts.alerts.map((al, idx) => (
                    <div key={idx} style={{
                      fontSize: '14px', padding: '12px 14px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '2px solid var(--magenta)',
                      borderRadius: 'var(--r)',
                      color: 'var(--ink)', position: 'relative'
                    }}>
                      <div style={{ fontWeight: 700, color: 'var(--magenta)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '4px' }}>
                        Prerequisite Advisory
                      </div>
                      {al}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                fontSize: '14px', padding: '12px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1.5px solid var(--cobalt)',
                borderRadius: 'var(--r)',
                color: 'var(--ink)', fontWeight: 500
              }}>
                🌟 Excellent alignment: Secondary scholastic baseline matches requirements for {programme} perfectly.
              </div>
            )}
          </div>
        </Card>

        <div className="callout callout-violet">
          <Sparkle size={16} />
          <div>These 6 cognitive dimensions guide Adwen&apos;s tutor calibration and spaced repetition weights. Your metrics will sharpen with active study sessions.</div>
        </div>
      </div>

      <div className="actions">
        <Button onClick={() => router.push('/courses')} size="lg" style={{ width: '100%' }}>
          Next: My courses →
        </Button>
      </div>
    </div>
  );
}
