/**
 * ReadLite Theme System - Unified management of all theme colors
 * Implementing dynamic theme switching using CSS variables, compatible with Tailwind
 */

// Define supported theme types
export type ThemeType = 'light' | 'dark' | 'sepia' | 'paper';

// Agent UI colors interface
export interface AgentColors {
  background: string;
  messageBg: string;
  userBubble: string;
  agentBubble: string;
  inputBg: string;
  text: string;
  textUser: string;
  textAgent: string;
  textSecondary: string;
  accent: string;
  border: string;
  error: string;
  scrollbar: string;
  scrollbarHover: string;
  chipBg: string;
  thinkingPulse: string;
}

// Settings panel colors interface 
export interface SettingsColors {
  bg: string;           // Background color
  text: string;         // Text color
  border: string;       // Border color
  highlight: string;    // Highlight color for active elements
  buttonBg: string;     // Button background color
  buttonText: string;   // Button text color
}

// Reader colors interface
export interface ReaderColors {
  background: string;   // Background color
  text: string;         // Main text color
  title: string;        // Title text color
  border: string;       // Border color
  toolbar: {
    background: string; // Toolbar background
    border: string;     // Toolbar border
  };
  link: {
    normal: string;     // Link color
    visited: string;    // Visited link color
    hover: string;      // Hover link color
    active: string;     // Active link color
  };
}

// Theme color tokens - Define all color variables
interface ColorTokens {
  // Background colors
  bg: {
    primary: string;   // Main background
    secondary: string; // Secondary background
    tertiary: string;  // Tertiary background
    user: string;      // User message background
    agent: string;     // Agent message background
    input: string;     // Input field background
  };
  
  // Text colors
  text: {
    primary: string;   // Primary text
    secondary: string; // Secondary text
    user: string;      // User message text
    agent: string;     // Agent message text
    accent: string;    // Accent text
  };
  
  // Borders and decorations
  border: string;      // Border
  accent: string;      // Accent color
  error: string;       // Error color
  
  // Scrollbar
  scrollbar: {
    track: string;     // Scrollbar track
    thumb: string;     // Scrollbar thumb
  };
  
  // Link colors
  link: {
    normal: string;    // Normal link
    visited: string;   // Visited link
    hover: string;     // Hover link
    active: string;    // Active link
  };
}

// Define color tokens for each theme
const themeTokens: Record<ThemeType, ColorTokens> = {
  light: {
    bg: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f1f5f9',
      user: '#edf4ff',
      agent: '#ffffff',
      input: '#ffffff'
    },
    text: {
      primary: '#4b5563',
      secondary: '#a1aebf',
      user: '#4b5563',
      agent: '#4b5563',
      accent: '#3B82F6'
    },
    border: '#edf2f7',
    accent: '#3B82F6',
    error: '#f87171',
    scrollbar: {
      track: '#edf2f7',
      thumb: '#d9e2ec'
    },
    link: {
      normal: '#60a5fa',
      visited: '#a78bfa', 
      hover: '#3b82f6',
      active: '#2563eb'
    }
  },
  
  dark: {
    bg: {
      primary: '#1a1a1a',
      secondary: '#242424',
      tertiary: '#2a2a2a',
      user: '#2d2d2d',
      agent: '#1a1a1a',
      input: '#242424'
    },
    text: {
      primary: '#cbd5e1',
      secondary: '#94a3b8',
      user: '#cbd5e1',
      agent: '#d1dbe8',
      accent: '#60a5fa'
    },
    border: '#2c2c2c',
    accent: '#60a5fa',
    error: '#ef4444',
    scrollbar: {
      track: '#2c2c2c',
      thumb: '#3d3d3d'
    },
    link: {
      normal: '#60a5fa',
      visited: '#a78bfa',
      hover: '#3b82f6', 
      active: '#2563eb'
    }
  },
  
  sepia: {
    bg: {
      primary: '#fbf8f2',
      secondary: '#f8f1e3',
      tertiary: '#e8ddcb', 
      user: '#eee4d3',
      agent: '#fbf8f2',
      input: '#fbf8f2'
    },
    text: {
      primary: '#5e4d36',
      secondary: '#8a7b69',
      user: '#5e4d36',
      agent: '#5e4d36',
      accent: '#9a7c59'
    },
    border: '#f0e6d7',
    accent: '#9a7c59',
    error: '#b91c1c',
    scrollbar: {
      track: '#f0e6d7',
      thumb: '#e0d5bf'
    },
    link: {
      normal: '#966f33',
      visited: '#7c5e2c',
      hover: '#ab7c38',
      active: '#85612b'
    }
  },
  
  paper: {
    bg: {
      primary: '#f8fafc',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      user: '#f1f5f9',
      agent: '#f8fafc',
      input: '#ffffff'
    },
    text: {
      primary: '#334155',
      secondary: '#7a8899',
      user: '#334155',
      agent: '#334155',
      accent: '#4b5563'
    },
    border: '#e9f0f7',
    accent: '#4b5563',
    error: '#dc2626',
    scrollbar: {
      track: '#e9f0f7',
      thumb: '#d6e2f0'
    },
    link: {
      normal: '#4b5563',
      visited: '#6b7280',
      hover: '#374151',
      active: '#1f2937'
    }
  }
};

