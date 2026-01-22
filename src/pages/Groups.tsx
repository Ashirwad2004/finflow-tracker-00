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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Users, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/AppLayout";
import { PullToRefresh } from "@/components/PullToRefresh";

const AVATAR_EMOJIS = [
  "🦊", "🐼", "🐸", "🦁", "🐯", "🐨", "🐷", "🦄", "🐙", "🐵",
  "🤖", "👻", "👽", "👾", "🤡", "🤠", "🎃", "⛄", "🐻", "🐝"
];

const getUserEmoji = (identifier: string | null) => {
  if (!identifier) return "👤";
  const charCodeSum = identifier.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_EMOJIS[charCodeSum % AVATAR_EMOJIS.length];
};

const GroupsSkeleton = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardFooter className="pt-2">
            <div className="flex items-center justify-between w-full">
              <div className="flex -space-x-3">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="w-9 h-9 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  </div>
);

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");

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

  const { data: allMembers = [] } = useQuery({
    queryKey: ["all-group-members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("group_members")
        .select("group_id, user_id, username");
      return data || [];
    },
  });

  const getGroupMembers = (groupId: string) => 
    allMembers.filter((m) => m.group_id === groupId);

  const handleRefresh = async () => {
    await refetch();
    toast({
      title: "Refreshed",
      description: "Groups updated successfully.",
    });
  };

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

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <p className="text-destructive mb-4">{error.message}</p>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-6xl">
          {isLoading ? (
            <GroupsSkeleton />
          ) : (
            <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Groups</h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  Manage expenses with your squads
                </p>
              </div>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="default" className="w-full sm:w-auto shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Create Group
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] mx-4 sm:mx-auto">
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
                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                      <Button
                        variant="ghost"
                        onClick={() => setIsCreateDialogOpen(false)}
                        className="order-2 sm:order-1"
                      >
                        Cancel
                      </Button>
                      <Button onClick={createGroup} className="order-1 sm:order-2">
                        Create Group
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {groups.length === 0 ? (
              <Card className="text-center py-12 sm:py-16 border-dashed shadow-sm">
                <CardContent className="flex flex-col items-center px-4">
                  <div className="bg-muted p-4 rounded-full mb-4">
                    <Users className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-sm mx-auto">
                    Create a group to start splitting bills and tracking shared expenses with friends.
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)} variant="outline">
                    Create First Group
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {groups.map((group) => {
                  const members = getGroupMembers(group.id);
                  const displayMembers = members.slice(0, 4);
                  const remainingCount = members.length - 4;

                  return (
                    <Card
                      key={group.id}
                      onClick={() => navigateToGroup(group.id)}
                      className="group relative cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-300 overflow-hidden active:scale-[0.98]"
                    >
                      <CardHeader className="pb-3 px-4 sm:px-6">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors truncate">
                              {group.name}
                            </CardTitle>
                            {group.description && (
                              <CardDescription className="line-clamp-1 mt-1 text-sm">
                                {group.description}
                              </CardDescription>
                            )}
                          </div>
                          <div className="p-2 bg-muted/50 rounded-full group-hover:bg-primary/10 transition-colors flex-shrink-0">
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardFooter className="pt-2 px-4 sm:px-6">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center -space-x-2 sm:-space-x-3">
                            {displayMembers.map((member) => (
                              <div
                                key={member.user_id}
                                className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-background border-2 border-card flex items-center justify-center text-sm sm:text-lg shadow-sm z-0 hover:z-10 hover:scale-110 transition-transform"
                                title={member.username || "Member"}
                              >
                                {getUserEmoji(member.username || member.user_id)}
                              </div>
                            ))}
                            
                            {remainingCount > 0 && (
                              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-medium text-muted-foreground z-0">
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
            </>
          )}
        </div>
      </PullToRefresh>
    </AppLayout>
  );
};

export default Groups;
