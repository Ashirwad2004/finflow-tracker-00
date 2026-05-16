import React from "react";
import { BarChart3, LockKeyhole, ShieldCheck, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
}

const trustItems = [
  { icon: ShieldCheck, label: "Verified accounts" },
  { icon: LockKeyhole, label: "Secure recovery" },
  { icon: BarChart3, label: "Protected workspace" },
];

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, description }) => {
  return (
    <div className="min-h-screen w-full bg-background">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-lg">
            <Wallet className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">FinFlow</h1>
            <p className="mt-1 text-sm text-muted-foreground">Business finance workspace</p>
          </div>
        </div>

        <Card className="w-full max-w-md border-border/60 shadow-elevated animate-in fade-in zoom-in-95 duration-500">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {children}
          </CardContent>
        </Card>

        <div className="mt-6 grid w-full max-w-md grid-cols-3 gap-2">
          {trustItems.map((item) => (
            <div
              key={item.label}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border bg-card/70 px-2 py-3 text-center"
            >
              <item.icon className="h-4 w-4 text-primary" />
              <span className="text-[11px] font-medium leading-tight text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          © {new Date().getFullYear()} FinFlow Inc. All rights reserved.
        </p>
      </main>
    </div>
  );
};
