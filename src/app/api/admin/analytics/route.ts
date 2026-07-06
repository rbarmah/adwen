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

  // ── Platform-wide KPIs (all use count: exact + head: true — no row limit) ─
  const [
    profilesRes,
    coursesRes,
    sessionsRes,
    responsesRes,
    chatRes,
    agentRes,
    studyCardsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('courses').select('id', { count: 'exact', head: true }),
    supabase.from('quiz_sessions').select('id', { count: 'exact', head: true }),
    supabase.from('response_events').select('id', { count: 'exact', head: true }),
    supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
    supabase.from('agent_runs').select('id', { count: 'exact', head: true }),
    supabase.from('study_cards').select('id', { count: 'exact', head: true }),
  ]);

  const kpis = {
    totalUsers: profilesRes.count || 0,
    totalCourses: coursesRes.count || 0,
    totalQuizSessions: sessionsRes.count || 0,
    totalQuestionsAnswered: responsesRes.count || 0,
    totalChatMessages: chatRes.count || 0,
    totalAICalls: agentRes.count || 0,
    totalStudyCardSets: studyCardsRes.count || 0,
  };

  // ── Per-user leaderboard ───────────────────────────────────────────────────
  // Get all auth users
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const users = authUsers?.users || [];

  // For each user, run individual count queries (fast, accurate, no row limit)
  const leaderboard = await Promise.all(
    users.map(async (user) => {
      const userId = user.id;

      const [courses, quizzes, answers, chats] = await Promise.all([
        supabase.from('courses').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('quiz_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('response_events').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('role', 'user'),
      ]);

      const coursesCount = courses.count || 0;
      const quizzesCount = quizzes.count || 0;
      const answersCount = answers.count || 0;
      const chatsCount = chats.count || 0;

      return {
        id: userId,
        email: user.email || 'unknown',
        joinedAt: user.created_at || '',
        lastSignIn: user.last_sign_in_at || '',
        courses: coursesCount,
        quizzes: quizzesCount,
        answers: answersCount,
        messages: chatsCount,
        totalActivity: quizzesCount + answersCount + chatsCount,
      };
    })
  );

  // Sort: most active first
  leaderboard.sort((a, b) => b.totalActivity - a.totalActivity);

  return NextResponse.json({ kpis, leaderboard });
}
