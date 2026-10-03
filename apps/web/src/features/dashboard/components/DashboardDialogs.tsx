import React from "react";
import { AddExpenseDialog } from "@/features/expenses/components/AddExpenseDialog";
import { EditExpenseDialog } from "@/features/expenses/components/EditExpenseDialog";
import { LentMoneyDialog } from "@/features/loans/components/LentMoneyDialog";
import { BorrowedMoneyDialog } from "@/features/loans/components/BorrowedMoneyDialog";
import { SettingsDialog } from "@/features/settings/components/SettingsDialog";
import { OnboardingDialog } from "@/features/settings/components/OnboardingDialog";
import { BusinessDetailsDialog } from "@/features/settings/components/BusinessDetailsDialog";

interface DashboardDialogsProps {
    userId: string;
    categories: any[];
    isAddDialogOpen: boolean;
    setIsAddDialogOpen: (open: boolean) => void;
    expenseToEdit: any;
    setExpenseToEdit: (expense: any) => void;
    isLentMoneyDialogOpen: boolean;
    setIsLentMoneyDialogOpen: (open: boolean) => void;
    isBorrowedMoneyDialogOpen: boolean;
    setIsBorrowedMoneyDialogOpen: (open: boolean) => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (open: boolean) => void;
    showOnboarding: boolean;
    onSelectOnboarding: (mode: "personal" | "business") => void;
    showBusinessDetails: boolean;
    setShowBusinessDetails: (open: boolean) => void;
}

export function DashboardDialogs({
    userId,
    categories,
    isAddDialogOpen,
    setIsAddDialogOpen,
    expenseToEdit,
    setExpenseToEdit,
    isLentMoneyDialogOpen,
    setIsLentMoneyDialogOpen,
    isBorrowedMoneyDialogOpen,
    setIsBorrowedMoneyDialogOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    showOnboarding,
    onSelectOnboarding,
    showBusinessDetails,
    setShowBusinessDetails,
}: DashboardDialogsProps) {
    return (
        <>
            <AddExpenseDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                categories={categories}
                userId={userId}
            />

            <EditExpenseDialog
                open={!!expenseToEdit}
                onOpenChange={(open) => !open && setExpenseToEdit(null)}
                expense={expenseToEdit}
                categories={categories}
            />

            <LentMoneyDialog
                open={isLentMoneyDialogOpen}
                onOpenChange={setIsLentMoneyDialogOpen}
                userId={userId}
            />

            <BorrowedMoneyDialog
                open={isBorrowedMoneyDialogOpen}
                onOpenChange={setIsBorrowedMoneyDialogOpen}
                userId={userId}
            />

            <SettingsDialog
                open={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
            />

            <OnboardingDialog
                open={showOnboarding}
                onSelect={onSelectOnboarding}
            />

            <BusinessDetailsDialog
                open={showBusinessDetails}
                onOpenChange={setShowBusinessDetails}
            />
        </>
    );
}
