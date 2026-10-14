/**
 * 1.4.11 Non-text Contrast, judged.
 *
 * The criterion: the visual presentation of a user interface component's
 * boundary, and of graphical objects needed to understand the content, has a
 * contrast ratio of at least 3:1 against adjacent colours.
 *
 * This is the criterion that makes a page with a perfect automated report
 * unusable. A text contrast scanner reads 1.4.3 and reports the label and the
 * typed value, both of which are usually fine. Nothing reads the one pixel
 * border that is the only thing telling the user where the field is.
 *
 * "Adjacent colours" is a plural on purpose. A border has a colour on each
 * side of it, and the boundary is perceivable if it stands out against
 * either, so the ratio taken here is the better of the two. Taking only the
 * outside colour reports a dark button with a dark border as a failure.
 */

import { failure, limit } from '../findings.mjs';
import { parseColour, over } from '../colour.mjs';
import { ratio, round, THRESHOLDS } from '../contrast.mjs';

/** The better of the ratios against each adjacent colour, or null. */
export function boundaryRatio(ink, adjacents) {
  const solidInk = ink && ink[3] === 1 ? ink : null;
  let best = null;
  for (const side of adjacents) {
    if (!side) continue;
    const resolvedInk = solidInk || over(ink, side);
    const r = ratio(resolvedInk, side);
    if (r !== null && (best === null || r > best)) best = r;
  }
  return best;
}

export function judge(obs) {
  const out = [];
  const unresolved = [];

  for (const control of obs.controls) {
    const ink = parseColour(control.borderColour);
    const outside = parseColour(control.backdropOutside);
    const inside = parseColour(control.backgroundInside);

    if (ink === null || (outside === null && inside === null)) {
      unresolved.push(
        `${control.ref} (border ${control.borderColour} against ` +
          `${control.backdropOutsideReason || control.backdropOutside})`
      );
      continue;
    }

    const r = boundaryRatio(ink, [outside, inside]);
    if (r === null) {
      // Both adjacent colours were present and neither produced a ratio,
      // which happens when the one that resolved is itself transparent and
      // the other is a gradient or an image. Dropping this case silently
      // was a defect: the control on the gradient in the corrected example
      // produced no finding at all, so the repository's claim that it
      // refuses to judge a gradient was not being made by the code.
      unresolved.push(
        `${control.ref} (border ${control.borderColour}; outside is ` +
          `${control.backdropOutsideReason || control.backdropOutside} and inside is ` +
          `${control.backgroundInside}, so neither side yields a flat colour to compare against)`
      );
      continue;
    }
    if (r < THRESHOLDS.nonText) {
      out.push(
        failure(
          '1.4.11/control-boundary-below-3',
          `${control.ref} draws its ${control.borderWidth} boundary in ${control.borderColour}, ` +
            `which is ${round(r)}:1 against the best of its adjacent colours ` +
            `(${control.backdropOutside} outside, ${control.backgroundInside} inside). ` +
            `${THRESHOLDS.nonText}:1 is required. The text in this control may well pass 1.4.3 ` +
            'perfectly; the user still cannot see where it is.'
        )
      );
    }
  }

  for (const box of obs.unborderedBoxes) {
    const fill = parseColour(box.background);
    const behind = parseColour(box.backdrop);
    if (fill === null || behind === null) {
      unresolved.push(`${box.ref} (fill ${box.background} against ${box.backdropReason || box.backdrop})`);
      continue;
    }
    const r = ratio(fill[3] === 1 ? fill : over(fill, behind), behind);
    if (r !== null && r < THRESHOLDS.nonText) {
      out.push(
        failure(
          '1.4.11/control-shaped-box-without-a-perceivable-boundary',
          `${box.ref} is a ${Math.round(box.rect.w)} by ${Math.round(box.rect.h)} box whose only ` +
            `boundary is a fill of ${box.background} against ${box.backdrop}, which is ` +
            `${round(r)}:1. It has no border to carry the boundary instead, so there is nothing ` +
            'at 3:1 anywhere on its edge.'
        )
      );
    }
  }

  for (const icon of obs.icons) {
    const ink = parseColour(icon.fill);
    const behind = parseColour(icon.backdrop);
    if (ink === null || behind === null) {
      unresolved.push(`${icon.ref} (fill ${icon.fill} against ${icon.backdropReason || icon.backdrop})`);
      continue;
    }
    const r = ratio(ink[3] === 1 ? ink : over(ink, behind), behind);
    if (r !== null && r < THRESHOLDS.nonText) {
      out.push(
        failure(
          '1.4.11/meaningful-icon-below-3',
          `${icon.ref} carries the accessible name "${icon.name}", which makes it a graphical ` +
            `object needed to understand the content. It is drawn in ${icon.fill} against ` +
            `${icon.backdrop}, which is ${round(r)}:1. A decorative icon would be exempt; one ` +
            'with a name is not.'
        )
      );
    }
  }

  for (const pair of obs.statePairs) {
    const a = parseColour(pair.aBackground);
    const b = parseColour(pair.bBackground);
    if (a === null || b === null || a[3] !== 1 || b[3] !== 1) {
      out.push(
        limit(
          '1.4.11/state-difference-beyond-colour-not-judged',
          `${pair.aRef} and ${pair.bRef} are the same size and are not distinguished by a flat ` +
            `background colour this judging can compare (${pair.aBackground} against ` +
            `${pair.bBackground}). On the corrected pattern that is the point: the knob moves, ` +
            'so the state is carried by position as well as by colour, and position is not ' +
            'something a contrast figure can express. The thing that makes this control ' +
            'readable is not the thing that was measured.'
        )
      );
      continue;
    }
    const r = ratio(a, b);
    if (r !== null && r < THRESHOLDS.nonText) {
      out.push(
        failure(
          '1.4.11/state-fill-below-3',
          `${pair.aRef} and ${pair.bRef} are identically sized and differ only in background: ` +
            `${pair.aBackground} against ${pair.bBackground} is ${round(r)}:1. Whatever the two ` +
            'states mean, a user cannot tell which one they are looking at.'
        )
      );
    }
  }

  if (unresolved.length > 0) {
    out.push(
      limit(
        '1.4.11/background-not-a-flat-colour-not-judged',
        `${unresolved.length} boundary or graphic could not be given a ratio: ` +
          `${unresolved.join('; ')}. A gradient, an image or a colour in a space wider than ` +
          'sRGB has no single value to compare against, and this judging reports that rather ' +
          'than sampling one pixel and calling it the background. Those cases need an eye or a ' +
          'screenshot.'
      )
    );
  }

  return out;
}
