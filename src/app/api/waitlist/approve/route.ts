import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// APP_URL is determined dynamically from the request
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

export async function POST(request: NextRequest) {
  try {
    // Dynamically get the app URL so the email links correctly in production
    const APP_URL = request.nextUrl.origin;
    // Auth check — require admin secret
    const authHeader = request.headers.get('x-admin-secret');
    if (ADMIN_SECRET && authHeader !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Update waitlist status
    const { data, error: updateError } = await getSupabase()
      .from('waitlist')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('email', normalizedEmail)
      .select()
      .single();

    if (updateError || !data) {
      return NextResponse.json(
        { error: 'Email not found on waitlist' },
        { status: 404 }
      );
    }

    // 2. Send approval email via Resend
    const { error: emailError } = await getResend().emails.send({
      from: `Adwen <${FROM_EMAIL}>`,
      to: normalizedEmail,
      subject: 'You\'re in! 🎉 Your Adwen access is ready',
      html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #f5f5f0;">
  <!-- Logo -->
  <div style="text-align: center; margin-bottom: 28px;">
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
      <tr>
        <td style="background: #D4ED2A; border: 2px solid #0E0E0E; border-radius: 10px; width: 36px; height: 36px; text-align: center; vertical-align: middle; font-size: 18px; box-shadow: 0 2px 0 #0E0E0E;">
          💡
        </td>
        <td style="padding-left: 10px; font-size: 24px; font-weight: 900; color: #0E0E0E; letter-spacing: 0.02em; font-family: 'Arial Black', 'Helvetica Neue', Arial, sans-serif;">
          Adwen
        </td>
      </tr>
    </table>
  </div>

  <!-- Card -->
  <div style="background: #FFFFFF; border: 2px solid #0E0E0E; border-radius: 16px; padding: 32px 28px; box-shadow: 0 4px 0 #0E0E0E;">
    <h1 style="font-size: 24px; font-weight: 800; margin: 0 0 8px; color: #0E0E0E;">You're in! 🎉</h1>
    <p style="color: #5C5C57; font-size: 14px; line-height: 1.7; margin: 0 0 8px;">
      Great news — your spot on Adwen is confirmed.
    </p>
    <p style="color: #5C5C57; font-size: 14px; line-height: 1.7; margin: 0 0 28px;">
      Click below to create your account and start your AI-powered study journey. Upload your course materials, take your cognitive diagnostic, and get personalised study strategies.
    </p>
    <table cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background: #D4ED2A; border: 2px solid #0E0E0E; border-radius: 99px; box-shadow: 0 3px 0 #0E0E0E;">
          <a href="${APP_URL}/signup" style="display: inline-block; padding: 14px 36px; color: #0E0E0E; font-size: 15px; font-weight: 800; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            Create my account →
          </a>
        </td>
      </tr>
    </table>
    <p style="color: #9E9E9E; font-size: 12px; margin-top: 28px; line-height: 1.6;">
      This link will take you to the signup page where you can set your password. Use this same email address (<strong>${normalizedEmail}</strong>) to sign up.
    </p>
  </div>

  <p style="text-align: center; color: #9E9E9E; font-size: 11px; margin-top: 20px; font-family: 'Courier New', monospace;">
    Adwen · Personalised learning intelligence
  </p>
</div>
      `,
    });

    if (emailError) {
      console.error('[waitlist/approve] Email send error:', emailError);
      // Still return success since the DB was updated
      return NextResponse.json({
        success: true,
        warning: 'Approved but email failed to send',
        emailError: emailError.message,
      });
    }

    return NextResponse.json({ success: true, email: normalizedEmail });
  } catch (err) {
    console.error('[waitlist/approve] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
