import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/core/lib/auth";
import { callGeminiStream } from "@/core/integrations/ai/gemini";
import { useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { offlineMutate } from "@/core/offline/apiService";
import { matchCategory } from "@/core/integrations/ai/categoryMatcher";
import { toast } from "@/core/hooks/use-toast";
import { supabase } from "@/core/integrations/supabase/client";
import { ChatMessage, ActionPayload } from "./types";

const INITIAL_SYSTEM_MESSAGE: ChatMessage = {
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
[ACTION: {"type": "add_expense" | "lent_money" | "borrowed_money", "data": {"amount": number, "description": string, "categoryName": string, "person_name": string}}]`,
};

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
    id: "assistant-init",
    role: "assistant",
    content: "Hi! I'm your RupeeBill AI CFO copilot. Ask me about your business cash flow, tax parameters, low stock alerts, receivables risk, or how to optimize your ledger!",
};

export function useAIAssistantChat() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

    const [messages, setMessages] = useState<ChatMessage[]>([
        INITIAL_SYSTEM_MESSAGE,
        INITIAL_ASSISTANT_MESSAGE,
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
                            content: m.content,
                        }));
                        setMessages([INITIAL_SYSTEM_MESSAGE, ...historyMsgs]);
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
            ...newMessages.slice(1),
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
                                title: userMsg.substring(0, 40),
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
                            content: userMsg,
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
                            content: finalContent,
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
                        content: fullText,
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
                INITIAL_SYSTEM_MESSAGE,
                INITIAL_ASSISTANT_MESSAGE,
            ]);
            return;
        }

        try {
            setCurrentConversationId(null);
            setMessages([
                INITIAL_SYSTEM_MESSAGE,
                { id: "assistant-init", role: "assistant", content: "Fresh CFO Audit initialized. How can I audit your ledger today?" },
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
                    date: todayStr,
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
                    date: todayStr,
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
                    date: todayStr,
                };
            }

            const result = await offlineMutate({
                table,
                action: "insert",
                recordId,
                payload,
                userId: user.id,
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
                variant: "destructive",
            });
        } finally {
            setExecutingActionId(null);
        }
    };

    return {
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
    };
}
