/**
 * 2.4.11 Focus Not Obscured (Minimum), judged.
 *
 * The criterion, read precisely, because the precision is the whole point:
 * when a component receives keyboard focus, it is not <em>entirely</em>
 * hidden by author-created content. Partly hidden passes at Level AA. It is
 * 2.4.12 Focus Not Obscured (Enhanced), at Level AAA, that asks for no part
 * of the component to be hidden.
 *
 * So this judging reports two different things and only one of them is a
 * failure. A focused control completely under a sticky header fails 2.4.11. A
 * focused control with a corner clipped by a chat widget does not, and
 * calling it a failure would be reporting a AAA requirement as a AA one,
 * which is how an audit loses a client's trust on the second page.
 */

import { failure, limit } from '../findings.mjs';

/** Fraction of `target` covered by `cover`, 0 to 1. */
export function coveredFraction(target, cover) {
  const w = Math.max(0, Math.min(target.x + target.w, cover.x + cover.w) - Math.max(target.x, cover.x));
  const h = Math.max(0, Math.min(target.y + target.h, cover.y + cover.h) - Math.max(target.y, cover.y));
  const area = target.w * target.h;
  if (area <= 0) return 0;
  return (w * h) / area;
}

const ENTIRELY = 0.995;

export function judge(obs) {
  const out = [];
  const partly = [];

  for (const step of obs.steps) {
    for (const cover of step.covers) {
      const fraction = coveredFraction(step.rect, cover.rect);
      if (fraction >= ENTIRELY) {
        out.push(
          failure(
            '2.4.11/focused-element-entirely-obscured',
            `${step.ref} ("${step.name}") took focus after ${step.via} and was completely ` +
              `covered by ${cover.ref}, which is position:${cover.position} at z-index ` +
              `${cover.zIndex}. The browser scrolled the element to the top of the scrollport, ` +
              'decided it was in view, and stopped. It is in view and it is behind something.'
          )
        );
      } else if (fraction > 0.02) {
        partly.push({ ref: step.ref, cover: cover.ref, fraction });
      }
    }
  }

  for (const p of partly) {
    out.push(
      limit(
        '2.4.11/focused-element-partly-obscured',
        `${p.ref} is ${Math.round(p.fraction * 100)}% covered by ${p.cover} while focused. ` +
          '2.4.11 at Level AA asks only that the component is not entirely hidden, so this ' +
          'passes the criterion being judged. It fails 2.4.12 Focus Not Obscured (Enhanced) at ' +
          'Level AAA, which is outside this library\'s stated scope and is recorded here so the ' +
          'difference between the two is a measurement rather than a footnote.'
      )
    );
  }

  if (obs.fragmentTarget && obs.fragmentTarget.fraction >= ENTIRELY) {
    out.push(
      failure(
        '2.4.11/fragment-target-entirely-obscured',
        `Activating ${obs.fragmentTarget.via} moved focus to ${obs.fragmentTarget.ref}, which ` +
          `is completely covered by ${obs.fragmentTarget.cover}. The first thing the skip link ` +
          'does for a keyboard user is hide the thing it skipped to.'
      )
    );
  }

  if (obs.obscurers.length === 0) {
    out.push(
      limit(
        '2.4.11/nothing-fixed-or-sticky-to-judge-against',
        'No visible element on this page is position:fixed or position:sticky, so there is ' +
          'nothing that can obscure a focused control and this criterion is met without any ' +
          'measurement being informative.'
      )
    );
  }

  return out;
}
