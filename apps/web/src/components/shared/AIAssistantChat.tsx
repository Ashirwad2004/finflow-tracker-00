import { Bot } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import {
    useAIAssistantChat,
    AIAssistantHeader,
    AIAssistantInputBar,
    ChatMessageItem,
} from "./ai-assistant";

export * from "./ai-assistant";

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
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 rounded-2xl overflow-hidden shadow-2xl hover:shadow-[0_0_20px_rgba(155,66,245,0.45)] hover:scale-110 active:scale-95 transition-all z-50 group flex items-center justify-center animate-bounce-in"
                title="Open AI Assistant"
                aria-label="Open AI Assistant"
            >
                <Logo size={48} showText={false} />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-[350px] sm:w-[420px] h-[600px] max-h-[85vh] bg-background border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5">
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
