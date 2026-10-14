/**
 * 2.4.3 Focus Order, judged.
 *
 * The criterion: if a page can be navigated sequentially and the sequence
 * affects meaning or operability, focus moves in an order that preserves
 * meaning and operability.
 *
 * A note on what this judging compares, because the obvious comparison does
 * not work and getting it wrong looks like a clean page.
 *
 * The obvious test is to walk the tab sequence and complain when focus jumps
 * upward or leftward. On the failing example in this library that test
 * reports nothing. The sidebar is reversed into the right-hand column with
 * `order`, so the tab order visits the right column first and then drops to a
 * link lower down on the left, which is forward in a top-to-bottom reading
 * order and therefore looks fine step by step. The page is still wrong.
 *
 * So the comparison is made where the reordering happens. For every flex and
 * grid container, the children sorted by DOM position are compared against
 * the children sorted by painted position. Tab order follows DOM order, so a
 * container whose painted order is a different permutation of its DOM order
 * is a container where tab order and reading order disagree, whatever any
 * individual step looks like.
 */

import { failure, limit } from '../findings.mjs';

export function judge(obs) {
  const out = [];

  for (const container of obs.reorderedContainers) {
    out.push(
      failure(
        '2.4.3/visual-order-differs-from-dom-order',
        `${container.ref} is a ${container.display} container whose children are painted in a ` +
          `different order from the one they appear in: DOM order ${container.domOrder.join(', ')} ` +
          `is painted as ${container.visualOrder.join(', ')} ` +
          `(${container.cause}). Tab order follows the DOM, so the two now disagree.`
      )
    );
  }

  for (const step of obs.tabSequence.filter((s) => !s.visible)) {
    out.push(
      failure(
        '2.4.3/focus-enters-invisible-content',
        `Tab arrives at ${step.ref} ("${step.name}") which cannot be seen, because ` +
          `${step.hiddenBecause}. Focus disappears. ` +
          'Hidden content has to be hidden from everyone, which means display:none or the ' +
          'hidden attribute, not opacity and a zero height.'
      )
    );
  }

  out.push(
    limit(
      '2.4.3/meaning-of-order-not-judged',
      `${obs.tabSequence.length} tab step(s) and ${obs.containersInspected} flex or grid ` +
        'container(s) were compared on painted position and visibility. The criterion asks for ' +
        'an order that preserves meaning, and meaning is not a geometric property: a sequence ' +
        'this judging reports as tidy can still put the postcode field before the street.'
    )
  );

  return out;
}
