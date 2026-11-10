export const messageFromError = (error: unknown): string => error instanceof Error ? error.message : 'The request could not be completed. Try again.';
export const textOnAccent = (color: string): string => {
  let hex = color.replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.split('').map((character) => `${character}${character}`).join('');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return '#ffffff';
  const channel = (offset: number): number => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return luminance > 0.179 ? '#000000' : '#ffffff';
};
