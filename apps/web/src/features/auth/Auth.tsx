import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";

import { AuthLayout } from "./components/AuthLayout";
import {
  ForgotPasswordForm,
  LoginForm,
  ResetPasswordForm,
  SignupForm,
} from "./components/AuthForms";

type AuthView = "login" | "signup" | "forgot" | "reset";

function getSafeRedirectPath(value: string | null): string {
  if (!value) {
    return "/";
  }

  try {
    const decoded = decodeURIComponent(value);
    const normalized = decoded.replace(/\\/g, "/");

    if (
      !normalized.startsWith("/") ||
      normalized.startsWith("//") ||
      /^[a-z][a-z\d+.-]*:/i.test(normalized)
    ) {
      return "/";
    }

    const url = new URL(normalized, window.location.origin);

    return url.origin === window.location.origin
      ? `${url.pathname}${url.search}${url.hash}`
      : "/";
  } catch {
    return "/";
  }
}

function hasRecoveryToken(): boolean {
  return new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
}

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();

  const [view, setView] = useState<AuthView>(() =>
    searchParams.get("reset") === "true" || hasRecoveryToken()
      ? "reset"
      : "login",
  );

  useEffect(() => {
    if (!hasRecoveryToken()) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("reset");

        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loading && user && view !== "reset") {
      navigate(getSafeRedirectPath(searchParams.get("redirect")), {
        replace: true,
      });
    }
  }, [loading, user, view, navigate, searchParams]);

  if (loading) {
    return (
      <AuthLayout
        title="Loading..."
        description="Checking your session"
      >
        <div
          className="flex justify-center py-8"
          role="status"
          aria-label="Loading"
        >
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AuthLayout>
    );
  }

  if (view === "login") {
    return (
      <AuthLayout
        title="Welcome back"
        description="Sign in to your account to continue"
      >
        <LoginForm onToggleForgot={() => setView("forgot")} />

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">
            Don't have an account?{" "}
          </span>

          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setView("signup")}
          >
            Sign up
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (view === "signup") {
    return (
      <AuthLayout
        title="Create an account"
        description="Enter your details to get started with RupeeBill"
      >
        <SignupForm onSuccess={() => setView("login")} />

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">
            Already have an account?{" "}
          </span>

          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setView("login")}
          >
            Sign in
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (view === "forgot") {
    return (
      <AuthLayout
        title="Reset password"
        description="Enter your email address and we'll send you a link"
      >
        <ForgotPasswordForm />

        <div className="mt-6 text-center text-sm">
          <button
            type="button"
            className="text-muted-foreground transition-colors hover:text-primary"
            onClick={() => setView("login")}
          >
            Back to sign in
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set new password"
      description="Enter a strong password for your account"
    >
      <ResetPasswordForm
        onSuccess={() => setView("login")}
      />
    </AuthLayout>
  );
};

export default Auth;