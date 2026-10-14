/**
 * contrast.mjs
 *
 * WCAG 2.x relative luminance and contrast ratio. Pure.
 *
 * One detail worth knowing, because it is the sort of thing that makes two
 * tools disagree by a hair and send somebody looking for a bug that is not
 * there. The published WCAG 2.1 text breaks the sRGB transfer function at
 * 0.03928. The value that actually makes the piecewise function continuous is
 * 0.04045, and the sRGB specification itself uses 0.04045. The difference
 * affects only colours in a narrow band near black and never moves a ratio
 * across a threshold, but it does move the third decimal place.
 *
 * This module follows the published WCAG text, which is also what axe-core
 * does, so that a figure from `npm run audit` can be compared with a figure
 * from a scanner without a footnote.
 */

const WCAG_TRANSFER_BREAK = 0.03928;

const linearise = (channel) => {
  const c = channel / 255;
  return c <= WCAG_TRANSFER_BREAK ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** Relative luminance of an opaque sRGB colour, 0 for black and 1 for white. */
export function luminance(colour) {
  if (!Array.isArray(colour) || colour.length < 3) return null;
  if (colour[3] !== undefined && colour[3] !== 1) return null;
  return (
    0.2126 * linearise(colour[0]) +
    0.7152 * linearise(colour[1]) +
    0.0722 * linearise(colour[2])
  );
}

/**
 * Contrast ratio between two opaque colours, from 1 to 21. Order does not
 * matter. Returns null if either colour is not opaque, because a ratio
 * against a translucent colour is not defined until it has been composited,
 * and compositing needs to know what is behind it.
 */
export function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Rounded to two places, the precision every report in this repository uses. */
export const round = (value) => (value === null ? null : Math.round(value * 100) / 100);

/**
 * The thresholds, with the reason each one is the number it is. These are
 * quoted in finding messages so a reader never has to go and look one up.
 */
export const THRESHOLDS = {
  /** 1.4.3, body text below 18.66px regular or 24px bold. */
  textNormal: 4.5,
  /** 1.4.3, large text. */
  textLarge: 3,
  /**
   * 1.4.11, the boundary of a user interface component and any graphical
   * object needed to understand the content.
   */
  nonText: 3,
  /**
   * 2.4.11 does not set a contrast figure at all. A focus indicator's
   * contrast is governed by 1.4.11 at AA, which is why this repository judges
   * a focus ring at 3 and not at the 4.5 that is sometimes quoted. 2.4.13
   * Focus Appearance, which does set indicator requirements, is AAA and
   * outside this library's stated scope.
   */
  focusIndicator: 3,
};

/**
 * 2.4.13 is AAA and out of scope, but its 2px figure is the only number in
 * the specification that says how thick an indicator has to be, and a 1px
 * ring is the single most common way a focus indicator exists on paper and
 * not in practice. Reported as a warning, never as a WCAG AA failure.
 */
export const MINIMUM_SENSIBLE_INDICATOR_PX = 2;
