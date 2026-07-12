import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { callOpenAI } from "@/core/integrations/ai/openai";
import { matchCategory } from "@/core/integrations/ai/categoryMatcher";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SmartExpenseInputProps {
    onParse: (data: { amount: string; description: string; categoryName?: string }) => void;
    disabled?: boolean;
    categories?: { name: string }[]; // Optional list of real categories
    expenses?: any[];
}

export const SmartExpenseInput = ({ onParse, disabled, categories = [], expenses = [] }: SmartExpenseInputProps) => {
    const [input, setInput] = useState("");
    const [isAnimating, setIsAnimating] = useState(false);

    const runLocalFallback = () => {
        // 1. Extract Amount (numbers)
        const amountMatch = input.match(/(\d+(\.\d{1,2})?)/);
        const amount = amountMatch ? amountMatch[0] : "";

        // 2. Extract Description (remove amount)
        let description = input.replace(/(\d+(\.\d{1,2})?)/, "").trim();
        description = description.replace(/[₹$€£]/g, "").trim();
        description = description.replace(/\s+/g, " ");

        // 3. Infer Category using the fuzzy shared matcher
        let categoryName: string | undefined = undefined;
        
        const formattedCats = categories.map((c, idx) => ({
            id: (c as any).id || c.name || idx.toString(),
            name: c.name
        }));
        
        const matchedId = matchCategory(description || input, formattedCats, expenses);
        if (matchedId) {
            const match = formattedCats.find(c => c.id === matchedId);
            if (match) {
                categoryName = match.name;
            }
        }

        onParse({ amount, description, categoryName });
    };

    // Parse logic
    const parseInput = async () => {
        if (!input.trim()) return;

        setIsAnimating(true);

        try {
            if (navigator.onLine) {
                const categoriesList = categories.map(c => c.name);
                 const systemPrompt = `Extract amount, description, and category.
Categories: ${categoriesList.join(",")}.
Examples:
- "starbucks coffee 150" -> {"amount":"150","description":"Starbucks Coffee","categoryName":"Food"}
- "₹1200 electricity bill" -> {"amount":"1200","description":"Electricity Bill","categoryName":"Bills"}
- "grocery d-mart 3400" -> {"amount":"3400","description":"Grocery D-Mart","categoryName":"Shopping"}
- "cab 450" -> {"amount":"450","description":"Cab","categoryName":"Travel"}`;
                const jsonSchema = {
                    type: "json_schema",
                    json_schema: {
                        name: "expense_parse",
                        strict: true,
                        schema: {
                            type: "object",
                            properties: {
                                amount: { type: "string" },
                                description: { type: "string" },
                                categoryName: { type: "string", nullable: true }
                            },
                            required: ["amount", "description", "categoryName"]
                        }
                    }
                };

                const response = await callOpenAI([
                    { role: "system", content: systemPrompt },
                    { role: "user", content: input }
                ], "gpt-4o-mini", jsonSchema);

                const data = JSON.parse(response);
                onParse({
                    amount: data.amount || "",
                    description: data.description || input,
                    categoryName: data.categoryName || undefined
                });
            } else {
                runLocalFallback();
            }
        } catch (error) {
            console.warn("AI smart parse failed, falling back to local regex:", error);
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
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-violet-500 rounded-lg blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 ${isAnimating ? "animate-pulse" : ""}`}></div>
            <div className="relative flex gap-2 w-full">
                <div className="relative flex-1">
                    <Sparkles className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500 ${isAnimating ? "animate-spin" : ""}`} />
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask AI: 'Lunch 250' or 'Uber 400'"
                        className="pl-10 pr-10 border-0 shadow-sm bg-background/90 focus:bg-background transition-all"
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
                                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md hover:shadow-lg transition-all"
                            >
                                <ArrowRight className="w-4 h-4" />
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
