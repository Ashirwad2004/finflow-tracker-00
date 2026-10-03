import { useState } from "react";
import { supabase } from "@/core/integrations/supabase/client";
import { toast } from "@/core/hooks/use-toast";

export function usePricingAuth() {
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const handleInlineAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    const cleanEmail = authEmail.trim().toLowerCase();

    try {
      if (authMode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: authPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/pricing`,
            data: {
              display_name: authName.trim() || cleanEmail.split("@")[0],
              full_name: authName.trim() || cleanEmail.split("@")[0],
            },
          },
        });

        if (signUpError) {
          const errMsg = signUpError.message || String(signUpError);
          if (
            errMsg.includes("Database error updating user") ||
            errMsg.toLowerCase().includes("already registered") ||
            errMsg.toLowerCase().includes("already exists") ||
            (signUpError as any).status === 500
          ) {
            const { error: fallbackSignInError } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: authPassword,
            });

            if (!fallbackSignInError) {
              toast({
                title: "Logged In Successfully!",
                description: "Recognized existing account. Proceeding with checkout.",
              });
              return;
            }

            setAuthMode("login");
            throw new Error(
              "An account with this email already exists. Please sign in with your password, or click 'Forgot password'."
            );
          }

          throw signUpError;
        }

        toast({
          title: "Account Created Successfully!",
          description: "You are now logged in. Proceeding to complete your payment.",
        });
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: authPassword,
        });
        if (signInError) {
          if (signInError.message === "Invalid login credentials") {
            throw new Error("Incorrect email or password. Please try again.");
          }
          throw signInError;
        }
        toast({
          title: "Logged In Successfully!",
          description: "Ready to proceed with payment.",
        });
      }
    } catch (err: any) {
      console.warn("[Pricing Auth] Handled warning:", err);
      let message = err.message || "Authentication failed. Please check your details.";
      if (message.includes("Database error updating user")) {
        message = "An account with this email already exists. Please switch to Sign In.";
        setAuthMode("login");
      }
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  return {
    authMode,
    setAuthMode,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authName,
    setAuthName,
    authLoading,
    authError,
    setAuthError,
    handleInlineAuth,
  };
}
