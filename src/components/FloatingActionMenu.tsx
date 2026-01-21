import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, List, Users, Handshake, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type MenuOption = "transactions" | "groups" | "lent" | "add";

interface FloatingActionMenuProps {
  onSelect: (option: MenuOption) => void;
  activeOption: MenuOption | null;
}

const menuItems = [
  { id: "transactions" as MenuOption, icon: List, label: "All Transactions", color: "from-blue-500 to-cyan-500" },
  { id: "groups" as MenuOption, icon: Users, label: "Group Expenses", color: "from-purple-500 to-pink-500" },
  { id: "lent" as MenuOption, icon: Handshake, label: "Lent/Borrowed", color: "from-amber-500 to-orange-500" },
  { id: "add" as MenuOption, icon: Plus, label: "Add New", color: "from-emerald-500 to-teal-500", highlight: true },
];

export const FloatingActionMenu = ({ onSelect, activeOption }: FloatingActionMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option: MenuOption) => {
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Menu Items - Fan animation */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Menu Items */}
            <div className="absolute bottom-16 right-0 flex flex-col-reverse gap-3">
              {menuItems.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0, 
                    scale: 1,
                    transition: { delay: index * 0.05, type: "spring", stiffness: 300 }
                  }}
                  exit={{ 
                    opacity: 0, 
                    y: 20, 
                    scale: 0.8,
                    transition: { delay: (menuItems.length - index - 1) * 0.03 }
                  }}
                  onClick={() => handleSelect(item.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl",
                    "bg-slate-800/90 backdrop-blur-md border border-slate-700/50",
                    "text-slate-100 shadow-xl",
                    "hover:bg-slate-700/90 transition-all duration-200",
                    "group min-w-[180px]",
                    activeOption === item.id && "ring-2 ring-primary ring-offset-2 ring-offset-slate-900"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    "bg-gradient-to-br shadow-lg",
                    item.color,
                    item.highlight && "animate-pulse"
                  )}>
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium text-sm">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-2xl",
          "bg-gradient-to-br from-primary to-primary/80",
          "flex items-center justify-center",
          "shadow-lg shadow-primary/30",
          "transition-all duration-300",
          "hover:shadow-xl hover:shadow-primary/40",
          "relative overflow-hidden",
          isOpen && "rotate-45"
        )}
        style={{
          boxShadow: "0 0 30px rgba(139, 92, 246, 0.4), 0 0 60px rgba(139, 92, 246, 0.2)"
        }}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/0 to-white/20 rounded-2xl" />
        
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <LayoutGrid className="w-6 h-6 text-white" />
          )}
        </motion.div>
      </motion.button>
    </div>
  );
};
