/** The designer accepts data, never HTML, executable URLs, or arbitrary CSS. */
const ENCODED_CONTROL = /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i;

function hasControl(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

function cleanTarget(value: string): string | undefined {
  if (typeof value !== 'string' || value.length > 2048 || hasControl(value) || ENCODED_CONTROL.test(value)) return undefined;
  const target = value.trim();
  if (!target || target.indexOf('\\') !== -1 || target.indexOf('//') === 0 || /^\/%(?:2f|5c)/i.test(target)) return undefined;
  return target;
}

export function safeLink(value: string): string | undefined {
  const target = cleanTarget(value);
  if (!target) return undefined;
  if (/^https?:\/\//i.test(target)) {
    try {
      const parsed = new URL(target);
      return parsed.hostname && !parsed.username && !parsed.password ? target : undefined;
    } catch { return undefined; }
  }
  if (/^mailto:[^\s?@]+@[^\s?@]+(?:\?[^\s]*)?$/i.test(target)) return target;
  if (/^tel:\+?[0-9(). -]{3,40}$/i.test(target)) return target;
  // A relative URL cannot contain a protocol-like colon or an encoded separator in its first segment.
  if (/^[^/?#]*:/.test(target) || /^[^/?#]*%(?:3a|2f|5c)/i.test(target)) return undefined;
  if (/^(?:\/|\.|#|\?|[a-z0-9_-])/i.test(target)) return target;
  return undefined;
}

export function safeImage(value: string): string | undefined {
  const target = cleanTarget(value);
  if (!target) return undefined;
  if (/^https:\/\//i.test(target)) return safeLink(target);
  return target.charAt(0) === '/' ? target : undefined;
}

/** An explicit image host policy avoids unapproved third-party tracking requests.
 * Historical instances can opt into the legacy any-HTTPS behavior. Hostnames
 * in the trusted list are exact matches, not wildcard suffixes. */
export function safeTileImage(value: string, currentSiteUrl: string, policy: 'tenant' | 'any-https', trustedHosts: string = ''): string | undefined {
  const image = safeImage(value);
  if (!image) return undefined;
  if (image.startsWith('/')) return image;
  if (policy === 'any-https') return image;
  try {
    const parsed = new URL(image);
    const tenant = new URL(currentSiteUrl);
    const hosts = trustedHosts.toLowerCase().split(/[\s,;]+/).filter(name => /^[a-z0-9.-]+$/.test(name) && name.length <= 253);
    return parsed.hostname === tenant.hostname || hosts.includes(parsed.hostname) ? image : undefined;
  } catch { return undefined; }
}

export function normalizeColor(value: unknown): string {
  if (typeof value !== 'string') return '';
  const color = value.trim();
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color) ? color.toLowerCase() : '';
}

export function validateSiteUrl(value: string, currentSiteUrl: string): string {
  const base = new URL(currentSiteUrl);
  const raw = value.trim() || currentSiteUrl;
  const target = safeLink(raw);
  if (!target) throw new Error('Enter a valid SharePoint site URL.');
  const url = new URL(target, base.origin);
  if (url.origin !== base.origin || url.protocol !== 'https:' || url.search || url.hash || /\/_api(?:\/|$)/i.test(url.pathname)) {
    throw new Error('Use a SharePoint site on the same tenant hostname, without a query or fragment.');
  }
  return url.href.replace(/\/$/, '');
}

export function validateListId(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error('Choose a SharePoint list before connecting.');
  }
  return value;
}

export function validFieldName(value: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]{0,127}$/.test(value);
}

export function escapeOData(value: string): string {
  return value.replace(/'/g, "''");
}
