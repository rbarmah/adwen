import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * DELETE /api/courses/[id]
 *
 * Deletes a course and all its related data in dependency order.
 * This bypasses FK constraint issues by manually clearing child tables first.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership first
  const { data: course, error: ownerErr } = await (supabase.from('courses') as any)
    .select('id')
    .eq('id', courseId)
    .eq('user_id', user.id)
    .single();

  if (ownerErr || !course) {
    return NextResponse.json({ error: 'Course not found or not yours' }, { status: 404 });
  }

  try {
    // Delete in dependency order (deepest children first)

    // 1. response_events → references quiz_sessions (no course_id direct)
    const { data: sessions } = await (supabase.from('quiz_sessions') as any)
      .select('id')
      .eq('course_id', courseId);

    const sessionIds = ((sessions as any[]) || []).map((s: any) => s.id);

    if (sessionIds.length > 0) {
      await (supabase.from('response_events') as any)
        .delete()
        .in('session_id', sessionIds);
    }

    // 2. quiz_sessions
    await (supabase.from('quiz_sessions') as any)
      .delete()
      .eq('course_id', courseId);

    // 3. mastery_states
    await (supabase.from('mastery_states') as any)
      .delete()
      .eq('course_id', courseId);

    // 4. readiness_estimates
    await (supabase.from('readiness_estimates') as any)
      .delete()
      .eq('course_id', courseId);

    // 5. outcome_reports
    await (supabase.from('outcome_reports') as any)
      .delete()
      .eq('course_id', courseId);

    // 6. review_schedule
    await (supabase.from('review_schedule') as any)
      .delete()
      .eq('course_id', courseId);

    // 7. study_cards
    await (supabase.from('study_cards') as any)
      .delete()
      .eq('course_id', courseId);

    // 8a. Collect item IDs for this course
    const { data: itemRows } = await (supabase.from('items') as any)
      .select('id')
      .eq('course_id', courseId);

    const itemIds = ((itemRows as any[]) || []).map((it: any) => it.id);

    // 8b. Delete response_events that reference these items (item_id FK)
    if (itemIds.length > 0) {
      await (supabase.from('response_events') as any)
        .delete()
        .in('item_id', itemIds);
    }

    // 8c. Now safe to delete items
    await (supabase.from('items') as any)
      .delete()
      .eq('course_id', courseId);

    // 9. prerequisites
    await (supabase.from('prerequisites') as any)
      .delete()
      .eq('course_id', courseId);

    // 10. content_units
    await (supabase.from('content_units') as any)
      .delete()
      .eq('course_id', courseId);

    // 11. course_files (and actual storage files)
    const { data: files } = await (supabase.from('course_files') as any)
      .select('storage_path')
      .eq('course_id', courseId);

    const paths = ((files as any[]) || []).map((f: any) => f.storage_path).filter(Boolean);
    if (paths.length > 0) {
      await supabase.storage.from('course-uploads').remove(paths);
    }

    await (supabase.from('course_files') as any)
      .delete()
      .eq('course_id', courseId);

    // 12. Finally delete the course itself
    const { error: deleteErr } = await (supabase.from('courses') as any)
      .delete()
      .eq('id', courseId)
      .eq('user_id', user.id);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[DELETE /api/courses/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete course. Please try again.' }, { status: 500 });
  }
}
