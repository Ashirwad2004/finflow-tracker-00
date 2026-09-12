import { useMemo, useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { offlineMutate } from "@/core/offline/apiService";
import { v4 as uuidv4 } from "uuid";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Users,
  ArrowRight,
  Search,
  ArrowUpDown,
  Copy,
  Check,
  LogIn,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "@/core/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { PullToRefresh } from "@/components/layout/PullToRefresh";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  invite_code: string;
}

interface GroupMember {
  group_id: string;
  user_id: string;
  username: string | null;
}

type SortKey = "name" | "members";

// ---------------------------------------------------------------------------
// Deterministic identity helpers (initials + color, not random emoji soup)
// ---------------------------------------------------------------------------

const AVATAR_PALETTE = [
  { bg: "bg-rose-100", text: "text-rose-700", ring: "ring-rose-200" },
  { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-200" },
  { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-200" },
  { bg: "bg-sky-100", text: "text-sky-700", ring: "ring-sky-200" },
  { bg: "bg-violet-100", text: "text-violet-700", ring: "ring-violet-200" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700", ring: "ring-fuchsia-200" },
  { bg: "bg-teal-100", text: "text-teal-700", ring: "ring-teal-200" },
  { bg: "bg-orange-100", text: "text-orange-700", ring: "ring-orange-200" },
];

const hashString = (input: string) =>
  input.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

const paletteFor = (seed: string) =>
  AVATAR_PALETTE[hashString(seed) % AVATAR_PALETTE.length];

const getInitials = (label: string | null) => {
  if (!label) return "?";
  const parts = label.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const generateInviteCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

const GroupsSkeleton = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="flex gap-3">
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 w-28" />
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

// ---------------------------------------------------------------------------
// Presentational pieces
// ---------------------------------------------------------------------------

const MemberAvatar = ({ member, size = "md" }: { member: GroupMember; size?: "sm" | "md" }) => {
  const palette = paletteFor(member.username || member.user_id);
  const dims = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  return (
    <div
      className={`${dims} rounded-full ${palette.bg} ${palette.text} border-2 border-card flex items-center justify-center font-semibold shadow-sm z-0 hover:z-10 hover:scale-110 transition-transform`}
      title={member.username || "Member"}
    >
      {getInitials(member.username)}
    </div>
  );
};

const GroupIcon = ({ group }: { group: Group }) => {
  const palette = paletteFor(group.id);
  return (
    <div
      className={`w-11 h-11 rounded-xl ${palette.bg} ${palette.text} flex items-center justify-center font-bold text-base shrink-0`}
    >
      {getInitials(group.name)}
    </div>
  );
};

const InviteCodeChip = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({ title: "Invite code copied", description: `Share ${code} to add people.` });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Couldn't copy", description: "Copy the code manually instead.", variant: "destructive" });
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 hover:bg-muted px-2 py-1 rounded-md transition-colors"
      aria-label={`Copy invite code ${code}`}
    >
      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
      {code}
    </button>
  );
};

const GroupCard = ({
  group,
  members,
  onOpen,
}: {
  group: Group;
  members: GroupMember[];
  onOpen: (id: string) => void;
}) => {
  const displayMembers = members.slice(0, 4);
  const remainingCount = members.length - 4;

  return (
    <Card
      onClick={() => onOpen(group.id)}
      className="group relative cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 overflow-hidden active:scale-[0.98]"
    >
      <CardHeader className="pb-3 px-4 sm:px-6">
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <GroupIcon group={group} />
            <div className="flex-1 min-w-0 pt-0.5">
              <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors truncate">
                {group.name}
              </CardTitle>
              {group.description && (
                <CardDescription className="line-clamp-1 mt-1 text-sm">
                  {group.description}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="p-2 bg-muted/50 rounded-full group-hover:bg-primary/10 transition-colors flex-shrink-0">
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
          </div>
        </div>
      </CardHeader>

      <CardFooter className="pt-2 px-4 sm:px-6 flex-col items-stretch gap-3">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center -space-x-2 sm:-space-x-3">
            {displayMembers.map((member) => (
              <MemberAvatar key={member.user_id} member={member} />
            ))}
            {remainingCount > 0 && (
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-medium text-muted-foreground z-0">
                +{remainingCount}
              </div>
            )}
          </div>
          <div className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
            {members.length} {members.length === 1 ? "member" : "members"}
          </div>
        </div>
        <div className="flex justify-start">
          <InviteCodeChip code={group.invite_code} />
        </div>
      </CardFooter>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const {
    data: groups = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Group[]>({
    queryKey: ["groups", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: memberships, error: memberErr } = await (supabase as any)
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (memberErr || !memberships?.length) return [];

      const groupIds = memberships.map((m: any) => m.group_id);

      const { data, error: groupErr } = await (supabase as any)
        .from("groups")
        .select("*")
        .in("id", groupIds);

      if (groupErr) throw groupErr;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const { data: allMembers = [] } = useQuery<GroupMember[]>({
    queryKey: ["all-group-members"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("group_members")
        .select("group_id, user_id, username");
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Real-time subscription for membership changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`realtime:groups-list:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["groups", user.id] });
          queryClient.invalidateQueries({ queryKey: ["all-group-members"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const getGroupMembers = useCallback(
    (groupId: string) => allMembers.filter((m) => m.group_id === groupId),
    [allMembers]
  );

  const getCurrentUsername = useCallback(async () => {
    if (!user?.id) return "user";
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();
    return (
      profile?.display_name ||
      user.user_metadata?.display_name ||
      user.email?.split("@")[0] ||
      `user_${user.id.slice(0, 8)}`
    );
  }, [user]);

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const createGroupMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      if (!user?.id) throw new Error("You need to be signed in.");

      const group: Group = {
        id: uuidv4(),
        name,
        description: description || null,
        created_by: user.id,
        invite_code: generateInviteCode(),
      };
      const memberId = uuidv4();
      const username = await getCurrentUsername();

      const { error: groupErr } = await offlineMutate({
        table: "groups",
        action: "insert",
        recordId: group.id,
        payload: group,
        userId: user.id,
      });
      if (groupErr) throw new Error(groupErr.message || "Failed to create group.");

      const member: GroupMember = { group_id: group.id, user_id: user.id, username };
      const { error: memberErr } = await offlineMutate({
        table: "group_members",
        action: "insert",
        recordId: memberId,
        payload: { id: memberId, ...member },
        userId: user.id,
      });
      if (memberErr) throw new Error(memberErr.message || "Failed to add you to the group.");

      return { group, member };
    },
    onSuccess: ({ group, member }) => {
      queryClient.setQueryData<Group[]>(["groups", user?.id], (old = []) => [...old, group]);
      queryClient.setQueryData<GroupMember[]>(["all-group-members"], (old = []) => [...old, member]);
      toast({ title: "Group created", description: `Share code ${group.invite_code} to invite people.` });
      setIsCreateDialogOpen(false);
      setNewGroupName("");
      setNewGroupDescription("");
      if (navigator.onLine) refetch();
    },
    onError: (err: any) => {
      toast({ title: "Couldn't create group", description: err.message || "Something went wrong.", variant: "destructive" });
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (rawCode: string) => {
      if (!user?.id) throw new Error("You need to be signed in.");
      const code = rawCode.trim().toUpperCase();
      if (!code) throw new Error("Enter an invite code.");

      const { data: group, error: findErr } = await (supabase as any)
        .from("groups")
        .select("*")
        .eq("invite_code", code)
        .maybeSingle();
      if (findErr || !group) throw new Error("No group matches that code.");

      const { data: existing } = await (supabase as any)
        .from("group_members")
        .select("id")
        .eq("group_id", group.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) throw new Error("You're already in this group.");

      const memberId = uuidv4();
      const username = await getCurrentUsername();
      const member: GroupMember = { group_id: group.id, user_id: user.id, username };

      const { error: memberErr } = await offlineMutate({
        table: "group_members",
        action: "insert",
        recordId: memberId,
        payload: { id: memberId, ...member },
        userId: user.id,
      });
      if (memberErr) throw new Error(memberErr.message || "Failed to join group.");

      return { group: group as Group, member };
    },
    onSuccess: ({ group, member }) => {
      queryClient.setQueryData<Group[]>(["groups", user?.id], (old = []) =>
        old.some((g) => g.id === group.id) ? old : [...old, group]
      );
      queryClient.setQueryData<GroupMember[]>(["all-group-members"], (old = []) => [...old, member]);
      toast({ title: "Joined group", description: `You're now in ${group.name}.` });
      setIsCreateDialogOpen(false);
      setJoinCode("");
      if (navigator.onLine) refetch();
    },
    onError: (err: any) => {
      toast({ title: "Couldn't join group", description: err.message || "Something went wrong.", variant: "destructive" });
    },
  });

  const handleRefresh = async () => {
    if (navigator.onLine) await refetch();
    toast({ title: "Refreshed", description: "Groups updated successfully." });
  };

  const navigateToGroup = (groupId: string) => navigate(`/groups/${groupId}`);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = query
      ? groups.filter(
          (g) =>
            g.name.toLowerCase().includes(query) ||
            g.description?.toLowerCase().includes(query)
        )
      : groups;

    result = [...result].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      return getGroupMembers(b.id).length - getGroupMembers(a.id).length;
    });

    return result;
  }, [groups, search, sortKey, getGroupMembers]);

  const totalPeople = useMemo(() => {
    const ids = new Set<string>();
    groups.forEach((g) => getGroupMembers(g.id).forEach((m) => ids.add(m.user_id)));
    return ids.size;
  }, [groups, getGroupMembers]);

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <p className="text-destructive mb-4">{(error as Error).message}</p>
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Groups</h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    {groups.length > 0
                      ? `${groups.length} ${groups.length === 1 ? "group" : "groups"} · ${totalPeople} people`
                      : "Manage expenses with your squads"}
                  </p>
                </div>

                <Dialog
                  open={isCreateDialogOpen}
                  onOpenChange={(open) => {
                    setIsCreateDialogOpen(open);
                    if (!open) {
                      setNewGroupName("");
                      setNewGroupDescription("");
                      setJoinCode("");
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button size="default" className="w-full sm:w-auto shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      New group
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[440px] mx-4 sm:mx-auto">
                    <DialogHeader>
                      <DialogTitle>{activeTab === "create" ? "Create a group" : "Join a group"}</DialogTitle>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "create" | "join")}>
                      <TabsList className="grid grid-cols-2 w-full">
                        <TabsTrigger value="create" className="gap-1.5">
                          <UserPlus className="w-3.5 h-3.5" /> Create
                        </TabsTrigger>
                        <TabsTrigger value="join" className="gap-1.5">
                          <LogIn className="w-3.5 h-3.5" /> Join
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="create" className="space-y-5 pt-4">
                        <div className="space-y-2">
                          <Label>
                            Group name <span className="text-red-500">*</span>
                          </Label>
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
                          <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)} className="order-2 sm:order-1">
                            Cancel
                          </Button>
                          <Button
                            onClick={() => {
                              if (!newGroupName.trim()) {
                                toast({ title: "Group name is required", variant: "destructive" });
                                return;
                              }
                              createGroupMutation.mutate({
                                name: newGroupName.trim(),
                                description: newGroupDescription.trim(),
                              });
                            }}
                            disabled={createGroupMutation.isPending}
                            className="order-1 sm:order-2"
                          >
                            {createGroupMutation.isPending ? "Creating…" : "Create group"}
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="join" className="space-y-5 pt-4">
                        <div className="space-y-2">
                          <Label>Invite code</Label>
                          <Input
                            placeholder="e.g. 7XQF2K9M"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            className="uppercase tracking-widest"
                            maxLength={8}
                          />
                          <p className="text-xs text-muted-foreground">Ask a group member for their invite code.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                          <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)} className="order-2 sm:order-1">
                            Cancel
                          </Button>
                          <Button
                            onClick={() => joinGroupMutation.mutate(joinCode)}
                            disabled={joinGroupMutation.isPending}
                            className="order-1 sm:order-2"
                          >
                            {joinGroupMutation.isPending ? "Joining…" : "Join group"}
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>

              {groups.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search groups…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 pr-9"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2 sm:w-auto">
                        <ArrowUpDown className="w-4 h-4" />
                        {sortKey === "name" ? "Name" : "Most members"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSortKey("name")}>Name</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortKey("members")}>Most members</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {groups.length === 0 ? (
                <Card className="text-center py-12 sm:py-16 border-dashed shadow-sm">
                  <CardContent className="flex flex-col items-center px-4">
                    <div className="bg-muted p-4 rounded-full mb-4">
                      <Users className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-sm mx-auto">
                      Create a group to start splitting bills, or join one with an invite code.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => {
                          setActiveTab("create");
                          setIsCreateDialogOpen(true);
                        }}
                        variant="outline"
                      >
                        Create a group
                      </Button>
                      <Button
                        onClick={() => {
                          setActiveTab("join");
                          setIsCreateDialogOpen(true);
                        }}
                        variant="outline"
                      >
                        Join with code
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : filteredGroups.length === 0 ? (
                <Card className="text-center py-10 border-dashed">
                  <CardContent className="px-4">
                    <p className="text-muted-foreground">No groups match "{search}".</p>
                    <Button variant="link" onClick={() => setSearch("")}>
                      Clear search
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      members={getGroupMembers(group.id)}
                      onOpen={navigateToGroup}
                    />
                  ))}
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