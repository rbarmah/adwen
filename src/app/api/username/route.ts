import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET /api/username — get current user's username
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await (supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle() as any);

  return NextResponse.json({ username: profile?.username || null, email: user.email });
}

// POST /api/username — set username
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { username } = await request.json();

  // Validate
  const trimmed = (username || '').trim();
  if (!trimmed || trimmed.length < 3) {
    return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
  }
  if (trimmed.length > 24) {
    return NextResponse.json({ error: 'Username must be 24 characters or less' }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_.\- ]+$/.test(trimmed)) {
    return NextResponse.json({ error: 'Username can only contain letters, numbers, spaces, underscores, dots, and hyphens' }, { status: 400 });
  }

  // Check uniqueness (service role to bypass RLS)
  const admin = getServiceSupabase();
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .ilike('username', trimmed)
    .neq('id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'This username is already taken' }, { status: 409 });
  }

  // Upsert profile with username
  const { error } = await (supabase.from('profiles') as any).upsert(
    { id: user.id, username: trimmed },
    { onConflict: 'id' }
  );

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This username is already taken' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, username: trimmed });
}
