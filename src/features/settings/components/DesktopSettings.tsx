import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Monitor, DownloadCloud, Loader2, PlaySquare } from "lucide-react";
import { toast } from "sonner";

export const DesktopSettings = () => {
    const [isDesktop, setIsDesktop] = useState(false);
    const [autoStart, setAutoStart] = useState(false);
    const [checkingUpdate, setCheckingUpdate] = useState(false);

    useEffect(() => {
        // Only run Tauri checks if we are inside the Tauri wrapper.
        const initDesktop = async () => {
            if (isTauri()) {
                setIsDesktop(true);
                try {
                    const enabled = await isEnabled();
                    setAutoStart(enabled);
                } catch (e) {
                    console.error("Autostart error:", e);
                }
            }
        };
        initDesktop();
    }, []);

    const handleAutoStartToggle = async (checked: boolean) => {
        try {
            if (checked) {
                await enable();
            } else {
                await disable();
            }
            setAutoStart(checked);
            toast.success(checked ? "FinFlow will now launch on system startup." : "Auto-launch disabled.");
        } catch (error) {
            toast.error("Failed to change auto-start preferences.");
            console.error(error);
        }
    };

    const handleCheckUpdate = async () => {
        setCheckingUpdate(true);
        try {
            const update = await check();
            if (update) {
                toast.success(`Update found: v${update.version}. Downloading...`);
                await update.downloadAndInstall();
                toast.success("Ready to restart and apply update!");
                await relaunch();
            } else {
                toast.info("You are on the latest version of FinFlow.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Could not check for updates. Make sure you are connected to the internet.");
        } finally {
            setCheckingUpdate(false);
        }
    };

    if (!isDesktop) return null;

    return (
        <Card className="border-primary/20 shadow-md rounded-md">
            <CardHeader className="bg-primary/5 p-4 pb-2">
                <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">Desktop Preferences</CardTitle>
                </div>
                <CardDescription className="text-xs">
                    Manage FinFlow native application settings.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-2">
                <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-1">
                        <Label htmlFor="auto-start" className="text-sm font-semibold flex items-center gap-2">
                            <PlaySquare className="w-4 h-4 text-muted-foreground" /> 
                            Launch on System Startup
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                            Automatically open FinFlow in the background when your computer boots.
                        </p>
                    </div>
                    <Switch
                        id="auto-start"
                        checked={autoStart}
                        onCheckedChange={handleAutoStartToggle}
                        className="scale-90"
                    />
                </div>

                <div className="flex items-center justify-between space-x-2 border-t pt-4">
                    <div className="space-y-1">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                            <DownloadCloud className="w-4 h-4 text-muted-foreground" /> 
                            Software Updates
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                            Check for new features, bug fixes, and performance improvements.
                        </p>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleCheckUpdate} 
                        disabled={checkingUpdate}
                    >
                        {checkingUpdate ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Checking...
                            </>
                        ) : "Check for Updates"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
