import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, User, ChevronDown, Sparkles, Check, Loader2, ArrowUpRight, ArrowDownLeft, Receipt, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/core/lib/auth";
import { callGeminiStream } from "@/core/integrations/ai/gemini";
import { useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { offlineMutate } from "@/core/offline/apiService";
import { matchCategory } from "@/core/integrations/ai/categoryMatcher";
import { toast } from "@/core/hooks/use-toast";
import { Logo } from "@/components/shared/Logo";
import { supabase } from "@/core/integrations/supabase/client";

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
    { label: "CFO Cash Flow", text: "Provide a CFO cash flow and profitability analysis", icon: "📊" },
    { label: "Tax Liability", text: "Estimate my GST tax liability and GSTR-1 parameters", icon: "🛡️" },
    { label: "Receivables Risk", text: "Analyze peer debt receivables risk and cash recovery", icon: "🤝" },
    { label: "Optimize Budget", text: "Identify expense velocity anomalies and cost cuts", icon: "💡" },
];

// Custom Premium Markdown text rendering component
function MarkdownText({ text }: { text: string }) {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    
    let tableRows: string[][] = [];
    let isTable = false;
    let listItems: string[] = [];
    let isList = false;

    const flushTable = (key: number) => {
        if (tableRows.length === 0) return null;
        const headers = tableRows[0];
        const bodyRows = tableRows.slice(2); // Skip header separator line
        
        tableRows = [];
        isTable = false;
        
        return (
            <div key={`table-${key}`} className="my-2.5 overflow-x-auto border border-violet-100 rounded-lg shadow-sm bg-card">
                <table className="min-w-full divide-y divide-border text-[11px]">
                    <thead className="bg-muted/40 font-semibold text-muted-foreground">
                        <tr>
                            {headers.map((h, i) => (
                                <th key={i} className="px-2.5 py-1.5 text-left font-medium">{h.trim()}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                        {bodyRows.map((row, rIdx) => (
                            <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-background" : "bg-violet-50/10 dark:bg-violet-950/5"}>
                                {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-2.5 py-1 whitespace-nowrap text-foreground">{cell.trim()}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const flushList = (key: number) => {
        if (listItems.length === 0) return null;
        const items = [...listItems];
        listItems = [];
        isList = false;
        return (
            <ul key={`list-${key}`} className="list-disc pl-4 my-1.5 space-y-0.5 text-xs text-muted-foreground">
                {items.map((item, i) => (
                    <li key={i}>{parseInlineMarkdown(item)}</li>
                ))}
            </ul>
        );
    };

    const parseInlineMarkdown = (str: string) => {
        const parts = str.split(/(\*\*.*?\*\*|`.*?`)/);
        return parts.map((part, idx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={idx} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith("`") && part.endsWith("`")) {
                return <code key={idx} className="px-1 py-0.5 rounded bg-muted font-mono text-[11px] text-pink-600 border border-muted-foreground/10">{part.slice(1, -1)}</code>;
            }
            return part;
        });
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.trim().startsWith("|")) {
            if (isList) elements.push(flushList(i));
            isTable = true;
            const cells = line.split("|").slice(1, -1);
            tableRows.push(cells);
            continue;
        } else if (isTable) {
            elements.push(flushTable(i));
        }

        if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
            isList = true;
            listItems.push(line.trim().slice(2));
            continue;
        } else if (isList && !line.trim().startsWith("* ") && !line.trim().startsWith("- ")) {
            elements.push(flushList(i));
        }

        if (line.trim().startsWith("### ")) {
            elements.push(<h4 key={i} className="text-xs font-bold text-foreground mt-2.5 mb-1 flex items-center gap-1 border-b pb-0.5 uppercase tracking-wider">{parseInlineMarkdown(line.trim().slice(4))}</h4>);
            continue;
        }
        if (line.trim().startsWith("## ")) {
            elements.push(<h3 key={i} className="text-xs font-extrabold text-violet-600 dark:text-violet-400 mt-3 mb-1.5 flex items-center gap-1">{parseInlineMarkdown(line.trim().slice(3))}</h3>);
            continue;
        }

        if (line.trim().startsWith("> [!")) {
            const match = line.match(/> \[!(.*?)\]/);
            const alertType = match ? match[1] : "NOTE";
            let content = "";
            while (i + 1 < lines.length && lines[i + 1].trim().startsWith(">")) {
                i++;
                content += " " + lines[i].trim().slice(1).trim();
            }
            let borderCol = "border-l-violet-500 bg-violet-500/5";
            let titleCol = "text-violet-600 dark:text-violet-400 font-bold";
            if (alertType === "WARNING" || alertType === "CAUTION") {
                borderCol = "border-l-amber-500 bg-amber-500/5";
                titleCol = "text-amber-600 dark:text-amber-400 font-bold";
            } else if (alertType === "IMPORTANT") {
                borderCol = "border-l-rose-500 bg-rose-500/5";
                titleCol = "text-rose-600 dark:text-rose-400 font-bold";
            }
            elements.push(
                <div key={i} className={`p-2.5 my-2 border-l-4 rounded-r-lg ${borderCol} text-xs leading-relaxed`}>
                    <div className={`uppercase tracking-wide text-[10px] mb-0.5 ${titleCol}`}>{alertType}</div>
                    <div>{parseInlineMarkdown(content.trim() || line.slice(line.indexOf("]") + 1).trim())}</div>
                </div>
            );
            continue;
        }

        if (line.trim()) {
            elements.push(<p key={i} className="my-0.5 leading-relaxed text-xs text-foreground/90">{parseInlineMarkdown(line)}</p>);
        } else {
            elements.push(<div key={i} className="h-1.5" />);
        }
    }

    if (isTable) elements.push(flushTable(lines.length));
    if (isList) elements.push(flushList(lines.length));

    return <div className="space-y-0.5 leading-normal">{elements}</div>;
}

export function AIAssistantChat() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    
    const [messages, setMessages] = useState<ChatMessage[]>([
        { 
            id: "system-init",
            role: "system", 
            content: `You are RupeeBill AI, a World-Class Virtual CFO, Chartered Accountant, and Store Copilot.
App Features:
1. Dashboard: income/expense charts.
2. Expenses: manual or OCR scanner.
3. Magic Add: natural language transaction bar.
4. Loans: track peer lent/borrowed money.
5. Business Mode: Sales, Invoice (CGST/SGST PDF), Inventory (low stock alerts), Online Store.

Guidelines:
- Act as an elite financial auditor. Your responses should contain detailed analysis, not basic summaries.
- Ground analyses in provided Context, referring to actual values.
- Default to Indian currency context (₹ symbol).
- Every major recommendation must cover: Why, calculated metrics, data used, confidence level, and what happens if ignored.
- Use simple markdown table formatting for structural lists.
- Suggest 2-3 interactive follow-up questions at the very end. Format them as bullet points prefixing with 'Follow-up Suggestions:'.
- SAFETY GUARDRAIL: You are strictly forbidden from answering coding queries, writing scripts, writing python/javascript code, answering generic homework questions, or carrying out tasks unrelated to RupeeBill bookkeeping, store inventory, GST tax compliance, or peer debts. If the user asks for code, programming help, recipes, or general knowledge outside corporate/personal finance, you must politely decline: "I am your RupeeBill AI CFO. I can only assist with finance, accounting, ledger audits, GSTR tax optimizations, and store management. I cannot generate code or perform tasks outside this domain."
- To record a transaction, append at the end:
[ACTION: {"type": "add_expense" | "lent_money" | "borrowed_money", "data": {"amount": number, "description": string, "categoryName": string, "person_name": string}}]`
        },
        { 
            id: "assistant-init",
            role: "assistant", 
            content: "Hi! I'm your RupeeBill AI CFO copilot. Ask me about your business cash flow, tax parameters, low stock alerts, receivables risk, or how to optimize your ledger!" 
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

    // Persistent Memory Loader
    useEffect(() => {
        const loadHistory = async () => {
            if (!user?.id) return;
            try {
                const { data: conversations, error: convErr } = await (supabase as any)
                    .from("ai_conversations")
                    .select("id")
                    .eq("user_id", user.id)
                    .order("updated_at", { ascending: false })
                    .limit(1);

                if (convErr) throw convErr;

                if (conversations && conversations.length > 0) {
                    const activeId = conversations[0].id;
                    setCurrentConversationId(activeId);

                    const { data: messagesData, error: msgErr } = await (supabase as any)
                        .from("ai_chat_messages")
                        .select("id, role, content")
                        .eq("conversation_id", activeId)
                        .order("created_at", { ascending: true });

                    if (msgErr) throw msgErr;

                    if (messagesData && messagesData.length > 0) {
                        const historyMsgs = messagesData.map((m: any) => ({
                            id: m.id,
                            role: m.role as "user" | "assistant",
                            content: m.content
                        }));
                        setMessages([messages[0], ...historyMsgs]);
                    }
                }
            } catch (err) {
                console.error("Failed to load conversation history:", err);
            }
        };

        loadHistory();
    }, [user?.id]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMsg = input.trim();
        setInput("");
        
        // Grab rich context from React Query local cache dynamically
        const expenses = queryClient.getQueryData<any[]>(["expenses", user?.id]) || [];
        const lent = queryClient.getQueryData<any[]>(["lent-money", user?.id]) || [];
        const borrowed = queryClient.getQueryData<any[]>(["borrowed-money", user?.id]) || [];
        const sales = queryClient.getQueryData<any[]>(["sales", user?.id]) || [];
        const products = queryClient.getQueryData<any[]>(["products", user?.id]) || queryClient.getQueryData<any[]>(["products"]) || [];
        const profile = queryClient.getQueryData<any>(["profile", user?.id]) || {};

        // Pre-aggregate cash flow metrics to guarantee math accuracy
        const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const totalSales = sales.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
        const netCashFlow = totalSales - totalExpenses;
        
        const totalLent = lent.filter(item => item.status !== "paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const totalBorrowed = borrowed.filter(item => item.status !== "paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
        
        const lowStockProducts = products.filter(item => Number(item.stock_quantity ?? item.stock ?? 0) <= 5);
        const outOfStockCount = products.filter(item => Number(item.stock_quantity ?? item.stock ?? 0) === 0).length;

        // Group expenses by month YYYY-MM
        const monthlyExpenseTotals: Record<string, number> = {};
        expenses.forEach(e => {
            if (!e.date) return;
            const month = String(e.date).substring(0, 7);
            monthlyExpenseTotals[month] = (monthlyExpenseTotals[month] || 0) + Number(e.amount || 0);
        });
        const sortedMonths = Object.keys(monthlyExpenseTotals).sort().slice(-6);
        const monthlyBreakdownStr = sortedMonths.map(m => `${m}: ₹${monthlyExpenseTotals[m].toFixed(0)}`).join(", ") || "No monthly history";

        // Compact delimited context
        const formatPipe = (arr: any[], mapper: (item: any) => string) => arr.slice(0, 8).map(mapper).join("; ") || "None";

        const contextMsg = `RupeeBill Indicators & Business Profile:
- Business Mode: ${profile.is_business_mode ? "Enabled" : "Disabled"} (Trade Name: ${profile.business_name || "None"}, GSTIN: ${profile.gst_number || "None"})
- Net Cash Flow: ₹${netCashFlow.toFixed(0)} (Sales: ₹${totalSales.toFixed(0)}, Expenses: ₹${totalExpenses.toFixed(0)})
- Debt Status: Lent ₹${totalLent.toFixed(0)}, Borrowed ₹${totalBorrowed.toFixed(0)}
- Inventory: ${products.length} products total, ${lowStockProducts.length} low stock, ${outOfStockCount} out of stock.
- Monthly Expense History (Last 6 Months): ${monthlyBreakdownStr}

Recent ledger items:
- Expenses: ${formatPipe(expenses, e => `${e.amount}|${e.description}|${e.date}|${e.categories?.name || ""}`)}
- Lent (Peer receivables): ${formatPipe(lent, l => `${l.amount}|${l.person_name}|${l.description}|${l.status}`)}
- Borrowed (Peer payables): ${formatPipe(borrowed, b => `${b.amount}|${b.person_name}|${b.description}|${b.status}`)}
- Sales Journal: ${formatPipe(sales, s => `${s.total_amount}|${s.created_at || s.date}|${s.customer_name || ""}`)}
- Low Stock Items: ${formatPipe(lowStockProducts, p => `${p.name}|${p.stock_quantity ?? p.stock}|₹${p.price}`)}
`;

        let chatHistory = [...messages];
        if (chatHistory.length > 9) {
            chatHistory = [chatHistory[0], ...chatHistory.slice(chatHistory.length - 8)];
        }

        const userMsgId = uuidv4();
        const assistantMsgId = uuidv4();

        const newMessages = [...chatHistory, { id: userMsgId, role: "user" as const, content: userMsg }];
        
        const apiMessages = [
            newMessages[0], 
            { role: "system" as const, content: contextMsg },
            ...newMessages.slice(1)
        ];

        setMessages(newMessages);
        setIsTyping(true);

        let conversationId = currentConversationId;

        try {
            // Save user message to database
            if (user?.id) {
                try {
                    if (!conversationId) {
                        const { data: newConv, error: convErr } = await (supabase as any)
                            .from("ai_conversations")
                            .insert({ 
                                user_id: user.id, 
                                title: userMsg.substring(0, 40) 
                            })
                            .select("id")
                            .single();
                            
                        if (convErr) {
                            console.warn("Could not save conversation to DB, falling back to local memory:", convErr);
                        } else if (newConv) {
                            conversationId = newConv.id;
                            setCurrentConversationId(conversationId);
                        }
                    }

                    if (conversationId) {
                        const { error: msgErr } = await (supabase as any).from("ai_chat_messages").insert({
                            conversation_id: conversationId,
                            role: "user",
                            content: userMsg
                        });
                        if (msgErr) console.warn("Could not save user message to DB:", msgErr);
                    }
                } catch (dbErr) {
                    console.warn("DB memory error, continuing with local state:", dbErr);
                }
            }

            setMessages(prev => [...prev, { id: assistantMsgId, role: "assistant", content: "" }]);
            setIsTyping(false); // Stop loader once streaming starts

            const response = await callGeminiStream(apiMessages);
            
            // Check if server supports streaming
            const contentType = response.headers.get("Content-Type") || "";
            if (!contentType.includes("text/event-stream")) {
                // Fallback: server returned a full JSON response instead of a stream
                const resText = await response.text();
                let finalContent = "";
                try {
                    const parsed = JSON.parse(resText);
                    finalContent = parsed.text || parsed.choices?.[0]?.message?.content || parsed.error || "";
                } catch {
                    finalContent = resText;
                }
                
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: finalContent } : m));
                
                // Save to DB
                if (user?.id && conversationId) {
                    try {
                        await (supabase as any).from("ai_chat_messages").insert({
                            conversation_id: conversationId,
                            role: "assistant",
                            content: finalContent
                        });
                    } catch (dbErr) {
                        console.warn("DB persist failed:", dbErr);
                    }
                }
                return;
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("Response body is not readable");

            const decoder = new TextDecoder("utf-8");
            let buffer = "";
            let fullText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    if (trimmed.startsWith("data: ")) {
                        const dataStr = trimmed.slice(6);
                        if (dataStr === "[DONE]") continue;

                        try {
                            const parsed = JSON.parse(dataStr);
                            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
                            if (text) {
                                fullText += text;
                                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: fullText } : m));
                            }
                        } catch (e) {
                            // Catch incomplete chunks
                        }
                    }
                }
            }

            // Save assistant message to database
            if (user?.id && conversationId) {
                try {
                    await (supabase as any).from("ai_chat_messages").insert({
                        conversation_id: conversationId,
                        role: "assistant",
                        content: fullText
                    });
                    
                    await (supabase as any).from("ai_conversations")
                        .update({ updated_at: new Date().toISOString() })
                        .eq("id", conversationId);
                } catch (dbErr) {
                    console.warn("Failed to persist assistant reply:", dbErr);
                }
            }

        } catch (error: any) {
            console.error("CFO chat execution error:", error);
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: `❌ Sorry, I had trouble processing that request: ${error.message}` } : m));
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

    const handleReset = async () => {
        if (!user?.id) {
            setMessages([
                messages[0],
                { id: "assistant-init", role: "assistant", content: "Hi! I'm your RupeeBill AI CFO copilot. Ask me about your business cash flow, tax parameters, low stock alerts, receivables risk, or how to optimize your ledger!" }
            ]);
            return;
        }

        try {
            setCurrentConversationId(null);
            setMessages([
                messages[0],
                { id: "assistant-init", role: "assistant", content: "Fresh CFO Audit initialized. How can I audit your ledger today?" }
            ]);
        } catch (err) {
            console.error("Failed to start new conversation:", err);
        }
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
                const expenses = queryClient.getQueryData<any[]>(["expenses", user.id]) || [];
                const matchedId = matchCategory(action.data.categoryName || action.data.description, cats, expenses);
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
                        onClick={handleReset} 
                        className="text-white hover:bg-white/20 hover:text-white rounded-full h-8 w-8"
                        title="Start Fresh Conversation"
                        aria-label="Start Fresh Conversation"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setIsOpen(false)} 
                        className="text-white hover:bg-white/20 hover:text-white rounded-full h-8 w-8"
                        title="Close AI Assistant"
                        aria-label="Close AI Assistant"
                    >
                        <ChevronDown className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Chat Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-muted/5 dark:bg-muted/10">
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
                        <div key={msg.id} className="space-y-1.5 animate-fade-in">
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
                                                    onClick={() => handleExecuteAction(msg.id, actionData!)}
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
                                                onClick={() => handleSuggestionClick(recText)}
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
                })}
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

            {/* Suggestion Chips footer */}
            <div className="px-3 py-2 flex gap-1.5 overflow-x-auto whitespace-nowrap bg-background border-t shrink-0 scrollbar-none">
                {SUGGESTIONS.map((chip, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSuggestionClick(chip.text)}
                        className="text-[10px] px-2.5 py-1 rounded-full border bg-muted/40 hover:bg-violet-600 hover:text-white hover:border-violet-600 text-muted-foreground font-medium transition-all flex items-center gap-1 shrink-0 shadow-sm"
                    >
                        <span>{chip.icon}</span>
                        {chip.label}
                    </button>
                ))}
            </div>

            {/* Input Footer */}
            <div className="p-3 border-t bg-background shrink-0">
                <form id="ai-chat-form" onSubmit={handleSend} className="relative flex items-center">
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
        </div>
    );
}
