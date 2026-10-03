import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/core/lib/auth";
import { BusinessProvider } from "@/core/contexts/BusinessContext";
import { CurrencyProvider } from "@/core/contexts/CurrencyContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeInitializer } from "@/components/shared/ThemeToggle";
import { AppAssistantGate } from "@/components/shared/AppAssistantGate";

// Optimize React Query for Instant Client-Side SPA Rendering
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 15,
      retry: 1,
      refetchOnWindowFocus: false,
      networkMode: "offlineFirst",
      placeholderData: (previousData: any) => previousData,
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BusinessProvider>
          <CurrencyProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <ThemeInitializer />
              <AppAssistantGate />
              {children}
            </TooltipProvider>
          </CurrencyProvider>
        </BusinessProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default AppProviders;
