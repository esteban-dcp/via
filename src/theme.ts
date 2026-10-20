export const colors = {
  primary: '#034af8',
  primaryLight: 'rgba(3, 74, 248, 0.15)',
  success: '#35D07F',
  successLight: 'rgba(53, 208, 127, 0.15)',
  warning: '#FFB547',
  warningLight: 'rgba(255, 181, 71, 0.15)',
  danger: '#FF5C5C',
  dangerLight: 'rgba(255, 92, 92, 0.15)',
  background: '#011360',
  card: '#021A70',
  glass: 'rgba(2, 26, 112, 0.78)',
  surface1: 'rgba(2, 26, 112, 0.9)',
  surface2: 'rgba(1, 20, 96, 0.85)',
  surface3: 'rgba(1, 15, 76, 0.95)',
  overlay: 'rgba(1, 10, 48, 0.75)',
  accent: '#4A7AF8',
  textPrimary: '#F8F8F8',
  textSecondary: '#A6B0D6',
  textMuted: 'rgba(166, 176, 214, 0.72)',
  onPrimary: '#FFFFFF',
  highlight: 'rgba(255, 255, 255, 0.06)',
  scrim: 'rgba(1, 8, 36, 0.62)',
  accentSoft: '#9DB6FF',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.04)',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  xl: 32,
  full: 999,
};

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

/** Resuelve la familia según fontWeight (Android no mezcla peso con familia custom). */
export const fontFamilyForWeight = (weight?: string | number): string => {
  const w = typeof weight === 'string' ? parseInt(weight, 10) || (weight === 'bold' ? 700 : 400) : weight ?? 400;
  if (w >= 800) return fonts.extrabold;
  if (w >= 700) return fonts.bold;
  if (w >= 600) return fonts.semibold;
  if (w >= 500) return fonts.medium;
  return fonts.regular;
};

export const typography = {
  display: { fontFamily: fonts.extrabold, fontSize: 40, letterSpacing: -1.2, lineHeight: 44 },
  h1: { fontFamily: fonts.extrabold, fontSize: 32, letterSpacing: -0.8, lineHeight: 38 },
  h2: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.5, lineHeight: 32 },
  h3: { fontFamily: fonts.bold, fontSize: 22, letterSpacing: -0.3, lineHeight: 28 },
  h4: { fontFamily: fonts.bold, fontSize: 18, letterSpacing: -0.1, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyBold: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  captionBold: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.3 },
  label: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.2, lineHeight: 14, textTransform: 'uppercase' as const },
  price: { fontFamily: fonts.extrabold, fontSize: 40, letterSpacing: -1.2, lineHeight: 44, fontVariant: ['tabular-nums' as const] },
};

export const hit = { min: 48 };

export const motion = {
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
  springSoft: { damping: 22, stiffness: 160, mass: 1 },
  fast: 160,
  base: 280,
  stagger: 45,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  glow: {
    shadowColor: '#034af8',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
};
