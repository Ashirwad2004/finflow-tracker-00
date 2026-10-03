import React from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, Settings } from "lucide-react";

interface DashboardSummaryHeaderProps {
    displayName?: string;
    onOpenGroups: () => void;
    onOpenSettings: () => void;
}

export function DashboardSummaryHeader({
    displayName = "User",
    onOpenGroups,
    onOpenSettings,
}: DashboardSummaryHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
                <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    Personal Dashboard
                </h1>
                <p className="text-muted-foreground text-sm">
                    Welcome back, {displayName}!
                </p>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenGroups}
                    className="flex items-center gap-2"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>Groups</span>
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onOpenSettings}
                    aria-label="Settings"
                >
                    <Settings className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
