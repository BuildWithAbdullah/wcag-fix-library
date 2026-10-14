/**
 * 2.4.7 Focus Visible, judged.
 *
 * The criterion: any keyboard operable interface has a mode of operation
 * where the focus indicator is visible.
 *
 * There is one trap in measuring this and it produces a false failure on a
 * correct page, which is the worst direction to be wrong in. A modern
 * stylesheet writes its indicator under :focus-visible, and :focus-visible
 * does not match when focus was moved by script after a pointer interaction.
 * Measure by calling element.focus() and every correct page in this library
 * reports no indicator at all. The observation this judge reads is built from
 * real Tab presses for that reason. See audit/tab.mjs.
 */

import { failure, limit } from '../findings.mjs';
import { parseColour, over } from '../colour.mjs';
import { ratio, round, THRESHOLDS, MINIMUM_SENSIBLE_INDICATOR_PX } from '../contrast.mjs';

/**
 * The indicator properties, split into the ones that paint something and the
 * ones that do not.
 *
 * This split exists because of a defect in the obvious version of this check.
 * The obvious version diffs the computed indicator properties before and
 * after focus and calls any difference an indicator. On the failing example
 * in this library, the plain link under a global `*:focus { outline: none }`
 * came back with a difference: Chrome's own user agent stylesheet sets
 * `outline-offset: 1px` on :focus-visible, and it sets it whether or not
 * there is an outline to offset. So the page that removes focus from every
 * element on the site passed a check written to catch exactly that.
 *
 * An offset with no outline paints nothing. An outline colour with a width of
 * zero paints nothing. Only a change that puts ink on the screen counts.
 */
const PAINTING = ['outline', 'boxShadow', 'backgroundColor', 'border', 'textDecorationLine', 'filter'];

const NON_PAINTING = ['outlineOffset', 'outlineColor', 'outlineWidth', 'outlineStyle', 'borderColor', 'borderWidth'];

const drawsOutlineIn = (style) =>
  style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0;

/**
 * The changes between an unfocused and a focused state that actually put ink
 * on the screen. An empty result means the control has no visible indicator,
 * whatever else about its computed style moved.
 */
export function paintedDelta(before, after) {
  const painted = [];

  const drewBefore = drawsOutlineIn(before);
  const drawsAfter = drawsOutlineIn(after);
  if (drawsAfter && !drewBefore) painted.push('outline appears');
  else if (
    drawsAfter &&
    drewBefore &&
    (before.outlineWidth !== after.outlineWidth || before.outlineColor !== after.outlineColor)
  ) {
    painted.push('outline changes');
  }

  if (after.boxShadow !== 'none' && after.boxShadow !== before.boxShadow) painted.push('boxShadow');
  if (after.backgroundColor !== before.backgroundColor) painted.push('backgroundColor');
  if (
    Number.parseFloat(after.borderWidth) > 0 &&
    (after.borderWidth !== before.borderWidth || after.borderColor !== before.borderColor)
  ) {
    painted.push('border');
  }
  if (after.textDecorationLine !== 'none' && after.textDecorationLine !== before.textDecorationLine) {
    painted.push('textDecorationLine');
  }
  if (after.filter !== 'none' && after.filter !== before.filter) painted.push('filter');

  return painted;
}

/**
 * Properties that moved without painting anything. Named in the finding so a
 * reader can see why a diff-based check would have called this page clean.
 */
export function inertDelta(before, after) {
  if (paintedDelta(before, after).length > 0) return [];
  return NON_PAINTING.filter((p) => before[p] !== after[p]);
}

