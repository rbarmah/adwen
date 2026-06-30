'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkle } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
import { WASSCE_SUBJECTS, STEP_LABELS, analyzeWassceAlerts } from './data';
import type { ProfileState, WassceElective } from './types';

// Step components — each is lazy-loaded for code splitting
import ConsentStep from './steps/ConsentStep';
import BasicsStep from './steps/BasicsStep';
import CognitiveTestsStep from './steps/CognitiveTestsStep';
import ChallengesStep from './steps/ChallengesStep';
import ProfileSummaryStep from './steps/ProfileSummaryStep';

export default function OnboardingPage() {
  const [step, setStep] = useState(0); // 0: Consent, 1: Basics, 2: Tests, 3: Challenges, 4: Profile
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Profile state
  const [profile, setProfile] = useState<ProfileState>({
    ageBand: '18-20',
    university: '',
    programme: '',
    level: 300,
    cwa: '62.0',
    challengesText: '',
  });

  // WASSCE state
  const [wassceCourse, setWassceCourse] = useState('General Science');
  const [wassceGrades, setWassceGrades] = useState<Record<string, string>>({
    'Core Mathematics': 'B3',
    'English Language': 'B3',
    'Integrated Science': 'B3',
    'Social Studies': 'B3',
  });
  const [wassceElectives, setWassceElectives] = useState<WassceElective[]>([
    { subject: 'Elective Mathematics', grade: 'B3' },
    { subject: 'Physics', grade: 'B3' },
    { subject: 'Chemistry', grade: 'B3' },
    { subject: 'Biology', grade: 'B3' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Consent
  const [consentMeasure, setConsentMeasure] = useState(true);
  const [consentData, setConsentData] = useState(true);

  // Challenges
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>(['I cram', 'Maths scares me', 'I don\'t know where to start']);

  // Cognitive test scores
  const [scores, setScores] = useState<Record<string, number | null>>({
    wm: null, speed: null, attention: null, logic: null, analysis: null, metacog: null,
  });

  // WASSCE diagnostic results
  const [wassceAlerts, setWassceAlerts] = useState<{ alerts: string[]; strengths: string[] }>({
    alerts: [], strengths: []
  });

  // Populate dynamic WASSCE elective defaults when course changes
  useEffect(() => {
    const defaultElectives = WASSCE_SUBJECTS[wassceCourse] || [];
    setWassceElectives(
      defaultElectives.map(el => ({ subject: el, grade: 'B3' }))
    );
  }, [wassceCourse]);

  // Fetch user and check for existing profile
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: existingProfile } = await (supabase
          .from('profiles') as any)
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const isRetakeMode = window.location.search.includes('retake=tests');
        const isStep4 = window.location.search.includes('step=4');

        if (isRetakeMode || isStep4) {
          // Load whatever existing profile data we have
          if (existingProfile) {
            setProfile(prev => ({
              ...prev,
              ageBand: existingProfile.age_band || prev.ageBand,
              university: existingProfile.university || prev.university,
              programme: existingProfile.programme || prev.programme,
              level: existingProfile.level || prev.level,
              cwa: String(existingProfile.cwa ?? prev.cwa),
            }));
            if (existingProfile.wassce_course) setWassceCourse(existingProfile.wassce_course);
            setConsentMeasure(existingProfile.consent_measure ?? true);
            setConsentData(existingProfile.consent_data ?? true);

            // Calculate WASSCE alerts for step 4
            if (isStep4 && existingProfile.wassce_course && existingProfile.wassce_grades && existingProfile.programme) {
              const alerts = analyzeWassceAlerts(existingProfile.wassce_course, existingProfile.wassce_grades, existingProfile.programme);
              setWassceAlerts(alerts);
            }
          }

          // Fetch existing scores so we can skip already completed tests (or show them in step 4)
          const { data: constructs } = await (supabase
            .from('learner_constructs') as any)
            .select('construct, value, measured, ci_low, ci_high')
            .eq('user_id', user.id);
            
          if (constructs && constructs.length > 0) {
            const loadedScores: Record<string, number | null> = { wm: null, speed: null, attention: null, logic: null, analysis: null, metacog: null };
            constructs.forEach((c: any) => {
              // For step 4 we want all scores, but for retake we only consider them Assessed if CI < 65
              const ciWidth = (Number(c.ci_high) || 85) - (Number(c.ci_low) || 15);
              if (!c.measured || ciWidth >= 65) {
                // If we are just viewing step 4, we might still want to show them if they exist, but actually step 4 only shows 'scores' that aren't null.
                if (!isStep4) return;
              }
              
              if (c.construct === 'working_memory') loadedScores.wm = c.value;
              if (c.construct === 'processing_speed') loadedScores.speed = c.value;
              if (c.construct === 'sustained_attention') loadedScores.attention = c.value;
              if (c.construct === 'logical_reasoning') loadedScores.logic = c.value;
              if (c.construct === 'analytical_reasoning') loadedScores.analysis = c.value;
              if (c.construct === 'metacognition') loadedScores.metacog = c.value;
            });
            setScores(loadedScores);
          }

          if (isStep4) {
            setStep(4);
          } else {
            setStep(2); // Jump straight to cognitive tests GUARANTEED
          }
        } else if (existingProfile?.programme && existingProfile?.level) {
          // Normal mode: if they already have a full profile, send them to courses dashboard
          router.replace('/courses');
        }
      }
    };
    fetchUser();
  }, []);

  // ── Step 1 → 2 transition ────────────────────────────────────────────
  const handleNextStep1 = () => {
    const requiredCores = ['Core Mathematics', 'English Language', 'Integrated Science', 'Social Studies'];
    const missingCores = requiredCores.filter(sub => !wassceGrades[sub]);
    const missingElectives = wassceElectives.some(el => !el.subject || !el.grade);
    if (missingCores.length > 0 || missingElectives) {
      setFormError('Please select a subject and grade for all core and elective fields.');
      return;
    }
    setFormError(null);

    const finalGrades: Record<string, string> = { ...wassceGrades };
    wassceElectives.forEach(el => { finalGrades[el.subject] = el.grade; });

    const analysis = analyzeWassceAlerts(wassceCourse, finalGrades, profile.programme);
    setWassceAlerts(analysis);

    setStep(2);
  };

  // ── Save profile and constructs to DB ─────────────────────────────────
  const submitProfile = async () => {
    if (!user) return;
    const supabase = createClient();

    const wmVal = scores.wm ?? 0;
    const speedVal = scores.speed ?? 0;
    const attnVal = scores.attention ?? 0;
    const logicVal = scores.logic ?? 0;
    const analysisVal = scores.analysis ?? 0;
    const metacogVal = scores.metacog ?? 0;

    try {
      const finalGrades: Record<string, string> = { ...wassceGrades };
      wassceElectives.forEach(el => {
        if (el.subject) finalGrades[el.subject] = el.grade;
      });

      // ── Tier 1: All columns (university + WASSCE) ──
      const fullData: any = {
        id: user.id,
        age_band: profile.ageBand,
        university: profile.university,
        programme: profile.programme,
        level: profile.level,
        cwa: parseFloat(profile.cwa),
        consent_measure: consentMeasure,
        consent_data: consentData,
        is_minor: profile.ageBand === 'under-18',
        wassce_course: wassceCourse,
        wassce_grades: finalGrades,
        academic_alerts: wassceAlerts.alerts,
      };

      const { error: err1 } = await (supabase.from('profiles') as any).upsert(fullData);
      if (err1) {
        console.warn('Tier 1 failed (all columns), trying without university...', err1.message);
        
        // ── Tier 2: Without university column ──
        const tier2Data: any = {
          id: user.id,
          age_band: profile.ageBand,
          programme: profile.programme,
          level: profile.level,
          cwa: parseFloat(profile.cwa),
          consent_measure: consentMeasure,
          consent_data: consentData,
          is_minor: profile.ageBand === 'under-18',
          wassce_course: wassceCourse,
          wassce_grades: finalGrades,
          academic_alerts: wassceAlerts.alerts,
        };

        const { error: err2 } = await (supabase.from('profiles') as any).upsert(tier2Data);
        if (err2) {
          console.warn('Tier 2 failed (without university), trying minimal...', err2.message);
          
          // ── Tier 3: Minimal (original schema only) ──
          const minimalData = {
            id: user.id,
            age_band: profile.ageBand,
            programme: profile.programme,
            level: profile.level,
            cwa: parseFloat(profile.cwa),
            consent_measure: consentMeasure,
            consent_data: consentData,
            is_minor: profile.ageBand === 'under-18',
          };
          const { error: err3 } = await (supabase.from('profiles') as any).upsert(minimalData);
          if (err3) throw err3;
        }
      }

      // ── Save cognitive constructs ──
      await (supabase.from('learner_constructs') as any).delete().eq('user_id', user.id);

      // Try all 6 new constructs first
      const allConstructs = [
        { user_id: user.id, construct: 'working_memory', value: wmVal, ci_low: scores.wm !== null ? Math.max(0, wmVal - 10) : 0, ci_high: scores.wm !== null ? Math.min(100, wmVal + 10) : 0, measured: scores.wm !== null },
        { user_id: user.id, construct: 'processing_speed', value: speedVal, ci_low: scores.speed !== null ? Math.max(0, speedVal - 10) : 0, ci_high: scores.speed !== null ? Math.min(100, speedVal + 10) : 0, measured: scores.speed !== null },
        { user_id: user.id, construct: 'sustained_attention', value: attnVal, ci_low: scores.attention !== null ? Math.max(0, attnVal - 10) : 0, ci_high: scores.attention !== null ? Math.min(100, attnVal + 10) : 0, measured: scores.attention !== null },
        { user_id: user.id, construct: 'logical_reasoning', value: logicVal, ci_low: scores.logic !== null ? Math.max(0, logicVal - 10) : 0, ci_high: scores.logic !== null ? Math.min(100, logicVal + 10) : 0, measured: scores.logic !== null },
        { user_id: user.id, construct: 'analytical_reasoning', value: analysisVal, ci_low: scores.analysis !== null ? Math.max(0, analysisVal - 10) : 0, ci_high: scores.analysis !== null ? Math.min(100, analysisVal + 10) : 0, measured: scores.analysis !== null },
        { user_id: user.id, construct: 'metacognition', value: metacogVal, ci_low: scores.metacog !== null ? Math.max(0, metacogVal - 10) : 0, ci_high: scores.metacog !== null ? Math.min(100, metacogVal + 10) : 0, measured: scores.metacog !== null },
      ];

      const { error: constError } = await (supabase.from('learner_constructs') as any).insert(allConstructs);
      if (constError) {
        console.warn('New constructs failed (CHECK constraint?), falling back to legacy 4...', constError.message);
        // Fallback: only save the 2 legacy constructs that the DB accepts
        const legacyConstructs = [
          { user_id: user.id, construct: 'working_memory', value: wmVal, ci_low: scores.wm !== null ? Math.max(0, wmVal - 10) : 0, ci_high: scores.wm !== null ? Math.min(100, wmVal + 10) : 0, measured: scores.wm !== null },
          { user_id: user.id, construct: 'processing_speed', value: speedVal, ci_low: scores.speed !== null ? Math.max(0, speedVal - 10) : 0, ci_high: scores.speed !== null ? Math.min(100, speedVal + 10) : 0, measured: scores.speed !== null },
        ];
        const { error: legacyErr } = await (supabase.from('learner_constructs') as any).insert(legacyConstructs);
        if (legacyErr) console.warn('Even legacy constructs failed:', legacyErr.message);
      }

      setStep(4);
    } catch (err) {
      console.error(err);
      alert('Error updating database. Continuing anyway...');
      setStep(4);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--paper)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top logo header */}
      <div style={{
        padding: '20px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '3px solid var(--ink)',
        background: 'var(--lime)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="Adwen" style={{ height: '56px', width: 'auto' }} />
        </div>
        <span className="mono" style={{ fontSize: '12px', color: 'var(--ink)', fontWeight: 600 }}>
          Step {step + 1} of {STEP_LABELS.length}
        </span>
      </div>

      {/* Main content */}
      <div style={{ width: '100%', maxWidth: '840px', margin: '0 auto', padding: '32px 24px 64px' }} className="responsive-container">
        {/* Stepper */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '32px',
          background: '#fff', border: '2px solid var(--ink)', borderRadius: 'var(--pill)',
          padding: '6px', overflow: 'auto'
        }}>
          {STEP_LABELS.map((lbl, i) => (
            <div key={lbl} style={{
              flex: 1, textAlign: 'center', padding: '8px 6px',
              borderRadius: 'var(--pill)',
              background: i === step ? 'var(--tangerine)' : i < step ? 'var(--green)' : '#fff',
              border: i <= step ? '2px solid var(--ink)' : '2px solid transparent',
              fontSize: '12px',
              fontFamily: 'var(--font-display)',
              fontWeight: i === step ? 700 : 500,
              color: i <= step ? 'var(--ink)' : 'var(--muted)',
              transition: 'all var(--transition-smooth)',
              whiteSpace: 'nowrap',
            }}>
              {lbl}
            </div>
          ))}
        </div>

        {/* ── Step 0: Consent ── */}
        {step === 0 && (
          <ConsentStep
            consentMeasure={consentMeasure}
            consentData={consentData}
            onConsentMeasureChange={setConsentMeasure}
            onConsentDataChange={setConsentData}
            onNext={() => setStep(1)}
          />
        )}

        {/* ── Step 1: Basics & WASSCE ── */}
        {step === 1 && (
          <BasicsStep
            profile={profile}
            setProfile={setProfile}
            wassceCourse={wassceCourse}
            setWassceCourse={setWassceCourse}
            wassceGrades={wassceGrades}
            setWassceGrades={setWassceGrades}
            wassceElectives={wassceElectives}
            setWassceElectives={setWassceElectives}
            formError={formError}
            onNext={handleNextStep1}
            onBack={() => setStep(0)}
          />
        )}

        {/* ── Step 2: Cognitive Tests ── */}
        {step === 2 && (
          <CognitiveTestsStep
            programme={profile.programme}
            initialScores={scores}
            onComplete={(testScores) => {
              setScores(testScores);
              setStep(3);
            }}
            onSkipAll={() => setStep(3)}
          />
        )}

        {/* ── Step 3: Challenges ── */}
        {step === 3 && (
          <ChallengesStep
            selectedChallenges={selectedChallenges}
            setSelectedChallenges={setSelectedChallenges}
            challengesText={profile.challengesText}
            onChallengesTextChange={(text) => setProfile({ ...profile, challengesText: text })}
            onSubmit={submitProfile}
          />
        )}

        {/* ── Step 4: Profile Summary ── */}
        {step === 4 && (
          <ProfileSummaryStep
            scores={scores}
            programme={profile.programme}
            wassceAlerts={wassceAlerts}
          />
        )}
      </div>
    </div>
  );
}
