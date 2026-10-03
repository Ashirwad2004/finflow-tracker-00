import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/core/lib/auth";
import { supabase } from "@/core/integrations/supabase/client";
import { AdminSection } from "./lib/adminUtils";
import {
  AdminSidebar,
  AdminOverviewSection,
  AdminPaymentsSection,
  AdminDemoSection,
  AdminFeaturesSection,
  AdminUsersSection,
  AdminSystemSection,
} from "./components";

export function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "overview":
        return <AdminOverviewSection />;
      case "payments":
        return <AdminPaymentsSection />;
      case "demo":
        return <AdminDemoSection />;
      case "users":
        return <AdminUsersSection />;
      case "features":
        return <AdminFeaturesSection />;
      case "system":
        return <AdminSystemSection />;
      default:
        return <AdminOverviewSection />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans">
      <AdminSidebar active={activeSection} onNav={setActiveSection} onSignOut={handleSignOut} />

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="text-slate-600">Admin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-300 font-medium capitalize">{activeSection}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="text-[10px] text-emerald-500 font-medium">Live</span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="text-xs text-slate-500 truncate max-w-[180px]">{user?.email}</div>
          </div>
        </div>

        {/* Section */}
        <div className="px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderSectionContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
