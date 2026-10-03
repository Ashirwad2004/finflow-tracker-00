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

interface SmartSaleInputProps {
    onParse: (data: {
        customerName?: string;
        customerPhone?: string;
        customerEmail?: string;
        customerGstin?: string;
        status?: "paid" | "pending";
        items?: Array<{ description: string; quantity: number; price: number; discount?: number }>;
        taxRate?: number;
        overallDiscount?: number;
    }) => void;
    disabled?: boolean;
    products?: { name: string; price: number }[]; // Optional list of real products
}

export const SmartSaleInput = ({ onParse, disabled, products = [] }: SmartSaleInputProps) => {
    const [input, setInput] = useState("");
    const [isAnimating, setIsAnimating] = useState(false);

    const runLocalFallback = () => {
        // Very basic regex fallback if offline or API error
        const amountMatch = input.match(/(\d+(\.\d{1,2})?)/);
        const amount = amountMatch ? parseFloat(amountMatch[0]) : 100;

        let description = input.replace(/(\d+(\.\d{1,2})?)/, "").trim();
        description = description.replace(/[₹$€£]/g, "").trim();

        onParse({
            customerName: "Walking Customer",
            status: "paid",
            items: [{
                description: description || "General Item",
                quantity: 1,
                price: amount,
                discount: 0
            }]
        });
    };

    const parseInput = async () => {
        if (!input.trim()) return;

        setIsAnimating(true);

        try {
            if (navigator.onLine) {
                const productsList = products.map(p => `${p.name} (₹${p.price})`).join(", ");
                const systemPrompt = `Extract invoice details from natural language text.
Available products catalog: ${productsList || "None"}.
Identify:
1. Customer details (name, phone, email, GSTIN). GSTIN is a 15-character ID.
2. Invoice status ('paid' or 'pending'). If the text says "unpaid", "pending", "on credit", or "due", mark as 'pending', otherwise default to 'paid'.
3. Items (description, quantity, price, discount percent). Match descriptions to the catalog if possible.
4. Tax rate (percentage if mentioned, e.g. "18% GST").
5. Overall discount percent if mentioned.

Examples:
- "Sold 3 cups at 200 each to Rahul, unpaid" -> {"customerName":"Rahul","status":"pending","items":[{"description":"cups","quantity":3,"price":200,"discount":0}]}
- "John Doe bought 2 monitors at 12000 each and 1 keyboard for 1500, paid" -> {"customerName":"John Doe","status":"paid","items":[{"description":"monitors","quantity":2,"price":12000,"discount":0},{"description":"keyboard","quantity":1,"price":1500,"discount":0}]}
- "Invoice to Priya 18% GST: 5 shirts for 500 each, gave 10% discount" -> {"customerName":"Priya","status":"paid","items":[{"description":"shirts","quantity":5,"price":500,"discount":10}],"taxRate":18}`;

                const jsonSchema = {
                    type: "json_schema",
                    json_schema: {
                        name: "sale_parse",
                        strict: true,
                        schema: {
                            type: "object",
                            properties: {
                                customerName: { type: "string", nullable: true },
                                customerPhone: { type: "string", nullable: true },
                                customerEmail: { type: "string", nullable: true },
                                customerGstin: { type: "string", nullable: true },
                                status: { type: "string", enum: ["paid", "pending"], nullable: true },
                                items: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            description: { type: "string" },
                                            quantity: { type: "number" },
                                            price: { type: "number" },
                                            discount: { type: "number", nullable: true }
                                        },
                                        required: ["description", "quantity", "price", "discount"]
                                    }
                                },
                                taxRate: { type: "number", nullable: true },
                                overallDiscount: { type: "number", nullable: true }
                            },
                            required: ["customerName", "customerPhone", "customerEmail", "customerGstin", "status", "items", "taxRate", "overallDiscount"]
                        }
                    }
                };

                const response = await callOpenAI([
                    { role: "system", content: systemPrompt },
                    { role: "user", content: input }
                ], "gpt-4o-mini", jsonSchema);

                const data = JSON.parse(response);
                
                onParse({
                    customerName: data.customerName || undefined,
                    customerPhone: data.customerPhone || undefined,
                    customerEmail: data.customerEmail || undefined,
                    customerGstin: data.customerGstin || undefined,
                    status: data.status || undefined,
                    items: data.items || undefined,
                    taxRate: data.taxRate !== null ? data.taxRate : undefined,
                    overallDiscount: data.overallDiscount !== null ? data.overallDiscount : undefined
                });
            } else {
                runLocalFallback();
            }
        } catch (error) {
            console.warn("AI smart invoice parse failed, falling back to local:", error);
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
                        placeholder="Ask AI: 'Sold 3 cups at 200 each to Rahul, unpaid'..."
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
