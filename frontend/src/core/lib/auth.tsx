import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/core/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ error: any }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

const getCachedSession = (): Session | null => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.user) {
            return parsed as Session;
          }
        }
      }
    }
  } catch {
    // Ignore parse or storage errors
  }
  return null;
};

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const initialCachedSession = getCachedSession();
  const [session, setSession] = useState<Session | null>(initialCachedSession);
  const [user, setUser] = useState<User | null>(initialCachedSession?.user ?? null);
  const [loading, setLoading] = useState(!initialCachedSession);

  useEffect(() => {
    let mounted = true;

    // Get the existing session from localStorage / Supabase
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Failed to restore authentication session:", error);
        }

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error("Authentication initialization error:", error);

        if (!mounted) return;

        setSession(null);
        setUser(null);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for login, logout, token refresh, etc.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;

        console.log("Auth state changed:", event);

        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    const redirectUrl = `${window.location.origin}/auth`;

    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName.trim(),
        },
      },
    });

    return { error };
  };

  const signIn = async (
    email: string,
    password: string
  ) => {
    const { error } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut({
      scope: "global",
    });

    if (error) {
      console.error("Sign out error:", error);
      throw error;
    }

    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    const redirectUrl =
      `${window.location.origin}/auth?reset=true`;

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: redirectUrl,
        }
      );

    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        signUp,
        signIn,
        signOut,
        resetPassword,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};