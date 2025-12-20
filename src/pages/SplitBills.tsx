import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Users, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Participant {
  name: string;
  amount: number;
}

const SplitBills = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([{ name: "", amount: 0 }]);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { data: splitBills = [], isLoading } = useQuery({
    queryKey: ["split-bills", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("split_bills")
        .select(`
          *,
          split_bill_participants (*)
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createSplitBill = useMutation({
    mutationFn: async () => {
      const { data: bill, error: billError } = await supabase
        .from("split_bills")
        .insert({
          user_id: user!.id,
          title,
          total_amount: parseFloat(totalAmount),
        })
        .select()
        .single();

      if (billError) throw billError;

      const participantsToInsert = participants
        .filter(p => p.name.trim() !== "")
        .map(p => ({
          split_bill_id: bill.id,
          name: p.name,
          amount: p.amount,
        }));

      if (participantsToInsert.length > 0) {
        const { error: partError } = await supabase
          .from("split_bill_participants")
          .insert(participantsToInsert);

        if (partError) throw partError;
      }

      return bill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-bills"] });
      setIsDialogOpen(false);
      setTitle("");
      setTotalAmount("");
      setParticipants([{ name: "", amount: 0 }]);
      toast({
        title: "Split bill created",
        description: "Your bill has been split successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create split bill.",
        variant: "destructive",
      });
    },
  });

  const deleteSplitBill = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("split_bills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-bills"] });
      toast({ title: "Bill deleted", description: "Split bill has been removed." });
    },
  });

  const togglePaid = useMutation({
    mutationFn: async ({ id, isPaid }: { id: string; isPaid: boolean }) => {
      const { error } = await supabase
        .from("split_bill_participants")
        .update({ is_paid: !isPaid })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-bills"] });
    },
  });

  // Redirect to auth if not logged in (after all hooks)
  if (!loading && !user) {
    navigate("/auth");
    return null;
  }

  // Show loading while checking auth (after all hooks)
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const handleTotalAmountChange = (value: string) => {
    setTotalAmount(value);
    const total = parseFloat(value) || 0;
    const perPerson = total / participants.length;
    setParticipants(participants.map(p => ({ ...p, amount: perPerson })));
  };

  const addParticipant = () => {
    const total = parseFloat(totalAmount) || 0;
    const newParticipants = [...participants, { name: "", amount: 0 }];
    const perPerson = total / newParticipants.length;
    setParticipants(newParticipants.map(p => ({ ...p, amount: perPerson })));
  };

  const removeParticipant = (index: number) => {
    if (participants.length > 1) {
      const newParticipants = participants.filter((_, i) => i !== index);
      const total = parseFloat(totalAmount) || 0;
      const perPerson = total / newParticipants.length;
      setParticipants(newParticipants.map(p => ({ ...p, amount: perPerson })));
    }
  };

  const updateParticipantName = (index: number, name: string) => {
    const updated = [...participants];
    updated[index].name = name;
    setParticipants(updated);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Split Bills</h1>
              <p className="text-sm text-muted-foreground">Split expenses with friends</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Your Split Bills</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Split Bill
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Split Bill</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="title">Bill Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Dinner at restaurant"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Total Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={totalAmount}
                    onChange={(e) => handleTotalAmountChange(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Participants</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addParticipant}>
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {participants.map((participant, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          placeholder="Name"
                          value={participant.name}
                          onChange={(e) => updateParticipantName(index, e.target.value)}
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground w-20 text-right">
                          ₹{participant.amount.toFixed(2)}
                        </span>
                        {participants.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeParticipant(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={() => createSplitBill.mutate()}
                  disabled={!title || !totalAmount || participants.every(p => !p.name.trim())}
                  className="w-full"
                >
                  Create Split Bill
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : splitBills.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No split bills yet. Create one to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {splitBills.map((bill: any) => (
              <Card key={bill.id} className="shadow-card">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{bill.title}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSplitBill.mutate(bill.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <p className="text-2xl font-bold text-primary">₹{parseFloat(bill.total_amount).toFixed(2)}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">Participants:</p>
                  <div className="space-y-2">
                    {bill.split_bill_participants?.map((participant: any) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => togglePaid.mutate({ id: participant.id, isPaid: participant.is_paid })}
                          >
                            {participant.is_paid ? (
                              <Check className="w-4 h-4 text-success" />
                            ) : (
                              <X className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                          <span className={participant.is_paid ? "line-through text-muted-foreground" : ""}>
                            {participant.name}
                          </span>
                        </div>
                        <span className="font-medium">₹{parseFloat(participant.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SplitBills;
