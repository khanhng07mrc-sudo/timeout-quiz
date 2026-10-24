"use client";

import React from "react";
import { LanguageProvider } from "@/lib/i18n";
import { SciFiPortalProvider } from "@/components/ui/SciFiPortalTransition";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <SciFiPortalProvider>{children}</SciFiPortalProvider>
    </LanguageProvider>
  );
}
