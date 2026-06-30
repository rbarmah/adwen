/* ============================================================
   Adwen — Shared API Auth Helpers
   Centralised authentication and authorization for all API routes.
   ============================================================ */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuthResult {
  user: { id: string; email?: string };
  supabase: SupabaseClient;
}

/**
 * Require an authenticated user. Returns { user, supabase } or a 401 Response.
 */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return { user, supabase };
}

/**
 * Verify that a course belongs to the authenticated user.
 * Returns true if the user owns the course, or a 403/404 Response.
 */
export async function requireCourseOwnership(
  supabase: SupabaseClient,
  courseId: string,
  userId: string
): Promise<true | NextResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: course, error } = await (supabase.from('courses') as any)
    .select('id')
    .eq('id', courseId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !course) {
    return NextResponse.json(
      { error: 'Course not found or access denied' },
      { status: 403 }
    );
  }

  return true;
}

/**
 * Helper: check auth result — returns true if it's an error response.
 */
export function isAuthError(result: AuthResult | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
