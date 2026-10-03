import React, { useState } from "react";
import { ArrowRight, Copy, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { toast } from "@/core/hooks/use-toast";
import { Group, GroupMember } from "../types";

const AVATAR_PALETTE = [
  { bg: "bg-rose-100", text: "text-rose-700", ring: "ring-rose-200" },
  { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-200" },
  { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-200" },
  { bg: "bg-sky-100", text: "text-sky-700", ring: "ring-sky-200" },
  { bg: "bg-violet-100", text: "text-violet-700", ring: "ring-violet-200" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700", ring: "ring-fuchsia-200" },
  { bg: "bg-teal-100", text: "text-teal-700", ring: "ring-teal-200" },
  { bg: "bg-orange-100", text: "text-orange-700", ring: "ring-orange-200" },
];

const hashString = (input: string) =>
  input.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

const paletteFor = (seed: string) =>
  AVATAR_PALETTE[hashString(seed) % AVATAR_PALETTE.length];

const getInitials = (label: string | null) => {
  if (!label) return "?";
  const parts = label.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const MemberAvatar = ({ member, size = "md" }: { member: GroupMember; size?: "sm" | "md" }) => {
  const palette = paletteFor(member.username || member.user_id);
  const dims = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  return (
    <div
      className={`${dims} rounded-full ${palette.bg} ${palette.text} border-2 border-card flex items-center justify-center font-semibold shadow-sm z-0 hover:z-10 hover:scale-110 transition-transform`}
      title={member.username || "Member"}
    >
      {getInitials(member.username)}
    </div>
  );
};

export const GroupIcon = ({ group }: { group: Group }) => {
  const palette = paletteFor(group.id);
  return (
    <div
      className={`w-11 h-11 rounded-xl ${palette.bg} ${palette.text} flex items-center justify-center font-bold text-base shrink-0`}
    >
      {getInitials(group.name)}
    </div>
  );
};

export const InviteCodeChip = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({ title: "Invite code copied", description: `Share ${code} to add people.` });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Couldn't copy", description: "Copy the code manually instead.", variant: "destructive" });
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 hover:bg-muted px-2 py-1 rounded-md transition-colors"
      aria-label={`Copy invite code ${code}`}
    >
      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
      {code}
    </button>
  );
};

interface GroupCardProps {
  group: Group;
  members: GroupMember[];
  onOpen: (id: string) => void;
}

export const GroupCard = ({ group, members, onOpen }: GroupCardProps) => {
  const displayMembers = members.slice(0, 4);
  const remainingCount = members.length - 4;

  return (
    <Card
      onClick={() => onOpen(group.id)}
      className="group relative cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 overflow-hidden active:scale-[0.98]"
    >
      <CardHeader className="pb-3 px-4 sm:px-6">
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <GroupIcon group={group} />
            <div className="flex-1 min-w-0 pt-0.5">
              <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors truncate">
                {group.name}
              </CardTitle>
              {group.description && (
                <CardDescription className="line-clamp-1 mt-1 text-sm">
                  {group.description}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="p-2 bg-muted/50 rounded-full group-hover:bg-primary/10 transition-colors flex-shrink-0">
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
          </div>
        </div>
      </CardHeader>

      <CardFooter className="pt-2 px-4 sm:px-6 flex-col items-stretch gap-3">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center -space-x-2 sm:-space-x-3">
            {displayMembers.map((member) => (
              <MemberAvatar key={member.user_id} member={member} />
            ))}
            {remainingCount > 0 && (
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-medium text-muted-foreground z-0">
                +{remainingCount}
              </div>
            )}
          </div>
          <div className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
            {members.length} {members.length === 1 ? "member" : "members"}
          </div>
        </div>
        <div className="flex justify-start">
          <InviteCodeChip code={group.invite_code} />
        </div>
      </CardFooter>
    </Card>
  );
};
