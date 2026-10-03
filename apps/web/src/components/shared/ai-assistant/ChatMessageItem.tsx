import React from "react";
import { User, Bot, Receipt, ArrowUpRight, ArrowDownLeft, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage, ActionPayload } from "./types";
import { MarkdownText } from "./MarkdownText";

interface ChatMessageItemProps {
    msg: ChatMessage;
    executedActionIds: Record<string, boolean>;
    executingActionId: string | null;
    onExecuteAction: (msgId: string, action: ActionPayload) => void;
    onSuggestionClick: (text: string) => void;
}

export function ChatMessageItem({
    msg,
    executedActionIds,
    executingActionId,
    onExecuteAction,
    onSuggestionClick,
}: ChatMessageItemProps) {
    const hasAction = msg.role === "assistant" && msg.content.includes("[ACTION:");
    let cleanText = msg.content;
    let actionData: ActionPayload | null = null;

    if (hasAction) {
        const match = msg.content.match(/\[ACTION:\s*(\{.*?\})\s*\]/);
        if (match) {
            try {
                actionData = JSON.parse(match[1]);
                cleanText = msg.content.replace(/\[ACTION:.*?\]/g, "").trim();
            } catch (err) {
                console.error("Error parsing AI action JSON", err);
            }
        }
    }

    // Interactive Suggestions Chip Parser
    const matchSuggestions = cleanText.match(/(?:Follow-up Suggestions:|Suggestions for next steps:)\s*\n((?:\s*[-*]\s+.*\n?)+)/i);
    let localSuggestions: string[] = [];
    if (matchSuggestions) {
        localSuggestions = matchSuggestions[1]
            .split("\n")
            .map(s => s.replace(/^\s*[-*]\s+/, "").trim())
            .filter(Boolean);
        cleanText = cleanText.replace(matchSuggestions[0], "").trim();
    }

    const isExecuted = msg.id ? executedActionIds[msg.id] : false;
    const isExecuting = msg.id ? executingActionId === msg.id : false;

    return (
        <div className="space-y-1.5 animate-fade-in">
            <div className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-7.5 h-7.5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-600 border border-violet-200"}`}>
                    {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div className={`p-3 rounded-2xl max-w-[82%] text-xs shadow-sm flex flex-col gap-1.5 ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border rounded-tl-none"}`}>
                    {cleanText ? (
                        <MarkdownText text={cleanText} />
                    ) : (
                        <div className="flex gap-1.5 items-center py-1 px-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400 animate-bounce" />
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400 animate-bounce [animation-delay:0.2s]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400 animate-bounce [animation-delay:0.4s]" />
                        </div>
                    )}
                    
                    {actionData && (
                        <div className="mt-1.5 p-2.5 rounded-lg bg-muted/60 dark:bg-muted/20 border border-muted-foreground/10 text-card-foreground flex flex-col gap-2 animate-in slide-in-from-top-3">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                                {actionData.type === "add_expense" && <Receipt className="w-3.5 h-3.5" />}
                                {actionData.type === "lent_money" && <ArrowUpRight className="w-3.5 h-3.5" />}
                                {actionData.type === "borrowed_money" && <ArrowDownLeft className="w-3.5 h-3.5" />}
                                <span>Record {actionData.type.replace("_", " ")}</span>
                            </div>
                            <div className="text-[10px] space-y-0.5">
                                <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span> <span className="font-bold text-violet-600 dark:text-violet-400">₹{actionData.data.amount}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Details:</span> <span className="font-medium">{actionData.data.description}</span></div>
                                {actionData.data.categoryName && <div className="flex justify-between"><span className="text-muted-foreground">Category:</span> <span className="font-medium text-emerald-600 dark:text-emerald-400">{actionData.data.categoryName}</span></div>}
                                {actionData.data.person_name && <div className="flex justify-between"><span className="text-muted-foreground">Person:</span> <span className="font-semibold text-indigo-600 dark:text-indigo-400">{actionData.data.person_name}</span></div>}
                            </div>
                            {isExecuted ? (
                                <div className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-500/10 px-2 py-1.5 rounded-md justify-center border border-green-500/20">
                                    <Check className="w-3.5 h-3.5" /> Added to ledger
                                </div>
                            ) : (
                                <Button
                                    size="sm"
                                    disabled={isExecuting}
                                    onClick={() => onExecuteAction(msg.id, actionData!)}
                                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:opacity-95 shadow-sm text-[10px] py-1 h-7 rounded-md"
                                >
                                    {isExecuting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                    Approve & Create
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Interactive Bullet Recommendations Render */}
            {localSuggestions.length > 0 && (
                <div className="pl-10 pr-4 py-1 flex flex-col gap-1.5 shrink-0 align-start items-start">
                    <div className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground opacity-60">Suggested CFO Queries</div>
                    <div className="flex flex-col gap-1 w-full">
                        {localSuggestions.map((recText, idx) => (
                            <button
                                key={idx}
                                onClick={() => onSuggestionClick(recText)}
                                className="text-[10px] text-left px-2.5 py-1.5 rounded-lg border bg-background/50 hover:bg-violet-600 hover:text-white hover:border-violet-600 text-violet-600 dark:text-violet-400 font-medium transition-all shadow-sm border-violet-100 flex items-center gap-1.5 group"
                            >
                                <Sparkles className="w-3 h-3 text-violet-500 group-hover:text-white shrink-0" />
                                <span>{recText}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
