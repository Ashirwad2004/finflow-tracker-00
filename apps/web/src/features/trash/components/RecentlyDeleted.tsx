import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2 } from "lucide-react";
import { useRecentlyDeleted } from "../hooks/useRecentlyDeleted";
import { RecentlyDeletedHeader } from "./RecentlyDeletedHeader";
import { DeletedItemRow } from "./DeletedItemRow";

export interface RecentlyDeletedProps {
  userId: string;
  currencyCode?: string;
  onClose?: () => void;
}

export const RecentlyDeleted = ({
  userId,
  currencyCode = "INR",
  onClose,
}: RecentlyDeletedProps) => {
  const {
    deletedItems,
    selectedIds,
    restoringId,
    hasItems,
    isAllSelected,
    getKey,
    toggleSelect,
    toggleAll,
    deleteMutation,
    handleRestore,
  } = useRecentlyDeleted(userId);

  return (
    <Card className="w-full h-full flex flex-col shadow-sm border-dashed">
      <RecentlyDeletedHeader
        hasItems={hasItems}
        isAllSelected={isAllSelected}
        selectedCount={selectedIds.size}
        onToggleAll={toggleAll}
        onConfirmDelete={() => deleteMutation.mutate()}
      />

      <CardContent className="flex-1 p-0 overflow-hidden relative">
        <ScrollArea className="h-[60vh] sm:h-[500px] px-4 md:px-6">
          {!hasItems ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground gap-3">
              <div className="bg-muted p-4 rounded-full">
                <Trash2 className="w-8 h-8 opacity-40" />
              </div>
              <div className="text-center">
                <p className="font-medium">No deleted items</p>
                <p className="text-sm opacity-70">Items deleted recently will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 py-2 pb-6">
              {deletedItems.map((item) => (
                <DeletedItemRow
                  key={getKey(item)}
                  item={item}
                  currencyCode={currencyCode}
                  isSelected={selectedIds.has(getKey(item))}
                  isRestoring={restoringId === item.id}
                  onToggle={() => toggleSelect(getKey(item))}
                  onRestore={() => handleRestore(item)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RecentlyDeleted;