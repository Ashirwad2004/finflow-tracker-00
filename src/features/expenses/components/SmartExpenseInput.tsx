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

interface SmartExpenseInputProps {
    onParse: (data: { amount: string; description: string; categoryName?: string }) => void;
    disabled?: boolean;
    categories?: { name: string }[]; // Optional list of real categories
}

// Keywords to detect the "Concept" (e.g. "Lunch" -> Food concept)
const CATEGORY_CONCEPTS: Record<string, string[]> = {
    "Food": ["lunch", "dinner", "breakfast", "coffee", "tea", "snack", "restaurant", "swiggy", "zomato", "grocery", "vegetables", "milk", "burger", "pizza", "food", "eat", "drink"],
    "Travel": ["uber", "ola", "taxi", "bus", "train", "flight", "petrol", "fuel", "gas", "metro", "auto", "cab", "ticket", "travel", "commute"],
    "Shopping": ["amazon", "flipkart", "clothes", "shoes", "mall", "market", "shop", "buy", "jeans", "shirt", "dress", "store"],
    "Bills": ["electricity", "water", "internet", "wifi", "phone", "recharge", "rent", "subscription", "netflix", "spotify", "bill", "invoice", "light bill", "broadband"],
    "Health": ["medicine", "doctor", "hospital", "gym", "yoga", "fitness", "medical", "checkup", "pharmacy"],
    "Entertainment": ["movie", "cinema", "game", "party", "concert", "ipl", "match", "fun", "outing"],
    "Education": ["books", "course", "fees", "tuition", "school", "college", "udemy", "coursera", "learning"],
};

// Synonyms to map a Concept to actual User Categories
// e.g. Concept "Food" matches categories containing "dining", "groceries", etc.
const CONCEPT_SYNONYMS: Record<string, string[]> = {
    "Food": ["food", "eat", "drink", "dining", "kitchen", "ration", "grocery", "snack"],
    "Travel": ["travel", "transport", "fuel", "petrol", "commute", "vehicle", "taxi", "cab"],
    "Shopping": ["shop", "purchase", "store", "buy", "cloth", "fashion"],
    "Bills": ["bill", "utility", "rent", "recharge", "subscription", "fee", "payment"],
    "Health": ["health", "medic", "fitness", "gym", "care"],
    "Entertainment": ["entertain", "movie", "fun", "subscription", "game"],
    "Education": ["education", "learn", "course", "school", "college", "book"],
};

export const SmartExpenseInput = ({ onParse, disabled, categories = [] }: SmartExpenseInputProps) => {
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

        // 3. Infer Category
        let categoryName: string | undefined = undefined;
        const lowerInput = input.toLowerCase();

        // Priority A: Direct Category Match (Input contains exact category name)
        const exactMatch = categories.find(c => lowerInput.includes(c.name.toLowerCase()));
        if (exactMatch) {
            categoryName = exactMatch.name;
        }

        // Priority B: Concept / Keyword Matching
        if (!categoryName) {
            let detectedConcept: string | null = null;

            // Find the concept (e.g. "Lunch" -> "Food")
            for (const [concept, keywords] of Object.entries(CATEGORY_CONCEPTS)) {
                if (keywords.some(k => lowerInput.includes(k))) {
                    detectedConcept = concept;
                    break;
                }
            }

            if (detectedConcept) {
                // Try to find a matching category for this concept
                // 1. Look for category exactly named like the concept (e.g. "Food")
                const directConceptMatch = categories.find(c => c.name.toLowerCase() === detectedConcept!.toLowerCase());

                if (directConceptMatch) {
                    categoryName = directConceptMatch.name;
                } else {
                    // 2. Fuzzy match: Look for category containing synonyms (e.g. "Eating Out" contains "eat")
                    const synonyms = CONCEPT_SYNONYMS[detectedConcept] || [];
                    const fuzzyMatch = categories.find(c =>
                        synonyms.some(syn => c.name.toLowerCase().includes(syn))
                    );
                    if (fuzzyMatch) {
                        categoryName = fuzzyMatch.name;
                    }
                }
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
                const systemPrompt = `
You are a financial AI data extractor. 
Extract the amount (numbers only), a clean short description (without currency symbols or the amount itself), and the best matching category from the user's input.
Available categories: ${JSON.stringify(categoriesList)}.
If a category cannot be determined or matched, choose the most relevant one from the list or null.
`;
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