export function judge(obs) {
  const out = [];
  let boxShadowOnly = [];

  for (const control of obs.controls) {
    const diff = paintedDelta(control.before, control.after);

    if (diff.length === 0) {
      const inert = inertDelta(control.before, control.after);
      out.push(
        failure(
          '2.4.7/no-indicator-on-focus',
          `A Tab press focuses ${control.ref} ("${control.name}") and nothing is painted. ` +
            `outline-style is ${control.after.outlineStyle} at ${control.after.outlineWidth}, ` +
            'the background, border, underline and shadow are unchanged, so there is no mode ' +
            'of operation in which focus is visible on this control' +
            (inert.length
              ? `. ${inert.join(' and ')} did change between the two states, which is what makes ` +
                'this page pass a check written as a plain diff of the indicator properties: ' +
                'the browser moves outline-offset on :focus-visible whether or not there is an ' +
                'outline to offset.'
              : '.')
        )
      );
      continue;
    }

    const drawsOutline = drawsOutlineIn(control.after);

    if (drawsOutline) {
      const width = Number.parseFloat(control.after.outlineWidth);
      if (width < MINIMUM_SENSIBLE_INDICATOR_PX) {
        out.push(
          failure(
            '2.4.7/indicator-thinner-than-2px',
            `${control.ref} draws a ${control.after.outlineWidth} focus ring. 2.4.7 sets no ` +
              'thickness, so this is not a Level AA failure on its own, but a hairline ring at ' +
              'the element edge is the most common way an indicator exists in the stylesheet ' +
              'and not on the screen. 2.4.13 Focus Appearance, which is AAA, asks for the ' +
              `equivalent of a ${MINIMUM_SENSIBLE_INDICATOR_PX}px perimeter.`
          )
        );
      }

      // The ring is painted outside the element's own border box, so the
      // colour it has to contrast with is the colour behind the element, not
      // the element's own background. Measuring against the element's
      // background turns a ring nobody can see into a passing one.
      const ring = parseColour(control.after.outlineColor);
      const behind = parseColour(control.backdropBehind);
      if (ring === null || behind === null) {
        out.push(
          limit(
            '2.4.7/indicator-colour-not-resolvable',
            `${control.ref} draws a ring in ${control.after.outlineColor} against ` +
              `${control.backdropBehind}${control.backdropReason ? ` (${control.backdropReason})` : ''}, ` +
              'and at least one of the two cannot be resolved to a flat sRGB colour, so no ' +
              'ratio is reported for it. Nothing is assumed in either direction.'
          )
        );
      } else {
        const solid = ring[3] === 1 ? ring : over(ring, behind);
        const r = solid ? ratio(solid, behind) : null;
        if (r !== null && r < THRESHOLDS.focusIndicator) {
          out.push(
            failure(
              '2.4.7/indicator-contrast-below-3',
              `${control.ref} draws its focus ring in ${control.after.outlineColor} against ` +
                `${control.backdropBehind}, which is ${round(r)}:1. A focus indicator is a ` +
                `graphical object, so 1.4.11 asks for ${THRESHOLDS.focusIndicator}:1. ` +
                'A ring exists here and it cannot be seen.'
            )
          );
        }
      }
    }

    if (diff.includes('boxShadow')) boxShadowOnly.push(control.ref);
  }

  if (boxShadowOnly.length > 0) {
    out.push(
      limit(
        '2.4.7/box-shadow-layers-not-judged',
        `${boxShadowOnly.length} control(s) build part of the indicator out of box-shadow ` +
          `layers: ${[...new Set(boxShadowOnly)].join(', ')}. This judging measures the outline ` +
          'colour against the colour behind the element. A stacked shadow ring is a sequence of ' +
          'layers at different offsets and its effective contrast is not computed here, so for ' +
          'those controls the figure reported covers the outline layer only.'
      )
    );
  }

  if (!obs.environment.forcedColors) {
    out.push(
      limit(
        '2.4.7/forced-colors-branch-not-exercised',
        'The browser this ran in reports (forced-colors: active) as false, so any ' +
          '@media (forced-colors: active) rule in the stylesheet was never applied and the ' +
          'indicator it defines was never measured. Windows high contrast mode discards author ' +
          'colours, which is the one case where a ring that measures well can disappear entirely.'
      )
    );
  }

  return out;
}
