import { useState, useEffect, useCallback, useRef } from 'react';

export const THEME_STORAGE_KEY = 'dropify-theme';

/**
 * Detect OS system color scheme
 */
export function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

/**
 * Retrieve saved user theme preference from localStorage
 */
export function getStoredTheme() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch (e) {
    // LocalStorage inaccessible (e.g. sandbox or security block)
  }
  return null;
}

/**
 * Get initial theme: check localStorage for explicit user choice, otherwise default to 'light'
 * (Default is always Light Paper mode; switching to AMOLED Dark is strictly user choice)
 */
export function getInitialTheme() {
  const stored = getStoredTheme();
  if (stored === 'dark' || stored === 'light') return stored;
  return 'light';
}

/**
 * Apply theme attributes, classes, and meta tags to the document
 */
export function applyThemeToDOM(theme) {
  if (typeof document === 'undefined') return;

  const isDark = theme === 'dark';

  // 1. Set data-theme on <html>
  document.documentElement.setAttribute('data-theme', theme);

  // 2. Toggle 'dark' class on <html> and <body>
  document.documentElement.classList.toggle('dark', isDark);
  if (document.body) {
    document.body.classList.toggle('dark', isDark);
  }

  // 3. Update or create <meta name="theme-color">
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  metaThemeColor.setAttribute('content', isDark ? '#000000' : '#FAF7F2');
}

/**
 * Primary Dropify Theme Management Hook
 */
export default function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme);
  const hasManualChoice = useRef(Boolean(getStoredTheme()));

  // Synchronize DOM side-effects whenever theme state changes
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  // Set explicit theme and persist to localStorage
  const setTheme = useCallback((newTheme) => {
    const validTheme = newTheme === 'dark' ? 'dark' : 'light';
    hasManualChoice.current = true;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, validTheme);
    } catch (e) {
      console.warn('Unable to persist theme to localStorage:', e);
    }
    setThemeState(validTheme);
  }, []);

  // Toggle between dark and light modes
  const toggleTheme = useCallback(() => {
    setThemeState((prevTheme) => {
      const nextTheme = prevTheme === 'dark' ? 'light' : 'dark';
      hasManualChoice.current = true;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch (e) {
        console.warn('Unable to persist theme to localStorage:', e);
      }
      return nextTheme;
    });
  }, []);

  return {
    theme,
    toggleTheme,
    setTheme,
    isDark: theme === 'dark'
  };
}
