/** WCAG contrast calculation, including compositing hex alpha over the theme. */
type Rgb = [number, number, number];
function decodeHex(input: string): { rgb: Rgb; alpha: number } | undefined {
  const value = input.replace(/^#/, '');
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return undefined;
  const expanded = value.length <= 4 ? value.split('').map(ch => ch + ch).join('') : value;
  return { rgb: [0, 2, 4].map(i => parseInt(expanded.slice(i, i + 2), 16)) as Rgb, alpha: expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1 };
}
function composited(front: string, back: Rgb): Rgb {
  const decoded = decodeHex(front);
  if (!decoded) return back;
  return decoded.rgb.map((ch, i) => ch * decoded.alpha + back[i] * (1 - decoded.alpha)) as Rgb;
}
function luminance(rgb: Rgb): number {
  const v = rgb.map(channel => {
    const value = channel / 255;
    return value <= .04045 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4);
  });
  return v[0] * .2126 + v[1] * .7152 + v[2] * .0722;
}
/** Effective composited contrast; large text may need a lower threshold. */
export function contrastRatio(foreground: string, background: string, canvas: string = '#ffffff'): number {
  const base = composited(canvas, [255, 255, 255]);
  const bg = composited(background, base);
  const fg = composited(foreground, bg);
  const a = luminance(bg), b = luminance(fg);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
export interface ContrastIssue { label: string; ratio: number; minimum: number; }
export function checkTileContrast(settings: {
  text: string; muted: string; accent: string; background: string; canvas?: string;
}): ContrastIssue[] {
  const { background, canvas } = settings;
  return ([
    { label: 'Title and body text', ratio: contrastRatio(settings.text, background, canvas), minimum: 4.5 },
    { label: 'Supporting text and status labels', ratio: contrastRatio(settings.muted, background, canvas), minimum: 4.5 },
    { label: 'Action links and icon labels', ratio: contrastRatio(settings.accent, background, canvas), minimum: 4.5 }
  ] as ContrastIssue[]).filter(result => result.ratio < result.minimum);
}
