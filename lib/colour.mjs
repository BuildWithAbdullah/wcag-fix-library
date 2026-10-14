/**
 * colour.mjs
 *
 * Parsing and compositing of the colour strings a browser actually returns
 * from getComputedStyle. Pure: no DOM, no browser, no dependencies, so the
 * judging in lib/judge/ can be unit tested without launching anything.
 *
 * getComputedStyle does not hand back what the author wrote. It hands back a
 * resolved value, and for colours that is almost always one of:
 *
 *   rgb(26, 26, 26)
 *   rgba(0, 0, 0, 0)            the resolved form of `transparent`
 *   rgba(26, 26, 26, 0.5)
 *   color(srgb 0.1 0.1 0.1)     when the author used a wide gamut function
 *
 * The last of those is the one that matters. A value this module cannot
 * resolve must come back as null rather than as black, because black is the
 * answer that quietly turns an unjudgeable control into a passing one.
 */

const NAMED = {
  transparent: [0, 0, 0, 0],
  black: [0, 0, 0, 1],
  white: [255, 255, 255, 1],
  red: [255, 0, 0, 1],
  lime: [0, 255, 0, 1],
  blue: [0, 0, 255, 1],
  silver: [192, 192, 192, 1],
  gray: [128, 128, 128, 1],
  grey: [128, 128, 128, 1],
  currentcolor: null,
};

const clamp255 = (n) => Math.min(255, Math.max(0, n));

function fromHex(text) {
  const body = text.slice(1);
  const expand = (s) => parseInt(s.length === 1 ? s + s : s, 16);
  if (body.length === 3 || body.length === 4) {
    const parts = body.split('').map(expand);
    return [parts[0], parts[1], parts[2], body.length === 4 ? parts[3] / 255 : 1];
  }
  if (body.length === 6 || body.length === 8) {
    const parts = [];
    for (let i = 0; i < body.length; i += 2) parts.push(parseInt(body.slice(i, i + 2), 16));
    return [parts[0], parts[1], parts[2], body.length === 8 ? parts[3] / 255 : 1];
  }
  return null;
}

function channel(token) {
  const t = token.trim();
  if (t.endsWith('%')) {
    const pct = Number.parseFloat(t);
    return Number.isFinite(pct) ? clamp255(Math.round((pct / 100) * 255)) : null;
  }
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? clamp255(Math.round(n)) : null;
}

function alpha(token) {
  if (token === undefined) return 1;
  const t = token.trim();
  if (t === 'none') return 1;
  if (t.endsWith('%')) {
    const pct = Number.parseFloat(t);
    return Number.isFinite(pct) ? Math.min(1, Math.max(0, pct / 100)) : null;
  }
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : null;
}

/**
 * Parse a colour string into [r, g, b, a] with r, g, b in 0 to 255 and a in
 * 0 to 1, or null when the value cannot be resolved to plain sRGB.
 *
 * Returning null for an unresolvable value is the whole point of this
 * function. Every caller in this repository treats null as "not judged" and
 * reports it, rather than substituting a default.
 */
export function parseColour(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();
  if (text === '') return null;

  if (Object.prototype.hasOwnProperty.call(NAMED, text)) return NAMED[text];

  if (text.startsWith('#')) return fromHex(text);

  const fn = /^(rgba?)\((.*)\)$/.exec(text);
  if (fn) {
    // Both the legacy comma form and the modern space form, which Chrome
    // emits for `rgb(0 0 0 / 50%)`.
    const body = fn[2].replace(/\//g, ' / ');
    const slash = body.split('/');
    const parts = slash[0].trim().split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const r = channel(parts[0]);
    const g = channel(parts[1]);
    const b = channel(parts[2]);
    const a = alpha(slash.length > 1 ? slash[1] : parts[3]);
    if (r === null || g === null || b === null || a === null) return null;
    return [r, g, b, a];
  }

  // color(), lab(), oklch(), colour spaces beyond sRGB, and anything else a
  // future browser resolves to. Not guessed at.
  return null;
}

/**
 * Composite a colour with alpha over an opaque backdrop. Needed because a
 * control border at rgba(0, 0, 0, 0.2) over white is not black, and judging
 * it as black would pass a boundary a user cannot see.
 */
export function over(colour, backdrop) {
  if (!colour || !backdrop) return null;
  if (backdrop[3] !== 1) return null;
  const a = colour[3];
  return [
    Math.round(colour[0] * a + backdrop[0] * (1 - a)),
    Math.round(colour[1] * a + backdrop[1] * (1 - a)),
    Math.round(colour[2] * a + backdrop[2] * (1 - a)),
    1,
  ];
}

export const isTransparent = (colour) => Array.isArray(colour) && colour[3] === 0;
