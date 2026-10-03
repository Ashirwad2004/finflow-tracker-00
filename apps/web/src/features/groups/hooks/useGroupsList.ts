import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { offlineMutate } from "@/core/offline/apiService";
import { v4 as uuidv4 } from "uuid";
import { toast } from "@/core/hooks/use-toast";
import { Group, GroupMember, SortKey } from "../types";

const generateInviteCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export function useGroupsList() {
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

      const { data: groupList, error: findErr } = await (supabase as any)
        .rpc("get_group_by_invite_code", {
          p_invite_code: code,
        });
      const group = Array.isArray(groupList) && groupList.length > 0 ? groupList[0] : null;
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

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      toast({ title: "Group name is required", variant: "destructive" });
      return;
    }
    createGroupMutation.mutate({
      name: newGroupName.trim(),
      description: newGroupDescription.trim(),
    });
  };

  const handleJoinGroup = () => {
    joinGroupMutation.mutate(joinCode);
  };

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

  return {
    groups,
    filteredGroups,
    totalPeople,
    isLoading,
    error,
    refetch,
    search,
    setSearch,
    sortKey,
    setSortKey,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    activeTab,
    setActiveTab,
    newGroupName,
    setNewGroupName,
    newGroupDescription,
    setNewGroupDescription,
    joinCode,
    setJoinCode,
    isCreating: createGroupMutation.isPending,
    isJoining: joinGroupMutation.isPending,
    handleCreateGroup,
    handleJoinGroup,
    handleRefresh,
    navigateToGroup,
    getGroupMembers,
  };
}
