import React from "react";
import { IndianRupee, PieChart, Check, CheckCircle2, Loader2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Member, SettlementItem } from "../types";

interface GroupOverviewTabProps {
  myBalance: number;
  settlements: SettlementItem[];
  memberBalances: Member[];
  currentMemberUsername?: string;
  isRecordingSettlement: boolean;
  onRecordSettlement: (settlement: SettlementItem) => void;
}

export function GroupOverviewTab({
  myBalance,
  settlements,
  memberBalances,
  currentMemberUsername,
  isRecordingSettlement,
  onRecordSettlement,
}: GroupOverviewTabProps) {
  const avatarColors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500"];
  const getAvatarColor = (name: string) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      {/* My Balance Card */}
      <Card className="bg-gradient-primary text-primary-foreground border-0 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <IndianRupee className="w-32 h-32" />
        </div>
        <CardHeader className="pb-2">
          <CardDescription className="text-primary-foreground/80">My Position</CardDescription>
          <CardTitle className="text-4xl font-bold flex items-center">
            {myBalance > 0 ? "+" : ""}{Number(myBalance).toFixed(0)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm opacity-90">
            {myBalance > 0.01
              ? "You are owed money overall."
              : myBalance < -0.01
                ? "You owe money to the group."
                : "You are all settled up!"}
          </p>
        </CardContent>
      </Card>

      {/* Settlements */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <PieChart className="w-5 h-5 opacity-70" /> Suggested Settlements
        </h3>
        {settlements.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground border-dashed">
            <Check className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No debts pending.
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {settlements.map((s) => (
              <Card key={`${s.from_user_id}-${s.to_user_id}`} className="flex items-center justify-between p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border-2 border-background">
                    <AvatarFallback className={getAvatarColor(s.from)}></AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <span className="font-semibold">{s.from === currentMemberUsername ? "You" : s.from}</span>
                    <span className="text-muted-foreground mx-1">owes</span>
                    <span className="font-semibold">{s.to === currentMemberUsername ? "You" : s.to}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-bold text-red-500 mr-1">₹{s.amount.toFixed(0)}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRecordSettlement(s)}
                    disabled={isRecordingSettlement}
                  >
                    {isRecordingSettlement ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                    Paid
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Members Balances List */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 opacity-70" /> Member Balances
        </h3>
        <Card>
          <CardContent className="p-0">
            {memberBalances.map((m, idx) => (
              <div key={m.user_id} className={`flex items-center justify-between p-4 ${idx !== memberBalances.length - 1 ? "border-b" : ""}`}>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className={`${getAvatarColor(m.username)} text-white`}>
                      {m.username.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{m.username}</span>
                </div>
                <span className={`font-bold ${(m.balance ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {(m.balance ?? 0) >= 0 ? "+" : ""}{(m.balance ?? 0).toFixed(0)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
