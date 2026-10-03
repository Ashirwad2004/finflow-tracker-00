import React from "react";
import { Bot, Sparkles, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIAssistantHeaderProps {
    onReset: () => void;
    onClose: () => void;
}

export function AIAssistantHeader({ onReset, onClose }: AIAssistantHeaderProps) {
    return (
        <div className="p-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex justify-between items-center shadow-md shrink-0">
            <div className="flex items-center gap-2">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                    <Bot className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                    <h3 className="font-bold text-sm leading-none flex items-center gap-1.5">
                        RupeeBill AI <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                    </h3>
                    <p className="text-[10px] text-white/80 mt-1 uppercase tracking-wider font-semibold">Virtual CFO & Auditor</p>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onReset} 
                    className="text-white hover:bg-white/20 hover:text-white rounded-full h-8 w-8"
                    title="Start Fresh Conversation"
                    aria-label="Start Fresh Conversation"
                >
                    <RefreshCw className="w-4 h-4" />
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onClose} 
                    className="text-white hover:bg-white/20 hover:text-white rounded-full h-8 w-8"
                    title="Close AI Assistant"
                    aria-label="Close AI Assistant"
                >
                    <ChevronDown className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
}
