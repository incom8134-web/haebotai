"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthError, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// Ported from an external useAuth hook (tRPC + a custom nonce-cookie
// login backend) — kept the shape (query-like state, redirect-if-
// unauthenticated, clean logout), rebuilt the mechanism on our own
// Supabase Auth. No React Query/tRPC needed: onAuthStateChange already
// gives real-time session updates, which is the actual feature that
// hook was reaching for. Dropped the sessionStorage "manus-cookie"
// mirror entirely — that was working around a different backend's
// header-based session quirk (Safari ITP / WebView); @supabase/ssr's
// cookie handling doesn't have that problem.

interface UseAuthOptions {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
}

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/auth" } = options ?? {};
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data, error: getUserError }) => {
      if (!active) return;
      setUser(data.user);
      setError(getUserError);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: getUserError } = await supabase.auth.getUser();
    setUser(data.user);
    setError(getUserError);
    setLoading(false);
  }, [supabase]);

  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(signOutError);
        return;
      }
      setUser(null);
    } finally {
      setLoggingOut(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (user) return;
    if (window.location.pathname === redirectPath) return;
    router.push(redirectPath);
  }, [redirectOnUnauthenticated, redirectPath, loading, user, router]);

  return {
    user,
    loading: loading || loggingOut,
    error,
    isAuthenticated: Boolean(user),
    refresh,
    logout,
  };
}
