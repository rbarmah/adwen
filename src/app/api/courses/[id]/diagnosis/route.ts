import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callAgent } from '@/lib/openai/client';
import { DIAGNOSTIC_NARRATOR_CONFIG } from '@/lib/openai/agents';
import { DiagnosticNarratorSchema } from '@/lib/openai/schemas';
import { requireCourseOwnership } from '@/lib/api/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;
  const supabase = await createClient();

  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify course ownership (IDOR protection)
  const ownerCheck = await requireCourseOwnership(supabase, courseId, user.id);
  if (ownerCheck !== true) return ownerCheck;

  // 2. Fetch course name
  const { data: courseObj } = await (supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single() as any);

  const courseName = courseObj?.name || 'University Course';

  // 3. Parse request body
  const { readiness, skills, actionPlan } = await request.json();
  if (!readiness || !skills || !actionPlan) {
    return NextResponse.json({ error: 'Missing diagnostic inputs' }, { status: 400 });
  }


  try {
    const prompt = `Course name: "${courseName}"
Readiness midpoint: ${readiness.point}% (Interval: ${readiness.ciLow}% to ${readiness.ciHigh}%, Confidence: ${readiness.confidence})
Skills measurements:
${skills.map((s: any) => `- ${s.name}: ${s.value}`).join('\n')}

Original action plan (BKT):
${actionPlan.map((p: any) => `- Priority ${p.rank}: ${p.topic} (${p.gain} potential gain)`).join('\n')}`;

    const narratorResult = await callAgent<any>(
      DIAGNOSTIC_NARRATOR_CONFIG,
      prompt,
      user.id,
      DiagnosticNarratorSchema,
    );

    return NextResponse.json(narratorResult.data);
  } catch (error: unknown) {
    console.error('Diagnosis narrator error:', error);
    return NextResponse.json({ error: 'Diagnosis failed. Please try again.' }, { status: 500 });
  }
}
