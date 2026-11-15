"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, User, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/contexts/AuthContext";
import { DeskhauntMark } from "@/components/shared/deskhaunt-mark";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDisplayName, getInitials } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/constants/brand";

export default function NavBar() {
  const { user, profile, isAdmin, signOut } = useAuth();

  const displayName = getDisplayName(
    profile?.first_name,
    profile?.last_name,
    profile?.tag,
    user?.email
  );

  const avatarUrl =
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    undefined;

  const initials = !avatarUrl ? getInitials(displayName) : undefined;

  return (
    <nav className="sticky top-0 z-50 flex h-(--app-nav-height) items-center justify-between bg-card px-3 shadow-xs shadow-black/10 sm:px-6 dark:shadow-black/25">
      <Link href="/" aria-label={`${BRAND_NAME} home`} className="keyboard-focus flex min-h-11 min-w-0 items-center gap-1.5 rounded-md px-1 text-sm font-semibold text-foreground hover:text-primary">
        <DeskhauntMark />
        <span className="truncate">{BRAND_NAME}</span>
      </Link>
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon-lg"
                className="size-11"
                aria-label="Add workspace"
                asChild
              >
                <Link href="/add-workspace">
                  <Plus className="h-6 w-6" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add Workspace</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div aria-hidden="true" className="hidden h-5 w-px bg-border sm:block" />
        <ThemeToggle />
        <div aria-hidden="true" className="hidden h-5 w-px bg-border sm:block" />
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-lg" className="size-11" aria-label="User menu">
                <User className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="flex items-center gap-3 px-3 py-2">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-tight">{displayName}</span>
                  {profile?.tag && (
                    <span className="text-xs text-muted-foreground leading-tight">@{profile.tag}</span>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/admin/workspaces">Admin</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/saved">Saved</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="ghost" size="icon-lg" className="size-11" asChild aria-label="Sign in">
            <Link href="/login">
              <User className="h-6 w-6" />
            </Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
