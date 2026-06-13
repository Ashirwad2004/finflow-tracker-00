import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/core/lib/auth";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/core/integrations/supabase/client";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const DISPOSABLE_DOMAINS = [
  "mailinator.com", "yopmail.com", "tempmail.com", "guerrillamail.com",
  "dispostable.com", "getairmail.com", "sharklasers.com", "trashmail.com",
  "10minutemail.com", "maildrop.cc", "temp-mail.org", "fakeinbox.com"
];

const COMMON_TYPOS: Record<string, string> = {
  "gamil.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gamil.co": "gmail.com",
  "gmail.co": "gmail.com",
  "yaho.com": "yahoo.com",
  "hotmal.com": "hotmail.com",
};

const passwordChecks = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "One number", test: (value: string) => /\d/.test(value) },
];

const passwordIsStrong = (password: string) => passwordChecks.every((check) => check.test(password));

const PasswordToggle = ({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className="absolute right-1 top-1 h-8 w-8 hover:bg-transparent"
    onClick={onToggle}
    aria-label={visible ? "Hide password" : "Show password"}
  >
    {visible ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
  </Button>
);

export const LoginForm = ({ onToggleForgot }: { onToggleForgot: () => void }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = normalizeEmail(email).length > 0 && password.length > 0 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      toast.success("Signed in successfully");
    } catch (err: any) {
      const message = err?.message === "Invalid login credentials"
        ? "Email or password is incorrect. If you just signed up, verify your email first."
        : err?.message || "Unable to sign in. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="space-y-2">
        <Label htmlFor="login-email">Work email</Label>
        <Input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={onToggleForgot}>
            Forgot password?
          </Button>
        </div>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="pr-10"
            required
          />
          <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
        </div>
      </div>

      <Button type="submit" className="w-full bg-gradient-primary" disabled={!canSubmit}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign in
      </Button>
    </form>
  );
};

export const SignupForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSuggestion, setEmailSuggestion] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const passwordScore = useMemo(
    () => passwordChecks.filter((check) => check.test(password)).length,
    [password]
  );

  const isEmailValid = useMemo(() => {
    const trimmed = email.trim();
    if (!trimmed) return false;
    if (!EMAIL_REGEX.test(trimmed)) return false;
    const domain = trimmed.split("@")[1]?.toLowerCase();
    if (DISPOSABLE_DOMAINS.includes(domain)) return false;
    return true;
  }, [email]);

  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;
  const canSubmit =
    name.trim().length >= 2 &&
    isEmailValid &&
    passwordIsStrong(password) &&
    password === confirmPassword &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      const { error } = await signUp(email, password, name.trim());
      if (error) throw error;
      const cleanEmail = normalizeEmail(email);
      setSubmittedEmail(cleanEmail);
      toast.success("Account created. Verify your email to continue.");
    } catch (err: any) {
      toast.error(err?.message || "Unable to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submittedEmail) {
    return (
      <div className="space-y-5 py-2 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-semibold">Check your inbox</h3>
          <p className="text-sm text-muted-foreground">
            We sent a verification link to <span className="font-medium text-foreground">{submittedEmail}</span>.
          </p>
        </div>
        <Button type="button" className="w-full" onClick={onSuccess}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Full name</Label>
        <Input
          id="signup-name"
          autoComplete="name"
          placeholder="Aarav Sharma"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email">Work email</Label>
        <Input
          id="signup-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => {
            const val = e.target.value;
            setEmail(val);
            
            // Clear errors/suggestions immediately when empty
            if (!val.trim()) {
              setEmailError("");
              setEmailSuggestion("");
              return;
            }

            const trimmed = val.trim();
            if (!EMAIL_REGEX.test(trimmed)) {
              setEmailError("Please enter a valid email address.");
              setEmailSuggestion("");
              return;
            }

            const domain = trimmed.split("@")[1]?.toLowerCase();
            if (domain) {
              if (DISPOSABLE_DOMAINS.includes(domain)) {
                setEmailError("Disposable email addresses are not allowed.");
                setEmailSuggestion("");
                return;
              }
              setEmailError(""); // Clear if it's a valid, non-disposable email
              
              if (COMMON_TYPOS[domain]) {
                setEmailSuggestion(`Did you mean ${COMMON_TYPOS[domain]}?`);
              } else {
                setEmailSuggestion("");
              }
            }
          }}
          disabled={loading}
          required
        />
        {emailError && (
          <p className="flex items-center gap-1.5 text-xs text-destructive font-medium mt-1">
            <AlertCircle className="h-3.5 w-3.5" />
            {emailError}
          </p>
        )}
        {emailSuggestion && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>
              {emailSuggestion}{" "}
              <button
                type="button"
                className="underline hover:text-amber-800 dark:hover:text-amber-300 font-semibold"
                onClick={() => {
                  const parts = email.split("@");
                  const domain = parts[1]?.toLowerCase();
                  if (domain && COMMON_TYPOS[domain]) {
                    const correctedEmail = `${parts[0]}@${COMMON_TYPOS[domain]}`;
                    setEmail(correctedEmail);
                    setEmailError("");
                    setEmailSuggestion("");
                  }
                }}
              >
                Use suggestion
              </button>
            </span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="pr-10"
            required
          />
          <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
        </div>
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <div className="flex gap-1">
            {passwordChecks.map((check, index) => (
              <span
                key={check.label}
                className={`h-1.5 flex-1 rounded-full ${index < passwordScore ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            {passwordChecks.map((check) => {
              const passed = check.test(password);
              return (
                <span key={check.label} className={passed ? "text-emerald-600" : undefined}>
                  {passed ? "✓" : "-"} {check.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-confirm-password">Confirm password</Label>
        <Input
          id="signup-confirm-password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          aria-invalid={!passwordsMatch}
          required
        />
        {!passwordsMatch && (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            Passwords do not match.
          </p>
        )}
      </div>

      <Button type="submit" className="w-full bg-gradient-primary" disabled={!canSubmit}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create account
      </Button>
    </form>
  );
};

export const ForgotPasswordForm = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;

    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) throw error;
      setSuccess(true);
      toast.success("Password reset link sent");
    } catch (err: any) {
      toast.error(err?.message || "Unable to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4 py-4 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <p className="text-sm text-muted-foreground">
          If an account exists for that email, a secure reset link is on its way.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="space-y-2">
        <Label htmlFor="forgot-email">Account email</Label>
        <Input
          id="forgot-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
      </div>
      <Button type="submit" className="w-full bg-gradient-primary" disabled={loading || !email}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Send reset link
      </Button>
    </form>
  );
};

export const ResetPasswordForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = passwordIsStrong(newPassword) && newPassword === confirmPassword && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      // Sign out the user to clear the session so they must log in using the new password
      await supabase.auth.signOut({ scope: "global" });
      
      toast.success("Password updated successfully. Please sign in with your new password.");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Unable to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
          <p>Choose a new password that is different from passwords you use elsewhere.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reset-password">New password</Label>
        <div className="relative">
          <Input
            id="reset-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Create a strong password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            className="pr-10"
            required
          />
          <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reset-confirm-password">Confirm password</Label>
        <Input
          id="reset-confirm-password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <Button type="submit" className="w-full bg-gradient-primary" disabled={!canSubmit}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Update password
      </Button>
    </form>
  );
};
