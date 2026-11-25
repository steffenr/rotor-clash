/**
 * Guarantees for links that come from data files (card sources and photo credits): only absolute
 * `https:` URLs may reach an `href`. The data is curated and tested, but a wrong edit (or a
 * `javascript:` value) would otherwise become a clickable script in the card detail.
 */
export function httpsUrlOrEmpty(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' ? trimmed : '';
  } catch {
    return '';
  }
}
