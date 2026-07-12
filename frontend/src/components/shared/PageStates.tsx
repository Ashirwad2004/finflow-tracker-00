import { PackageOpen, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/core/lib/utils";

export function TableLoadingRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <tr key={i}>
                    {Array.from({ length: cols }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-full max-w-[120px]" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}

export function PageEmptyState({
    title,
    description,
    className,
}: {
    title: string;
    description?: string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center py-16 px-6 text-center rounded-xl border border-dashed bg-muted/30",
                className
            )}
        >
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <PackageOpen className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">{title}</p>
            {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
        </div>
    );
}

export function InlineLoader({ label = "Loading…" }: { label?: string }) {
    return (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">{label}</span>
        </div>
    );
}
