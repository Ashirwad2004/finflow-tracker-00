import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, User, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/core/lib/auth";
import { callOpenAI } from "@/core/integrations/ai/openai";
import { useQueryClient } from "@tanstack/react-query";

export function AIAssistantChat() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: "system" | "user" | "assistant", content: string }[]>([
        { 
            role: "system", 
            content: `You are FinFlow Gemini AI, an expert premium virtual accountant, business analyst, and ecommerce copilot for the FinFlow Tracker application.
Your goal is to help users manage their personal and small business finances, analyze their sales/expenses/debts/inventory, and answer questions about how to use the app in an easy, practical way.

FinFlow Tracker App Guide & Capabilities:
1. **Personal Dashboard**: Shows monthly budget progress, income/expense breakdown, visual charts, and recent transactions.
2. **Expenses & Budgeting**: Users can add expenses manually, via OCR receipt scan (uploading JPEG/PNG in Bill Upload section), or using "AI Smart Fill" in the Add Expense dialog.
3. **Magic Add**: Natural language bar on the dashboard. Users can type things like "Spent 400 on cab yesterday and Rahul borrowed 500" to instantly insert multiple transactions across tables.
4. **Lent / Borrowed Money (Debts)**: Track peer-to-peer or customer debts, pending/paid status, and view reports by party.
5. **Business Mode / Sales Ledger**: Toggle Business Mode in the navigation/sidebar. Features:
   - Sales: Record customer sales, track revenue.
   - Invoicing: Generate professional tax invoices (handles CGST/SGST/IGST tax rates) and download PDFs or print them in the Print Studio.
   - Inventory: Add items with stock quantities, unit prices, cost price, and manage reorders.
   - Online Store: Configure a public, responsive e-commerce storefront linked to inventory, enabling customers to place orders directly online.

Answering Guidelines:
- Ground your analysis strictly in the provided "Current Financial Data Context" (Expenses, Lent, Borrowed, Sales, Inventory).
- Default to Indian currency context (using Rupee ₹ symbol) unless specified otherwise. Keep format clean (e.g. ₹250 instead of 250 INR).
- Help users navigate: If they ask how to do something, provide a short step-by-step guide matching the FinFlow modules above.
- Keep answers structured (bullet points), readable, practical, friendly, and brief.`
        },
        { role: "assistant", content: "Hi! I'm your FinFlow Gemini AI copilot. Ask me about your sales, expenses, inventory, debts, or how to use the app's business features!" }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

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

        // Compress data to fit safely into token limits (last 50 items each)
        const contextMsg = `Current Financial Data Context:
Expenses (Last 50): ${JSON.stringify(expenses.slice(0, 50).map(e => ({ amount: e.amount, desc: e.description, date: e.date, category: e.categories?.name })))}
Lent Money (Last 50): ${JSON.stringify(lent.slice(0, 50).map(l => ({ amount: l.amount, person: l.person_name, desc: l.description })))}
Borrowed Money (Last 50): ${JSON.stringify(borrowed.slice(0, 50).map(b => ({ amount: b.amount, person: b.person_name, desc: b.description })))}
Sales Ledger (Last 50): ${JSON.stringify(sales.slice(0, 50).map(s => ({ amount: s.total_amount, date: s.created_at || s.date, invoice: s.invoice_number, customer: s.customer_name })))}
Product Inventory: ${JSON.stringify(products.slice(0, 50).map(p => ({ name: p.name, price: p.price, stock: p.stock_quantity, unit: p.unit })))}
`;

        const newMessages = [...messages, { role: "user" as const, content: userMsg }];
        // We temporarily inject the context as a hidden system prompt before sending
        const apiMessages = [
            newMessages[0], 
            { role: "system", content: contextMsg },
            ...newMessages.slice(1)
        ];

        setMessages(newMessages);
        setIsTyping(true);

        try {
            const response = await callOpenAI(apiMessages, "gemini-2.5-flash");
            setMessages(prev => [...prev, { role: "assistant", content: response }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { role: "assistant", content: `❌ Sorry, I had trouble processing that: ${error.message}` }]);
        } finally {
            setIsTyping(false);
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
                {messages.slice(1).map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-600 border border-violet-200"}`}>
                            {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div className={`p-3 rounded-2xl max-w-[75%] text-sm shadow-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border rounded-tl-none"}`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
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

            {/* Input Footer */}
            <div className="p-3 border-t bg-background">
                <form onSubmit={handleSend} className="relative flex items-center">
                    <Input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask about your budget..."
                        className="pr-12 rounded-full bg-muted/50 border-transparent focus-visible:ring-violet-500"
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
