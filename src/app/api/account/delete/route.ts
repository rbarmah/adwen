import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api/auth';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, supabase } = auth;

  // Initialize admin client to bypass RLS and delete auth user
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!adminKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Server misconfiguration: missing admin keys.' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // 1. Delete all user uploaded files from storage
    const { data: files } = await (supabase.from('course_files') as any)
      .select('storage_path')
      .eq('user_id', user.id);
      
    const paths = ((files as any[]) || []).map((f: any) => f.storage_path).filter(Boolean);
    if (paths.length > 0) {
      await supabaseAdmin.storage.from('course-uploads').remove(paths);
    }

    // 2. Delete the user from Auth
    // Because of ON DELETE CASCADE on auth.users -> profiles / courses / etc.
    // This will instantly and atomically wipe every single row belonging to the user.
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true, message: 'Account completely deleted.' });
  } catch (error: unknown) {
    console.error('[delete-account] Error:', error);
    return NextResponse.json({ error: 'Account deletion failed. Please try again.' }, { status: 500 });
  }
}
