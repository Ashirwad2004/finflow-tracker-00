import { motion, AnimatePresence } from "framer-motion";
import { List, Users, Handshake, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuOption } from "./FloatingActionMenu";

interface ContentSectionProps {
  activeOption: MenuOption | null;
  children: React.ReactNode;
}

const greetings = [
  "Make every rupee count.",
  "Track smart. Spend wise.",
  "Your finances, simplified.",
  "Small savings, big dreams.",
];

const getRandomGreeting = () => greetings[Math.floor(Math.random() * greetings.length)];

const sectionTitles: Record<MenuOption, { icon: typeof List; title: string; subtitle: string }> = {
  transactions: {
    icon: List,
    title: "All Transactions",
    subtitle: "Your recent expenses"
  },
  groups: {
    icon: Users,
    title: "Group Expenses",
    subtitle: "Shared costs with friends"
  },
  lent: {
    icon: Handshake,
    title: "Lent & Borrowed",
    subtitle: "Track who owes what"
  },
  add: {
    icon: List,
    title: "",
    subtitle: ""
  }
};

export const ContentSection = ({ activeOption, children }: ContentSectionProps) => {
  return (
    <div className="min-h-[300px]">
      <AnimatePresence mode="wait">
        {!activeOption || activeOption === "add" ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6"
            >
              <Sparkles className="w-8 h-8 text-primary/60" />
            </motion.div>
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-slate-400 font-light text-center italic"
            >
              "{getRandomGreeting()}"
            </motion.p>
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-slate-600 mt-4"
            >
              Tap the menu to explore your finances
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key={activeOption}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-6">
              {(() => {
                const section = sectionTitles[activeOption];
                const Icon = section.icon;
                return (
                  <>
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      "bg-primary/10"
                    )}>
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-100">{section.title}</h2>
                      <p className="text-sm text-slate-500">{section.subtitle}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Content */}
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
