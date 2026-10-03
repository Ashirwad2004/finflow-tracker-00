import { Bot, Sparkles } from "lucide-react";
import {
    useAIAssistantChat,
    AIAssistantHeader,
    AIAssistantInputBar,
    ChatMessageItem,
    openAIAssistant,
    closeAIAssistant,
    toggleAIAssistant,
} from "./ai-assistant";

export * from "./ai-assistant";
export { openAIAssistant, closeAIAssistant, toggleAIAssistant };

export function AIAssistantChat() {
    const {
        user,
        isOpen,
        setIsOpen,
        messages,
        input,
        setInput,
        isTyping,
        scrollRef,
        executingActionId,
        executedActionIds,
        handleSend,
        handleSuggestionClick,
        handleReset,
        handleExecuteAction,
    } = useAIAssistantChat();

    if (!user) return null;

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900/95 dark:bg-slate-800/95 text-white shadow-xl shadow-violet-500/10 hover:shadow-violet-500/25 border border-violet-500/30 hover:border-violet-400 hover:scale-105 active:scale-95 transition-all duration-200 backdrop-blur-md cursor-pointer"
                title="Open RupayBill CFO (Virtual Copilot) • Press Ctrl+J"
                aria-label="Open RupayBill CFO Virtual Copilot"
            >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                    <Bot className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold tracking-wide text-slate-100 flex items-center gap-1.5">
                    RupayBill CFO
                    <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                </span>
                <span className="hidden sm:inline-flex text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    Copilot
                </span>
            </button>
        );
    }

    return (
        <div 
            className="fixed bottom-6 right-6 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[82vh] bg-background border border-border/80 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
            role="region"
            aria-label="RupayBill CFO Virtual Assistant"
        >
            {/* Header */}
            <AIAssistantHeader 
                onReset={handleReset} 
                onClose={() => setIsOpen(false)} 
            />

            {/* Chat Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-muted/5 dark:bg-muted/10">
                {messages.slice(1).map((msg) => (
                    <ChatMessageItem
                        key={msg.id}
                        msg={msg}
                        executedActionIds={executedActionIds}
                        executingActionId={executingActionId}
                        onExecuteAction={handleExecuteAction}
                        onSuggestionClick={handleSuggestionClick}
                    />
                ))}
                {isTyping && (
                    <div className="flex gap-2.5">
                        <div className="w-7.5 h-7.5 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-600 border border-violet-200 flex items-center justify-center shrink-0">
                            <Bot className="w-3.5 h-3.5" />
                        </div>
                        <div className="p-3 rounded-2xl bg-card border rounded-tl-none flex gap-1 items-center shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" />
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:0.2s]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:0.4s]" />
                        </div>
                    </div>
                )}
            </div>

            {/* Suggestions & Input Footer */}
            <AIAssistantInputBar
                input={input}
                setInput={setInput}
                onSubmit={handleSend}
                isTyping={isTyping}
                onSuggestionClick={handleSuggestionClick}
            />
        </div>
    );
}
