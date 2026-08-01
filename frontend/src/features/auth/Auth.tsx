import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/core/lib/auth";
import { supabase } from "@/core/integrations/supabase/client";

import { AuthLayout } from "./components/AuthLayout";
import { LoginForm, SignupForm, ForgotPasswordForm, ResetPasswordForm } from "./components/AuthForms";

type AuthView = "login" | "signup" | "forgot" | "reset";

/**
 * Only allow same-origin, relative paths as a post-login redirect target.
 * Blocks absolute URLs, protocol-relative URLs ("//evil.com"), backslash
 * tricks ("/\evil.com"), and encoded variants of either.
 */
const getSafeRedirectPath = (raw: string | null): string => {
  if (!raw) return "/";

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return "/";
  }

  const isRelative =
    decoded.startsWith("/") && !decoded.startsWith("//") && !decoded.startsWith("/\\");
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(decoded);

  return isRelative && !hasScheme ? decoded : "/";
};

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<AuthView>(() => {
    const hasResetParam = searchParams.get("reset") === "true";
    const isRecoveryHash = window.location.hash.includes("type=recovery");
    return hasResetParam || isRecoveryHash ? "reset" : "login";
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  // 1. Detect password recovery from the email link
  useEffect(() => {
    // If we arrived with a recovery token in the hash, strip it from the
    // URL right away — it should not linger in history or leak via Referer
    // if the user clicks any external link on this page.
    if (window.location.hash.includes("type=recovery")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("reset");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Redirect authenticated users — only to a validated, same-origin path
  useEffect(() => {
    if (user && view !== "reset") {
      navigate(getSafeRedirectPath(searchParams.get("redirect")));
    }
  }, [user, view, navigate, searchParams]);

  const viewData = {
    login: {
      title: "Welcome back",
      description: "Sign in to your account to continue",
      content: (
        <>
          <LoginForm onToggleForgot={() => setView("forgot")} />
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <button type="button" className="text-primary hover:underline font-medium" onClick={() => setView("signup")}>
              Sign up
            </button>
          </div>
        </>
      ),
    },
    signup: {
      title: "Create an account",
      description: "Enter your details to get started with RupeeBill",
      content: (
        <>
          <SignupForm onSuccess={() => setView("login")} />
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <button type="button" className="text-primary hover:underline font-medium" onClick={() => setView("login")}>
              Sign in
            </button>
          </div>
        </>
      ),
    },
    forgot: {
      title: "Reset password",
      description: "Enter your email address and we'll send you a link",
      content: (
        <>
          <ForgotPasswordForm />
          <div className="mt-6 text-center text-sm">
            <button type="button" className="text-muted-foreground hover:text-primary transition-colors" onClick={() => setView("login")}>
              Back to sign in
            </button>
          </div>
        </>
      ),
    },
    reset: {
      title: "Set new password",
      description: "Enter a strong password for your account",
      content: <ResetPasswordForm onSuccess={() => setView("login")} />,
    },
  };

  const currentView = viewData[view];

  return (
    <AuthLayout title={currentView.title} description={currentView.description}>
      {currentView.content}
    </AuthLayout>
  );
};

export default Auth;