import React from "react";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GroupsEmptyStateProps {
  isSearchEmpty: boolean;
  searchQuery?: string;
  onClearSearch: () => void;
  onCreateGroupClick: () => void;
  onJoinGroupClick: () => void;
}

export function GroupsEmptyState({
  isSearchEmpty,
  searchQuery,
  onClearSearch,
  onCreateGroupClick,
  onJoinGroupClick,
}: GroupsEmptyStateProps) {
  if (isSearchEmpty) {
    return (
      <Card className="text-center py-10 border-dashed">
        <CardContent className="px-4">
          <p className="text-muted-foreground">No groups match "{searchQuery}".</p>
          <Button variant="link" onClick={onClearSearch}>
            Clear search
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
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
          <Button onClick={onCreateGroupClick} variant="outline">
            Create a group
          </Button>
          <Button onClick={onJoinGroupClick} variant="outline">
            Join with code
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
