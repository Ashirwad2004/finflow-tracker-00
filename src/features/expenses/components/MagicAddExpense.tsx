import { useState } from "react";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/core/hooks/use-toast";
import { callOpenAI } from "@/core/integrations/ai/openai";
import { offlineMutate } from "@/core/offline/apiService";
import { useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";

interface MagicAddProps {
    userId: string;
    categories: any[];
}

export function MagicAddExpense({ userId, categories }: MagicAddProps) {
    const [query, setQuery] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const queryClient = useQueryClient();

    const handleMagicSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsProcessing(true);
        try {
            const systemPrompt = `
You are an intelligent financial data extraction AI.
The user will give you a sentence describing financial transactions.
Your task is to extract each transaction and determine:
- table (expenses, lent_money, or borrowed_money)
- amount (Numeric)
- description (Short description of what the transaction was)
- date (YYYY-MM-DD strictly. If they say 'yesterday', subtract 1 day from today. Today is ${new Date().toISOString().split('T')[0]})
- person_name (Only if lent or borrowed to someone, otherwise null)
- category_term (Guess the category like 'Food', 'Travel', 'Shopping'. Only for expenses, otherwise null)
`;
            const jsonSchema = {
                type: "json_schema",
                json_schema: {
                    name: "financial_actions",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            operations: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        table: { type: "string", enum: ["expenses", "lent_money", "borrowed_money"] },
                                        amount: { type: "number" },
                                        description: { type: "string" },
                                        date: { type: "string" },
                                        person_name: { type: ["string", "null"] },
                                        category_term: { type: ["string", "null"] }
                                    },
                                    required: ["table", "amount", "description", "date", "person_name", "category_term"],
                                    additionalProperties: false
                                }
                            }
                        },
                        required: ["operations"],
                        additionalProperties: false
                    }
                }
            };

            const response = await callOpenAI([
                { role: "system", content: systemPrompt },
                { role: "user", content: query }
            ], "gpt-4o-mini", jsonSchema);

            const parsed = JSON.parse(response);

            if (!parsed.operations || parsed.operations.length === 0) {
                toast({ title: "No operations found", description: "Could not understand the transaction.", variant: "destructive" });
                return;
            }

            // Execute offline mutations dynamically!
            const promises = parsed.operations.map(async (op: any) => {
                const recordId = uuidv4();
                let payload: any = {
                    id: recordId,
                    user_id: userId,
                    amount: op.amount,
                    date: op.date,
                    description: op.description
                };

                if (op.table === 'expenses') {
                    // Try to auto-match category
                    const matchedCat = categories.find(c =>
                        c.name.toLowerCase().includes(op.category_term?.toLowerCase() || '')
                    );
                    payload.category_id = matchedCat?.id || categories[0]?.id; // Default to first if miss
                } else if (op.table === 'lent_money' || op.table === 'borrowed_money') {
                    payload.person_name = op.person_name || "Unknown";
                    payload.status = "pending";
                    // dueDate shouldn't break schema
                }

                const { error } = await offlineMutate({
                    table: op.table,
                    action: "insert",
                    recordId,
                    payload,
                    userId
                });
                
                if (error) throw error;
            });

            await Promise.all(promises);

            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["lent-money"] });
            queryClient.invalidateQueries({ queryKey: ["borrowed-money"] });

            toast({ title: "✨ Magic Add Success!", description: `Added ${parsed.operations.length} transaction(s) optimally.` });
            setQuery("");

        } catch (error: any) {
            toast({ title: "AI Processing Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleMagicSubmit} className="relative group w-full mb-6">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative flex items-center bg-card rounded-xl shadow-lg border">
                <div className="pl-4 py-3 flex text-violet-500">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Type 'Spent 400 on cab yesterday and Rahul borrowed 500'..."
                    className="border-0 focus-visible:ring-0 bg-transparent text-foreground placeholder:text-muted-foreground shadow-none"
                    disabled={isProcessing}
                />
                <Button 
                    type="submit" 
                    size="icon" 
                    variant="ghost" 
                    className="mr-2 text-violet-500 hover:text-violet-600 hover:bg-violet-50"
                    disabled={!query.trim() || isProcessing}
                >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                </Button>
            </div>
        </form>
    );
}
