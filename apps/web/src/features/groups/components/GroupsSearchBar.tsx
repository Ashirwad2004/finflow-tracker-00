import React from "react";
import { Search, X, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SortKey } from "../types";

interface GroupsSearchBarProps {
  search: string;
  setSearch: (search: string) => void;
  sortKey: SortKey;
  setSortKey: (key: SortKey) => void;
}

export function GroupsSearchBar({
  search,
  setSearch,
  sortKey,
  setSortKey,
}: GroupsSearchBarProps) {
  return (
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
  );
}
