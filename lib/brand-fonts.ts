export const brandFonts = [
  {
    id: 'system',
    label: 'System Sans',
    description: 'Clean and familiar',
    family:
      'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", sans-serif',
    tracking: '0.025em',
  },
  {
    id: 'friendly',
    label: 'Friendly Sans',
    description: 'Soft and approachable',
    family: '"Trebuchet MS", Verdana, "DejaVu Sans", sans-serif',
    tracking: '0.01em',
  },
  {
    id: 'serif',
    label: 'Editorial Serif',
    description: 'Classic and distinctive',
    family: 'Georgia, "Noto Serif", "Times New Roman", serif',
    tracking: '0',
  },
  {
    id: 'mono',
    label: 'Technical Mono',
    description: 'Precise and technical',
    family:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    tracking: '0.01em',
  },
] as const;
export const brandFontIds = ['system', 'friendly', 'serif', 'mono'] as const;
export function brandFontStyle(font: string = 'system', weight: number = 700) {
  const selected = brandFonts.find((option) => option.id === font) || brandFonts[0];
  return { fontFamily: selected.family, fontWeight: weight, letterSpacing: selected.tracking };
}
