'use client';
import React, { useEffect, useState } from 'react';
import { THEME_COLORS, applyTheme, getSavedTheme } from '@/utils/theme';
import { Check } from 'lucide-react';

export default function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState('#6366f1');

  useEffect(() => {
    setCurrentTheme(getSavedTheme());
    const handleThemeChange = () => setCurrentTheme(getSavedTheme());
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Theme color</h3>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>Choose a preferred theme for the app.</p>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        {THEME_COLORS.map((theme) => {
          const isSelected = currentTheme === theme.color;
          return (
            <button
              key={theme.id}
              onClick={() => applyTheme(theme.color)}
              title={theme.id}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: theme.color,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                transition: 'all 0.2s ease',
                outline: isSelected ? `2px solid ${theme.color}` : 'none',
                outlineOffset: '2px',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {isSelected && <Check size={16} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
