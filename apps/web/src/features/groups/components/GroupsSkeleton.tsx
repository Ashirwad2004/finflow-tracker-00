import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardFooter } from "@/components/ui/card";

export const GroupsSkeleton = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="flex gap-3">
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 w-28" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardFooter className="pt-2">
            <div className="flex items-center justify-between w-full">
              <div className="flex -space-x-3">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="w-9 h-9 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  </div>
);
