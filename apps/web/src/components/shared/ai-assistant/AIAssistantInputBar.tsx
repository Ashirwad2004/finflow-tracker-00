import React from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUGGESTIONS, SuggestionItem } from "./types";

interface AIAssistantInputBarProps {
    input: string;
    setInput: (val: string) => void;
    onSubmit: (e?: React.FormEvent) => void;
    isTyping: boolean;
    onSuggestionClick: (text: string) => void;
    suggestions?: SuggestionItem[];
}

export function AIAssistantInputBar({
    input,
    setInput,
    onSubmit,
    isTyping,
    onSuggestionClick,
    suggestions = SUGGESTIONS,
}: AIAssistantInputBarProps) {
    return (
        <>
            {/* Suggestion Chips footer */}
            <div className="px-3 py-2 flex gap-1.5 overflow-x-auto whitespace-nowrap bg-background border-t shrink-0 scrollbar-none">
                {suggestions.map((chip, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSuggestionClick(chip.text)}
                        className="text-[10px] px-2.5 py-1 rounded-full border bg-muted/40 hover:bg-violet-600 hover:text-white hover:border-violet-600 text-muted-foreground font-medium transition-all flex items-center gap-1 shrink-0 shadow-sm"
                    >
                        <span>{chip.icon}</span>
                        {chip.label}
                    </button>
                ))}
            </div>

            {/* Input Footer */}
            <div className="p-3 border-t bg-background shrink-0">
                <form id="ai-chat-form" onSubmit={onSubmit} className="relative flex items-center">
                    <Input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask CFO or create transaction rules..."
                        className="pr-12 pl-4 rounded-full bg-muted/50 border-transparent focus-visible:ring-violet-500 text-xs h-9"
                        disabled={isTyping}
                    />
                    <Button 
                        type="submit" 
                        size="icon" 
                        className="absolute right-1 rounded-full w-7 h-7 bg-violet-600 hover:bg-violet-700 text-white"
                        disabled={!input.trim() || isTyping}
                        title="Send message"
                        aria-label="Send message"
                    >
                        <Send className="w-3.5 h-3.5 ml-0.5" />
                    </Button>
                </form>
            </div>
        </>
    );
}
