/**
 * Supabase Middleware Helper
 *
 * Refreshes the Supabase auth session on every request so that
 * cookies stay up-to-date and expired sessions are detected early.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Define public routes that don't require authentication
  const publicRoutes = ["/login", "/auth/callback"];
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    console.log(`[MIDDLEWARE] getUser result — user: ${data?.user?.email ?? 'null'}, error: ${error?.message ?? 'none'}`);
    if (!error) {
      user = data.user;
    }
  } catch (e) {
    console.log(`[MIDDLEWARE] getUser threw: ${e}`);
    user = null;
  }

  console.log(`[MIDDLEWARE] Path: ${request.nextUrl.pathname}, isPublic: ${isPublicRoute}, user: ${user?.email ?? 'null'}`);

  // If user is not authenticated and is trying to access a protected route → redirect to login
  if (!user && !isPublicRoute) {
    console.log(`[MIDDLEWARE] Redirecting to /login`);
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user IS authenticated and visits /login → redirect to home
  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
