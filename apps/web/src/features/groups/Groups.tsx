import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PullToRefresh } from "@/components/layout/PullToRefresh";
import { Button } from "@/components/ui/button";
import { useGroupsList } from "./hooks/useGroupsList";
import {
  GroupsSkeleton,
  GroupCard,
  CreateOrJoinGroupDialog,
  GroupsSearchBar,
  GroupsEmptyState,
} from "./components";

export * from "./types";

export const Groups = () => {
  const {
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
    isCreating,
    isJoining,
    handleCreateGroup,
    handleJoinGroup,
    handleRefresh,
    navigateToGroup,
    getGroupMembers,
  } = useGroupsList();

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
              {/* Header with Title and Create Dialog */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Groups</h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    {groups.length > 0
                      ? `${groups.length} ${groups.length === 1 ? "group" : "groups"} · ${totalPeople} people`
                      : "Manage expenses with your squads"}
                  </p>
                </div>

                <CreateOrJoinGroupDialog
                  open={isCreateDialogOpen}
                  onOpenChange={(open) => {
                    setIsCreateDialogOpen(open);
                    if (!open) {
                      setNewGroupName("");
                      setNewGroupDescription("");
                      setJoinCode("");
                    }
                  }}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  newGroupName={newGroupName}
                  setNewGroupName={setNewGroupName}
                  newGroupDescription={newGroupDescription}
                  setNewGroupDescription={setNewGroupDescription}
                  joinCode={joinCode}
                  setJoinCode={setJoinCode}
                  isCreating={isCreating}
                  isJoining={isJoining}
                  onCreateGroup={handleCreateGroup}
                  onJoinGroup={handleJoinGroup}
                />
              </div>

              {/* Search and Sort Toolbar */}
              {groups.length > 0 && (
                <GroupsSearchBar
                  search={search}
                  setSearch={setSearch}
                  sortKey={sortKey}
                  setSortKey={setSortKey}
                />
              )}

              {/* Group Cards Grid or Empty States */}
              {groups.length === 0 ? (
                <GroupsEmptyState
                  isSearchEmpty={false}
                  onClearSearch={() => setSearch("")}
                  onCreateGroupClick={() => {
                    setActiveTab("create");
                    setIsCreateDialogOpen(true);
                  }}
                  onJoinGroupClick={() => {
                    setActiveTab("join");
                    setIsCreateDialogOpen(true);
                  }}
                />
              ) : filteredGroups.length === 0 ? (
                <GroupsEmptyState
                  isSearchEmpty={true}
                  searchQuery={search}
                  onClearSearch={() => setSearch("")}
                  onCreateGroupClick={() => {
                    setActiveTab("create");
                    setIsCreateDialogOpen(true);
                  }}
                  onJoinGroupClick={() => {
                    setActiveTab("join");
                    setIsCreateDialogOpen(true);
                  }}
                />
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