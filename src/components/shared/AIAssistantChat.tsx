import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, User, ChevronDown, Sparkles, Check, Loader2, ArrowUpRight, ArrowDownLeft, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/core/lib/auth";
import { callOpenAI } from "@/core/integrations/ai/openai";
import { useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { offlineMutate } from "@/core/offline/apiService";
import { matchCategory } from "@/core/integrations/ai/categoryMatcher";
import { toast } from "@/core/hooks/use-toast";

interface ChatMessage {
    id: string;
    role: "system" | "user" | "assistant";
    content: string;
}

interface ActionPayload {
    type: "add_expense" | "lent_money" | "borrowed_money";
    data: {
        amount: number;
        description: string;
        categoryName?: string;
        person_name?: string;
    };
}

const SUGGESTIONS = [
    { label: "Cash Flow", text: "Summarize my cash flow and net profit", icon: "📊" },
    { label: "Low Stock", text: "Are there any items in my inventory that are low on stock?", icon: "📦" },
    { label: "Owed Money", text: "Who owes me money, and how much?", icon: "🤝" },
    { label: "Optimize Expenses", text: "How can I optimize my spending and reduce expenses?", icon: "💡" },
];

export function AIAssistantChat() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    
    const [messages, setMessages] = useState<ChatMessage[]>([
        { 
            id: "system-init",
            role: "system", 
            content: `You are FinFlow Gemini AI, virtual accountant and store copilot.
App Features:
1. Dashboard: income/expense charts.
2. Expenses: manual or OCR scanner.
3. Magic Add: natural language transaction bar.
4. Loans: track peer lent/borrowed money.
5. Business Mode: Sales, Invoice (CGST/SGST PDF), Inventory (low stock alerts), Online Store.

Guidelines:
- Ground analyses in provided Pipe-Delimited Context.
- Default to Indian currency context (₹ symbol).
- Keep answers brief, structured, and practical.

Actions:
To record a transaction, append at the end:
[ACTION: {"type": "add_expense" | "lent_money" | "borrowed_money", "data": {"amount": number, "description": string, "categoryName": string, "person_name": string}}]`
        },
        { 
            id: "assistant-init",
            role: "assistant", 
            content: "Hi! I'm your FinFlow Gemini AI copilot. Ask me about your sales, expenses, inventory, debts, or how to use the app's business features!" 
        }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [executingActionId, setExecutingActionId] = useState<string | null>(null);
    const [executedActionIds, setExecutedActionIds] = useState<Record<string, boolean>>({});
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMsg = input.trim();
        setInput("");
        
        // Grab context from React Query local cache dynamically
        const expenses = queryClient.getQueryData<any[]>(["expenses", user?.id]) || [];
        const lent = queryClient.getQueryData<any[]>(["lent-money", user?.id]) || [];
        const borrowed = queryClient.getQueryData<any[]>(["borrowed-money", user?.id]) || [];
        const sales = queryClient.getQueryData<any[]>(["sales", user?.id]) || [];
        const products = queryClient.getQueryData<any[]>(["products", user?.id]) || queryClient.getQueryData<any[]>(["products"]) || [];

        // Pre-aggregate cash flow metrics to guarantee math accuracy
        const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const totalSales = sales.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
        const netCashFlow = totalSales - totalExpenses;
        
        const totalLent = lent.filter(item => item.status !== "paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const totalBorrowed = borrowed.filter(item => item.status !== "paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
        
        const lowStockProducts = products.filter(item => Number(item.stock_quantity ?? item.stock ?? 0) <= 5);
        const outOfStockCount = products.filter(item => Number(item.stock_quantity ?? item.stock ?? 0) === 0).length;

        // Pipe-delimited compact context (saves 70% tokens over JSON)
        const formatPipe = (arr: any[], mapper: (item: any) => string) => arr.slice(0, 5).map(mapper).join("; ") || "None";

        const contextMsg = `FinFlow Indicators:
- Net Cash Flow: ₹${netCashFlow.toFixed(0)} (Sales: ₹${totalSales.toFixed(0)}, Expenses: ₹${totalExpenses.toFixed(0)})
- Debt: Lent ₹${totalLent.toFixed(0)}, Borrowed ₹${totalBorrowed.toFixed(0)}
- Inventory: ${products.length} products. ${lowStockProducts.length} low stock, ${outOfStockCount} out of stock.

Recent (Last 5) [Format: amount|desc|date|extra]:
- Expenses: ${formatPipe(expenses, e => `${e.amount}|${e.description}|${e.date}|${e.categories?.name || ""}`)}
- Lent: ${formatPipe(lent, l => `${l.amount}|${l.person_name}|${l.description}|${l.status}`)}
- Borrowed: ${formatPipe(borrowed, b => `${b.amount}|${b.person_name}|${b.description}|${b.status}`)}
- Sales: ${formatPipe(sales, s => `${s.total_amount}|${s.created_at || s.date}|${s.customer_name || ""}`)}
- Low Stock: ${formatPipe(lowStockProducts, p => `${p.name}|${p.stock_quantity ?? p.stock}|₹${p.price}`)}
`;

        // Maintain token limit by keeping initial prompt + last 6 messages
        let chatHistory = [...messages];
        if (chatHistory.length > 7) {
            chatHistory = [chatHistory[0], ...chatHistory.slice(chatHistory.length - 6)];
        }

        const newMessages = [...chatHistory, { id: uuidv4(), role: "user" as const, content: userMsg }];
        
        // Temporarily inject context prompt before dispatching query
        const apiMessages = [
            newMessages[0], 
            { role: "system" as const, content: contextMsg },
            ...newMessages.slice(1)
        ];

        setMessages(newMessages);
        setIsTyping(true);

        try {
            const response = await callOpenAI(apiMessages, "gemini-2.5-flash");
            setMessages(prev => [...prev, { id: uuidv4(), role: "assistant", content: response }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { id: uuidv4(), role: "assistant", content: `❌ Sorry, I had trouble processing that: ${error.message}` }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSuggestionClick = (text: string) => {
        setInput(text);
        setTimeout(() => {
            const form = document.getElementById("ai-chat-form") as HTMLFormElement;
            if (form) form.requestSubmit();
        }, 50);
    };

    const handleExecuteAction = async (msgId: string, action: ActionPayload) => {
        if (!user?.id) return;
        setExecutingActionId(msgId);
        
        try {
            const recordId = uuidv4();
            const todayStr = new Date().toISOString().split("T")[0];
            let table = "";
            let payload: any = {};

            if (action.type === "add_expense") {
                table = "expenses";
                const cats = queryClient.getQueryData<any[]>(["categories"]) || [];
                const matchedId = matchCategory(action.data.categoryName || action.data.description, cats);
                payload = {
                    id: recordId,
                    user_id: user.id,
                    amount: Number(action.data.amount),
                    description: action.data.description,
                    category_id: matchedId || cats[0]?.id,
                    date: todayStr
                };
            } else if (action.type === "lent_money") {
                table = "lent_money";
                payload = {
                    id: recordId,
                    user_id: user.id,
                    amount: Number(action.data.amount),
                    description: action.data.description,
                    person_name: action.data.person_name || "Someone",
                    status: "pending",
                    date: todayStr
                };
            } else if (action.type === "borrowed_money") {
                table = "borrowed_money";
                payload = {
                    id: recordId,
                    user_id: user.id,
                    amount: Number(action.data.amount),
                    description: action.data.description,
                    person_name: action.data.person_name || "Someone",
                    status: "pending",
                    date: todayStr
                };
            }

            const result = await offlineMutate({
                table,
                action: "insert",
                recordId,
                payload,
                userId: user.id
            });

            if (result.error) throw result.error;

            // Invalidate caches
            if (action.type === "add_expense") {
                queryClient.invalidateQueries({ queryKey: ["expenses", user.id] });
            } else if (action.type === "lent_money") {
                queryClient.invalidateQueries({ queryKey: ["lent-money", user.id] });
                queryClient.invalidateQueries({ queryKey: ["lent-money-parties", user.id] });
            } else if (action.type === "borrowed_money") {
                queryClient.invalidateQueries({ queryKey: ["borrowed-money", user.id] });
                queryClient.invalidateQueries({ queryKey: ["borrowed-money-parties", user.id] });
            }

            toast({
                title: "Action Executed ✨",
                description: `Successfully added: ${action.data.description} for ₹${action.data.amount}`,
            });

            setExecutedActionIds(prev => ({ ...prev, [msgId]: true }));
        } catch (err: any) {
            console.error("Action execution failed", err);
            toast({
                title: "Execution Failed",
                description: err.message || "Failed to execute transaction action.",
                variant: "destructive"
            });
        } finally {
            setExecutingActionId(null);
        }
    };

    if (!user) return null;

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 p-4 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all z-50 group flex items-center justify-center animate-bounce-in"
            >
                <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-white opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity" />
                <Bot className="w-7 h-7 relative z-10" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-[350px] sm:w-[400px] h-[550px] max-h-[80vh] bg-background border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white flex justify-between items-center shadow-md">
                <div className="flex items-center gap-2">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold leading-none">FinFlow Gemini AI</h3>
                        <p className="text-xs text-white/80 mt-1">Finance & Store Copilot</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 hover:text-white rounded-full">
                    <ChevronDown className="w-5 h-5" />
                </Button>
            </div>

            {/* Chat Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
                {messages.slice(1).map((msg) => {
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

                    const isExecuted = msg.id ? executedActionIds[msg.id] : false;
                    const isExecuting = msg.id ? executingActionId === msg.id : false;

                    return (
                        <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-600 border border-violet-200"}`}>
                                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>
                            <div className={`p-3 rounded-2xl max-w-[75%] text-sm shadow-sm flex flex-col gap-2 ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border rounded-tl-none"}`}>
                                <div className="whitespace-pre-wrap leading-relaxed">{cleanText}</div>
                                {actionData && (
                                    <div className="mt-2 p-3 rounded-xl bg-muted/70 dark:bg-muted/30 border border-muted-foreground/10 text-card-foreground flex flex-col gap-2.5 animate-in slide-in-from-top-3">
                                        <div className="flex items-center gap-2 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide">
                                            {actionData.type === "add_expense" && <Receipt className="w-3.5 h-3.5" />}
                                            {actionData.type === "lent_money" && <ArrowUpRight className="w-3.5 h-3.5" />}
                                            {actionData.type === "borrowed_money" && <ArrowDownLeft className="w-3.5 h-3.5" />}
                                            <span>Record {actionData.type.replace("_", " ")}</span>
                                        </div>
                                        <div className="text-xs space-y-1">
                                            <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span> <span className="font-bold text-violet-600 dark:text-violet-400">₹{actionData.data.amount}</span></div>
                                            <div className="flex justify-between"><span className="text-muted-foreground">Details:</span> <span className="font-medium">{actionData.data.description}</span></div>
                                            {actionData.data.categoryName && <div className="flex justify-between"><span className="text-muted-foreground">Category:</span> <span className="font-medium text-emerald-600 dark:text-emerald-400">{actionData.data.categoryName}</span></div>}
                                            {actionData.data.person_name && <div className="flex justify-between"><span className="text-muted-foreground">Person:</span> <span className="font-semibold text-indigo-600 dark:text-indigo-400">{actionData.data.person_name}</span></div>}
                                        </div>
                                        {isExecuted ? (
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-500/10 px-2 py-1.5 rounded-lg justify-center border border-green-500/20">
                                                <Check className="w-4 h-4" /> Added to ledger
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                disabled={isExecuting}
                                                onClick={() => handleExecuteAction(msg.id, actionData!)}
                                                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:opacity-95 shadow-sm text-xs py-1 h-8"
                                            >
                                                {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                                                Approve & Create
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {isTyping && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-600 border border-violet-200 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4" />
                        </div>
                        <div className="p-4 rounded-2xl bg-card border rounded-tl-none flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" />
                            <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce delay-100" />
                            <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce delay-200" />
                        </div>
                    </div>
                )}
            </div>

            {/* Suggestion Chips */}
            <div className="px-3 py-2 flex gap-1.5 overflow-x-auto whitespace-nowrap bg-background border-t shrink-0 scrollbar-none">
                {SUGGESTIONS.map((chip, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSuggestionClick(chip.text)}
                        className="text-[11px] px-2.5 py-1 rounded-full border bg-muted/30 hover:bg-violet-500 hover:text-white hover:border-violet-500 text-muted-foreground font-medium transition-all flex items-center gap-1 shrink-0"
                    >
                        <span>{chip.icon}</span>
                        {chip.label}
                    </button>
                ))}
            </div>

            {/* Input Footer */}
            <div className="p-3 border-t bg-background">
                <form id="ai-chat-form" onSubmit={handleSend} className="relative flex items-center">
                    <Input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask about your budget or create entries..."
                        className="pr-12 rounded-full bg-muted/50 border-transparent focus-visible:ring-violet-500 text-sm"
                        disabled={isTyping}
                    />
                    <Button 
                        type="submit" 
                        size="icon" 
                        className="absolute right-1 rounded-full w-8 h-8 bg-violet-600 hover:bg-violet-700 text-white"
                        disabled={!input.trim() || isTyping}
                    >
                        <Send className="w-4 h-4 ml-0.5" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
