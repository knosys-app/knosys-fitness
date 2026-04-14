/**
 * Signature palette — JS mirror of the CSS tokens declared in
 * /styles.css under `.knosys-fitness-root`.
 *
 * Why a JS mirror? CSS vars don't propagate reliably through
 * Recharts SVG attributes (fill/stroke resolve at render time,
 * in some cases against document root where our scoped vars
 * don't exist). All chart and SVG consumers should import from
 * here instead of referencing `hsl(var(--knf-*))`.
 */

export const SIG_PALETTE = {
  // Surface
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  surface2: '#F4F3EE',
  ink: '#0C0E05',
  ink2: '#3F4A2A',
  muted: '#8A8F82',
  hairline: '#E6E6DC',

  // Hero (signature chartreuse)
  hero: '#B8E82A',
  heroInk: '#3F5A00',
  heroWash: '#EEF9CF',
  heroEdge: '#A8DC19',

  // Semantic — one token per metric meaning
  calBurn: '#FF5C1F',
  protein: '#8B5CF6',
  carbs: '#F0B429',
  fat: '#EC4B8C',
  hydration: '#0086FF',
  steps: '#00C08B',
  sleep: '#6B5EFF',
  heart: '#FF2D55',
  weightDown: '#00A86B',
  weightUp: '#FF6B35',

  // State
  success: '#00A86B',
  warning: '#FFB400',
  alert: '#FF3B30',
} as const;

export type SigPaletteKey = keyof typeof SIG_PALETTE;

export const getSig = (key: SigPaletteKey): string => SIG_PALETTE[key];

/**
 * Semantic colors — kebab-case keys that map to meanings,
 * not to palette positions. Consumers pass these into primitives
 * via `accent` props so the design system can evolve the underlying
 * hex without a renaming pass.
 */
export type SemanticColor =
  | 'cal-burn'
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'hydration'
  | 'steps'
  | 'sleep'
  | 'heart'
  | 'weight-down'
  | 'weight-up'
  | 'hero'
  | 'success'
  | 'warning'
  | 'alert'
  | 'muted'
  | 'ink';

const SEMANTIC_TO_HEX: Record<SemanticColor, string> = {
  'cal-burn': SIG_PALETTE.calBurn,
  protein: SIG_PALETTE.protein,
  carbs: SIG_PALETTE.carbs,
  fat: SIG_PALETTE.fat,
  hydration: SIG_PALETTE.hydration,
  steps: SIG_PALETTE.steps,
  sleep: SIG_PALETTE.sleep,
  heart: SIG_PALETTE.heart,
  'weight-down': SIG_PALETTE.weightDown,
  'weight-up': SIG_PALETTE.weightUp,
  hero: SIG_PALETTE.hero,
  success: SIG_PALETTE.success,
  warning: SIG_PALETTE.warning,
  alert: SIG_PALETTE.alert,
  muted: SIG_PALETTE.muted,
  ink: SIG_PALETTE.ink,
};

export const semanticToHex = (key: SemanticColor): string => SEMANTIC_TO_HEX[key];

/** CSS custom-property name for a semantic key, for CSS-land consumers. */
export const semanticToVar = (key: SemanticColor): string => {
  const map: Record<SemanticColor, string> = {
    'cal-burn': 'var(--knf-cal-burn)',
    protein: 'var(--knf-protein)',
    carbs: 'var(--knf-carbs)',
    fat: 'var(--knf-fat)',
    hydration: 'var(--knf-hydration)',
    steps: 'var(--knf-steps)',
    sleep: 'var(--knf-sleep)',
    heart: 'var(--knf-heart)',
    'weight-down': 'var(--knf-weight-down)',
    'weight-up': 'var(--knf-weight-up)',
    hero: 'var(--knf-hero)',
    success: 'var(--knf-success)',
    warning: 'var(--knf-warning)',
    alert: 'var(--knf-alert)',
    muted: 'var(--knf-muted)',
    ink: 'var(--knf-ink)',
  };
  return map[key];
};

/** Soft (10% alpha) version of a semantic color — for soft badges, backgrounds. */
export const semanticToSoft = (key: SemanticColor): string => {
  const hex = semanticToHex(key);
  // Convert #RRGGBB to rgba(…, 0.1)
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.1)`;
};
