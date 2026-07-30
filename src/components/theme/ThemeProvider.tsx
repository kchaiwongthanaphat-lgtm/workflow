'use client';
import React, { useEffect } from 'react';
import { applyTheme, getSavedTheme } from '@/utils/theme';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(getSavedTheme());
  }, []);
  return <>{children}</>;
}
