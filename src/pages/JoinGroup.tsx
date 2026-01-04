import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const JoinGroup = () => {
  const { inviteCode } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGroup = async () => {
      if (!inviteCode) {
        setError("Invalid invite link");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("groups")
        .select("id, name, description")
        .eq("invite_code", inviteCode.toUpperCase())
        .single();

      if (error || !data) {
        setError("Group not found or invite link is invalid");
        setLoading(false);
        return;
      }

      setGroup(data);
      setLoading(false);
    };

    fetchGroup();
  }, [inviteCode]);

  useEffect(() => {
    const checkMembership = async () => {
      if (!user || !group) return;

      const { data: existingMember } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", group.id)
        .eq("user_id", user.id)
        .single();

      if (existingMember) {
        toast({
          title: "Already a member",
          description: "You're already a member of this group",
        });
        navigate(`/groups/${group.id}`);
      }
    };

    checkMembership();
  }, [user, group, navigate]);

  const handleJoin = async () => {
    if (!user) {
      navigate(`/auth?redirect=/join/${inviteCode}`);
      return;
    }

    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }

    setJoining(true);

    try {
      const { error } = await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: user.id,
          username: username.trim(),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `You've joined ${group.name}!`,
      });

      navigate(`/groups/${group.id}`);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to join group",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <Skeleton className="w-16 h-16 rounded-full mx-auto" />
            <Skeleton className="h-8 w-40 mx-auto" />
            <Skeleton className="h-4 w-56 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invite</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate("/groups")}>Go to Groups</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Users className="w-16 h-16 text-primary mx-auto mb-4" />
          <CardTitle className="text-2xl">Join Group</CardTitle>
          <p className="text-muted-foreground">
            You've been invited to join <strong>{group?.name}</strong>
          </p>
          {group?.description && (
            <p className="text-sm text-muted-foreground mt-2">{group.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!user ? (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Please sign in to join this group
              </p>
              <Button onClick={() => navigate(`/auth?redirect=/join/${inviteCode}`)}>
                Sign In to Join
              </Button>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="username">Choose your display name for this group</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name"
                  className="mt-1"
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handleJoin}
                disabled={joining}
              >
                {joining ? "Joining..." : "Join Group"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinGroup;