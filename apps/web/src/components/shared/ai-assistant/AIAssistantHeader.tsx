import React from "react";
import { Bot, Sparkles, RefreshCw, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIAssistantHeaderProps {
    onReset: () => void;
    onClose: () => void;
}

export function AIAssistantHeader({ onReset, onClose }: AIAssistantHeaderProps) {
    return (
        <div className="p-3.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white flex justify-between items-center shadow-md shrink-0">
            <div className="flex items-center gap-2.5">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                    <Bot className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-sm leading-none flex items-center gap-1.5">
                        RupayBill CFO <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                    </h3>
                    <p className="text-[10px] text-white/80 mt-1 uppercase tracking-wider font-semibold">Virtual CFO & Audit Copilot</p>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onReset} 
                    className="text-white hover:bg-white/20 hover:text-white rounded-full h-7 w-7"
                    title="Start Fresh Conversation"
                    aria-label="Start Fresh Conversation"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onClose} 
                    className="text-white hover:bg-white/20 hover:text-white rounded-full h-7 w-7"
                    title="Minimize to Corner"
                    aria-label="Minimize to Corner"
                >
                    <Minus className="w-3.5 h-3.5" />
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onClose} 
                    className="text-white hover:bg-white/20 hover:text-white rounded-full h-7 w-7"
                    title="Close CFO Panel"
                    aria-label="Close CFO Panel"
                >
                    <X className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
    );
}
