import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User, Briefcase, Check } from "lucide-react";

interface OnboardingDialogProps {
    open: boolean;
    onSelect: (mode: 'personal' | 'business') => void;
}

export const OnboardingDialog = ({ open, onSelect }: OnboardingDialogProps) => {
    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-2xl [&>button]:hidden">
                <DialogHeader className="text-center pb-4">
                    <DialogTitle className="text-3xl font-bold mb-2">Welcome to FinFlow!</DialogTitle>
                    <DialogDescription className="text-lg">
                        How are you planning to use this application?
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6">
                    {/* Personal Option */}
                    <div
                        className="group relative flex flex-col items-center p-8 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-accent/50 cursor-pointer transition-all duration-300"
                        onClick={() => onSelect('personal')}
                    >
                        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Personal Use</h3>
                        <p className="text-center text-muted-foreground text-sm">
                            Track personal expenses, split bills with friends, and manage your budget.
                        </p>
                        <Button className="mt-6 w-full" variant="outline">Select Personal</Button>
                    </div>

                    {/* Business Option */}
                    <div
                        className="group relative flex flex-col items-center p-8 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-accent/50 cursor-pointer transition-all duration-300"
                        onClick={() => onSelect('business')}
                    >
                        <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <Briefcase className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Business Use</h3>
                        <p className="text-center text-muted-foreground text-sm">
                            Manage inventory, sales, invoices, and track business growth.
                        </p>
                        <Button className="mt-6 w-full" variant="default">Select Business</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
