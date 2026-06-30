'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface ConsentStepProps {
  consentMeasure: boolean;
  consentData: boolean;
  onConsentMeasureChange: (v: boolean) => void;
  onConsentDataChange: (v: boolean) => void;
  onNext: () => void;
}

export default function ConsentStep({
  consentMeasure,
  consentData,
  onConsentMeasureChange,
  onConsentDataChange,
  onNext,
}: ConsentStepProps) {
  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <h1 className="h-lg">Consent first.</h1>
        <p className="lede">Ghana Data Protection Act (Act 843) baseline consent. You can decline measurement and still use Adwen.</p>
      </div>
      <Card padding="lg">
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>What we measure &amp; why</h2>
        <p className="note" style={{ marginBottom: '16px', lineHeight: 1.6 }}>
          We measure cognitive readiness metrics to help adapt study material and quizzes. These are trainable skills that grow with practice — NOT a fixed intelligence score.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={consentMeasure}
              onChange={(e) => onConsentMeasureChange(e.target.checked)}
              style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: 'var(--cobalt)' }}
            />
            <span style={{ fontSize: '14px', lineHeight: 1.5 }}>
              I agree Adwen may measure my cognitive strengths (working memory, reaction speed) to adapt my materials.
            </span>
          </label>
          <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={consentData}
              onChange={(e) => onConsentDataChange(e.target.checked)}
              style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: 'var(--cobalt)' }}
            />
            <span style={{ fontSize: '14px', lineHeight: 1.5 }}>
              I agree to secure storage and processing of my responses to build my personalized learner profile.
            </span>
          </label>
        </div>
      </Card>
      <div className="actions">
        <Button onClick={onNext} disabled={!consentMeasure || !consentData} size="lg">
          Agree &amp; continue
        </Button>
      </div>
    </div>
  );
}
