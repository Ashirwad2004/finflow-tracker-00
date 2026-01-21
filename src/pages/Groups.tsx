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
  CardDescription,
  CardFooter,
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
import { Plus, Users, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/AppLayout";

// 1. LIST OF EMOJIS TO ASSIGN
const AVATAR_EMOJIS = [
  "🦊", "🐼", "🐸", "🦁", "🐯", "🐨", "🐷", "🦄", "🐙", "🐵",
  "🤖", "👻", "👽", "👾", "🤡", "🤠", "🎃", "⛄", "🐻", "🐝"
];

// 2. HELPER: Deterministically get an emoji based on username string
const getUserEmoji = (identifier: string | null) => {
  if (!identifier) return "👤";
  // Sum character codes to get a number
  const charCodeSum = identifier.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  // Use modulo to pick an emoji from the list
  return AVATAR_EMOJIS[charCodeSum % AVATAR_EMOJIS.length];
};

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

  /* ---------------- FETCH MEMBERS (UPDATED) ---------------- */

  const { data: allMembers = [] } = useQuery({
    queryKey: ["all-group-members"],
    queryFn: async () => {
      // We now fetch username and user_id to generate the emoji
      const { data } = await supabase
        .from("group_members")
        .select("group_id, user_id, username");
      return data || [];
    },
  });

  const getGroupMembers = (groupId: string) => 
    allMembers.filter((m) => m.group_id === groupId);

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

  const navigateToGroup = (groupId: string) => {
    navigate(`/groups/${groupId}`);
  };

  /* ---------------- UI ---------------- */

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading your circles...</p>
        </div>
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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
            <p className="text-muted-foreground mt-1">
              Manage expenses with your squads
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                <Plus className="w-5 h-5 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
              </DialogHeader>

              <div className="space-y-5 py-4">
                <div className="space-y-2">
                  <Label>Group Name <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="e.g. Goa Trip, Roommates"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="What's this group for?"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    className="resize-none min-h-[80px]"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={createGroup}>Create Group</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {groups.length === 0 ? (
          <Card className="text-center py-16 border-dashed shadow-sm">
            <CardContent className="flex flex-col items-center">
              <div className="bg-muted p-4 rounded-full mb-4">
                <Users className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Create a group to start splitting bills and tracking shared expenses with friends.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} variant="outline">
                Create First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => {
              const members = getGroupMembers(group.id);
              const displayMembers = members.slice(0, 4); // Show first 4
              const remainingCount = members.length - 4;

              return (
                <Card
                  key={group.id}
                  onClick={() => navigateToGroup(group.id)}
                  className="group relative cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-300 overflow-hidden"
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {group.name}
                        </CardTitle>
                        {group.description && (
                          <CardDescription className="line-clamp-1 mt-1">
                            {group.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="p-2 bg-muted/50 rounded-full group-hover:bg-primary/10 transition-colors">
                         <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardFooter className="pt-2">
                    <div className="flex items-center justify-between w-full">
                      {/* EMOJI STACK LOGIC */}
                      <div className="flex items-center -space-x-3">
                        {displayMembers.map((member) => (
                          <div
                            key={member.user_id}
                            className="w-9 h-9 rounded-full bg-background border-2 border-card flex items-center justify-center text-lg shadow-sm z-0 hover:z-10 hover:scale-110 transition-transform cursor-help"
                            title={member.username || "Member"}
                          >
                            {getUserEmoji(member.username || member.user_id)}
                          </div>
                        ))}
                        
                        {/* Overflow Counter */}
                        {remainingCount > 0 && (
                          <div className="w-9 h-9 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-medium text-muted-foreground z-0">
                            +{remainingCount}
                          </div>
                        )}
                      </div>

                      <div className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                        {members.length} {members.length === 1 ? 'member' : 'members'}
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;