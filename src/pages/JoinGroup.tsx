import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Copy, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const JoinGroup = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const inviteLink = useMemo(() => {
    if (!inviteCode) return "";
    return `${window.location.origin}/join/${inviteCode}`;
  }, [inviteCode]);

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

      const { data } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", group.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        toast({
          title: "Already a member",
          description: "You're already part of this group",
        });
        navigate(`/groups/${group.id}`);
      }
    };

    checkMembership();
  }, [user, group, navigate]);

  const handleJoin = async () => {
    if (!group) return;

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
      const { error } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
        username: username.trim(),
      });

      if (error) throw error;

      toast({
        title: "Success 🎉",
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

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: "Link copied",
        description: "Invite link copied to clipboard",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy invite link",
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <Skeleton className="w-16 h-16 rounded-full mx-auto" />
            <Skeleton className="h-8 w-40 mx-auto" />
            <Skeleton className="h-4 w-56 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6 px-4">
            <Users className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold mb-2">Invalid Invite</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate("/groups")} className="w-full sm:w-auto">
              Go to Groups
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center px-4 sm:px-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="absolute left-4 top-4"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Users className="w-12 h-12 sm:w-16 sm:h-16 text-primary mx-auto mb-4" />
          <CardTitle className="text-xl sm:text-2xl">Join Group</CardTitle>
          <p className="text-sm sm:text-base text-muted-foreground">
            You've been invited to join <strong className="text-foreground">{group.name}</strong>
          </p>
          {group.description && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">
              {group.description}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4 px-4 sm:px-6">
          {/* INVITE LINK */}
          <div>
            <Label className="text-sm">Invite Link</Label>
            <div className="flex gap-2 mt-1">
              <Input value={inviteLink} readOnly className="text-xs sm:text-sm" />
              <Button
                variant="outline"
                size="icon"
                onClick={copyInviteLink}
                className="flex-shrink-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {!user ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Please sign in to join this group
              </p>
              <Button
                onClick={() =>
                  navigate(`/auth?redirect=/join/${inviteCode}`)
                }
                className="w-full"
              >
                Sign In to Join
              </Button>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="username" className="text-sm">
                  Choose your display name
                </Label>
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
