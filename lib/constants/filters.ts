import type { ComponentType } from "react";
import {
  Bookmark,
  Wifi,
  Plug,
  Coffee,
  Moon,
  Clock3,
  UtensilsCrossed,
  Sprout,
  Wine,
  Sun,
  ShowerHead,
  Accessibility,
  PawPrint,
  Car,
  Users,
} from "lucide-react";
import type { Workspace } from "@/lib/types";

export interface FilterGroup {
  label: string;
  options: string[];
}

export const FILTER_GROUPS: FilterGroup[] = [
  {
    label: "Saved",
    options: ["Saved"],
  },
  {
    label: "Essentials",
    options: ["Wi-Fi", "Power", "Coffee"],
  },
  {
    label: "Focus & Duration",
    options: ["Quiet", "Long stays"],
  },
  {
    label: "Food & Drink",
    options: ["Food", "Veggie", "Alcohol"],
  },
  {
    label: "Space & Access",
    options: ["Outdoor", "Restroom", "Accessible", "Pets", "Parking", "Light"],
  },
  {
    label: "Community",
    options: ["Groups"],
  },
];

export const FILTER_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Saved: Bookmark,
  "Wi-Fi": Wifi,
  Power: Plug,
  Coffee: Coffee,
  Quiet: Moon,
  "Long stays": Clock3,
  Food: UtensilsCrossed,
  Veggie: Sprout,
  Alcohol: Wine,
  Outdoor: Sun,
  Restroom: ShowerHead,
  Accessible: Accessibility,
  Pets: PawPrint,
  Parking: Car,
  Light: Sun,
  Groups: Users,
};

// Map filter options to workspace properties
export const SUPPORTED_FILTERS: Record<string, keyof Workspace> = {
  "Wi-Fi": "has_wifi",
  Power: "has_power_outlets",
  Coffee: "has_coffee",
};

export const MAX_ACTIVE_FILTERS = 5;
