import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/core/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { toast } from "@/core/hooks/use-toast";
import { z } from "zod";
import { supabase } from "@/core/integrations/supabase/client";

// ─── Validation Schemas ───────────────────────────────────────────────────────

const emailSchema = z
  .string()
  .trim()
  .email({ message: "Invalid email address" });

const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters long" })
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
  });

const nameSchema = z
  .string()
  .trim()
  .min(2, { message: "Name must be at least 2 characters" });

// ─── Component ────────────────────────────────────────────────────────────────

type AuthView = "login" | "signup" | "forgot" | "reset";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<AuthView>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const { user, signIn, signUp, resetPassword, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  // ── 1. Detect Supabase PASSWORD_RECOVERY event from email link ──────────────
  //
  // Supabase appends the recovery tokens to the URL **hash** (e.g.
  // #access_token=xxx&type=recovery). It processes the hash automatically and
  // fires an onAuthStateChange event with type "PASSWORD_RECOVERY".
  // Checking `?reset=true` query params will NEVER work for this flow.
  //
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

  // ── 2. Redirect already-authenticated users ─────────────────────────────────
  useEffect(() => {
    // Only redirect if we're not in the middle of a password reset flow.
    if (user && view !== "reset") {
      navigate(searchParams.get("redirect") || "/");
    }
  }, [user, view, navigate, searchParams]);

  // ─── Submit Handler ──────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectTo = searchParams.get("redirect") || "/";

      // ── Password Reset (from email link) ─────────────────────────────────
      if (view === "reset") {
        passwordSchema.parse(newPassword);

        if (newPassword !== confirmPassword) {
          toast({
            title: "Error",
            description: "Passwords do not match.",
            variant: "destructive",
          });
          return;
        }

        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          toast({
            title: "Error updating password",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Password updated!",
            description: "Your password has been successfully updated.",
          });
          navigate(redirectTo);
        }

        return;
      }

      // ── Forgot Password (request reset email) ────────────────────────────
      if (view === "forgot") {
        emailSchema.parse(email);

        const { error } = await resetPassword(email);

        if (error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Check your email",
            description: "We've sent you a password reset link.",
          });
          setView("login");
        }

        return;
      }

      // ── Login ─────────────────────────────────────────────────────────────
      if (view === "login") {
        emailSchema.parse(email);
        // Do NOT validate password format on login. The backend will verify it.

        const { error } = await signIn(email, password);

        if (error) {
          toast({
            title: "Login failed",
            description: error.message.includes("Invalid login credentials")
              ? "Invalid email or password. Please try again."
              : error.message,
            variant: "destructive",
          });
        }
        // Navigation is handled automatically by the useEffect above once user state updates

        return;
      }

      // ── Sign Up ───────────────────────────────────────────────────────────
      if (view === "signup") {
        emailSchema.parse(email);
        passwordSchema.parse(password);
        nameSchema.parse(displayName);

        const { error: signUpError } = await signUp(email, password, displayName);

        if (signUpError) {
          toast({
            title: "Signup failed",
            description: signUpError.message.includes("already registered")
              ? "This email is already registered. Please sign in instead."
              : signUpError.message,
            variant: "destructive",
          });
          return;
        }

        // Attempt auto-login. If email confirmation is required in your
        // Supabase project, signIn will fail here — that is expected.
        const { error: signInError } = await signIn(email, password);

        if (signInError) {
          // Email confirmation is likely required.
          toast({
            title: "Account created!",
            description:
              "Please check your email and verify your address before signing in.",
          });
          setView("login");
        } else {
          toast({
            title: "Welcome!",
            description: "Your account has been created. You can now track your expenses.",
          });
          // Navigation is handled automatically by the useEffect above once user state updates
        }
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: err.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "An error occurred",
          description:
            (err as Error)?.message || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
      }
    } catch (err: any) {
      toast({
        title: "An error occurred",
        description: err?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // ─── Derived UI State ────────────────────────────────────────────────────────

  const title = {
    login: "Welcome Back",
    signup: "Create Account",
    forgot: "Reset Password",
    reset: "Set New Password",
  }[view];

  const description = {
    login: "Sign in to continue tracking your expenses",
    signup: "Start managing your finances today",
    forgot: "Enter your email to receive a password reset link",
    reset: "Enter your new password below",
  }[view];

  const submitLabel = {
    login: "Sign In",
    signup: "Sign Up",
    forgot: "Send Reset Link",
    reset: "Update Password",
  }[view];

  const isSubmitDisabled =
    loading ||
    (view === "reset" && (!newPassword || !confirmPassword)) ||
    (view === "forgot" && !email) ||
    (view === "login" && (!email || !password)) ||
    (view === "signup" && (!email || !password || !displayName));

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
              <Wallet className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── Password Reset View ── */}
            {view === "reset" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {/* ── Login / Signup / Forgot Views ── */}
            {view !== "reset" && (
              <div className="space-y-4">
                {/* Name — Signup only */}
                {view === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Name</Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="John Doe"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* Email — always visible */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Password — hidden on Forgot view */}
                {view !== "forgot" && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity mt-6"
              disabled={isSubmitDisabled}
            >
              {loading ? "Loading…" : submitLabel}
            </Button>
          </form>

          {/* ── Google Login Button ── */}
          {(view === "login" || view === "signup") && (
            <div className="mt-4 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                type="button"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </Button>
            </div>
          )}

          {/* ── Footer Links ── */}
          {view !== "reset" && (
            <div className="mt-4 text-center space-y-2">
              {view === "login" && (
                <button
                  type="button"
                  onClick={() => setView("forgot")}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
                >
                  Forgot password?
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (view === "forgot") setView("login");
                  else setView(view === "login" ? "signup" : "login");
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {view === "forgot"
                  ? "Back to sign in"
                  : view === "login"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;