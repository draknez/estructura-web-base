import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // 1. Theme State
  const [theme, setTheme] = useState(() => {
    if (localStorage.getItem('theme')) return localStorage.getItem('theme');
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  // 2. Navbar Position State (top | bottom)
  const [navbarPosition, setNavbarPosition] = useState(() => {
    return localStorage.getItem('navbarPosition') || 'top';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('navbarPosition', navbarPosition);
  }, [navbarPosition]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const toggleNavbarPosition = () => {
    setNavbarPosition((prev) => (prev === 'top' ? 'bottom' : 'top'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, navbarPosition, toggleNavbarPosition }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
