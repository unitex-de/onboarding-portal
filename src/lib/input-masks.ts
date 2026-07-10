export type MaskType = 'mobile' | 'phone' | 'iban' | 'digits';

// ─── Format functions ────────────────────────────────────────────────────────

/** +XX NNN NNNNNNNN — max 13 digits */
export function formatMobile(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 13);
  if (!d) return '';
  let r = '+' + d.slice(0, 2);
  if (d.length > 2) r += ' ' + d.slice(2, 5);
  if (d.length > 5) r += ' ' + d.slice(5);
  return r;
}

/** NNNN NNNNN (NN) — max 11 digits */
export function formatPhone(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 11);
  if (!d) return '';
  let r = d.slice(0, 4);
  if (d.length > 4) r += ' ' + d.slice(4, 9);
  if (d.length > 9) r += ' (' + d.slice(9) + (d.length >= 11 ? ')' : '');
  return r;
}

/** Strips everything except digits */
export function formatDigits(input: string): string {
  return input.replace(/\D/g, '');
}
/** Groups of 4 separated by spaces — DE=22, AT=20, CH=21, else max 34 chars */
export function formatIBAN(input: string): string {
  const c = input.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const cc = c.slice(0, 2);
  const maxLen = cc === 'DE' ? 22 : cc === 'AT' ? 20 : cc === 'CH' ? 21 : 34;
  const s = c.slice(0, maxLen);
  const groups: string[] = [];
  for (let i = 0; i < s.length; i += 4) groups.push(s.slice(i, i + 4));
  return groups.join(' ');
}

// ─── Mask config ─────────────────────────────────────────────────────────────

export const MASK_CONFIG: Record<
  MaskType,
  { format: (v: string) => string; isContent: (c: string) => boolean }
> = {
  mobile: { format: formatMobile, isContent: (c) => /\d/.test(c) },
  phone:  { format: formatPhone,  isContent: (c) => /\d/.test(c) },
  iban:   { format: formatIBAN,   isContent: (c) => /[A-Z0-9]/i.test(c) },
  digits: { format: formatDigits, isContent: (c) => /\d/.test(c) },
};

// ─── Cursor helpers ───────────────────────────────────────────────────────────

/** Number of content chars strictly before `pos` in `str`. */
export function contentCountBefore(
  str: string,
  pos: number,
  isContent: (c: string) => boolean,
): number {
  let n = 0;
  for (let i = 0; i < pos && i < str.length; i++) {
    if (isContent(str[i])) n++;
  }
  return n;
}

/**
 * Position in `formatted` immediately after the n-th content char.
 * Returns 0 when n=0 (before everything), formatted.length when n exceeds total.
 */
export function cursorFromContent(
  formatted: string,
  n: number,
  isContent: (c: string) => boolean,
): number {
  if (n === 0) return 0;
  let count = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (isContent(formatted[i])) {
      count++;
      if (count === n) return i + 1;
    }
  }
  return formatted.length;
}
