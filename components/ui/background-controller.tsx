"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

export function BackgroundController() {
  const pathname = usePathname();
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    const updateBackground = () => {
      try {
        const htmlElement = document.documentElement;
        const isHomepage = pathname === "/";
        const isLight = resolvedTheme === "light";

        // Use requestAnimationFrame to ensure smooth updates
        requestAnimationFrame(() => {
          if (isLight && !isHomepage) {
            htmlElement.classList.add("day-light-bg");
          } else {
            htmlElement.classList.remove("day-light-bg");
          }
        });
      } catch (e) {
        console.error('Error in BackgroundController:', e);
      }
    };

    // Run immediately with a slight delay to ensure theme is resolved
    const timeoutId = setTimeout(updateBackground, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [pathname, resolvedTheme]);

  return null;
}


