import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/core/lib/auth";
import { supabase } from "@/core/integrations/supabase/client";

import { AuthLayout } from "./components/AuthLayout";
import { LoginForm, SignupForm, ForgotPasswordForm, ResetPasswordForm } from "./components/AuthForms";
import { SocialAuth } from "./components/SocialAuth";

type AuthView = "login" | "signup" | "forgot" | "reset";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<AuthView>("login");
  const { user } = useAuth();
  const navigate = useNavigate();

  // 1. Detect Password Recovery from email link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setView("reset");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // 2. Redirect authenticated users
  useEffect(() => {
    if (user && view !== "reset") {
      navigate(searchParams.get("redirect") || "/");
    }
  }, [user, view, navigate, searchParams]);

  const viewData = {
    login: {
      title: "Welcome back",
      description: "Sign in to your account to continue",
      content: (
        <>
          <LoginForm onToggleForgot={() => setView("forgot")} />
          <div className="mt-6">
            <SocialAuth />
          </div>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <button type="button" className="text-primary hover:underline font-medium" onClick={() => setView("signup")}>
              Sign up
            </button>
          </div>
        </>
      )
    },
    signup: {
      title: "Create an account",
      description: "Enter your details to get started with FinFlow",
      content: (
        <>
          <SignupForm />
          <div className="mt-6">
            <SocialAuth />
          </div>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <button type="button" className="text-primary hover:underline font-medium" onClick={() => setView("login")}>
              Sign in
            </button>
          </div>
        </>
      )
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
      )
    },
    reset: {
      title: "Set new password",
      description: "Enter a strong password for your account",
      content: (
        <ResetPasswordForm onSuccess={() => navigate(searchParams.get("redirect") || "/")} />
      )
    }
  };

  const currentView = viewData[view];

  return (
    <AuthLayout title={currentView.title} description={currentView.description}>
      {currentView.content}
    </AuthLayout>
  );
};

export default Auth;