import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useAIAssistant } from "@/contexts/AIAssistantContext";
import { useTotalUnreadCount } from "@/integrations/supabase/hooks/useConversations";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminNotificationBell } from "@/components/notifications/AdminNotificationBell";
import { SessionTimer } from "@/components/session/SessionTimer";
import { GlobalCommandPalette } from "./GlobalCommandPalette";
import {
  User,
  LogOut,
  MessageCircle,
  MessageSquareText,
  Search,
} from "lucide-react";
import { useState } from "react";

export function NavigationHeader() {
  const { user, signOut } = useAuth();
  const { isAdmin, isManager } = useUserRole();
  const { toggleOpen, messages } = useAIAssistant();
  const { data: unreadCount = 0 } = useTotalUnreadCount();
  const [commandOpen, setCommandOpen] = useState(false);

  const hasUnread =
    messages.length > 0 && messages[messages.length - 1].role === "assistant";

  return (
    <>
      <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b bg-background px-3">
        {/* Sidebar toggle */}
        <SidebarTrigger className="-ml-1" />

        <div className="h-5 w-px bg-border" />

        {/* Search trigger */}
        <Button
          variant="ghost"
          size="sm"
          className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-foreground h-8 px-3"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="h-4 w-4" />
          <span className="text-xs">Search…</span>
          <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            ⌘K
          </kbd>
        </Button>
        {/* Mobile search icon */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden h-8 w-8 text-muted-foreground"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Messages */}
          <Link to="/messages">
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <MessageSquareText className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-medium">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </Link>

          {/* AI Assistant */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleOpen}
            className="relative h-8 w-8"
          >
            <MessageCircle className="h-4 w-4" />
            {hasUnread && (
              <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
            )}
          </Button>

          {/* Session Timer */}
          <div className="hidden md:block">
            <SessionTimer />
          </div>

          {/* Notifications */}
          {(isAdmin || isManager) && <AdminNotificationBell />}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? "Administrator" : isManager ? "Manager" : "User"}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/activity-history">Activity History</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <GlobalCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
