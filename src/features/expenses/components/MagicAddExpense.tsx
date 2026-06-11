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
You are an intelligent financial data extraction AI for the FinFlow Tracker application.
The user will describe one or multiple financial transactions (expenses, lending money, or borrowing money) in natural language.
Extract each individual transaction as a separate operation in the "operations" array.

Fields to extract for each operation:
- table: Must be exactly one of "expenses", "lent_money", or "borrowed_money"
- amount: The numeric amount of the transaction
- description: A short, clean description of the transaction
- date: Format must be YYYY-MM-DD strictly. Today is ${new Date().toISOString().split('T')[0]}. If they mention "yesterday", "2 days ago", etc., compute the correct date accordingly.
- person_name: The name of the person involved (only if lent_money or borrowed_money, otherwise null)
- category_term: A general category term (e.g. 'Food', 'Travel', 'Shopping', 'Bills', 'Health', 'Education') (only for expenses, otherwise null)

Few-Shot Training Examples:

Example 1:
User query: "Spent 400 on cab yesterday and Rahul borrowed 500"
Output: {
  "operations": [
    {
      "table": "expenses",
      "amount": 400,
      "description": "Cab ride",
      "date": "${(() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })()}",
      "person_name": null,
      "category_term": "Travel"
    },
    {
      "table": "lent_money",
      "amount": 500,
      "description": "Rahul borrowed money",
      "date": "${new Date().toISOString().split('T')[0]}",
      "person_name": "Rahul",
      "category_term": null
    }
  ]
}

Example 2:
User query: "Borrowed 10000 from Priya for school fees"
Output: {
  "operations": [
    {
      "table": "borrowed_money",
      "amount": 10000,
      "description": "School fees",
      "date": "${new Date().toISOString().split('T')[0]}",
      "person_name": "Priya",
      "category_term": null
    }
  ]
}

Example 3:
User query: "Paid electricity bill of 2400 on 2026-05-15"
Output: {
  "operations": [
    {
      "table": "expenses",
      "amount": 2400,
      "description": "Electricity bill",
      "date": "2026-05-15",
      "person_name": null,
      "category_term": "Bills"
    }
  ]
}
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
                                        person_name: { type: "string", nullable: true },
                                        category_term: { type: "string", nullable: true }
                                    },
                                    required: ["table", "amount", "description", "date", "person_name", "category_term"]
                                }
                            }
                        },
                        required: ["operations"]
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
