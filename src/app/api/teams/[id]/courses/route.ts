import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/teams/[id]/courses — assign a course to the team (owner only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: team } = await (supabase.from('teams').select('owner_id').eq('id', teamId).single() as any);
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.owner_id !== user.id) return NextResponse.json({ error: 'Only the team owner can add courses' }, { status: 403 });

  const { courseId } = await request.json();
  if (!courseId) return NextResponse.json({ error: 'courseId is required' }, { status: 400 });

  const { error } = await (supabase.from('team_courses') as any).insert({
    team_id: teamId, course_id: courseId, added_by: user.id,
  });

  if (error?.code === '23505') return NextResponse.json({ error: 'Course already added to this team' }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// DELETE /api/teams/[id]/courses — remove a course from the team (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: team } = await (supabase.from('teams').select('owner_id').eq('id', teamId).single() as any);
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.owner_id !== user.id) return NextResponse.json({ error: 'Only the team owner can remove courses' }, { status: 403 });

  const { courseId } = await request.json();
  await (supabase.from('team_courses') as any).delete().eq('team_id', teamId).eq('course_id', courseId);

  return NextResponse.json({ success: true });
}
