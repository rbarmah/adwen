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

  // ── Platform-wide KPIs ─────────────────────────────────────────────────────
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
    supabase.from('agent_runs').select('id', { count: 'exact', head: true }),
  ]);

  // Feature-specific KPIs from agent_runs
  // agent names: tutor = flashcards, visual_notes = visual notes, item_writer = quiz gen
  const [
    tutorCallsRes,
    visualNotesCallsRes,
  ] = await Promise.all([
    supabase.from('agent_runs').select('id', { count: 'exact', head: true }).eq('agent', 'tutor'),
    supabase.from('agent_runs').select('id', { count: 'exact', head: true }).eq('agent', 'visual_notes'),
  ]);

  const kpis = {
    totalUsers: profilesRes.count || 0,
    totalCourses: coursesRes.count || 0,
    totalQuizSessions: sessionsRes.count || 0,
    totalQuestionsAnswered: responsesRes.count || 0,
    totalChatMessages: chatRes.count || 0,
    totalFlashcardSets: tutorCallsRes.count || 0,
    totalVisualNotes: visualNotesCallsRes.count || 0,
    totalAICalls: agentRes.count || 0,
  };

  // ── Per-user leaderboard with feature breakdown ────────────────────────────
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const users = authUsers?.users || [];

  const leaderboard = await Promise.all(
    users.map(async (user) => {
      const uid = user.id;

      // All queries in parallel for speed
      const [
        courses,
        quizzes,
        answers,
        chats,
        flashcardUses,
        visualNoteUses,
        feynmanChats,
        feynmanEvals,
      ] = await Promise.all([
        // Courses uploaded
        supabase.from('courses').select('id', { count: 'exact', head: true }).eq('user_id', uid),
        // Quiz sessions started
        supabase.from('quiz_sessions').select('id', { count: 'exact', head: true }).eq('user_id', uid),
        // Quiz questions answered
        supabase.from('response_events').select('id', { count: 'exact', head: true }).eq('user_id', uid),
        // Chat messages sent (user messages only)
        supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('role', 'user'),
        // Flashcard sets generated (agent_runs where agent = 'tutor')
        supabase.from('agent_runs').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('agent', 'tutor'),
        // Visual notes generated (agent_runs where agent = 'visual_notes')
        supabase.from('agent_runs').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('agent', 'visual_notes'),
        // Feynman teach-it-back conversations (agent_runs where agent = 'feynman_evaluator' doesn't exist,
        // but feynman-chat uses direct OpenAI — count chat_messages isn't available for Feynman)
        // Best proxy: check if user has Feynman-related chat data. Use a different approach:
        // Count feynman-chat API calls from agent_runs (these go through direct OpenAI, not callAgent)
        // Since Feynman doesn't log to agent_runs, we'll count mastery_states as a proxy for study engagement
        supabase.from('mastery_states').select('id', { count: 'exact', head: true }).eq('user_id', uid),
        // Readiness estimates (shows they've done enough quizzes to get scored)
        supabase.from('readiness_estimates').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      ]);

      const coursesCount = courses.count || 0;
      const quizzesCount = quizzes.count || 0;
      const answersCount = answers.count || 0;
      const chatsCount = chats.count || 0;
      const flashcardCount = flashcardUses.count || 0;
      const visualNotesCount = visualNoteUses.count || 0;
      const masteryTopics = feynmanChats.count || 0;
      const readinessCount = feynmanEvals.count || 0;

      return {
        id: uid,
        email: user.email || 'unknown',
        joinedAt: user.created_at || '',
        lastSignIn: user.last_sign_in_at || '',
        courses: coursesCount,
        quizzes: quizzesCount,
        answers: answersCount,
        chatMessages: chatsCount,
        flashcards: flashcardCount,
        visualNotes: visualNotesCount,
        masteryTopics,
        readinessScores: readinessCount,
        totalActivity: quizzesCount + answersCount + chatsCount + flashcardCount + visualNotesCount,
      };
    })
  );

  leaderboard.sort((a, b) => b.totalActivity - a.totalActivity);

  return NextResponse.json({ kpis, leaderboard });
}
