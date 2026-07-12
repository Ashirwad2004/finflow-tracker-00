import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { callOpenAI } from "@/core/integrations/ai/openai";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SmartPurchaseInputProps {
    onParse: (data: {
        vendorName?: string;
        billNumber?: string;
        date?: string;
        items?: Array<{ description: string; quantity: number; price: number }>;
    }) => void;
    disabled?: boolean;
}

export const SmartPurchaseInput = ({ onParse, disabled }: SmartPurchaseInputProps) => {
    const [input, setInput] = useState("");
    const [isAnimating, setIsAnimating] = useState(false);

    const runLocalFallback = () => {
        // Very basic regex fallback if offline or API error
        const amountMatch = input.match(/(\d+(\.\d{1,2})?)/);
        const amount = amountMatch ? parseFloat(amountMatch[0]) : 100;

        let description = input.replace(/(\d+(\.\d{1,2})?)/, "").trim();
        description = description.replace(/[₹$€£]/g, "").trim();

        onParse({
            vendorName: "Unknown Vendor",
            date: new Date().toISOString().split("T")[0],
            items: [{
                description: description || "Supplier Goods",
                quantity: 1,
                price: amount
            }]
        });
    };

    const parseInput = async () => {
        if (!input.trim()) return;

        setIsAnimating(true);

        try {
            if (navigator.onLine) {
                const systemPrompt = `Extract purchase/bill details from natural language text.
Identify:
1. Vendor/Supplier name.
2. Bill number or reference number if mentioned.
3. Date (format as YYYY-MM-DD. Today is ${new Date().toISOString().split('T')[0]}). If "yesterday" is mentioned, calculate it relative to today.
4. Items list (description, quantity, price).

Examples:
- "Bought 10 cables for 50 each from Supplier Alpha yesterday, bill ref SA-300" -> {"vendorName":"Supplier Alpha","billNumber":"SA-300","date":"${(() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })()}","items":[{"description":"cables","quantity":10,"price":50}]}
- "Purchased 2 laptops at 45000 each from Dell Store" -> {"vendorName":"Dell Store","billNumber":null,"date":"${new Date().toISOString().split('T')[0]}","items":[{"description":"laptops","quantity":2,"price":45000}]}`;

                const jsonSchema = {
                    type: "json_schema",
                    json_schema: {
                        name: "purchase_parse",
                        strict: true,
                        schema: {
                            type: "object",
                            properties: {
                                vendorName: { type: "string", nullable: true },
                                billNumber: { type: "string", nullable: true },
                                date: { type: "string", nullable: true },
                                items: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            description: { type: "string" },
                                            quantity: { type: "number" },
                                            price: { type: "number" }
                                        },
                                        required: ["description", "quantity", "price"]
                                    }
                                }
                            },
                            required: ["vendorName", "billNumber", "date", "items"]
                        }
                    }
                };

                const response = await callOpenAI([
                    { role: "system", content: systemPrompt },
                    { role: "user", content: input }
                ], "gpt-4o-mini", jsonSchema);

                const data = JSON.parse(response);
                
                onParse({
                    vendorName: data.vendorName || undefined,
                    billNumber: data.billNumber || undefined,
                    date: data.date || undefined,
                    items: data.items || undefined
                });
            } else {
                runLocalFallback();
            }
        } catch (error) {
            console.warn("AI smart purchase parse failed, falling back to local:", error);
            runLocalFallback();
        } finally {
            setIsAnimating(false);
            setInput("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            parseInput();
        }
    };

    return (
        <div className="relative group">
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-lg blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 ${isAnimating ? "animate-pulse" : ""}`}></div>
            <div className="relative flex gap-2 w-full">
                <div className="relative flex-1">
                    <Sparkles className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500 ${isAnimating ? "animate-spin" : ""}`} />
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask AI: 'Bought 10 cables for 50 each from Supplier Alpha'..."
                        className="pl-10 pr-10 border-slate-200 shadow-sm bg-background/90 focus:bg-background transition-all h-10 text-sm"
                        disabled={disabled || isAnimating}
                    />
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={parseInput}
                                disabled={!input.trim() || disabled || isAnimating}
                                size="icon"
                                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md hover:shadow-lg transition-all h-10 w-10 shrink-0"
                            >
                                {isAnimating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Magic Fill</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
};
