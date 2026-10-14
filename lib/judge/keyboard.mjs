/**
 * 2.1.1 Keyboard, judged.
 *
 * The criterion: all functionality is operable through a keyboard interface.
 * Two halves, and a scanner cannot reach either of them. Reachable, meaning a
 * Tab press arrives at the control. Operable, meaning Enter or Space actually
 * does the thing.
 *
 * The observation for this criterion is built by pressing Tab through the
 * page, then pressing Enter on each control that was reached while counting
 * how many of the page's own handlers fired.
 */

import { failure, limit } from '../findings.mjs';

const INTERACTIVE_ROLES = new Set([
  'button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem',
  'menuitemcheckbox', 'menuitemradio', 'option', 'textbox', 'combobox', 'slider',
]);

const NATIVELY_INTERACTIVE = new Set([
  'a', 'button', 'input', 'select', 'textarea', 'summary', 'audio', 'video',
]);

export function judge(obs) {
  const out = [];

  for (const el of obs.mouseTargets) {
    const role = (el.role || '').toLowerCase();
    const nativelyInteractive = NATIVELY_INTERACTIVE.has(el.tag) && !(el.tag === 'a' && !el.hasHref);
    if (!el.tabbable && !nativelyInteractive && !INTERACTIVE_ROLES.has(role)) {
      out.push(
        failure(
          '2.1.1/click-handler-on-unfocusable-element',
          `${el.ref} carries ${el.inlineHandlers.join(', ')} but is a <${el.tag}> with ` +
            `${role ? `role="${role}"` : 'no role'} and no tabindex, so it is not focusable. ` +
            'A mouse user sees a control; a keyboard user cannot reach it.'
        )
      );
    }
  }

  for (const el of obs.anchorsWithoutHref) {
    out.push(
      failure(
        '2.1.1/anchor-without-href',
        `${el.ref} is an <a> with no href. Without href an anchor is neither focusable nor ` +
          'exposed as a link. If it acts on this page it is a button; if it navigates, give it an href.'
      )
    );
  }

  for (const el of obs.positiveTabindex) {
    out.push(
      failure(
        '2.1.1/positive-tabindex',
        `${el.ref} has tabindex="${el.tabIndexAttr}". A positive value lifts this element above ` +
          'every element that does not have one, so the order it creates is only correct until the ' +
          'next control is added. Fix the order by fixing the DOM order.'
      )
    );
  }

  for (const el of obs.unreachedByTab) {
    out.push(
      failure(
        '2.1.1/control-unreachable-by-tab',
        `${el.ref} was offered to a pointer but ${obs.tabSteps} Tab presses never arrived at it.`
      )
    );
  }

  for (const el of obs.activations.filter((a) => a.reached && a.hasInlineHandler && !a.firedOnEnter)) {
    out.push(
      failure(
        '2.1.1/control-not-operable-by-enter',
        `${el.ref} can be focused and declares ${el.handler}, but pressing Enter on it fired ` +
          'nothing. A control that takes focus and then does not respond to a key is reachable ' +
          'and not operable, which fails this criterion just as plainly as being unreachable.'
      )
    );
  }

  const unattributed = obs.activations.filter((a) => a.reached && !a.hasInlineHandler);
  if (unattributed.length > 0) {
    out.push(
      limit(
        '2.1.1/action-attached-by-script-not-observed',
        `${unattributed.length} control(s) reached by Tab declare no inline handler, so this ` +
          'judging cannot tell whether pressing a key did anything: ' +
          `${unattributed.map((a) => a.ref).join(', ')}. A listener added with addEventListener ` +
          'is invisible from outside the page, and so is a handler that only changes state this ' +
          'audit does not read.'
      )
    );
  }

  const notPressed = obs.activations.filter((a) => a.notPressed);
  if (notPressed.length > 0) {
    out.push(
      limit(
        '2.1.1/link-operability-not-pressed',
        `${notPressed.length} link(s) were reached but not activated, because pressing Enter on ` +
          'an href leaves the page and ends the walk: ' +
          `${notPressed.map((a) => a.ref).join(', ')}. Their reachability is measured; their ` +
          'operability is taken from the fact that a native link with an href responds to Enter ' +
          'without any script, which is true and is still an assumption rather than a measurement.'
      )
    );
  }

  return out;
}
