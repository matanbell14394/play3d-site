'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div style={{ width: 38, height: 38 }} />;

  const isDark = theme === 'dark';

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'מצב בהיר' : 'מצב כהה'}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
