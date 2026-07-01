import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — important for Server Components
  // Wrapped in try-catch: if Supabase key format is not recognized, 
  // just proceed without blocking
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Public routes that don't require auth
    const publicPaths = ['/', '/login', '/signup', '/waitlist', '/consent', '/onboarding', '/forgot-password', '/terms', '/privacy', '/update-password'];
    const isPublicPath = publicPaths.some(
      (path) => request.nextUrl.pathname === path
    );
    // API routes handle their own auth
    const isApiPath = request.nextUrl.pathname.startsWith('/api');

    // If no user and trying to access protected route, redirect to login
    if (!user && !isPublicPath && !isApiPath) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // If user is logged in and trying to access auth pages, redirect to app
    if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
      // Check if they are profiled
      const { data: profile } = await supabase
        .from('profiles')
        .select('consent_measure')
        .eq('id', user.id)
        .single();

      const url = request.nextUrl.clone();
      if (profile && profile.consent_measure) {
        url.pathname = '/courses';
      } else {
        url.pathname = '/onboarding';
      }
      return NextResponse.redirect(url);
    }

    // If user is logged in and accessing protected page, check if profiled
    if (user && !isPublicPath && !isApiPath) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('consent_measure, consent_data')
        .eq('id', user.id)
        .single();

      // Accept either consent flag as valid (fix: was only checking consent_measure)
      if (!profile || (!profile.consent_measure && !profile.consent_data)) {
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding';
        return NextResponse.redirect(url);
      }
    }
  } catch {
    // Auth check failed — for protected routes, redirect to login
    // rather than letting the request through in an unknown state
    const publicPaths = ['/', '/login', '/signup', '/waitlist', '/consent', '/onboarding', '/forgot-password', '/terms', '/privacy', '/update-password'];
    const isPublicPath = publicPaths.some(
      (path) => request.nextUrl.pathname === path
    );
    const isApiPath = request.nextUrl.pathname.startsWith('/api');
    if (!isPublicPath && !isApiPath) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // Disable client-side router cache for middleware responses
  // to prevent stale redirects after auth state changes
  supabaseResponse.headers.set('x-middleware-cache', 'no-cache');
  return supabaseResponse;
}

