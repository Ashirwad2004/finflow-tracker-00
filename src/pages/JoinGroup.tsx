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
import { Users, Link2, Copy } from "lucide-react";
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

  /* ---------------- INVITE LINK ---------------- */

  const inviteLink = useMemo(() => {
    if (!inviteCode) return "";
    return `${window.location.origin}/join/${inviteCode}`;
  }, [inviteCode]);

  /* ---------------- FETCH GROUP ---------------- */

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

  /* ---------------- CHECK MEMBERSHIP ---------------- */

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

  /* ---------------- JOIN GROUP ---------------- */

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

  /* ---------------- COPY LINK ---------------- */

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

  /* ---------------- LOADING ---------------- */

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
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

  /* ---------------- ERROR ---------------- */

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invite</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate("/groups")}>
              Go to Groups
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Users className="w-16 h-16 text-primary mx-auto mb-4" />
          <CardTitle className="text-2xl">Join Group</CardTitle>
          <p className="text-muted-foreground">
            You've been invited to join <strong>{group.name}</strong>
          </p>
          {group.description && (
            <p className="text-sm text-muted-foreground mt-2">
              {group.description}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* INVITE LINK */}
          <div>
            <Label>Invite Link</Label>
            <div className="flex gap-2 mt-1">
              <Input value={inviteLink} readOnly />
              <Button
                variant="outline"
                size="icon"
                onClick={copyInviteLink}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {!user ? (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
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
                <Label htmlFor="username">
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
