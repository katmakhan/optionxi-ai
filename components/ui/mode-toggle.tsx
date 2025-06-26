"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

export function ModeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <TooltipProvider disableHoverableContent>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="relative w-8 h-8 rounded-full bg-background"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            <SunIcon
              className="absolute w-5 h-5 transition-transform duration-500 rotate-0 scale-100 dark:-rotate-90 dark:scale-0"
            />
            <MoonIcon
              className="absolute w-5 h-5 transition-transform duration-500 rotate-90 scale-0 dark:rotate-0 dark:scale-100"
            />
            <span className="sr-only">Switch Theme</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Switch Theme</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
