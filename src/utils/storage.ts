import { ThemeMode, ToolId } from '../types/tool';
import { isValidToolId } from '../data/tools';

const THEME_KEY = 'daq_theme';
const FAVORITES_KEY = 'daq_favorites';
const RECENTS_KEY = 'daq_recents';
const MAX_RECENTS = 6;

export function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  } catch {
    // ignore storage errors
  }
  return 'dark';
}

export function saveTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore storage errors
  }
}

export function loadFavorites(): ToolId[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is ToolId => typeof id === 'string' && isValidToolId(id));
  } catch {
    return [];
  }
}

export function saveFavorites(favorites: ToolId[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // ignore storage errors
  }
}

export function loadRecents(): ToolId[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((id): id is ToolId => typeof id === 'string' && isValidToolId(id))
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function pushRecentTool(toolId: ToolId, current: ToolId[]): ToolId[] {
  const next = [toolId, ...current.filter((id) => id !== toolId)].slice(0, MAX_RECENTS);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
  return next;
}
