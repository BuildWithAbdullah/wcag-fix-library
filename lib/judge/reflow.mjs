/**
 * 1.4.10 Reflow, judged.
 *
 * The criterion: content can be presented at 320 CSS px wide without needing
 * to scroll in two directions. 320px is not arbitrary. It is 1280px at 400%
 * zoom, which is the reflow requirement expressed the way a user meets it.
 *
 * No scanner on the market reports this, because the DOM at the author's
 * viewport does not contain the answer. You have to make the viewport 320px
 * wide and then measure. That is what audit/collectors/reflow.mjs does, and
 * this file judges what it measured.
 */

import { failure, limit } from '../findings.mjs';

export const TARGET_WIDTH = 320;

/** Tables and other data grids are the documented exception in the criterion. */
const SCROLLABLE = new Set(['auto', 'scroll']);

export function judge(obs) {
  const out = [];
  const w = obs.viewport.width;

  if (w !== TARGET_WIDTH) {
    throw new Error(
      `reflow must be judged at ${TARGET_WIDTH}px, not ${w}px. ` +
        'Judging a wider viewport is the mistake that makes this criterion look clean.'
    );
  }

  if (obs.document.scrollWidth > obs.document.clientWidth) {
    out.push(
      failure(
        '1.4.10/document-overflows-at-320',
        `the document scrolls sideways at ${TARGET_WIDTH}px: ` +
          `scrollWidth ${obs.document.scrollWidth}px against clientWidth ${obs.document.clientWidth}px`
      )
    );
  }

  for (const el of obs.wide) {
    // A used width wider than the viewport is only a fault if the element
    // could not have been narrower. max-width:960px on a 320px viewport
    // resolves to 320px and is correct; width:960px does not and is not.
    const fixed = el.widthDeclared !== 'auto' && el.widthDeclared !== '' && !el.widthDeclared.endsWith('%');
    if (fixed) {
      out.push(
        failure(
          '1.4.10/fixed-width-element',
          `${el.ref} has a used width of ${Math.round(el.rect.w)}px from a non-auto width of ` +
            `${el.widthDeclared}. A fixed width cannot reflow; cap it with max-width instead.`
        )
      );
    }

    if (el.gridTracks && el.gridTracks.length > 1) {
      out.push(
        failure(
          '1.4.10/grid-tracks-do-not-collapse',
          `${el.ref} still lays out ${el.gridTracks.length} grid tracks at ${TARGET_WIDTH}px ` +
            `(${el.gridTemplateColumns}). repeat(auto-fit, minmax(min(Npx, 100%), 1fr)) collapses ` +
            'to one column with no breakpoint to maintain.'
        )
      );
    }

    if (el.isDataGrid && !SCROLLABLE.has(el.nearestScrollAncestorOverflowX)) {
      out.push(
        failure(
          '1.4.10/wide-content-not-in-a-scroll-container',
          `${el.ref} is ${Math.round(el.rect.w)}px wide and its nearest scroll ancestor is ` +
            `${el.nearestScrollAncestorRef} with overflow-x ${el.nearestScrollAncestorOverflowX}. ` +
            'A wide table may scroll in one direction, but the scroll has to belong to the table, ' +
            'not to the page.'
        )
      );
    }
  }

  // The corrected pattern puts the wide table in a focusable scroll
  // container. On a wide viewport that container does not scroll, and a
  // keyboard user tabs into a region that does nothing. The criterion is met
  // either way, so this is reported rather than failed, and it is asserted on
  // the corrected page so the trade stays visible.
  for (const el of obs.tabbableScrollContainers) {
    if (!el.scrollsAtCurrentWidth) {
      out.push(
        limit(
          '1.4.10/scroll-container-tabbable-when-not-scrollable',
          `${el.ref} carries tabindex="0" so the scroll can be reached by keyboard, but at ` +
            `${el.measuredAtWidth}px it has nothing to scroll, so a keyboard user stops on a ` +
            'region with no action. Removing the tabindex when it does not overflow needs a ' +
            'resize observer, which is a cost this library does not pay in a copyable snippet.'
        )
      );
    }
  }

  if (obs.unresolvedWidths > 0) {
    out.push(
      limit(
        '1.4.10/intrinsic-minimum-width-not-judged',
        `${obs.unresolvedWidths} element(s) overflow with an auto width, which means something ` +
          'inside them has an intrinsic minimum this judging does not trace: a long unbroken ' +
          'string, a fixed-width image, or a nested fixed-width descendant.'
      )
    );
  }

  return out;
}
