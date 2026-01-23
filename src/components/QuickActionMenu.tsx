import { useState } from "react";
import { Plus, Receipt, Users, HandCoins, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface QuickActionMenuProps {
    onAddExpense: () => void;
    onSplitBill: () => void;
    onLentMoney: () => void;
    onBorrowedMoney: () => void;
}

export const QuickActionMenu = ({
    onAddExpense,
    onSplitBill,
    onLentMoney,
    onBorrowedMoney,
}: QuickActionMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const actions = [
        {
            label: "Add Expense",
            icon: Receipt,
            onClick: onAddExpense,
            color: "bg-blue-500",
        },
        {
            label: "Split Bill",
            icon: Users,
            onClick: onSplitBill,
            color: "bg-purple-500",
        },
        {
            label: "Lent Money",
            icon: HandCoins,
            onClick: onLentMoney,
            color: "bg-green-500",
        },
        {
            label: "Borrowed Money",
            icon: HandCoins, // Same icon, maybe differentiate later or user context
            onClick: onBorrowedMoney,
            color: "bg-orange-500",
        }
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            {/* Menu Items */}
            <div className={cn(
                "flex flex-col items-end gap-3 transition-all duration-300",
                isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
            )}>
                {actions.map((action, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        <span className="bg-black/75 text-white text-xs px-2 py-1 rounded backdrop-blur-sm shadow-sm font-medium">
                            {action.label}
                        </span>
                        <Button
                            size="icon"
                            className={cn("rounded-full shadow-lg h-10 w-10 transition-transform hover:scale-110", action.color)}
                            onClick={() => {
                                action.onClick();
                                setIsOpen(false);
                            }}
                        >
                            <action.icon className="w-5 h-5 text-white" />
                        </Button>
                    </div>
                ))}
            </div>

            {/* Main Toggle Button */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="icon"
                            className={cn(
                                "h-14 w-14 rounded-full shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90",
                                isOpen && "rotate-45"
                            )}
                            onClick={() => setIsOpen(!isOpen)}
                        >
                            <Plus className="w-8 h-8" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        <p>Quick Actions</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Backdrop for closing */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-background/20 backdrop-blur-[1px] z-[-1]"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};
