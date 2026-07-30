export const THEME_COLORS = [
  { id: 'gray', color: '#64748b' },
  { id: 'purple', color: '#6366f1' }, // Default
  { id: 'blue', color: '#3b82f6' },
  { id: 'pink', color: '#ec4899' },
  { id: 'light-purple', color: '#a855f7' },
  { id: 'indigo', color: '#8b5cf6' },
  { id: 'orange', color: '#f97316' },
  { id: 'teal', color: '#14b8a6' },
  { id: 'brown', color: '#a8a29e' },
  { id: 'green', color: '#10b981' }
];

export const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '99, 102, 241';
};

export const applyTheme = (colorHex: string) => {
  document.documentElement.style.setProperty('--accent', colorHex);
  document.documentElement.style.setProperty('--accent-hover', colorHex);
  const rgb = hexToRgb(colorHex);
  document.documentElement.style.setProperty('--accent-light', `rgba(${rgb}, 0.1)`);
  localStorage.setItem('velo-accent-color', colorHex);
  window.dispatchEvent(new Event('theme-changed'));
};

export const getSavedTheme = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('velo-accent-color') || '#6366f1';
  }
  return '#6366f1';
};
