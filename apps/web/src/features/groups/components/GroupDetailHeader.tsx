import React from "react";
import { ArrowLeft, FileDown, Loader2, Link, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface GroupDetailHeaderProps {
  groupName?: string;
  groupDescription?: string;
  membersCount: number;
  isCreator: boolean;
  isExporting: boolean;
  onBack: () => void;
  onExportPDF: () => void;
  onOpenInvite: () => void;
  onDeleteGroup: () => void;
}

export function GroupDetailHeader({
  groupName,
  groupDescription,
  membersCount,
  isCreator,
  isExporting,
  onBack,
  onExportPDF,
  onOpenInvite,
  onDeleteGroup,
}: GroupDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2" aria-label="Back to groups">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">{groupName}</h1>
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
              {membersCount} members
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{groupDescription || "No description"}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {/* Action Buttons */}
        <Button variant="outline" size="sm" onClick={onExportPDF} disabled={isExporting}>
          {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
          PDF
        </Button>

        {isCreator && (
          <>
            <Button variant="outline" size="sm" onClick={onOpenInvite}>
              <Link className="w-4 h-4 mr-2" /> Invite
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteGroup}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
}
