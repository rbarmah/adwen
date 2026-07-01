'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge, { Sparkle } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ConfidenceBand } from '@/components/ui/ProgressBar';
import { createClient } from '@/lib/supabase/client';

export default function OutcomePage() {
  const params = useParams();
  const courseId = params.id as string;

  const [realGrade, setRealGrade] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [prediction, setPrediction] = useState<any>({ point: 50, ciLow: 15, ciHigh: 85 });
  const [calibrationData, setCalibrationData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ brierScore: 0.0, error: '0 points' });

  useEffect(() => {
    const fetchOutcomeData = async () => {
      if (!courseId) return;
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // 1. Fetch latest readiness prediction
        const { data: readinessData } = await supabase
          .from('readiness_estimates')
          .select('*')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false })
          .limit(1);

        const rData = (readinessData as any) || [];
        if (rData.length > 0) {
          setPrediction({
            point: Math.round(rData[0].point),
            ciLow: Math.round(rData[0].ci_low),
            ciHigh: Math.round(rData[0].ci_high)
          });
        }

        // 2. Fetch all reported outcomes for calibration
        const { data: reportsData } = await supabase
          .from('outcome_reports')
          .select('*')
          .eq('course_id', courseId);

        const reports = (reportsData as any) || [];
        if (reports.length > 0) {
          setCalibrationData(reports.map((r: any) => ({
            pred: r.predicted_at_report,
            real: r.real_grade
          })));

          // Calculate MAE (error) and Brier-analogous score
          const sumErr = reports.reduce((sum: number, r: any) => sum + Math.abs(r.real_grade - r.predicted_at_report), 0);
          const avgErr = (sumErr / reports.length).toFixed(1);

          const brier = reports.reduce((sum: number, r: any) => sum + ((r.real_grade - r.predicted_at_report) / 100) ** 2, 0) / reports.length;

          setMetrics({
            brierScore: Number(brier.toFixed(2)),
            error: `${avgErr} points`
          });
          setSubmitted(true);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOutcomeData();
  }, [courseId]);

  const handleSubmitGrade = async () => {
    if (!realGrade || !user) return;
    setLoading(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('outcome_reports')
        .insert({
          user_id: user.id,
          course_id: courseId,
          real_grade: Number(realGrade),
          predicted_at_report: prediction.point
        } as any);

      if (error) throw error;

      // Refresh list
      const { data: reportsData } = await supabase
        .from('outcome_reports')
        .select('*')
        .eq('course_id', courseId);

      const reports = (reportsData as any) || [];
      if (reports.length > 0) {
        setCalibrationData(reports.map((r: any) => ({
          pred: r.predicted_at_report,
          real: r.real_grade
        })));

        const sumErr = reports.reduce((sum: number, r: any) => sum + Math.abs(r.real_grade - r.predicted_at_report), 0);
        const avgErr = (sumErr / reports.length).toFixed(1);
        const brier = reports.reduce((sum: number, r: any) => sum + ((r.real_grade - r.predicted_at_report) / 100) ** 2, 0) / reports.length;

        setMetrics({
          brierScore: Number(brier.toFixed(2)),
          error: `${avgErr} points`
        });
      }
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Error submitting grade.');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic calibration chart drawing (pure SVG)
  const drawCalibrationChart = () => {
    const W = 300;
    const H = 200;
    const pad = 34;
    const items = calibrationData;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: `${W}px` }}>
        {/* Axes */}
        <line x1={pad} y1={H - pad} x2={W - 10} y2={H - pad} stroke="var(--ink)" strokeWidth="2" />
        <line x1={pad} y1={10} x2={pad} y2={H - pad} stroke="var(--ink)" strokeWidth="2" />
        
        {/* Diagonal ideal prediction line */}
        <line x1={pad} y1={H - pad} x2={W - 10} y2={10} stroke="var(--muted-ink)" strokeDasharray="4 4" />
        
        {/* Y Axis Labels */}
        <text x={pad - 8} y={15} fontSize="9" fill="var(--muted)" fontFamily="var(--font-mono)" textAnchor="end">100</text>
        <text x={pad - 8} y={H - pad} fontSize="9" fill="var(--muted)" fontFamily="var(--font-mono)" textAnchor="end">0</text>
        
        {/* Axis Titles */}
        <text x={(W + pad) / 2} y={H - 6} fontSize="10" fill="var(--ink)" fontWeight="700" fontFamily="var(--font-mono)" textAnchor="middle">predicted →</text>
        <text x="12" y={(H - pad) / 2} fontSize="10" fill="var(--ink)" fontWeight="700" fontFamily="var(--font-mono)" textAnchor="middle" transform={`rotate(-90 12 ${(H - pad) / 2})`}>actual →</text>
        
        {/* Scatter Points */}
        {items.map((d, idx) => {
          const x = pad + (d.pred / 100) * (W - 10 - pad);
          const y = (H - pad) - (d.real / 100) * (H - pad - 10);
          return (
            <circle key={idx} cx={x} cy={y} r="5" fill="var(--cobalt)" stroke="var(--ink)" strokeWidth="1.5" opacity="0.9" />
          );
        })}
        {items.length === 0 && (
          <text x={W / 2} y={H / 2} fontSize="11" fill="var(--muted)" fontFamily="var(--font-body)" textAnchor="middle">
            Report a grade to plot it
          </text>
        )}
      </svg>
    );
  };

  if (loading && !submitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="skeleton" style={{ height: '40px', width: '200px' }} />
        <div className="skeleton" style={{ height: '300px' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <Badge variant="cobalt" size="sm" style={{ marginBottom: '8px' }}>Stage 8</Badge>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase' }}>
          EXAM{' '}
          <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)' }}>outcome</span>
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: '4px' }}>
          Report your real grade to close the feedback loop
        </p>
      </div>

      {/* Our prediction */}
      <Card padding="lg" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkle size={14} />
          Our Prediction
        </h2>
        <ConfidenceBand
          point={prediction.point}
          ciLow={prediction.ciLow}
          ciHigh={prediction.ciHigh}
          label="Predicted Exam Score"
          confidenceLabel="Calculated from latest readiness estimate"
          color="var(--cobalt)"
        />
      </Card>

      {/* Grade entry */}
      {!submitted ? (
        <Card padding="lg" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '8px' }}>
            Report your real exam grade
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginBottom: '20px' }}>
            This closes the feedback loop. Your real grade helps Adwen recalibrate item parameters
            and improve predictions for you and future students.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <Input
                label="Your exam score (%)"
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 62"
                value={realGrade}
                onChange={(e) => setRealGrade(e.target.value)}
                id="real-grade"
              />
            </div>
            <Button
              onClick={handleSubmitGrade}
              disabled={!realGrade || Number(realGrade) < 0 || Number(realGrade) > 100 || loading}
              size="lg"
            >
              Submit grade
            </Button>
          </div>
        </Card>
      ) : (
        <Card
          padding="lg"
          style={{
            marginBottom: '24px',
            background: 'rgba(34,197,94,0.04)',
            border: '2px solid var(--success)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎉</div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '8px' }}>
              Grade recorded!
            </h2>

            {/* Predicted vs Actual */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '24px 0', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', minWidth: '80px' }}>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Predicted
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(1.2rem, 4vw, var(--text-3xl))', fontWeight: 700, color: 'var(--cobalt)' }}>
                  {prediction.ciLow}–{prediction.ciHigh}%
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: 'var(--text-2xl)', color: 'var(--muted)' }}>
                vs
              </div>
              <div style={{ textAlign: 'center', minWidth: '80px' }}>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Actual
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(1.2rem, 4vw, var(--text-3xl))', fontWeight: 700, color: 'var(--success)' }}>
                  {realGrade || calibrationData[0]?.real}%
                </p>
              </div>
            </div>

            {Number(realGrade || calibrationData[0]?.real) >= prediction.ciLow && Number(realGrade || calibrationData[0]?.real) <= prediction.ciHigh ? (
              <Badge variant="green" size="sm">Within predicted range ✓</Badge>
            ) : (
              <Badge variant="tangerine" size="sm">
                Outside range — recalibrating model parameters
              </Badge>
            )}
          </div>
        </Card>
      )}

      {/* Calibration metrics */}
      {submitted && (
        <Card padding="lg" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '16px' }}>
            Calibration Metrics
          </h2>
          <div className="responsive-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', border: '2px solid var(--ink)', textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: '4px' }}>Brier Score Analog</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--cobalt)' }}>
                {metrics.brierScore}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted-light)' }}>0 = perfect, 1 = worst</p>
            </div>
            <div style={{ padding: '16px', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', border: '2px solid var(--ink)', textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: '4px' }}>Mean Absolute Error</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--tangerine)' }}>
                {metrics.error}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted-light)' }}>vs. predicted midpoint</p>
            </div>
          </div>
        </Card>
      )}

      {/* Calibration chart */}
      {submitted && (
        <Card padding="lg" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '16px', alignSelf: 'flex-start' }}>
            Predicted vs Actual Calibration
          </h2>
          {drawCalibrationChart()}
        </Card>
      )}

      {/* What happens next */}
      <Card padding="lg" variant="outlined">
        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: '8px' }}>
          What happens with your grade?
        </h3>
        <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', lineHeight: 2, paddingLeft: '20px' }}>
          <li>Item difficulty parameters are recalibrated from predicted-vs-actual</li>
          <li>Your readiness model weights are adjusted for this course type</li>
          <li>The reliability diagram updates to track our calibration quality</li>
          <li>This data helps make predictions more accurate for all students</li>
        </ul>
      </Card>
    </div>
  );
}
