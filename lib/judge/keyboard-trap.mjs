/**
 * 2.1.2 No Keyboard Trap, judged.
 *
 * The criterion: if focus can be moved to a component with a keyboard, focus
 * can be moved away from it with a keyboard.
 *
 * The failure that matters in production is not the one the criterion's name
 * suggests. It is rarely focus stuck inside a dialog. It is a dialog that
 * never took focus at all, sitting over a page that is still fully tabbable
 * under an overlay the user cannot dismiss. Focus is not trapped in the
 * dialog; the user is trapped outside it, with no way to reach the control
 * that would close it. Both are judged here, from a transcript of real key
 * presses.
 */

import { failure, limit } from '../findings.mjs';

export function judge(obs) {
  const out = [];

  for (const d of obs.dialogs) {
    if (!d.opened) {
      out.push(
        limit(
          '2.1.2/dialog-could-not-be-opened-by-keyboard',
          `${d.ref} was found in the document but no keyboard route opened it, so nothing about ` +
            'it was judged. Either the opening control was not reachable by Tab, which is a ' +
            '2.1.1 matter, or it opens on an interaction this audit does not perform.'
        )
      );
      continue;
    }

    if (!d.focusMovedIn) {
      out.push(
        failure(
          '2.1.2/focus-not-moved-into-dialog',
          `${d.ref} opened and focus stayed on ${d.focusAfterOpen}. Nothing inside the dialog ` +
            'received focus, so a keyboard user has an overlay on screen and their focus ' +
            'position behind it.'
        )
      );
    }

    if (d.escapedWhileOpen.length > 0) {
      out.push(
        failure(
          '2.1.2/tab-leaves-open-dialog',
          `With ${d.ref} open, Tab reached ${d.escapedWhileOpen.length} element(s) outside it: ` +
            `${d.escapedWhileOpen.join(', ')}. The page behind a modal has to be inert, not just ` +
            'covered. An overlay is paint; it stops a mouse and it does not stop a Tab key.'
        )
      );
    }

    if (d.escapeClosedIt === false) {
      out.push(
        failure(
          '2.1.2/escape-does-not-close',
          `Escape was pressed with ${d.ref} open and it stayed open. Escape is the only exit a ` +
            'keyboard user will try without being told, and it is the one the specification ' +
            'names for a modal.'
        )
      );
    }

    if (d.closedByKeyboard && d.focusAfterClose !== d.opener) {
      out.push(
        failure(
          '2.1.2/focus-not-returned-to-opener',
          `${d.ref} was closed with a key press and focus went to ${d.focusAfterClose} rather ` +
            `than back to ${d.opener}. The control that had focus has just been removed from the ` +
            'page, so focus falls to the document and the next Tab starts again from the top.'
        )
      );
    }

    if (d.usedInert && obs.environment.inertSupported) {
      out.push(
        limit(
          '2.1.2/inert-fallback-branch-not-executed',
          `${d.ref} holds focus by setting inert on the page behind it, and this browser ` +
            'supports inert, so the Tab cycling fallback written for browsers that do not was ' +
            'never executed and is therefore unverified. A branch that only runs where the ' +
            'audit cannot run is a branch nothing has checked.'
        )
      );
    }
  }

  return out;
}
