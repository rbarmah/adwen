import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api/auth';

export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, supabase } = auth;

  try {
    // Gather all user data across tables
    const [
      { data: profile },
      { data: courses },
      { data: constructs },
      { data: sessions },
      { data: responses },
      { data: masteries },
      { data: readiness },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('courses').select('*').eq('user_id', user.id),
      supabase.from('learner_constructs').select('*').eq('user_id', user.id),
      supabase.from('quiz_sessions').select('*').eq('user_id', user.id),
      supabase.from('response_events').select('*').eq('user_id', user.id),
      supabase.from('mastery_states').select('*').eq('user_id', user.id),
      supabase.from('readiness_estimates').select('*').eq('user_id', user.id),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
      profile,
      courses,
      learner_constructs: constructs,
      quiz_sessions: sessions,
      response_events: responses,
      mastery_states: masteries,
      readiness_estimates: readiness,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="adwen-export-${user.id.slice(0, 8)}.json"`,
      },
    });
  } catch (error: unknown) {
    console.error('[export] Error:', error);
    return NextResponse.json({ error: 'Export failed. Please try again.' }, { status: 500 });
  }
}
