import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/core/lib/auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export const SocialAuth: React.FC = () => {
  const { signInWithGoogle, signInWithGithub, signInWithMagicLink } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoadingProvider(provider);
    try {
      const { error } = provider === 'google' ? await signInWithGoogle() : await signInWithGithub();
      if (error) {
        toast.error(error.message);
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicEmail) {
      toast.error("Please enter your email");
      return;
    }
    setLoadingProvider("magic");
    try {
      const { error } = await signInWithMagicLink(magicEmail);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Check your email for the magic link!");
        setShowMagicLink(false);
        setMagicEmail("");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          type="button"
          onClick={() => handleOAuth('google')}
          disabled={loadingProvider !== null}
          className="w-full hover:bg-secondary/50 transition-colors"
        >
          {loadingProvider === 'google' ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          Google
        </Button>

        <Button
          variant="outline"
          type="button"
          onClick={() => handleOAuth('github')}
          disabled={loadingProvider !== null}
          className="w-full hover:bg-secondary/50 transition-colors"
        >
          {loadingProvider === 'github' ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <svg className="w-4 h-4 mr-2 text-foreground" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          )}
          GitHub
        </Button>
      </div>

      {!showMagicLink ? (
        <Button 
          variant="ghost" 
          type="button" 
          className="w-full text-muted-foreground text-sm"
          onClick={() => setShowMagicLink(true)}
        >
          Use Magic Link instead
        </Button>
      ) : (
        <form onSubmit={handleMagicLink} className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
          <Input 
            placeholder="name@example.com" 
            type="email" 
            value={magicEmail}
            onChange={(e) => setMagicEmail(e.target.value)}
            disabled={loadingProvider !== null}
          />
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowMagicLink(false)}
              disabled={loadingProvider !== null}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={loadingProvider !== null}
            >
              {loadingProvider === 'magic' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Send Link"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
