import { Database } from '@/types/supabase';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const getValidSubdomain = (host?: string | null) => {
  let subdomain: string | null = null;
  if (!host && typeof window !== 'undefined') {
    host = window.location.host;
  }
  if (host && host.includes('.')) {
    const candidate = host.split('.')[0];
    if (candidate && !candidate.includes('localhost') && candidate !== 'www') {
      subdomain = candidate;
    }
  }
  return subdomain;
};

export const createClient = (request: NextRequest) => {
  const url = request.nextUrl.clone();
  const host = request.headers.get('host');
  const subdomain = getValidSubdomain(host);

  if (subdomain) {
    url.pathname = `/${subdomain}${url.pathname}`;
  }

  // Create an unmodified response
  let response = NextResponse.rewrite(url, {
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is updated, update the cookies for the request and response
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the cookies for the request and response
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  return { supabase, response, subdomain };
};
