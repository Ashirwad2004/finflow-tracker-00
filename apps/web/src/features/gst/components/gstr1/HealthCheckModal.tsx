import React from "react";
import { ListChecks, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HealthCheckModalProps {
    open: boolean;
    onClose: () => void;
    errors: string[];
}

export const HealthCheckModal: React.FC<HealthCheckModalProps> = ({ open, onClose, errors }) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <ListChecks className="w-5 h-5 text-blue-600" />
                    Pre-Validation Health Check
                </h3>
                <div className="max-h-[60vh] overflow-y-auto space-y-2 mb-6">
                    {errors.map((err, i) => (
                        <div
                            key={i}
                            className={`p-3 rounded-lg text-sm flex gap-2 ${
                                err.includes("No anomalies")
                                    ? "bg-green-50 text-green-700"
                                    : "bg-red-50 text-red-700"
                            }`}
                        >
                            {err.includes("No anomalies") ? (
                                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                            ) : (
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            )}
                            <span>{err}</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end">
                    <Button onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};
