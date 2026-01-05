import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

  const { data: groups = [], isLoading, error, refetch } = useQuery({
    queryKey: ["groups", user?.id],
    queryFn: async () => {
      try {
        // First get groups the user is a member of
        const { data: userGroups, error: groupsError } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", user?.id);

        if (groupsError) {
          // If table doesn't exist, return empty array
          if (groupsError.message?.includes('relation "public.group_members" does not exist')) {
            return [];
          }
          throw groupsError;
        }

        if (!userGroups || userGroups.length === 0) return [];

        const groupIds = userGroups.map(g => g.group_id);

        // Then get group details
        const { data, error } = await supabase
          .from("groups")
          .select("*")
          .in("id", groupIds);

        if (error) {
          // If table doesn't exist, return empty array
          if (error.message?.includes('relation "public.groups" does not exist')) {
            return [];
          }
          throw error;
        }
        return data;
      } catch (err) {
        console.error('Error fetching groups:', err);
        return [];
      }
    },
    enabled: !!user,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ["all-group-members", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id");

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getMemberCount = (groupId: string) => {
    return allMembers.filter(member => member.group_id === groupId).length;
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
      // Create the group
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (groupError) {
        if (groupError.message?.includes('relation "public.groups" does not exist')) {
          toast({
            title: "Database Error",
            description: "Group tables not found. Please run the SQL script to create the database tables.",
            variant: "destructive",
          });
          return;
        }
        throw groupError;
      }

      // Add creator as first member
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user?.id)
        .single();

      const username = profile?.display_name || `user_₹{user?.id?.slice(0, 8)}`;

      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: user?.id,
          username: username,
        });

      if (memberError) {
        if (memberError.message?.includes('relation "public.group_members" does not exist')) {
          toast({
            title: "Database Error",
            description: "Group member tables not found. Please run the SQL script to create the database tables.",
            variant: "destructive",
          });
          return;
        }
        throw memberError;
      }

      toast({
        title: "Success",
        description: "Group created successfully!",
      });

      setIsCreateDialogOpen(false);
      setNewGroupName("");
      setNewGroupDescription("");
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create group",
        variant: "destructive",
      });
    }
  };

  const navigateToGroup = (groupId: string) => {
    navigate(`/groups/₹{groupId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading groups...</p>
        </div>
      </div>
    );
  }

  if (error && !error.message?.includes('relation "public.group_members" does not exist')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-destructive">Error Loading Groups</h1>
          <p className="text-muted-foreground mb-6">{error.message}</p>
          <Button onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Groups</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage expense groups with your friends and family
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
                  <Label htmlFor="group-name">Group Name *</Label>
                  <Input
                    id="group-name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter group name"
                  />
                </div>
                <div>
                  <Label htmlFor="group-description">Description (Optional)</Label>
                  <Textarea
                    id="group-description"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Describe your group"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
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
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No groups yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first group to start sharing expenses with others
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigateToGroup(group.id)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {group.name}
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </CardTitle>
                  {group.description && (
                    <p className="text-sm text-muted-foreground">{group.description}</p>
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