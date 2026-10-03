import { Bot } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent
                side="right"
                className="w-full sm:w-[480px] sm:max-w-md p-0 flex flex-col h-full bg-background border-l shadow-2xl z-50 focus:outline-none [&>button:last-child]:hidden"
            >
                <SheetTitle className="sr-only">RupayBill CFO</SheetTitle>
                <SheetDescription className="sr-only">
                    AI Virtual CFO, Tax Auditor and Enterprise Financial Copilot
                </SheetDescription>

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
            </SheetContent>
        </Sheet>
    );
}
