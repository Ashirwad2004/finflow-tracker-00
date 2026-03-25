import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { Bell, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

export interface NotificationRecord {
  id: string;
  user_id: string;
  message: string;
  type: string;
  is_read: boolean;
  reference_id: string | null;
  created_at: string;
}

interface NotificationDropdownProps {
  userId: string;
}

export const NotificationDropdown = ({ userId }: NotificationDropdownProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      try {
        // Trigger evaluation of overdue notifications for the current user
        // We do this before fetching to ensure the user sees the latest overdue alerts.
        await supabase.rpc('generate_overdue_notifications');
      } catch (err) {
        console.error("Failed to generate overdue notifications:", err);
      }

      // @ts-ignore: types.ts not yet updated
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as NotificationRecord[];
    },
    enabled: !!userId,
    refetchInterval: 60000, // Refetch every minute
  });

  // Subscribe to real-time notification inserts
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      // @ts-ignore: types.ts not yet updated
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      // @ts-ignore: types.ts not yet updated
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      setOpen(false);
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 px-1 min-w-[1.25rem] h-5 flex items-center justify-center text-[10px] animate-in zoom-in"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 border-border/50 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-2">
            <DropdownMenuLabel className="p-0 font-semibold text-sm">Notifications</DropdownMenuLabel>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                markAllAsRead.mutate();
              }}
            >
              <Check className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="max-h-[350px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <Bell className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">All caught up!</p>
              <p className="text-xs text-muted-foreground">No new notifications</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`flex items-start gap-3 p-4 border-b border-border/50 transition-all hover:bg-muted/50 cursor-pointer ${!notification.is_read ? 'bg-primary/5 hover:bg-primary/10' : ''}`}
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsRead.mutate(notification.id);
                    }
                  }}
                >
                  <div className="mt-1 flex-shrink-0">
                    {notification.type.includes('overdue') ? (
                      <div className={`p-1.5 rounded-full ${!notification.is_read ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                        <AlertCircle className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className={`w-2 h-2 mt-1.5 rounded-full ${!notification.is_read ? 'bg-primary' : 'bg-transparent'}`} />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className={`text-sm leading-snug ${!notification.is_read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
