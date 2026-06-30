'use client';

import React, { useMemo } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input, { Select } from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { ACADEMIC_LEVELS, AGE_BANDS } from '@/lib/constants';
import { GHANA_PROGRAMMES, GHANA_UNIVERSITIES, classifyDegree } from '@/lib/ghana-programmes';
import { WASSCE_SUBJECTS, WASSCE_ELECTIVES_LIST, GRADE_OPTIONS } from '../data';
import type { ProfileState, WassceElective } from '../types';

interface BasicsStepProps {
  profile: ProfileState;
  setProfile: (p: ProfileState) => void;
  wassceCourse: string;
  setWassceCourse: (v: string) => void;
  wassceGrades: Record<string, string>;
  setWassceGrades: (g: Record<string, string>) => void;
  wassceElectives: WassceElective[];
  setWassceElectives: (e: WassceElective[]) => void;
  formError: string | null;
  onNext: () => void;
  onBack: () => void;
}

export default function BasicsStep({
  profile,
  setProfile,
  wassceCourse,
  setWassceCourse,
  wassceGrades,
  setWassceGrades,
  wassceElectives,
  setWassceElectives,
  formError,
  onNext,
  onBack,
}: BasicsStepProps) {
  // Get selected university info
  const selectedUni = useMemo(
    () => GHANA_UNIVERSITIES.find(u => u.id === profile.university),
    [profile.university]
  );

  // Filter programmes to show selected university's programmes first, then all others
  const filteredProgrammes = useMemo(() => {
    if (!selectedUni) return GHANA_PROGRAMMES;
    const uniProgs = GHANA_PROGRAMMES.filter(p => p.group === selectedUni.programmeGroup);
    const otherProgs = GHANA_PROGRAMMES.filter(p => p.group !== selectedUni.programmeGroup);
    return [...uniProgs, ...otherProgs];
  }, [selectedUni]);

  // Auto-classify degree from CWA/GPA
  const degreeClass = useMemo(
    () => classifyDegree(profile.cwa, profile.university),
    [profile.cwa, profile.university]
  );

  // Dynamic score label and placeholder
  const scoreLabel = selectedUni?.scoreLabel || 'CWA / GPA';
  const scorePlaceholder = selectedUni?.placeholder || 'e.g. 65.4';
  const scaleHint = selectedUni
    ? `${selectedUni.shortName} uses ${selectedUni.scoreLabel} (out of ${selectedUni.maxScore})`
    : 'Select your university first';

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <h1 className="h-lg">Your academic baseline.</h1>
        <p className="lede">Help us align Adwen with your programme, level requirements, and school history.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Card padding="lg">
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--ink)' }}>Tertiary Enrollment</h2>

          {/* Row 1: Age + University */}
          <div className="grid-2" style={{ gap: '18px' }}>
            <Select
              label="Age range"
              options={AGE_BANDS.map((b) => ({ value: b, label: b === 'under-18' ? 'Under 18' : b }))}
              value={profile.ageBand}
              onChange={(e) => setProfile({ ...profile, ageBand: e.target.value })}
              id="age-band"
            />
            <Select
              label="University"
              options={[
                { value: '', label: '— Select your university —' },
                ...GHANA_UNIVERSITIES.map(u => ({ value: u.id, label: u.name }))
              ]}
              value={profile.university}
              onChange={(e) => setProfile({ ...profile, university: e.target.value, programme: '' })}
              id="university"
            />
          </div>

          {/* Row 2: Programme (filtered by uni) + Level */}
          <div className="grid-2" style={{ gap: '18px', marginTop: '14px' }}>
            <SearchableSelect
              label="Programme"
              placeholder={selectedUni ? `Search ${selectedUni.shortName} programmes…` : 'Search your programme…'}
              options={filteredProgrammes}
              value={profile.programme}
              onChange={(val) => setProfile({ ...profile, programme: val })}
              id="programme"
              allowCustom
            />
            <Select
              label="Level"
              options={ACADEMIC_LEVELS.map((l) => ({ value: String(l.value), label: l.label }))}
              value={String(profile.level)}
              onChange={(e) => setProfile({ ...profile, level: Number(e.target.value) })}
              id="level"
            />
          </div>

          {/* Row 3: CWA/GPA with auto-classification */}
          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', alignItems: 'end' }}>
              <Input
                label={`Current ${scoreLabel}`}
                placeholder={scorePlaceholder}
                value={profile.cwa}
                onChange={(e) => setProfile({ ...profile, cwa: e.target.value })}
                hint={scaleHint}
                id="cwa"
              />
              {/* Degree classification badge */}
              <div style={{ paddingBottom: '2px' }}>
                {degreeClass ? (
                  <div style={{
                    padding: '10px 16px',
                    borderRadius: 'var(--pill)',
                    border: `2.5px solid ${degreeClass.color}`,
                    background: `${degreeClass.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.3s ease',
                  }}>
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: degreeClass.color,
                      boxShadow: `0 0 8px ${degreeClass.color}40`,
                    }} />
                    <div>
                      <div style={{
                        fontSize: '15px', fontWeight: 700,
                        color: degreeClass.color,
                        lineHeight: 1.2,
                      }}>
                        {degreeClass.shortLabel}
                      </div>
                      <div style={{
                        fontSize: '11px', color: 'var(--ink)',
                        fontFamily: 'var(--font-mono)',
                        opacity: 0.7, lineHeight: 1.3,
                      }}>
                        {degreeClass.label}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '10px 16px',
                    borderRadius: 'var(--pill)',
                    border: '2px dashed var(--muted)',
                    color: 'var(--muted)',
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'center',
                  }}>
                    {profile.university ? 'Enter your score to see classification' : 'Select university first'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>WASSCE Qualifications</h2>
            <Badge variant="magenta" size="sm">Pre-admission Diagnostics</Badge>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <Select
              label="WASSCE Course Completed"
              options={Object.keys(WASSCE_SUBJECTS).map(c => ({ value: c, label: c }))}
              value={wassceCourse}
              onChange={(e) => setWassceCourse(e.target.value)}
              id="wassce-course"
            />
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.03)',
            padding: '16px',
            borderRadius: 'var(--r)',
            border: '1.5px dashed var(--ink)'
          }}>
            <span className="mono" style={{ fontSize: '11px', display: 'block', marginBottom: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Select Grades for Individual Subjects
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Core Subjects */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {['Core Mathematics', 'English Language', 'Integrated Science', 'Social Studies'].map(sub => (
                  <div key={sub} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label className="mono" style={{ fontSize: '11px', fontWeight: 600 }}>{sub} *</label>
                    <select
                      value={wassceGrades[sub] || ''}
                      onChange={(e) => setWassceGrades({ ...wassceGrades, [sub]: e.target.value })}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--pill)',
                        border: '2px solid var(--ink)',
                        fontSize: '14px',
                        fontFamily: 'var(--font-mono)',
                        background: '#fff',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">-- Grade --</option>
                      {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {/* Divider */}
              <div style={{ height: '1px', background: 'var(--ink)', opacity: 0.15, margin: '8px 0' }} />

              {/* Electives */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                {wassceElectives.map((el, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label className="mono" style={{ fontSize: '11px', fontWeight: 600 }}>Elective Subject {idx + 1} *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '10px' }}>
                      {/* Subject selector */}
                      <select
                        value={el.subject}
                        onChange={(e) => {
                          const newElectives = [...wassceElectives];
                          newElectives[idx].subject = e.target.value;
                          setWassceElectives(newElectives);
                        }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--pill)',
                          border: '2px solid var(--ink)',
                          fontSize: '14px',
                          background: '#fff',
                          outline: 'none',
                          cursor: 'pointer',
                          width: '100%'
                        }}
                      >
                        <option value="">-- Select Subject --</option>
                        {WASSCE_ELECTIVES_LIST.map(subject => (
                          <option key={subject} value={subject}>{subject}</option>
                        ))}
                      </select>

                      {/* Grade selector */}
                      <select
                        value={el.grade}
                        onChange={(e) => {
                          const newElectives = [...wassceElectives];
                          newElectives[idx].grade = e.target.value;
                          setWassceElectives(newElectives);
                        }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--pill)',
                          border: '2px solid var(--ink)',
                          fontSize: '14px',
                          fontFamily: 'var(--font-mono)',
                          background: '#fff',
                          outline: 'none',
                          cursor: 'pointer',
                          width: '100%'
                        }}
                      >
                        <option value="">-- Grade --</option>
                        {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {formError && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: '#FEE2E2',
              border: '2px solid #EF4444',
              borderRadius: 'var(--r)',
              color: '#991B1B',
              fontSize: '13px',
              fontWeight: 600
            }}>
              ⚠️ {formError}
            </div>
          )}
        </Card>
      </div>

      <div className="actions">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button onClick={onNext} size="lg">
          Continue to assessments
        </Button>
      </div>
    </div>
  );
}
