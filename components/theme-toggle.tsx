"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Toggle theme" disabled>
        <div className="h-6 w-6" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";
  const currentMode = isDark ? "Dark mode" : "Light mode";
  const nextMode = isDark ? "light" : "dark";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(nextMode)}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{currentMode}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
