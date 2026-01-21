import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SplitBills from "./pages/SplitBills";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import JoinGroup from "./pages/JoinGroup";
import AllExpenses from "./pages/AllExpenses";
import LentMoney from "./pages/LentMoney";
import RecentlyDeletedPage from "./pages/RecentlyDeletedPage";
import NotFound from "./pages/NotFound";
import { ThemeInitializer } from "@/components/ThemeToggle";

const queryClient = new QueryClient();

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/expenses" element={<ProtectedRoute><AllExpenses /></ProtectedRoute>} />
      <Route path="/split-bills" element={<ProtectedRoute><SplitBills /></ProtectedRoute>} />
      <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
      <Route path="/groups/:groupId" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
      <Route path="/join/:inviteCode" element={<JoinGroup />} />
      <Route path="/lent-money" element={<ProtectedRoute><LentMoney /></ProtectedRoute>} />
      <Route path="/recently-deleted" element={<ProtectedRoute><RecentlyDeletedPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ThemeInitializer />
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
