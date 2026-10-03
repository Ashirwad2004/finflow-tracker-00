import React from "react";
import { Plus, UserPlus, LogIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface CreateOrJoinGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: "create" | "join";
  setActiveTab: (tab: "create" | "join") => void;
  newGroupName: string;
  setNewGroupName: (name: string) => void;
  newGroupDescription: string;
  setNewGroupDescription: (desc: string) => void;
  joinCode: string;
  setJoinCode: (code: string) => void;
  isCreating: boolean;
  isJoining: boolean;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
}

export function CreateOrJoinGroupDialog({
  open,
  onOpenChange,
  activeTab,
  setActiveTab,
  newGroupName,
  setNewGroupName,
  newGroupDescription,
  setNewGroupDescription,
  joinCode,
  setJoinCode,
  isCreating,
  isJoining,
  onCreateGroup,
  onJoinGroup,
}: CreateOrJoinGroupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="default" className="w-full sm:w-auto shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          New group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>{activeTab === "create" ? "Create a group" : "Join a group"}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "create" | "join")}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="create" className="gap-1.5">
              <UserPlus className="w-3.5 h-3.5" /> Create
            </TabsTrigger>
            <TabsTrigger value="join" className="gap-1.5">
              <LogIn className="w-3.5 h-3.5" /> Join
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label>
                Group name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Goa Trip, Roommates"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="What's this group for?"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                className="resize-none min-h-[80px]"
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="order-2 sm:order-1">
                Cancel
              </Button>
              <Button
                onClick={onCreateGroup}
                disabled={isCreating}
                className="order-1 sm:order-2"
              >
                {isCreating ? "Creating…" : "Create group"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="join" className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label>Invite code</Label>
              <Input
                placeholder="e.g. 7XQF2K9M"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="uppercase tracking-widest"
                maxLength={8}
              />
              <p className="text-xs text-muted-foreground">Ask a group member for their invite code.</p>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="order-2 sm:order-1">
                Cancel
              </Button>
              <Button
                onClick={onJoinGroup}
                disabled={isJoining}
                className="order-1 sm:order-2"
              >
                {isJoining ? "Joining…" : "Join group"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
