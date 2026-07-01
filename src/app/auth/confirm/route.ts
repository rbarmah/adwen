import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as string | null;
  const next = searchParams.get('next') ?? '/';

  if (token_hash && type) {
    const supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });

    if (!error) {
      // Determine where to redirect based on type
      let redirectTo = next;
      if (type === 'recovery') {
        redirectTo = '/update-password';
      } else if (type === 'signup' || type === 'email') {
        redirectTo = '/consent';
      }

      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = redirectTo;
      redirectUrl.searchParams.delete('token_hash');
      redirectUrl.searchParams.delete('type');
      redirectUrl.searchParams.delete('next');

      const response = NextResponse.redirect(redirectUrl);
      // Copy cookies from supabase response
      supabaseResponse.cookies.getAll().forEach(cookie => {
        response.cookies.set(cookie.name, cookie.value);
      });
      return response;
    }
  }

  // If verification failed, redirect to error or login
  const errorUrl = request.nextUrl.clone();
  errorUrl.pathname = '/login';
  errorUrl.searchParams.set('error', 'verification_failed');
  return NextResponse.redirect(errorUrl);
}
