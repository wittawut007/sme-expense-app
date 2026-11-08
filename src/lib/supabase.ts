import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getSupabaseEnv = () => {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  return { url, key };
};

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseEnv();
  return (
    typeof url === 'string' &&
    url.trim() !== '' &&
    !url.includes('your_') &&
    typeof key === 'string' &&
    key.trim() !== '' &&
    !key.includes('your_')
  );
}

/**
 * Standard server-side Supabase client (Anon / Service Role)
 */
export function getSupabaseClient() {
  const { url, key } = getSupabaseEnv();

  if (!isSupabaseConfigured()) {
    throw new Error(
      'SUPABASE_NOT_CONFIGURED: กรุณาระบุ NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY หรือ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ใน .env.local'
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Server-side Supabase client authenticated on behalf of a specific user token.
 * This ensures Row Level Security (RLS) rules evaluate `auth.uid() = user_id`.
 */
export function getAuthenticatedSupabaseClient(token?: string | null) {
  const { url, key } = getSupabaseEnv();

  if (!isSupabaseConfigured()) {
    throw new Error(
      'SUPABASE_NOT_CONFIGURED: กรุณาระบุ NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createClient(url, key, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    auth: {
      persistSession: false,
    },
  });
}

// Client-side singleton instance
let browserClientInstance: SupabaseClient | null = null;

/**
 * Browser-side Supabase client for Authentication and Realtime with session persistence in localStorage
 */
export function getBrowserSupabaseClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    return getSupabaseClient();
  }

  if (!browserClientInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      '';

    if (!url || !key) {
      throw new Error('Supabase client credentials missing on browser');
    }

    browserClientInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        lock: async (_name, _acquireTimeout, fn) => {
          return await fn();
        },
      },
    });
  }

  return browserClientInstance;
}

/**
 * Extract Bearer token from Request Authorization header
 */
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader) return null;
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return authHeader.trim();
}

/**
 * Validates the user token from the request and returns the authenticated user
 */
export async function getAuthUser(req: Request): Promise<{
  user: any | null;
  token: string | null;
  error: string | null;
}> {
  try {
    const token = extractToken(req);
    if (!token) {
      return { user: null, token: null, error: 'NO_TOKEN' };
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return { user: null, token, error: error?.message || 'INVALID_TOKEN' };
    }

    return { user: data.user, token, error: null };
  } catch (err: any) {
    return { user: null, token: null, error: err.message };
  }
}
