import React from "react";
import { Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, description }) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 sm:p-8 relative">
      {/* Centered Logo/Brand */}
      <div className="flex flex-col items-center mb-8 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
          <Wallet className="w-6 h-6 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">FinFlow</h1>
      </div>

      <Card className="w-full max-w-md shadow-elevated border-border/50 animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
      
      {/* Footer text */}
      <div className="mt-8 text-sm text-muted-foreground animate-in fade-in duration-500 delay-150">
        © {new Date().getFullYear()} FinFlow Inc. All rights reserved.
      </div>
    </div>
  );
};
