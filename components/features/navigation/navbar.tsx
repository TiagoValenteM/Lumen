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
import { Globe, Plus, User, MapPin, Loader2, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLocation } from "@/contexts/LocationContext";
import { useAuth } from "@/contexts/AuthContext";
import { CoffeeLogo } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDisplayName, getInitials } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";

export default function NavBar() {
  const { latitude, longitude, error, loading, requestLocation } = useLocation();
  const { user, signOut } = useAuth();
  const { profile } = useProfile(user?.id);

  const displayName = getDisplayName(
    profile?.first_name,
    profile?.last_name,
    profile?.tag,
    profile?.email || user?.email
  );

  const avatarUrl =
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    undefined;

  const initials = !avatarUrl ? getInitials(displayName) : undefined;

  const handleLocationClick = () => {
    requestLocation();
  };

  const getLocationTooltip = () => {
    if (loading) return "Getting location...";
    if (error) return error;
    if (latitude && longitude) return `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    return "Click to get your location";
  };

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 h-14 border-b bg-background">
      <Link href="/" className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
        <CoffeeLogo className="h-6 w-6" />
        <span>Lumen</span>
      </Link>
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="Cities"
                asChild
              >
                <Link href="/cities">
                  <Globe className="h-6 w-6" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Browse Cities</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="h-6 w-px bg-border" />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="Get location"
                onClick={handleLocationClick}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : latitude && longitude ? (
                  <MapPin className="h-6 w-6" />
                ) : (
                  <MapPin className="h-6 w-6 opacity-50" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getLocationTooltip()}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="h-6 w-px bg-border" />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
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
        <div className="h-6 w-px bg-border" />
        <ThemeToggle />
        <div className="h-6 w-px bg-border" />
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="User menu">
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
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Saved Places</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="ghost" size="icon" asChild aria-label="Sign in">
            <Link href="/login">
              <User className="h-6 w-6" />
            </Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
