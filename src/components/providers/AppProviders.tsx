"use client";

import React from "react";
import { LanguageProvider } from "@/lib/i18n";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
