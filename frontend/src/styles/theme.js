// Professional Attractive Design System
// Sophisticated colors with modern gradients and business-ready aesthetics
// Enhanced with comprehensive dark mode support

export const theme = {
  // Professional Color Palette - Attractive yet Business-Ready
  colors: {
    // Primary - Professional Deep Blue with modern twist
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Main primary - Professional blue
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },

    // Secondary - Sophisticated Teal/Emerald
    secondary: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6', // Main secondary - Professional teal
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    },

    // Accent - Elegant Purple
    accent: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7', // Main accent - Elegant purple
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6d28d9',
      900: '#581c87',
    },

    // Success - Professional Green
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e', // Main success - Professional green
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },

    // Warning - Professional Amber
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b', // Main warning - Professional amber
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },

    // Error - Professional Red
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444', // Main error - Professional red
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },

    // Neutral grays - Sophisticated and modern
    gray: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
  },

  // Dark Mode Color Palette - Professional Dark Theme
  dark: {
    // Background layers for depth
    bg: {
      primary: '#0f0f23',    // Deep dark blue-black
      secondary: '#1a1a2e',   // Slightly lighter for cards
      tertiary: '#16213e',    // For elevated elements
      quaternary: '#232340',  // For hover states
      surface: '#252545',     // Interactive surfaces
    },

    // Text colors with proper contrast
    text: {
      primary: '#f1f5f9',     // Main text - very light
      secondary: '#cbd5e1',   // Secondary text
      tertiary: '#94a3b8',    // Muted text
      quaternary: '#64748b',  // Subtle text
      inverse: '#1e293b',     // Dark text on light backgrounds
    },

    // Border colors
    border: {
      primary: '#334155',     // Main borders
      secondary: '#475569',   // Prominent borders
      tertiary: '#64748b',    // Subtle borders
      accent: '#3b82f6',      // Accent borders
    },

    // Interactive element states
    interactive: {
      hover: '#252545',       // Hover state background
      active: '#2a2a4a',      // Active state background
      focus: '#3b82f6',       // Focus ring color
      disabled: '#1e293b',    // Disabled state
    },

    // Status colors adapted for dark theme
    status: {
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
  },

  // Professional Gradient Combinations
  gradients: {
    primary: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
    secondary: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)',
    accent: 'linear-gradient(135deg, #a855f7 0%, #9333ea 50%, #7c3aed 100%)',
    success: 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',

    // Professional business gradients
    business: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
    ocean: 'linear-gradient(135deg, #3b82f6 0%, #14b8a6 50%, #22c55e 100%)',
    sunset: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #a855f7 100%)',
    professional: 'linear-gradient(135deg, #475569 0%, #3b82f6 50%, #14b8a6 100%)',

    // Dark mode gradients
    dark: {
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      card: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #232340 100%)',
      primary: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
      secondary: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)',
      accent: 'linear-gradient(135deg, #a855f7 0%, #9333ea 50%, #7c3aed 100%)',
      surface: 'linear-gradient(135deg, #252545 0%, #232340 50%, #2a2a4a 100%)',
    },
  },

  // Typography - Professional and readable
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      display: ['Inter', 'system-ui', 'sans-serif'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1.1' }],
    },
  },

  // Professional shadows with subtle color hints
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    colored: {
      primary: '0 8px 25px -8px rgb(59 130 246 / 0.3)',
      secondary: '0 8px 25px -8px rgb(20 184 166 / 0.3)',
      accent: '0 8px 25px -8px rgb(168 85 247 / 0.3)',
      success: '0 8px 25px -8px rgb(34 197 94 / 0.3)',
    }
  },

  // Professional component styles
  components: {
    button: {
      primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-500/25 transition-all duration-200',
      secondary: 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-teal-500/25 transition-all duration-200',
      accent: 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg hover:shadow-purple-500/25 transition-all duration-200',
      success: 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-emerald-500/25 transition-all duration-200',
      outline: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm hover:shadow-md transition-all duration-200',
      ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200',
    },
    card: {
      base: 'bg-white rounded-2xl shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300',
      elevated: 'bg-white rounded-2xl shadow-xl border border-gray-200/50 hover:shadow-2xl transition-all duration-300',
      gradient: 'bg-gradient-to-br from-white to-gray-50/50 rounded-2xl shadow-xl border border-gray-200/50 hover:shadow-2xl transition-all duration-300',
      colored: {
        primary: 'bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl shadow-lg border border-blue-200/50 hover:shadow-xl transition-all duration-300',
        secondary: 'bg-gradient-to-br from-teal-50 to-emerald-50/50 rounded-2xl shadow-lg border border-teal-200/50 hover:shadow-xl transition-all duration-300',
        accent: 'bg-gradient-to-br from-purple-50 to-violet-50/50 rounded-2xl shadow-lg border border-purple-200/50 hover:shadow-xl transition-all duration-300',
        success: 'bg-gradient-to-br from-emerald-50 to-green-50/50 rounded-2xl shadow-lg border border-emerald-200/50 hover:shadow-xl transition-all duration-300',
      }
    },
    input: {
      base: 'w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200',
      error: 'w-full px-4 py-3 rounded-lg border border-red-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-200',
    }
  },

  // Dark mode component styles
  dark: {
    ...this.dark,
    components: {
      button: {
        primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-500/40 transition-all duration-200',
        secondary: 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-teal-500/40 transition-all duration-200',
        accent: 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg hover:shadow-purple-500/40 transition-all duration-200',
        success: 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-emerald-500/40 transition-all duration-200',
        outline: 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-100 border border-gray-600 shadow-lg hover:shadow-xl transition-all duration-200',
        ghost: 'text-gray-300 hover:text-gray-100 hover:bg-gray-800/50 transition-all duration-200',
      },
      card: {
        base: 'bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-2xl shadow-2xl border border-gray-700/50 hover:shadow-2xl hover:border-gray-600/50 transition-all duration-300 backdrop-blur-sm',
        elevated: 'bg-gradient-to-br from-gray-800/95 to-gray-700/95 rounded-2xl shadow-2xl border border-gray-600/50 hover:shadow-2xl hover:border-gray-500/50 transition-all duration-300 backdrop-blur-sm',
        gradient: 'bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-2xl shadow-2xl border border-gray-700/50 hover:shadow-2xl hover:border-gray-600/50 transition-all duration-300 backdrop-blur-sm',
        colored: {
          primary: 'bg-gradient-to-br from-blue-900/40 to-blue-800/40 rounded-2xl shadow-2xl border border-blue-700/50 hover:shadow-2xl hover:border-blue-600/50 transition-all duration-300 backdrop-blur-sm',
          secondary: 'bg-gradient-to-br from-teal-900/40 to-emerald-900/40 rounded-2xl shadow-2xl border border-teal-700/50 hover:shadow-2xl hover:border-teal-600/50 transition-all duration-300 backdrop-blur-sm',
          accent: 'bg-gradient-to-br from-purple-900/40 to-violet-900/40 rounded-2xl shadow-2xl border border-purple-700/50 hover:shadow-2xl hover:border-purple-600/50 transition-all duration-300 backdrop-blur-sm',
          success: 'bg-gradient-to-br from-emerald-900/40 to-green-900/40 rounded-2xl shadow-2xl border border-emerald-700/50 hover:shadow-2xl hover:border-emerald-600/50 transition-all duration-300 backdrop-blur-sm',
        }
      },
      input: {
        base: 'w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-800/80 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 backdrop-blur-sm',
        error: 'w-full px-4 py-3 rounded-lg border border-red-500 bg-gray-800/80 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all duration-200 backdrop-blur-sm',
      }
    }
  },
};

export default theme;