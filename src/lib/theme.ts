export type CanonicalThemeId =
  | 'slate_dark'
  | 'erp_cyan'
  | 'forest_green'
  | 'royal_indigo'
  | 'charcoal_minimal'
  | 'purple_dusk'
  | 'ocean_teal'
  | 'warm_cream'
  | 'modern_mint'
  | 'classic_steel';

export type ThemeId = CanonicalThemeId | 'forest' | 'navy' | 'teal' | 'slate';

export interface ThemeOption {
  id: CanonicalThemeId;
  name: string;
  tagline: string;
  type: 'dark' | 'light' | 'balanced';
  dotColor: string;
  sidebarBg: string;
  sidebarBorder: string;
  headerIconBg: string;
  activeCapsule: string;
  accentBtn: string;
  accentText: string;
  badgeBg: string;
  appBg?: string;
}

export const CANONICAL_THEMES: Record<CanonicalThemeId, ThemeOption> = {
  // 1. Slate Dark (Default Developer Midnight)
  slate_dark: {
    id: 'slate_dark',
    name: 'Slate Dark',
    tagline: 'Default Developer Midnight',
    type: 'dark',
    dotColor: '#475569',
    sidebarBg: 'bg-[#0f172a]',
    sidebarBorder: 'border-[#1e293b]',
    headerIconBg: 'bg-slate-700',
    activeCapsule: 'bg-slate-700 text-white border-2 border-white shadow-md shadow-slate-950/40',
    accentBtn: 'bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white',
    accentText: 'text-slate-700',
    badgeBg: 'bg-slate-800 text-slate-200 border-slate-700',
    appBg: 'bg-[#f1f5f9]',
  },

  // 2. Soft ERP Cyan (Matching Dynamic ERP light sky blue)
  erp_cyan: {
    id: 'erp_cyan',
    name: 'Soft ERP Cyan',
    tagline: 'Dynamic ERP Sky Blue',
    type: 'balanced',
    dotColor: '#0284c7',
    sidebarBg: 'bg-[#082f49]',
    sidebarBorder: 'border-[#0c4a6e]',
    headerIconBg: 'bg-sky-500',
    activeCapsule: 'bg-sky-600 text-white border-2 border-white shadow-md shadow-sky-950/40',
    accentBtn: 'bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white',
    accentText: 'text-sky-700',
    badgeBg: 'bg-sky-950 text-sky-200 border-sky-800',
    appBg: 'bg-[#f0f9ff]',
  },

  // 3. Forest Green (Deep Emerald Green)
  forest_green: {
    id: 'forest_green',
    name: 'Forest Green',
    tagline: 'Deep Emerald Green',
    type: 'dark',
    dotColor: '#059669',
    sidebarBg: 'bg-[#092b23]',
    sidebarBorder: 'border-[#0f3d32]',
    headerIconBg: 'bg-emerald-500',
    activeCapsule: 'bg-emerald-600 text-white border-2 border-white shadow-md shadow-emerald-950/40',
    accentBtn: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white',
    accentText: 'text-emerald-700',
    badgeBg: 'bg-emerald-950 text-emerald-200 border-emerald-800',
    appBg: 'bg-[#f0fdf4]',
  },

  // 4. Royal Indigo (Modern Deep Blue)
  royal_indigo: {
    id: 'royal_indigo',
    name: 'Royal Indigo',
    tagline: 'Modern Deep Blue',
    type: 'dark',
    dotColor: '#4f46e5',
    sidebarBg: 'bg-[#12183a]',
    sidebarBorder: 'border-[#1d2656]',
    headerIconBg: 'bg-indigo-600',
    activeCapsule: 'bg-indigo-600 text-white border-2 border-white shadow-md shadow-indigo-950/40',
    accentBtn: 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white',
    accentText: 'text-indigo-700',
    badgeBg: 'bg-indigo-950 text-indigo-200 border-indigo-800',
    appBg: 'bg-[#f5f3ff]',
  },

  // 5. Charcoal Minimal (High Contrast Low Strain)
  charcoal_minimal: {
    id: 'charcoal_minimal',
    name: 'Charcoal Minimal',
    tagline: 'High Contrast Low Strain',
    type: 'dark',
    dotColor: '#52525b',
    sidebarBg: 'bg-[#18181b]',
    sidebarBorder: 'border-[#27272a]',
    headerIconBg: 'bg-zinc-700',
    activeCapsule: 'bg-zinc-700 text-white border-2 border-white shadow-md shadow-zinc-950/40',
    accentBtn: 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-white',
    accentText: 'text-zinc-800',
    badgeBg: 'bg-zinc-900 text-zinc-200 border-zinc-700',
    appBg: 'bg-[#f4f4f5]',
  },

  // 6. Purple Dusk (Soft Dark Violet)
  purple_dusk: {
    id: 'purple_dusk',
    name: 'Purple Dusk',
    tagline: 'Soft Dark Violet',
    type: 'dark',
    dotColor: '#9333ea',
    sidebarBg: 'bg-[#221235]',
    sidebarBorder: 'border-[#351b53]',
    headerIconBg: 'bg-purple-600',
    activeCapsule: 'bg-purple-600 text-white border-2 border-white shadow-md shadow-purple-950/40',
    accentBtn: 'bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white',
    accentText: 'text-purple-700',
    badgeBg: 'bg-purple-950 text-purple-200 border-purple-800',
    appBg: 'bg-[#faf5ff]',
  },

  // 7. Ocean Teal (Teal Sidebar with Light Body)
  ocean_teal: {
    id: 'ocean_teal',
    name: 'Ocean Teal',
    tagline: 'Teal Sidebar with Light Body',
    type: 'balanced',
    dotColor: '#0d9488',
    sidebarBg: 'bg-[#04282a]',
    sidebarBorder: 'border-[#083b3e]',
    headerIconBg: 'bg-teal-500',
    activeCapsule: 'bg-teal-600 text-white border-2 border-white shadow-md shadow-teal-950/40',
    accentBtn: 'bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white',
    accentText: 'text-teal-700',
    badgeBg: 'bg-teal-950 text-teal-200 border-teal-800',
    appBg: 'bg-[#f0fdfa]',
  },

  // 8. Warm Cream / Sand (Soft Off-white light theme)
  warm_cream: {
    id: 'warm_cream',
    name: 'Warm Cream / Sand',
    tagline: 'Soft Off-White Light Theme',
    type: 'light',
    dotColor: '#d97706',
    sidebarBg: 'bg-[#292524]',
    sidebarBorder: 'border-[#3e3834]',
    headerIconBg: 'bg-amber-600',
    activeCapsule: 'bg-amber-600 text-white border-2 border-white shadow-md shadow-stone-950/40',
    accentBtn: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white',
    accentText: 'text-amber-800',
    badgeBg: 'bg-stone-900 text-amber-200 border-amber-900/50',
    appBg: 'bg-[#faf7f2]',
  },

  // 9. Modern Mint (Soft Pastel Green)
  modern_mint: {
    id: 'modern_mint',
    name: 'Modern Mint',
    tagline: 'Soft Pastel Green',
    type: 'balanced',
    dotColor: '#10b981',
    sidebarBg: 'bg-[#0f2e26]',
    sidebarBorder: 'border-[#174438]',
    headerIconBg: 'bg-emerald-500',
    activeCapsule: 'bg-emerald-500 text-white border-2 border-white shadow-md shadow-emerald-950/40',
    accentBtn: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white',
    accentText: 'text-emerald-700',
    badgeBg: 'bg-emerald-950 text-emerald-200 border-emerald-800',
    appBg: 'bg-[#f0fdf4]',
  },

  // 10. Classic Steel (Corporate Slate Gray)
  classic_steel: {
    id: 'classic_steel',
    name: 'Classic Steel',
    tagline: 'Corporate Slate Gray',
    type: 'balanced',
    dotColor: '#64748b',
    sidebarBg: 'bg-[#1e2633]',
    sidebarBorder: 'border-[#2d3848]',
    headerIconBg: 'bg-slate-600',
    activeCapsule: 'bg-slate-600 text-white border-2 border-white shadow-md shadow-slate-950/40',
    accentBtn: 'bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white',
    accentText: 'text-slate-700',
    badgeBg: 'bg-slate-900 text-slate-200 border-slate-700',
    appBg: 'bg-[#f8fafc]',
  },
};

