import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/core/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { toast } from "@/core/hooks/use-toast";
import { z } from "zod";
import { supabase } from "@/core/integrations/supabase/client";

const emailSchema = z.string().trim().email({ message: "Invalid email address" });
const passwordSchema = z.string().min(6, { message: "Password must be at least 6 characters" });
const nameSchema = z.string().trim().min(2, { message: "Name must be at least 2 characters" });

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is coming from password reset email
    if (searchParams.get('reset') === 'true') {
      setIsResettingPassword(true);
      setIsForgotPassword(false);
      setIsLogin(false);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isResettingPassword) {
        // Handle password update from reset link
        passwordSchema.parse(newPassword);
        if (newPassword !== confirmPassword) {
          toast({
            title: "Error",
            description: "Passwords do not match",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Password updated!",
            description: "Your password has been successfully updated.",
          });
          setIsResettingPassword(false);
          setIsLogin(true);
          navigate("/");
        }
      } else if (isForgotPassword) {
        // Handle password reset request
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
          setIsForgotPassword(false);
        }
      } else {
        // Validate inputs
        emailSchema.parse(email);
        passwordSchema.parse(password);
        if (!isLogin) {
          nameSchema.parse(displayName);
        }

        const redirectTo = searchParams.get('redirect') || '/';

        if (isLogin) {
          const { error } = await signIn(email, password);
          if (error) {
            if (error.message.includes("Invalid login credentials")) {
              toast({
                title: "Login failed",
                description: "Invalid email or password. Please try again.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Login failed",
                description: error.message,
                variant: "destructive",
              });
            }
          } else {
            navigate(redirectTo);
          }
        } else {
          const { error } = await signUp(email, password, displayName);
          if (error) {
            if (error.message.includes("already registered")) {
              toast({
                title: "Signup failed",
                description: "This email is already registered. Please try logging in.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Signup failed",
                description: error.message,
                variant: "destructive",
              });
            }
          } else {
            toast({
              title: "Account created!",
              description: "You can now start tracking your expenses.",
            });
            navigate(redirectTo);
          }
        }
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "An error occurred",
          description: error?.message || "Something went wrong during authentication.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading ||
    (isResettingPassword && (!newPassword || !confirmPassword)) ||
    (isForgotPassword && !email) ||
    (isLogin && (!email || !password)) ||
    (!isLogin && (!isForgotPassword && !isResettingPassword) && (!email || !password || !displayName));

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
              <Wallet className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {isResettingPassword ? "Set New Password" : isForgotPassword ? "Reset Password" : isLogin ? "Welcome Back" : "Create Account"}
          </CardTitle>
          <CardDescription>
            {isResettingPassword
              ? "Enter your new password below"
              : isForgotPassword
                ? "Enter your email to receive a password reset link"
                : isLogin
                  ? "Sign in to continue tracking your expenses"
                  : "Start managing your finances today"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isResettingPassword ? (
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
            ) : (
              <div className="space-y-4 flex flex-col">
                {/* 1. Name Field (Only on Sign Up) */}
                {!isLogin && !isForgotPassword && (
                  <div className="space-y-2 order-1">
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

                {/* 2. Email Field (Always visible unless resetting password via token) */}
                <div className="space-y-2 order-2">
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

                {/* 3. Password Field (Hidden only on Forgot Password) */}
                {!isForgotPassword && (
                  <div className="space-y-2 order-3">
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
              {loading ? "Loading..." : isResettingPassword ? "Update Password" : isForgotPassword ? "Send Reset Link" : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>
          {!isResettingPassword && (
            <div className="mt-4 text-center space-y-2">
              {isLogin && !isForgotPassword && (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
                >
                  Forgot password?
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setIsForgotPassword(false);
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isForgotPassword
                  ? "Back to sign in"
                  : isLogin
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