import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Loader2, Users, IndianRupee } from "lucide-react";

interface Category {
    id: string;
    name: string;
}

interface Member {
    user_id: string;
    username: string;
}

interface GroupExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    groupId: string;
    members: Member[];
    categories: Category[];
    userId: string;
    currentMemberUsername?: string;
}

export const GroupExpenseDialog = ({
    open,
    onOpenChange,
    groupId,
    members,
    categories,
    userId,
    currentMemberUsername,
}: GroupExpenseDialogProps) => {
    const queryClient = useQueryClient();

    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [categoryId, setCategoryId] = useState("");

    // Split logic state
    const [splitType, setSplitType] = useState<"equal" | "exact">("equal");
    // selectedMembers stores IDs of who is involved. Default is ALL members.
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

    useEffect(() => {
        if (open) {
            // Reset form when opening
            setDescription("");
            setAmount("");
            setDate(new Date().toISOString().split("T")[0]);
            setCategoryId("");
            setSplitType("equal");
            setSelectedMembers(members.map(m => m.user_id));
        }
    }, [open, members]);

    const toggleMember = (memberId: string) => {
        setSelectedMembers(prev => {
            if (prev.includes(memberId)) {
                // Don't allow removing the last member (at least one person must pay/owe)
                if (prev.length === 1) {
                    toast({ title: "At least one member must be selected" });
                    return prev;
                }
                return prev.filter(id => id !== memberId);
            }
            return [...prev, memberId];
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedMembers(members.map(m => m.user_id));
        } else {
            // Don't allow deselecting everything, keep just current user or first
            setSelectedMembers([userId].filter(id => members.some(m => m.user_id === id)));
        }
    };

    const addExpenseMutation = useMutation({
        mutationFn: async () => {
            // Prepare split_data
            // If ALL members are selected, we can technically leave split_data as NULL for backward compatibility,
            // OR we can explicitly save the IDs. Let's explicitly save IDs for consistency if it's a subset.
            // If it matches exactly all members, we could set it to null (to mean "everyone").
            // But to be "party-wise" specific, explicit is better. 
            // However, for the SQL logic I wrote (comment says NULL = all), let's stick to that for "Equal All".

            let splitData = null;
            if (selectedMembers.length !== members.length) {
                splitData = selectedMembers;
            }

            const { error } = await supabase.from("group_expenses").insert({
                group_id: groupId,
                user_id: userId,
                username: currentMemberUsername || "Unknown",
                amount: parseFloat(amount),
                description: description.trim(),
                date,
                category_id: categoryId || null,
                split_data: splitData ? JSON.stringify(splitData) : null,
            });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["group-expenses", groupId] });
            toast({ title: "Expense added", description: "Split recorded successfully." });
            onOpenChange(false);
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const handleSubmit = () => {
        if (!amount || !description) {
            toast({ title: "Missing details", description: "Please enter amount and description.", variant: "destructive" });
            return;
        }
        addExpenseMutation.mutate();
    };

    // Avatar color helper (reused pattern)
    const avatarColors = [
        "bg-red-500", "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500", "bg-orange-500",
    ];
    const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

    const amountPerPerson = selectedMembers.length > 0
        ? (parseFloat(amount || "0") / selectedMembers.length).toFixed(2)
        : "0.00";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-4 sm:p-6 border-b bg-muted/20">
                    <DialogTitle>Add Group Expense</DialogTitle>
                </DialogHeader>

                <ScrollArea className="max-h-[80vh] overflow-y-auto">
                    <div className="p-4 sm:p-6 space-y-6">

                        {/* Amount & Description */}
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    <IndianRupee className="w-5 h-5" />
                                </div>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    className="pl-10 text-2xl font-bold h-14"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Details</Label>
                                <Input
                                    placeholder="What's this for?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select value={categoryId} onValueChange={setCategoryId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Split Section */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2 text-base font-semibold">
                                    <Users className="w-4 h-4" />
                                    Split Among
                                </Label>
                                <div className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded">
                                    ₹{amountPerPerson} / person
                                </div>
                            </div>

                            <div className="border rounded-lg divide-y bg-card">
                                <div className="p-3 flex items-center justify-between bg-muted/30">
                                    <Label htmlFor="select-all" className="cursor-pointer text-sm font-medium">Select All</Label>
                                    <Checkbox
                                        id="select-all"
                                        checked={selectedMembers.length === members.length}
                                        onCheckedChange={handleSelectAll}
                                    />
                                </div>
                                <div className="max-h-[200px] overflow-y-auto">
                                    {members.map((member) => (
                                        <div
                                            key={member.user_id}
                                            className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                                            onClick={() => toggleMember(member.user_id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar className={`w-8 h-8 ${getAvatarColor(member.username)}`}>
                                                    <AvatarFallback className="text-xs text-white">
                                                        {member.username.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-medium">{member.username}</span>
                                            </div>
                                            <Checkbox
                                                checked={selectedMembers.includes(member.user_id)}
                                                onCheckedChange={() => toggleMember(member.user_id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </ScrollArea>

                <DialogFooter className="p-4 border-t bg-muted/20">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={addExpenseMutation.isPending}>
                        {addExpenseMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Expense
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
