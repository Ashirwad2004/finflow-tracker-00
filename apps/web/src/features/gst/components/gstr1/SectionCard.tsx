import React, { useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";

interface SectionCardProps {
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
    badge?: string;
    color: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export const SectionCard: React.FC<SectionCardProps> = ({
    title,
    subtitle,
    icon: Icon,
    count,
    badge,
    color,
    children,
    defaultOpen = true,
}) => {
    const [open, setOpen] = useState(defaultOpen);

    const iconBg = color
        .replace("border-l-", "bg-")
        .replace("-500", "-100")
        .replace("-600", "-100");
    const iconText = color.replace("border-l-", "text-").replace("-[", "[");

    return (
        <Card className={`border-l-4 ${color}`}>
            <CardHeader
                className="py-4 cursor-pointer select-none"
                onClick={() => setOpen((v) => !v)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className={`h-9 w-9 rounded-lg flex items-center justify-center ${iconBg} dark:bg-opacity-20`}
                        >
                            <Icon className={`w-4 h-4 ${iconText}`} />
                        </div>
                        <div>
                            <CardTitle className="text-base">{title}</CardTitle>
                            <CardDescription className="text-xs mt-0.5">{subtitle}</CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {badge}
                            </span>
                        )}
                        <Badge variant="secondary" className="font-semibold">
                            {count} record{count !== 1 ? "s" : ""}
                        </Badge>
                        {open ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                    </div>
                </div>
            </CardHeader>
            {open && <CardContent className="p-0 pb-2">{children}</CardContent>}
        </Card>
    );
};
