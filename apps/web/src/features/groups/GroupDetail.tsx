import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroupExpenseDialog } from "@/features/groups/GroupExpenseDialog";
import { useGroupDetail } from "./hooks/useGroupDetail";
import {
  GroupDetailHeader,
  GroupOverviewTab,
  GroupExpensesTab,
  GroupInviteDialog,
  GroupDetailSkeleton,
} from "./components";

export * from "./types";

export const GroupDetail = () => {
  const {
    groupId,
    user,
    navigate,
    group,
    members,
    expenses,
    categories,
    settlements,
    memberBalances,
    myBalance,
    totalExpenses,
    isMember,
    isCreator,
    currentMember,
    isLoading,
    isAddExpenseOpen,
    setIsAddExpenseOpen,
    isInviteDialogOpen,
    setIsInviteDialogOpen,
    copied,
    isExporting,
    handleExportPDF,
    copyInviteLink,
    recordSettlement,
    deleteExpense,
    deleteGroup,
  } = useGroupDetail();

  if (isLoading) {
    return (
      <AppLayout>
        <GroupDetailSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-5xl h-full flex flex-col">
        {/* Header */}
        <GroupDetailHeader
          groupName={group?.name}
          groupDescription={group?.description}
          membersCount={members.length}
          isCreator={isCreator}
          isExporting={isExporting}
          onBack={() => navigate("/groups")}
          onExportPDF={handleExportPDF}
          onOpenInvite={() => setIsInviteDialogOpen(true)}
          onDeleteGroup={() => deleteGroup.mutate()}
        />

        {/* Tabs Layout */}
        <Tabs defaultValue="overview" className="flex-1 flex flex-col">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <GroupOverviewTab
              myBalance={myBalance}
              settlements={settlements}
              memberBalances={memberBalances}
              currentMemberUsername={currentMember?.username}
              isRecordingSettlement={recordSettlement.isPending}
              onRecordSettlement={(s) => recordSettlement.mutate(s)}
            />
          </TabsContent>

          <TabsContent value="expenses">
            <GroupExpensesTab
              expenses={expenses}
              totalExpenses={totalExpenses}
              isMember={isMember}
              membersCount={members.length}
              currentUserId={user?.id}
              onOpenAddExpense={() => setIsAddExpenseOpen(true)}
              onDeleteExpense={(id) => deleteExpense.mutate(id)}
            />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <GroupExpenseDialog
          open={isAddExpenseOpen}
          onOpenChange={setIsAddExpenseOpen}
          groupId={groupId!}
          members={members}
          categories={categories}
          userId={user?.id!}
          currentMemberUsername={currentMember?.username}
        />

        <GroupInviteDialog
          open={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
          inviteCode={group?.invite_code}
          copied={copied}
          onCopy={copyInviteLink}
        />
      </div>
    </AppLayout>
  );
};

export default GroupDetail;