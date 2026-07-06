"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface AccessibilityContextType {
  highContrast: boolean;
  largeFont: boolean;
  toggleHighContrast: () => void;
  toggleLargeFont: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [highContrast, setHighContrast] = useState(false);
  const [largeFont, setLargeFont] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedHighContrast = localStorage.getItem("sikad_high_contrast") === "true";
    const savedLargeFont = localStorage.getItem("sikad_large_font") === "true";
    
    setHighContrast(savedHighContrast);
    setLargeFont(savedLargeFont);
    setMounted(true);
  }, []);

  // Update HTML classes when states change
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    if (highContrast) {
      root.classList.add("high-contrast");
      localStorage.setItem("sikad_high_contrast", "true");
    } else {
      root.classList.remove("high-contrast");
      localStorage.setItem("sikad_high_contrast", "false");
    }

    if (largeFont) {
      root.classList.add("large-font");
      localStorage.setItem("sikad_large_font", "true");
    } else {
      root.classList.remove("large-font");
      localStorage.setItem("sikad_large_font", "false");
    }
  }, [highContrast, largeFont, mounted]);

  const toggleHighContrast = () => setHighContrast((prev) => !prev);
  const toggleLargeFont = () => setLargeFont((prev) => !prev);

  return (
    <AccessibilityContext.Provider
      value={{
        highContrast,
        largeFont,
        toggleHighContrast,
        toggleLargeFont,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
}
