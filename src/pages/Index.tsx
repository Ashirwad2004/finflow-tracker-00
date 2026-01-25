import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Dashboard } from "@/components/Dashboard";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, Shield, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      // User not authenticated, stay on landing page
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-6000"></div>
      </div>

      <header className="border-b bg-card/50 backdrop-blur-md relative z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center transform transition-transform group-hover:scale-110 group-hover:rotate-3">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">ExpenseTracker</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button onClick={() => navigate("/auth")} className="bg-gradient-primary hover:opacity-90 transform transition-all hover:scale-105 hover:shadow-lg">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 relative z-10">

        <div className="max-w-4xl mx-auto text-center mb-16 animate-fade-in">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent animate-slide-up">
            Take Control of Your Finances
          </h2>
          <p className="text-xl text-muted-foreground mb-8 animate-slide-up animation-delay-200">
            Track expenses, visualize spending, and achieve your financial goals with our intuitive expense tracker.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-6 transform transition-all hover:scale-105 hover:shadow-2xl animate-slide-up animation-delay-400"
          >
            Start Tracking Now
          </Button>
        </div>

        {/* Business Features Section */}
        <div className="max-w-6xl mx-auto mb-20 animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Powerful Business Features
            </h3>
            <p className="text-muted-foreground text-lg">
              Everything you need to manage your business finances in one place
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 hover:border-purple-500/40 hover:shadow-xl hover:scale-105 transition-all duration-300 backdrop-blur-sm group">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-4 transform group-hover:rotate-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Business Dashboard</h4>
              <p className="text-sm text-muted-foreground">
                Real-time analytics, sales trends, and profit tracking
              </p>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 hover:border-blue-500/40 hover:shadow-xl hover:scale-105 transition-all duration-300 backdrop-blur-sm group">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4 transform group-hover:rotate-6 group-hover:scale-110 transition-transform">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Inventory Management</h4>
              <p className="text-sm text-muted-foreground">
                Track products, stock levels, and low stock alerts
              </p>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 hover:border-green-500/40 hover:shadow-xl hover:scale-105 transition-all duration-300 backdrop-blur-sm group">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-4 transform group-hover:rotate-6 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Sales & Invoices</h4>
              <p className="text-sm text-muted-foreground">
                Create invoices, track payments, and manage customers
              </p>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 hover:border-orange-500/40 hover:shadow-xl hover:scale-105 transition-all duration-300 backdrop-blur-sm group">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mb-4 transform group-hover:rotate-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Business Reports</h4>
              <p className="text-sm text-muted-foreground">
                Profit/loss statements, expense reports, and insights
              </p>
            </div>
          </div>
        </div>

        {/* Personal Finance Features */}
        <div className="max-w-5xl mx-auto mb-16">
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Personal Finance Made Easy
            </h3>
            <p className="text-muted-foreground text-lg">
              Smart tools to help you manage your personal expenses
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">

            <div className="text-center p-6 rounded-lg bg-card/50 backdrop-blur-sm shadow-card animate-fade-in hover:shadow-xl hover:scale-105 transition-all duration-300 border border-border/50" style={{ animationDelay: "0.1s" }}>
              <div className="w-14 h-14 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 transform transition-transform hover:rotate-12 hover:scale-110">
                <TrendingUp className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Insights</h3>
              <p className="text-muted-foreground">
                Visualize your spending patterns with beautiful charts and actionable insights.
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-card/50 backdrop-blur-sm shadow-card animate-fade-in hover:shadow-xl hover:scale-105 transition-all duration-300 border border-border/50" style={{ animationDelay: "0.2s" }}>
              <div className="w-14 h-14 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 transform transition-transform hover:rotate-12 hover:scale-110">
                <Shield className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
              <p className="text-muted-foreground">
                Your financial data is encrypted and protected with enterprise-grade security.
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-card/50 backdrop-blur-sm shadow-card animate-fade-in hover:shadow-xl hover:scale-105 transition-all duration-300 border border-border/50" style={{ animationDelay: "0.3s" }}>
              <div className="w-14 h-14 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 transform transition-transform hover:rotate-12 hover:scale-110">
                <Zap className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Add expenses in seconds and access your data instantly from anywhere.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-8 text-center text-muted-foreground relative z-10 bg-card/30 backdrop-blur-sm">
        <p>&copy; ExpenseTracker, made by satyam.</p>
      </footer>
    </div>
  );
};

export default Index;