// Generate CSS variable names mapping from color tokens
export const cssVarNames = {
  bg: {
    primary: '--rl-bg-primary',
    secondary: '--rl-bg-secondary',
    tertiary: '--rl-bg-tertiary',
    user: '--rl-bg-user',
    agent: '--rl-bg-agent',
    input: '--rl-bg-input'
  },
  text: {
    primary: '--rl-text-primary',
    secondary: '--rl-text-secondary',
    user: '--rl-text-user',
    agent: '--rl-text-agent',
    accent: '--rl-text-accent'
  },
  border: '--rl-border',
  accent: '--rl-accent',
  error: '--rl-error',
  scrollbar: {
    track: '--rl-scrollbar-track',
    thumb: '--rl-scrollbar-thumb'
  },
  link: {
    normal: '--rl-link',
    visited: '--rl-link-visited',
    hover: '--rl-link-hover',
    active: '--rl-link-active'
  }
};

/**
 * Get agent UI colors based on the provided theme type
 * 
 * @param theme The theme type (light, dark, sepia, or paper)
 * @returns An object containing agent UI colors
 */
export function getAgentColors(theme: ThemeType): AgentColors {
  const tokens = themeTokens[theme];
  
  return {
    background: tokens.bg.primary,
    messageBg: tokens.bg.secondary,
    userBubble: tokens.bg.user,
    agentBubble: tokens.bg.agent,
    inputBg: tokens.bg.input,
    text: tokens.text.primary,
    textUser: tokens.text.user,
    textAgent: tokens.text.agent,
    textSecondary: tokens.text.secondary,
    accent: tokens.accent,
    border: tokens.border,
    error: tokens.error,
    scrollbar: tokens.scrollbar.track,
    scrollbarHover: tokens.scrollbar.thumb,
    chipBg: tokens.bg.tertiary,
    thinkingPulse: addOpacity(tokens.accent, 0.3)
  };
}

/**
 * Get settings panel colors based on the provided theme type
 * 
 * @param theme The theme type (light, dark, sepia, or paper)
 * @returns An object containing colors for settings panel
 */
export function getSettingsColors(theme: ThemeType): SettingsColors {
  const tokens = themeTokens[theme];
  
  return {
    bg: tokens.bg.primary,
    text: tokens.text.primary,
    border: tokens.border,
    highlight: tokens.accent,
    buttonBg: darkenColor(tokens.bg.primary, 3),
    buttonText: tokens.text.primary
  };
}

/**
 * Get reader UI colors based on the provided theme type
 * 
 * @param theme The theme type (light, dark, sepia, or paper)
 * @returns An object containing colors for reader UI
 */
