'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { AVAILABLE_CHALLENGES } from '../data';

interface ChallengesStepProps {
  selectedChallenges: string[];
  setSelectedChallenges: (c: string[]) => void;
  challengesText: string;
  onChallengesTextChange: (text: string) => void;
  onSubmit: () => void;
}

export default function ChallengesStep({
  selectedChallenges,
  setSelectedChallenges,
  challengesText,
  onChallengesTextChange,
  onSubmit,
}: ChallengesStepProps) {
  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <h1 className="h-lg">What gets in the way?</h1>
        <p className="lede">Help us understand your obstacles so we can tailor the spaced review schedule.</p>
      </div>
      <Card padding="lg">
        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Pick your top challenges</h3>
        <div className="chips" style={{ marginBottom: '20px' }}>
          {AVAILABLE_CHALLENGES.map(c => {
            const on = selectedChallenges.includes(c);
            return (
              <button
                key={c}
                className={`chip ${on ? 'on' : ''}`}
                onClick={() => {
                  if (on) setSelectedChallenges(selectedChallenges.filter(x => x !== c));
                  else setSelectedChallenges([...selectedChallenges, c]);
                }}
                style={{ border: '2px solid var(--ink)', cursor: 'pointer' }}
              >
                {c}
              </button>
            );
          })}
        </div>
        <div className="field">
          <label>Add detail about your study routine (optional)</label>
          <textarea
            className="inp"
            placeholder="e.g. I work part-time, I have exam anxiety..."
            value={challengesText}
            onChange={(e) => onChallengesTextChange(e.target.value)}
            style={{ minHeight: '90px', resize: 'vertical' }}
          />
        </div>
      </Card>
      <div className="actions">
        <Button onClick={onSubmit} size="lg">
          Build my profile →
        </Button>
      </div>
    </div>
  );
}
