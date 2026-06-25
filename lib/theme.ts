// Design tokens — thin map onto the CSS custom properties defined in
// app/globals.css (the single source of truth). C.danger resolves to
// "var(--danger)", so JS components stay token-named and typo-safe while the
// actual values live in CSS and can be re-themed (e.g. night mode) at runtime.
export const C = {
  bg: "var(--bg)",
  surface: "var(--surface)",
  raised: "var(--raised)",
  border: "var(--border)",
  borderLt: "var(--border-lt)",
  text: "var(--text)",
  bright: "var(--bright)",
  dim: "var(--dim)",
  value: "var(--value)",
  label: "var(--label)",
  safe: "var(--safe)",
  safeBr: "var(--safe-br)",
  caution: "var(--caution)",
  cautionBr: "var(--caution-br)",
  cautionDim: "var(--caution-dim)",
  danger: "var(--danger)",
  dangerBr: "var(--danger-br)",
  dangerDim: "var(--danger-dim)",
  blue: "var(--blue)",
  own: "var(--own)",
  guard: "var(--guard)",
  ring: "var(--ring)",
  aton: "var(--aton)",
  // radar-only chrome
  radarGrad0: "var(--radar-grad-0)",
  radarGrad1: "var(--radar-grad-1)",
  ringLabel: "var(--ring-label)",
  compassN: "var(--compass-n)",
  compass: "var(--compass)",
  radarInfo: "var(--radar-info)",
  labelBg: "var(--label-bg)",
  // elevation + glow (premium finish)
  cardShadow: "var(--card-shadow)",
  cardInset: "var(--card-inset)",
  glowCaution: "var(--glow-caution)",
  glowDanger: "var(--glow-danger)",
} as const;

export const FONT_MONO = "var(--font-mono)";
export const FONT_SANS = "var(--font-sans)";
