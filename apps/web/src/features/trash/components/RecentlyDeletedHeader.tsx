import React from "react";
import { Clock, CheckSquare, Square, Trash2 } from "lucide-react";
import {
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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

interface RecentlyDeletedHeaderProps {
  hasItems: boolean;
  isAllSelected: boolean;
  selectedCount: number;
  onToggleAll: () => void;
  onConfirmDelete: () => void;
}

export function RecentlyDeletedHeader({
  hasItems,
  isAllSelected,
  selectedCount,
  onToggleAll,
  onConfirmDelete,
}: RecentlyDeletedHeaderProps) {
  return (
    <CardHeader className="pb-3 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Clock className="w-5 h-5 text-muted-foreground" />
            History & Bin
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Manage locally stored deleted items.
          </CardDescription>
        </div>

        {hasItems && (
          <div className="flex w-full sm:w-auto gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleAll}
              className="flex-1 sm:flex-none"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 mr-1" />
              ) : (
                <Square className="w-4 h-4 mr-1" />
              )}
              <span className="sr-only sm:not-sr-only">
                {isAllSelected ? "Deselect" : "Select All"}
              </span>
              <span className="sm:hidden">{isAllSelected ? "None" : "All"}</span>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={selectedCount === 0}
                  className="flex-1 sm:flex-none"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete {selectedCount > 0 && `(${selectedCount})`}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. These items will be permanently removed from your local history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onConfirmDelete}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Delete Forever
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </CardHeader>
  );
}
