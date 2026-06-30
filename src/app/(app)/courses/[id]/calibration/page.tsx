'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge, { Sparkle } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { computeCalibration } from '@/lib/engine/calibrator';

export default function CalibrationPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [courseName, setCourseName] = useState('');
  const [calibration, setCalibration] = useState<any>(null);
  const [itemDetails, setItemDetails] = useState<Record<string, any>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchCalibrationData = async () => {
    if (!courseId) return;
    try {
      const supabase = createClient();

      // 1. Fetch course details
      const { data: courseData } = await (supabase
        .from('courses') as any)
        .select('name')
        .eq('id', courseId)
        .single();
      setCourseName(courseData?.name || 'Course');

      // 2. Fetch reported outcomes
      const { data: outcomes } = await supabase
        .from('outcome_reports')
        .select('*')
        .eq('course_id', courseId);
      
      const reports = (outcomes as any) || [];
      const predictions = reports.map((r: any) => ({
        predicted: Number(r.predicted_at_report || 50) / 100,
        actual: Number(r.real_grade || 50) / 100
      }));

      // 3. Fetch items and responses
      const { data: dbItems } = await supabase
        .from('items')
        .select('*')
        .eq('course_id', courseId);
      const itemsList = (dbItems as any) || [];

      // Map item details for UI stems
      const detailsMap: Record<string, any> = {};
      itemsList.forEach((it: any) => {
        detailsMap[it.id] = {
          stem: it.stem,
          cognitive_type: it.cognitive_type
        };
      });
      setItemDetails(detailsMap);

      const { data: dbEvents } = await supabase
        .from('response_events')
        .select('*, items(*)');
      
      const courseEvents = (dbEvents as any || []).filter((e: any) => e.items && e.items.course_id === courseId);
      
      const itemResponseMap: Record<string, Array<{ correct: boolean; thetaAtTime: number }>> = {};
      courseEvents.forEach((ev: any) => {
        if (!itemResponseMap[ev.item_id]) {
          itemResponseMap[ev.item_id] = [];
        }
        itemResponseMap[ev.item_id].push({
          correct: ev.is_correct,
          thetaAtTime: Number(ev.theta_before || 0.0)
        });
      });

      const calibratorInput = itemsList.map((item: any) => ({
        itemId: item.id,
        currentB: Number(item.difficulty_b),
        responses: itemResponseMap[item.id] || []
      }));

      // 4. Run deterministic calibrator engine
      const calibrationResult = computeCalibration(predictions, calibratorInput);
      setCalibration(calibrationResult);

    } catch (err) {
      console.error('Error fetching calibration:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalibrationData();
  }, [courseId]);

  const handleApplyRecalibration = async (itemId: string, suggestedB: number) => {
    setUpdatingId(itemId);
    try {
      const supabase = createClient();
      const { error } = await (supabase
        .from('items') as any)
        .update({
          difficulty_b: suggestedB,
          difficulty_bucket: Math.max(1, Math.min(5, Math.round(suggestedB)))
        })
        .eq('id', itemId);

      if (error) throw error;
      
      // Refresh calibration
      await fetchCalibrationData();
    } catch (err) {
      console.error(err);
      alert('Failed to update item parameters.');
    } finally {
      setUpdatingId(null);
    }
  };

  const drawReliabilityDiagram = () => {
    if (!calibration || !calibration.reliabilityBins) return null;
    const W = 320;
    const H = 240;
    const pad = 36;
    const bins = calibration.reliabilityBins;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: `${W}px` }}>
        {/* Diagonal perfect calibration line */}
        <line x1={pad} y1={H - pad} x2={W - 15} y2={15} stroke="var(--muted-ink)" strokeDasharray="3 3" />
        
        {/* Grid lines */}
        <line x1={pad} y1={(H - pad + 15) / 2} x2={W - 15} y2={(H - pad + 15) / 2} stroke="var(--line)" strokeWidth="0.5" />
        <line x1={(W - 15 + pad) / 2} y1={15} x2={(W - 15 + pad) / 2} y2={H - pad} stroke="var(--line)" strokeWidth="0.5" />

        {/* Axes */}
        <line x1={pad} y1={H - pad} x2={W - 15} y2={H - pad} stroke="var(--ink)" strokeWidth="2" />
        <line x1={pad} y1={15} x2={pad} y2={H - pad} stroke="var(--ink)" strokeWidth="2" />

        {/* Labels */}
        <text x={pad - 8} y={20} fontSize="8" fill="var(--muted)" fontFamily="var(--font-mono)" textAnchor="end">1.0</text>
        <text x={pad - 8} y={(H - pad + 15) / 2 + 3} fontSize="8" fill="var(--muted)" fontFamily="var(--font-mono)" textAnchor="end">0.5</text>
        <text x={pad - 8} y={H - pad} fontSize="8" fill="var(--muted)" fontFamily="var(--font-mono)" textAnchor="end">0.0</text>

        <text x={pad} y={H - pad + 12} fontSize="8" fill="var(--muted)" fontFamily="var(--font-mono)" textAnchor="middle">0.0</text>
        <text x={(W - 15 + pad) / 2} y={H - pad + 12} fontSize="8" fill="var(--muted)" fontFamily="var(--font-mono)" textAnchor="middle">0.5</text>
        <text x={W - 15} y={H - pad + 12} fontSize="8" fill="var(--muted)" fontFamily="var(--font-mono)" textAnchor="middle">1.0</text>

        {/* Titles */}
        <text x={(W + pad) / 2} y={H - 4} fontSize="9" fill="var(--ink)" fontWeight="700" fontFamily="var(--font-mono)" textAnchor="middle">predicted probability →</text>
        <text x="12" y={(H - pad) / 2} fontSize="9" fill="var(--ink)" fontWeight="700" fontFamily="var(--font-mono)" textAnchor="middle" transform={`rotate(-90 12 ${(H - pad) / 2})`}>actual accuracy →</text>

        {/* Data points and line */}
        {bins.map((b: any, i: number) => {
          const x = pad + b.meanPredicted * (W - 15 - pad);
          const y = H - pad - b.meanActual * (H - pad - 15);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="5" fill="var(--magenta)" stroke="var(--ink)" strokeWidth="1.5" />
              {/* Optional bin count tooltip indicator */}
              <text x={x} y={y - 8} fontSize="7" fill="var(--muted)" fontFamily="var(--font-mono)" textAnchor="middle">n={b.count}</text>
            </g>
          );
        })}
        {bins.length === 0 && (
          <text x={W / 2} y={H / 2} fontSize="11" fill="var(--muted)" fontFamily="var(--font-body)" textAnchor="middle">
            No outcomes reported yet
          </text>
        )}
      </svg>
    );
  };

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
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Badge variant="cobalt" size="sm" style={{ marginBottom: '8px' }}>Stage 9</Badge>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase' }}>
            ITEM{' '}
            <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)' }}>calibration</span>
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: '4px' }}>
            Recalibrating parameters for {courseName}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push(`/courses/${courseId}`)}>
          ← Dashboard
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Global calibration metrics */}
        <Card padding="lg">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '16px' }}>
            Overview
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '16px', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', border: '2.5px solid var(--ink)', textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: '4px' }}>Expected Calibration Error</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--magenta)' }}>
                {calibration?.ece ?? '0.00'}
              </p>
            </div>
            <div style={{ padding: '16px', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', border: '2.5px solid var(--ink)', textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: '4px' }}>Global Brier Score</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--cobalt)' }}>
                {calibration?.brierScore ?? '0.00'}
              </p>
            </div>
          </div>
          <div style={{ padding: '12px 16px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', color: 'var(--muted)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--ink)' }}>What this means:</strong> The **Brier Score** measures accuracy (closer to 0 is better). The **Expected Calibration Error (ECE)** measures the difference between confidence (predicted success probability) and performance (actual correct frequency).
          </div>
        </Card>

        {/* Reliability Diagram */}
        <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '16px', alignSelf: 'flex-start' }}>
            Reliability Diagram
          </h2>
          {drawReliabilityDiagram()}
        </Card>
      </div>

      {/* Suggested Parameter Adjustments */}
      <Card padding="lg">
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkle size={14} />
          Suggested Parameter Adjustments
        </h2>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: '20px' }}>
          Items with statistical deviations in actual student success rate relative to current theoretical difficulty.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {calibration?.parameterAdjustments.map((adj: any) => {
            const detail = itemDetails[adj.itemId] || { stem: 'Question stem', cognitive_type: 'memory' };
            const stemSnippet = detail.stem.length > 90 ? `${detail.stem.slice(0, 90)}...` : detail.stem;
            
            return (
              <div
                key={adj.itemId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface)',
                  border: '1.5px solid var(--line)'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                    <Badge variant="cobalt" size="sm">{detail.cognitive_type}</Badge>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      Observed responses: {adj.nResponses}
                    </span>
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink)' }}>
                    &ldquo;{stemSnippet}&rdquo;
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center', minWidth: '70px' }}>
                    <p style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase' }}>Current b</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink)' }}>{adj.currentB.toFixed(2)}</p>
                  </div>
                  <div style={{ fontSize: '1.2rem', color: 'var(--muted-light)' }}>→</div>
                  <div style={{ textAlign: 'center', minWidth: '70px', marginRight: '16px' }}>
                    <p style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase' }}>Suggested b</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--magenta)' }}>{adj.suggestedB.toFixed(2)}</p>
                  </div>

                  <Button
                    onClick={() => handleApplyRecalibration(adj.itemId, adj.suggestedB)}
                    disabled={updatingId === adj.itemId}
                    size="sm"
                  >
                    {updatingId === adj.itemId ? 'Applying...' : 'Apply adjustment'}
                  </Button>
                </div>
              </div>
            );
          })}

          {calibration?.parameterAdjustments.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--line)' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
                {"No items currently require recalibration adjustments (requires at least 5 observed responses per item with deviation > 0.15)."}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