export function getReaderColors(theme: ThemeType): ReaderColors {
  const tokens = themeTokens[theme];
  
  // Determine border color based on theme type
  const isDarkTheme = theme === 'dark';
  const borderBaseColor = isDarkTheme ? '#FFFFFF' : '#000000';
  const borderOpacity = 0.02; // Reduced from 0.04 for even more subtle borders
  const toolbarBorderOpacity = 0.015; // Reduced for even subtler toolbar borders
  
  return {
    background: tokens.bg.primary,
    text: addOpacity(tokens.text.primary, 0.75),
    title: addOpacity(tokens.text.primary, 0.8),
    border: addOpacity(borderBaseColor, borderOpacity),
    toolbar: {
      background: addOpacity(tokens.bg.primary, 0.5),
      border: addOpacity(borderBaseColor, toolbarBorderOpacity)
    },
    link: tokens.link
  };
}

// Apply theme colors to CSS variables
export const applyThemeColors = (colors: AgentColors): void => {
  // Add namespace prefix 'readlite-' to all CSS variables
  const PREFIX = 'readlite';
  
  // Create variable name mappings for easier reference
  const varMap = {
    background: `--${PREFIX}-background`,
    messageBg: `--${PREFIX}-message-bg`,
    userBubble: `--${PREFIX}-user-bubble`,
    agentBubble: `--${PREFIX}-agent-bubble`,
    inputBg: `--${PREFIX}-input-bg`,
    text: `--${PREFIX}-text`,
    textUser: `--${PREFIX}-text-user`,
    textAgent: `--${PREFIX}-text-agent`,
    textSecondary: `--${PREFIX}-text-secondary`,
    accent: `--${PREFIX}-accent`,
    border: `--${PREFIX}-border`,
    error: `--${PREFIX}-error`,
    scrollbar: `--${PREFIX}-scrollbar`,
    scrollbarHover: `--${PREFIX}-scrollbar-hover`,
    chipBg: `--${PREFIX}-chip-bg`,
    thinkingPulse: `--${PREFIX}-thinking-pulse`,
  };
  
  // Generate style content
  const styleContent = generateStyleContent(colors, PREFIX, varMap);
  
  // Try to find the shadow root containing our components
  const shadowContainer = document.getElementById('readlite-shadow-container');
  const shadow = shadowContainer?.shadowRoot || null;
  
  // If we're in a Shadow DOM, apply styles there
  if (shadow) {
    // Update styles in the shadow root
    const styleId = `${PREFIX}-theme-variables`;
    const existingStyle = shadow.getElementById(styleId);
    if (existingStyle) {
      existingStyle.textContent = styleContent;
    } else {
      // Create new style element if it doesn't exist
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = styleContent;
      shadow.appendChild(style);
    }
    return;
  }
  
  // Fallback to document-level styles if no shadow DOM found
  const styleId = `${PREFIX}-theme-variables`;
  let styleElement = document.getElementById(styleId);
  
  if (!styleElement) {
    // Create new style element if it doesn't exist
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }
  
  // Update style content
  styleElement.textContent = styleContent;
};

// Apply theme function
export function applyTheme(theme: ThemeType, root: HTMLElement | ShadowRoot = document.documentElement): void {
  if (!root) return;
  
  const tokens = themeTokens[theme];
  
  // Function to apply CSS variables
  const applyCssVars = (element: HTMLElement | ShadowRoot) => {
    // Handle different ways to set CSS variables for DOM elements and ShadowRoot
    if (element instanceof HTMLElement) {
      // HTMLElements have style property
      setCssVars(element.style, tokens);
      applyLegacyVars(getAgentColors(theme), element.style);
    } else if (element instanceof ShadowRoot) {
      // For ShadowRoot, need to create or use style element
      let styleEl = element.getElementById('readlite-theme-vars');
      
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'readlite-theme-vars';
        element.appendChild(styleEl);
      }
      
      if (styleEl instanceof HTMLStyleElement) {
        styleEl.textContent = generateCssVarStyles(tokens, theme);
      }
    }
  };
  
  // Apply CSS variables
  applyCssVars(root);
  
  // Set theme class names
  if (root === document.documentElement) {
    // Remove all theme classes
    document.documentElement.classList.remove('light', 'dark', 'sepia', 'paper');
    // Add current theme class
    document.documentElement.classList.add(theme);
  } else if (root instanceof ShadowRoot) {
    // If shadow DOM
    const container = root.querySelector('[class*="readlite"]');
    if (container instanceof HTMLElement) {
      // Remove all theme classes
      container.classList.remove('readlite-light', 'readlite-dark', 'readlite-sepia', 'readlite-paper', 'light', 'dark', 'sepia', 'paper');
      // Add current theme classes
      container.classList.add(`readlite-${theme}`, theme);
    }
  }
}

