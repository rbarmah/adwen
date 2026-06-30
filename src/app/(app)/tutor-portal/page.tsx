'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge, { Sparkle } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';

export default function TutorPortalPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    const fetchTutorTelemetry = async () => {
      try {
        const supabase = createClient();

        // 1. Fetch only profiles who have granted data sharing consent (consent_data = true)
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('consent_data', true);

        if (error) throw error;

        const consentedProfiles = (profiles || []) as any[];

        // 2. Fetch telemetry stats for each consenting student
        const studentTelemetry = await Promise.all(consentedProfiles.map(async (prof, idx) => {
          // Fetch readiness estimates
          const { data: readinessData } = await supabase
            .from('readiness_estimates')
            .select('*')
            .eq('user_id', prof.id)
            .order('created_at', { ascending: false });
          
          const latestR = readinessData?.[0] as any;
          const readinessText = latestR 
            ? `${Math.round(latestR.ci_low)}–${Math.round(latestR.ci_high)}%` 
            : 'No estimates';

          // Fetch constructs
          const { data: constructs } = await supabase
            .from('learner_constructs')
            .select('*')
            .eq('user_id', prof.id);
          
          const constructMap: Record<string, number> = {
            working_memory: 50,
            processing_speed: 50,
            application: 50,
            prior_knowledge: 50,
          };
          (constructs || []).forEach((c: any) => {
            constructMap[c.construct] = Number(c.value);
          });

          // Fetch response events to evaluate confident but wrong counts
          const { data: events } = await supabase
            .from('response_events')
            .select('*')
            .eq('user_id', prof.id);
          
          const cbwCount = (events || []).filter((e: any) => 
            !e.is_correct && (e.stated_confidence === 'certain' || e.stated_confidence === 'fairly')
          ).length;

          return {
            id: prof.id,
            alias: `KNUST Student #${idx + 101}`,
            programme: prof.programme || 'Undergraduate',
            level: prof.level || 200,
            cwa: prof.cwa ? `${prof.cwa} CWA` : 'N/A',
            readiness: readinessText,
            readinessPoint: latestR ? latestR.point : 50,
            cbwAlerts: cbwCount,
            skills: {
              memory: constructMap.working_memory,
              recall: constructMap.processing_speed,
              application: constructMap.application,
              maths: Math.round((constructMap.prior_knowledge * 0.5) + (constructMap.application * 0.5))
            }
          };
        }));

        setStudents(studentTelemetry);
      } catch (err) {
        console.error('Error fetching tutor telemetry:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTutorTelemetry();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="skeleton" style={{ height: '40px', width: '200px' }} />
        <div className="skeleton" style={{ height: '300px' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '32px' }}>
        <Badge variant="magenta" size="sm" style={{ marginBottom: '8px' }}>Educator Panel</Badge>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase' }}>
          TUTOR{' '}
          <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--cobalt)' }}>portal</span>
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: '4px' }}>
          Student telemetry and cognitive readiness dashboard (Act 843 compliant)
        </p>
      </div>

      {students.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center', border: '1.5px dashed var(--line)', background: 'var(--surface)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔒</div>
          <h3 style={{ fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: '6px' }}>No student data available</h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', maxWidth: '440px', margin: '0 auto' }}>
            Only students who have explicitly opted in to share their learning telemetry (via settings consent controls) are shown.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {students.map((student) => (
            <Card
              key={student.id}
              padding="lg"
              style={{
                border: '1.5px solid var(--ink)',
                background: student.cbwAlerts > 2 ? 'rgba(236,63,143,0.02)' : 'var(--surface)',
                borderLeft: student.cbwAlerts > 2 ? '4px solid var(--magenta)' : '1.5px solid var(--ink)'
              }}
            >
              <div className="responsive-grid-1" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr', gap: '24px', alignItems: 'center' }}>
                
                {/* 1. Profile information */}
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--cobalt)' }}>{student.alias}</h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginTop: '4px' }}>
                    {student.programme} • Level {student.level}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '10px' }}>
                    <Badge variant="muted" size="sm">{student.cwa}</Badge>
                    {student.cbwAlerts > 0 && (
                      <Badge variant={student.cbwAlerts > 2 ? 'danger' : 'tangerine'} size="sm">
                        ⚠️ {student.cbwAlerts} CBW Errors
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 2. Skills map levels */}
                <div>
                  <h4 style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>
                    Cognitive Skill Measures
                  </h4>
                  <div className="responsive-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {Object.entries(student.skills).map(([skill, val]: any) => (
                      <div key={skill} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--muted-ink)', textTransform: 'capitalize' }}>{skill}</span>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink)' }}>{val}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Readiness meter */}
                <div style={{ textAlign: 'center', borderLeft: '1.5px solid var(--line)', paddingLeft: '24px' }}>
                  <h4 style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                    Predicted Exam Readiness
                  </h4>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--success)', margin: '4px 0' }}>
                    {student.readiness}
                  </p>
                  {student.cbwAlerts > 2 && (
                    <p style={{ fontSize: '9px', color: 'var(--magenta)', fontStyle: 'italic', marginTop: '4px' }}>
                      Potential misconception gap detected
                    </p>
                  )}
                </div>

              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
