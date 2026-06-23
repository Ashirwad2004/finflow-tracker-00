import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/core/lib/auth";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { supabase } from "@/core/integrations/supabase/client";
import { AuthLayout } from "./components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/core/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, Lock, ShieldCheck } from "lucide-react";

export default function SalesmanLogin() {
    const { isSalesman, setSalesmanSession } = useBusiness();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Redirect to storefront orders if already authenticated as salesman
    useEffect(() => {
        if (isSalesman) {
            navigate("/salesman-dashboard");
        }
    }, [isSalesman, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        setIsLoading(true);

        try {
            // 1. Authenticate with Supabase Auth using email and password
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password: password.trim()
            });

            if (authError) {
                toast({
                    title: "Access Denied 🔒",
                    description: "Invalid salesman email address or password. Please verify details or contact your store owner.",
                    variant: "destructive"
                });
                setIsLoading(false);
                return;
            }

            // 2. Fetch Salesman details to ensure they are actually registered as a salesman
            const { data: salesmanData, error: salesmanError } = await (supabase as any)
                .from("store_salesmen")
                .select("store_id, salesman_name, salesman_email")
                .eq("salesman_email", email.trim().toLowerCase())
                .maybeSingle();

            if (salesmanError || !salesmanData) {
                // If they are not in the store_salesmen table, sign them out of Auth
                await supabase.auth.signOut();
                toast({
                    title: "Access Denied 🔒",
                    description: "You do not have active salesman privileges. Please contact your store owner.",
                    variant: "destructive"
                });
                setIsLoading(false);
                return;
            }

            // Authenticated as salesman! Save session local state
            setSalesmanSession({
                store_id: salesmanData.store_id,
                email: salesmanData.salesman_email,
                name: salesmanData.salesman_name
            });

            toast({
                title: `Welcome back, ${salesmanData.salesman_name}!`,
                description: "Fulfillment portal authenticated successfully."
            });
            navigate("/salesman-dashboard");
        } catch (err: any) {
            toast({
                title: "Authentication Error",
                description: err.message || "An unexpected error occurred during login.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout 
            title="Salesman Portal" 
            description="Sign in to your salesman account to fulfill delivery orders"
        >
            <div className="space-y-6">
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-350 border border-amber-100 dark:border-amber-900/30 rounded-xl text-xs">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>This portal is strictly for authorized store salesmen.</span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="email">Email address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="salesman@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-9 h-11 rounded-xl bg-background"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Password</Label>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-9 h-11 rounded-xl bg-background"
                                required
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-11 rounded-xl font-bold text-sm mt-2"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying Portal Access...</>
                        ) : (
                            "Log In to Dashboard"
                        )}
                    </Button>
                </form>

                <div className="pt-2 text-center">
                    <button
                        onClick={() => navigate("/auth")}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary font-semibold transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Standard merchant sign-in
                    </button>
                </div>
            </div>
        </AuthLayout>
    );
}