// Set CSS variables to CSSStyleDeclaration object
function setCssVars(style: CSSStyleDeclaration, tokens: ColorTokens): void {
  style.setProperty(cssVarNames.bg.primary, tokens.bg.primary);
  style.setProperty(cssVarNames.bg.secondary, tokens.bg.secondary);
  style.setProperty(cssVarNames.bg.tertiary, tokens.bg.tertiary);
  style.setProperty(cssVarNames.bg.user, tokens.bg.user);
  style.setProperty(cssVarNames.bg.agent, tokens.bg.agent);
  style.setProperty(cssVarNames.bg.input, tokens.bg.input);
  
  style.setProperty(cssVarNames.text.primary, tokens.text.primary);
  style.setProperty(cssVarNames.text.secondary, tokens.text.secondary);
  style.setProperty(cssVarNames.text.user, tokens.text.user);
  style.setProperty(cssVarNames.text.agent, tokens.text.agent);
  style.setProperty(cssVarNames.text.accent, tokens.text.accent);
  
  style.setProperty(cssVarNames.border, tokens.border);
  style.setProperty(cssVarNames.accent, tokens.accent);
  style.setProperty(cssVarNames.error, tokens.error);
  
  style.setProperty(cssVarNames.scrollbar.track, tokens.scrollbar.track);
  style.setProperty(cssVarNames.scrollbar.thumb, tokens.scrollbar.thumb);
  
  style.setProperty(cssVarNames.link.normal, tokens.link.normal);
  style.setProperty(cssVarNames.link.visited, tokens.link.visited);
  style.setProperty(cssVarNames.link.hover, tokens.link.hover);
  style.setProperty(cssVarNames.link.active, tokens.link.active);
}

// Keep legacy variable names for compatibility
function applyLegacyVars(colors: AgentColors, style: CSSStyleDeclaration): void {
  const PREFIX = 'readlite';
  
  const varMap = {
    background: `--${PREFIX}-background`,
    messageBg: `--${PREFIX}-message-bg`,
    userBubble: `--${PREFIX}-user-bubble`,
    agentBubble: `--${PREFIX}-agent-bubble`,
    inputBg: `--${PREFIX}-input-bg`,
    text: `--${PREFIX}-text`,
    textUser: `--${PREFIX}-text-user`,
    textAgent: `--${PREFIX}-text-agent`,
    textSecondary: `--${PREFIX}-text-secondary`,
    accent: `--${PREFIX}-accent`,
    border: `--${PREFIX}-border`,
    error: `--${PREFIX}-error`,
    scrollbar: `--${PREFIX}-scrollbar`,
    scrollbarHover: `--${PREFIX}-scrollbar-hover`,
    chipBg: `--${PREFIX}-chip-bg`,
    thinkingPulse: `--${PREFIX}-thinking-pulse`,
  };
  
  Object.entries(colors).forEach(([key, value]) => {
    const varName = varMap[key as keyof AgentColors];
    if (varName) {
      style.setProperty(varName, value);
    }
  });
}

