import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function checkAuth(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret');
  return ADMIN_SECRET && secret === ADMIN_SECRET;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // ── Platform-wide KPIs (parallel queries) ──────────────────────────────────
  const [
    profilesRes,
    coursesRes,
    sessionsRes,
    responsesRes,
    chatRes,
    agentRes,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('courses').select('id', { count: 'exact', head: true }),
    supabase.from('quiz_sessions').select('id', { count: 'exact', head: true }),
    supabase.from('response_events').select('id', { count: 'exact', head: true }),
    supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
    supabase.from('agent_runs').select('input_tokens, output_tokens'),
  ]);

  const totalTokens = (agentRes.data || []).reduce(
    (sum: number, r: any) => sum + (r.input_tokens || 0) + (r.output_tokens || 0),
    0
  );

  const kpis = {
    totalUsers: profilesRes.count || 0,
    totalCourses: coursesRes.count || 0,
    totalSessions: sessionsRes.count || 0,
    totalResponses: responsesRes.count || 0,
    totalChatMessages: chatRes.count || 0,
    totalAgentCalls: (agentRes.data || []).length,
    totalTokens,
  };

  // ── Per-user leaderboard ───────────────────────────────────────────────────
  // 1. Get all users with their auth email
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const users = authUsers?.users || [];

  // Build email lookup
  const emailMap: Record<string, string> = {};
  for (const u of users) {
    emailMap[u.id] = u.email || 'unknown';
  }

  // 2. Get aggregated counts per user
  const [userCourses, userSessions, userResponses, userChats] = await Promise.all([
    supabase.from('courses').select('user_id'),
    supabase.from('quiz_sessions').select('user_id, started_at'),
    supabase.from('response_events').select('user_id, created_at'),
    supabase.from('chat_messages').select('user_id, created_at').eq('role', 'user'),
  ]);

  // Aggregate per user
  const userStats: Record<string, {
    email: string;
    courses: number;
    quizzes: number;
    answers: number;
    messages: number;
    lastActive: string;
  }> = {};

  // Initialize all known users
  for (const u of users) {
    userStats[u.id] = {
      email: u.email || 'unknown',
      courses: 0,
      quizzes: 0,
      answers: 0,
      messages: 0,
      lastActive: u.last_sign_in_at || u.created_at || '',
    };
  }

  // Count courses
  for (const row of (userCourses.data || []) as any[]) {
    if (userStats[row.user_id]) {
      userStats[row.user_id].courses++;
    }
  }

  // Count quizzes and track last active
  for (const row of (userSessions.data || []) as any[]) {
    if (userStats[row.user_id]) {
      userStats[row.user_id].quizzes++;
      if (row.started_at > userStats[row.user_id].lastActive) {
        userStats[row.user_id].lastActive = row.started_at;
      }
    }
  }

  // Count answers
  for (const row of (userResponses.data || []) as any[]) {
    if (userStats[row.user_id]) {
      userStats[row.user_id].answers++;
      if (row.created_at > userStats[row.user_id].lastActive) {
        userStats[row.user_id].lastActive = row.created_at;
      }
    }
  }

  // Count chat messages
  for (const row of (userChats.data || []) as any[]) {
    if (userStats[row.user_id]) {
      userStats[row.user_id].messages++;
      if (row.created_at > userStats[row.user_id].lastActive) {
        userStats[row.user_id].lastActive = row.created_at;
      }
    }
  }

  // Convert to sorted array (most engaged first)
  const leaderboard = Object.entries(userStats)
    .map(([id, stats]) => ({ id, ...stats, engagement: stats.quizzes + stats.messages + stats.answers }))
    .sort((a, b) => b.engagement - a.engagement);

  return NextResponse.json({ kpis, leaderboard });
}
