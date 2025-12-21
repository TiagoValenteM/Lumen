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
import { Globe, Plus, User, MapPin, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLocation } from "@/contexts/LocationContext";
import CoffeeLogo from "@/components/CoffeeLogo";

export default function NavBar() {
  const { latitude, longitude, error, loading, requestLocation, permissionStatus } = useLocation();

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
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 h-12 border-b bg-background">
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
        <Button variant="ghost" size="icon" aria-label="Add">
          <Plus className="h-6 w-6" />
        </Button>
        <div className="h-6 w-px bg-border" />
        <ThemeToggle />
        <div className="h-6 w-px bg-border" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="User menu">
              <User className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Log Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