// 10 Ordered canonical themes for the UI Switcher
export const ORDERED_THEMES: ThemeOption[] = [
  CANONICAL_THEMES.slate_dark,
  CANONICAL_THEMES.erp_cyan,
  CANONICAL_THEMES.forest_green,
  CANONICAL_THEMES.royal_indigo,
  CANONICAL_THEMES.charcoal_minimal,
  CANONICAL_THEMES.purple_dusk,
  CANONICAL_THEMES.ocean_teal,
  CANONICAL_THEMES.warm_cream,
  CANONICAL_THEMES.modern_mint,
  CANONICAL_THEMES.classic_steel,
];

// Dictionary with legacy aliases mapped to canonical themes
export const THEMES: Record<ThemeId, ThemeOption> = {
  ...CANONICAL_THEMES,
  forest: CANONICAL_THEMES.forest_green,
  navy: CANONICAL_THEMES.royal_indigo,
  teal: CANONICAL_THEMES.ocean_teal,
  slate: CANONICAL_THEMES.slate_dark,
};

export const DEFAULT_THEME: CanonicalThemeId = 'forest_green';

/**
 * Resolves any raw or legacy theme key into a valid CanonicalThemeId
 */
export function resolveThemeId(raw: string | null | undefined): CanonicalThemeId {
  if (!raw) return DEFAULT_THEME;
  if (raw in CANONICAL_THEMES) return raw as CanonicalThemeId;
  if (raw === 'forest') return 'forest_green';
  if (raw === 'navy') return 'royal_indigo';
  if (raw === 'teal') return 'ocean_teal';
  if (raw === 'slate') return 'slate_dark';
  return DEFAULT_THEME;
}

/**
 * Retrieves the saved theme for a specific company code/id from localStorage.
 * Falls back to the global key and then DEFAULT_THEME.
 */
export function getSavedTheme(companyKey?: string): CanonicalThemeId {
  if (typeof window !== 'undefined') {
    if (companyKey) {
      const companySaved = localStorage.getItem(`chequedesk_theme_${companyKey}`);
      if (companySaved) {
        return resolveThemeId(companySaved);
      }
    }
    const globalSaved = localStorage.getItem('chequedesk_theme');
    if (globalSaved) {
      return resolveThemeId(globalSaved);
    }
  }
  return DEFAULT_THEME;
}

/**
 * Stores the chosen theme for a company in localStorage, and updates global key.
 */
export function saveTheme(theme: ThemeId, companyKey?: string) {
  if (typeof window !== 'undefined') {
    const canonical = resolveThemeId(theme);
    if (companyKey) {
      localStorage.setItem(`chequedesk_theme_${companyKey}`, canonical);
    }
    localStorage.setItem('chequedesk_theme', canonical);
  }
}