// Generate CSS variables stylesheet
function generateCssVarStyles(tokens: ColorTokens, theme: ThemeType): string {
  const agentColors = getAgentColors(theme);
  
  return `
:root, :host {
  ${cssVarNames.bg.primary}: ${tokens.bg.primary};
  ${cssVarNames.bg.secondary}: ${tokens.bg.secondary};
  ${cssVarNames.bg.tertiary}: ${tokens.bg.tertiary};
  ${cssVarNames.bg.user}: ${tokens.bg.user};
  ${cssVarNames.bg.agent}: ${tokens.bg.agent};
  ${cssVarNames.bg.input}: ${tokens.bg.input};
  
  ${cssVarNames.text.primary}: ${tokens.text.primary};
  ${cssVarNames.text.secondary}: ${tokens.text.secondary};
  ${cssVarNames.text.user}: ${tokens.text.user};
  ${cssVarNames.text.agent}: ${tokens.text.agent};
  ${cssVarNames.text.accent}: ${tokens.text.accent};
  
  ${cssVarNames.border}: ${tokens.border};
  ${cssVarNames.accent}: ${tokens.accent};
  ${cssVarNames.error}: ${tokens.error};
  
  ${cssVarNames.scrollbar.track}: ${tokens.scrollbar.track};
  ${cssVarNames.scrollbar.thumb}: ${tokens.scrollbar.thumb};
  
  ${cssVarNames.link.normal}: ${tokens.link.normal};
  ${cssVarNames.link.visited}: ${tokens.link.visited};
  ${cssVarNames.link.hover}: ${tokens.link.hover};
  ${cssVarNames.link.active}: ${tokens.link.active};
  
  /* Legacy variables */
  --readlite-background: ${agentColors.background};
  --readlite-message-bg: ${agentColors.messageBg};
  --readlite-user-bubble: ${agentColors.userBubble};
  --readlite-agent-bubble: ${agentColors.agentBubble};
  --readlite-input-bg: ${agentColors.inputBg};
  --readlite-text: ${agentColors.text};
  --readlite-text-user: ${agentColors.textUser};
  --readlite-text-agent: ${agentColors.textAgent};
  --readlite-text-secondary: ${agentColors.textSecondary};
  --readlite-accent: ${agentColors.accent};
  --readlite-border: ${agentColors.border};
  --readlite-error: ${agentColors.error};
  --readlite-scrollbar: ${agentColors.scrollbar};
  --readlite-scrollbar-hover: ${agentColors.scrollbarHover};
  --readlite-chip-bg: ${agentColors.chipBg};
  --readlite-thinking-pulse: ${agentColors.thinkingPulse};
}`;
}

// Generate style content with CSS variables
function generateStyleContent(colors: AgentColors, prefix: string, varMap: Record<string, string>): string {
  const cssVars = Object.entries(colors).map(([key, value]) => {
    const varName = varMap[key as keyof AgentColors];
    return varName ? `${varName}: ${value};` : '';
  }).filter(Boolean).join('\n  ');

  return `
:root {
  ${cssVars}
}
  `;
}

// Helper function to convert hex to rgb for rgba values
function hexToRgb(hex: string): string {
  // Remove the hash if it exists
  hex = hex.replace('#', '');
  
  // Convert 3-digit hex to 6-digit hex
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  // Parse the hex values
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `${r}, ${g}, ${b}`;
}

// Helper function to apply opacity to a color
function addOpacity(color: string, opacity: number): string {
  // If already rgba, just update the opacity
  if (color.startsWith('rgba(')) {
    return color.replace(/rgba\([^,]+,[^,]+,[^,]+,\s*[\d.]+\)/, `rgba($1, $2, $3, ${opacity})`);
  }
  
  // If rgb, convert to rgba
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
  }
  
  // If hex, convert to rgba
  if (color.startsWith('#')) {
    const rgb = hexToRgb(color);
    return `rgba(${rgb}, ${opacity})`;
  }
  
  // Default fallback
  return color;
}

// Helper function to darken a color
function darkenColor(color: string, percent: number): string {
  if (!color.startsWith('#')) return color;
  
  let r = parseInt(color.slice(1, 3), 16);
  let g = parseInt(color.slice(3, 5), 16);
  let b = parseInt(color.slice(5, 7), 16);
  
  r = Math.max(0, Math.floor(r * (1 - percent / 100)));
  g = Math.max(0, Math.floor(g * (1 - percent / 100)));
  b = Math.max(0, Math.floor(b * (1 - percent / 100)));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
} 