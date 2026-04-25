import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

// Read the persisted Supabase session synchronously from localStorage so we
// can render the app optimistically on cold start instead of waiting for
// supabase.auth.getSession() (which performs a token-refresh round-trip).
// If the persisted session turns out to be invalid or expired, the
// onAuthStateChange listener clears it below and ProtectedRoute redirects.
function readPersistedSession(): Session | null {
  try {
    const raw = localStorage.getItem('inkbloop-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const session = parsed?.currentSession ?? parsed?.session ?? null;
    if (!session?.access_token) return null;
    // Treat already-expired tokens as no session — Supabase will refresh
    // them on its own once the SDK boots, but we shouldn't render the app
    // shell against credentials we know are stale.
    const expiresAt = session.expires_at;
    if (typeof expiresAt === 'number' && expiresAt * 1000 < Date.now()) {
      return null;
    }
    return session as Session;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const persisted = typeof window !== 'undefined' ? readPersistedSession() : null;
  const [session, setSession] = useState<Session | null>(persisted);
  // If we already have a plausible session, show the app immediately and
  // let the SDK validate in the background. Only block on cold-start
  // BootSplash when there's nothing in storage to render against.
  const [loading, setLoading] = useState(!persisted);

  useEffect(() => {
    // Validate the optimistic session in the background. If Supabase
    // disagrees, the new value (or null) flows in via setSession below.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
