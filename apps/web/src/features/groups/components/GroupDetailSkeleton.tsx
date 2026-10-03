import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const GroupDetailSkeleton = () => (
  <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-4xl space-y-6">
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
    <Skeleton className="h-10 w-full" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  </div>
);
