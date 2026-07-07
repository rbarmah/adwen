import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

// POST /api/admin/send-username-reminder — email all existing users who haven't set a username
export async function POST(request: NextRequest) {
  const APP_URL = request.nextUrl.origin;

  const authHeader = request.headers.get('x-admin-secret');
  if (ADMIN_SECRET && authHeader !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const resend = getResend();

  // Get all users
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const allUsers = authUsers?.users || [];

  // Get profiles that already have a username
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username');

  const hasUsername = new Set(
    (profiles || []).filter((p: any) => p.username && p.username.trim()).map((p: any) => p.id)
  );

  // Find users without a username
  const needUsername = allUsers.filter(u => !hasUsername.has(u.id) && u.email);

  let sent = 0;
  const errors: string[] = [];

  for (const user of needUsername) {
    try {
      await resend.emails.send({
        from: `Adwen <${FROM_EMAIL}>`,
        to: user.email!,
        subject: '👤 Set your Adwen username!',
        html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #f5f5f0;">
  <div style="text-align: center; margin-bottom: 28px;">
    <span style="font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">ADWEN</span>
  </div>

  <div style="background: #ffffff; border-radius: 16px; padding: 32px 24px; border: 2px solid #1a1a1a; box-shadow: 0 4px 0 #1a1a1a;">
    <h2 style="text-align: center; margin: 0 0 12px; font-size: 22px;">
      Choose your username! 👤
    </h2>
    <p style="color: #666; font-size: 14px; line-height: 1.6; text-align: center; margin: 0 0 24px;">
      We're adding usernames to Adwen so your classmates can find you easily for <strong>Teams</strong> and <strong>Duels</strong>. Log in and set yours now!
    </p>

    <div style="text-align: center;">
      <a href="${APP_URL}/courses" style="display: inline-block; padding: 14px 32px; background: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 99px; font-weight: 700; font-size: 15px;">
        Set my username →
      </a>
    </div>

    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
      When you log in, you'll see a prompt to choose your username.
    </p>
  </div>

  <p style="color: #999; font-size: 11px; text-align: center; margin-top: 20px;">
    Adwen — Your Intelligent Study Companion
  </p>
</div>
        `,
      });
      sent++;
    } catch (err: any) {
      errors.push(`${user.email}: ${err.message}`);
    }
  }

  return NextResponse.json({
    totalUsers: allUsers.length,
    alreadyHaveUsername: hasUsername.size,
    emailsSent: sent,
    errors: errors.length > 0 ? errors : undefined,
  });
}
