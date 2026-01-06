import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");

  /* ---------------- FETCH GROUPS ---------------- */

  const {
    data: groups = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["groups", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: memberships, error: memberErr } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (memberErr || !memberships?.length) return [];

      const groupIds = memberships.map((m) => m.group_id);

      const { data: groups, error: groupErr } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds);

      if (groupErr) throw groupErr;
      return groups || [];
    },
    enabled: !!user?.id,
  });

  /* ---------------- MEMBER COUNT ---------------- */

  const { data: allMembers = [] } = useQuery({
    queryKey: ["all-group-members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("group_members")
        .select("group_id");
      return data || [];
    },
  });

  const getMemberCount = (groupId: string) =>
    allMembers.filter((m) => m.group_id === groupId).length;

  /* ---------------- CREATE GROUP ---------------- */

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: group, error: groupErr } = await supabase
        .from("groups")
        .insert({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (groupErr) throw groupErr;

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user?.id)
        .single();

      const username =
        profile?.display_name || `user_${user?.id?.slice(0, 8)}`;

      const { error: memberErr } = await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: user?.id,
          username,
        });

      if (memberErr) throw memberErr;

      toast({
        title: "Success",
        description: "Group created successfully",
      });

      setIsCreateDialogOpen(false);
      setNewGroupName("");
      setNewGroupDescription("");
      refetch();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create group",
        variant: "destructive",
      });
    }
  };

  /* ---------------- NAVIGATION ---------------- */

  const navigateToGroup = (groupId: string) => {
    navigate(`/groups/${groupId}`);
  };

  /* ---------------- UI ---------------- */

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading groups...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error.message}</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Groups</h1>
            <p className="text-muted-foreground">
              Manage shared expense groups
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Group Name *</Label>
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={createGroup}>Create</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {groups.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-14 h-14 mx-auto mb-4 text-muted-foreground" />
              <p className="mb-4">No groups yet</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Create First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <Card
                key={group.id}
                onClick={() => navigateToGroup(group.id)}
                className="cursor-pointer hover:shadow-md transition"
              >
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {group.name}
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </CardTitle>
                  {group.description && (
                    <p className="text-sm text-muted-foreground">
                      {group.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="w-4 h-4 mr-2" />
                    {getMemberCount(group.id)} members
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;
