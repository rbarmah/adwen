import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api/auth';

export async function POST() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, supabase } = auth;

  try {
    // Delete all user data across tables (cascading deletes on courses handle most)
    // Order: dependent tables first, then courses, then profile
    const tables = [
      'review_schedule',
      'readiness_estimates',
      'response_events',
      'quiz_sessions',
      'mastery_states',
      'learner_constructs',
      'chat_messages',
      'study_cards',
      'visual_note_generations',
    ];

    for (const table of tables) {
      await (supabase.from(table) as any).delete().eq('user_id', user.id);
    }

    // Delete courses (cascading will clean up items, content_units, prerequisites)
    await supabase.from('courses').delete().eq('user_id', user.id);

    // Delete profile
    await supabase.from('profiles').delete().eq('id', user.id);

    // Note: Supabase client-side cannot delete auth user.
    // The user should sign out. For full auth deletion, use admin API on the server.

    return NextResponse.json({ success: true, message: 'All data deleted. Please sign out.' });
  } catch (error: unknown) {
    console.error('[delete-account] Error:', error);
    return NextResponse.json({ error: 'Account deletion failed. Please try again.' }, { status: 500 });
  }
}
