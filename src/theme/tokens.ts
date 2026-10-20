import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  paper: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceMuted: '#F2EDE5',
  ink: '#2A2622',
  inkMuted: '#6E655B',
  inkFaint: '#787066',
  hairline: '#E5DED3',
  accent: '#5B6B54',
  accentSoft: '#E8EDE4',
  attention: '#8A6D3B',
  attentionSoft: '#F3EBDC',
  danger: '#8C3A2E',
  overlay: 'rgba(42,38,34,0.32)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const gutter = spacing.xl;

export const fontFamily = {
  heading: 'Fraunces_500Medium',
} as const;

export const type = {
  display: { fontFamily: fontFamily.heading, fontSize: 30, lineHeight: 36 } as TextStyle,
  title: { fontFamily: fontFamily.heading, fontSize: 22, lineHeight: 28 } as TextStyle,
  section: { fontFamily: fontFamily.heading, fontSize: 17, lineHeight: 22 } as TextStyle,
  body: { fontSize: 16, lineHeight: 22 } as TextStyle,
  caption: { fontSize: 13, lineHeight: 18 } as TextStyle,
  overline: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '600',
  } as TextStyle,
  button: { fontSize: 16, lineHeight: 20, fontWeight: '600' } as TextStyle,
} as const;

export const elevation = {
  sheet: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  } as ViewStyle,
} as const;

export const motion = {
  fast: 150,
  standard: 250,
} as const;

export const hitTarget = 44;

export const theme = {
  colors,
  spacing,
  radii,
  gutter,
  fontFamily,
  type,
  elevation,
  motion,
} as const;

export type Theme = typeof theme;
