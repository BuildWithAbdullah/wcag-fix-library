/**
 * Observe 2.1.1 by pressing keys.
 *
 * The page's own handlers are the only thing that can tell us whether a key
 * press did anything, so window.alert is replaced with a counter before any
 * key is pressed. Every criterion page in this library signals an action with
 * alert() for exactly this reason: it is the one side effect an audit can
 * observe without the page cooperating.
 *
 * Two mistakes were made writing this file and both are worth leaving a note
 * about, because both produce a confident wrong answer rather than an error.
 *
 * First, a hand cursor is inherited. `cursor: pointer` on a button applies to
 * every span inside it, so treating a hand cursor as an invitation to click
 * reported the label inside a correct button as an unreachable control. A
 * descendant of something interactive is not a separate target.
 *
 * Second, blurring an element and pressing Tab does not start the walk again.
 * The sequential focus navigation starting point stays where focus was, so
 * Tab continues from there. Re-tabbing i+1 times from a blurred state lands
 * further and further past the element it was aiming at, and the activation
 * pass silently collected one element out of six. There is one forward walk
 * now, and the only reliable way to restart one is to load the page again.
 */

import { open } from '../browser.mjs';
import { unreached } from '../tab.mjs';

const INSTALL_COUNTER = () => {
  window.__fired = [];
  window.alert = (message) => { window.__fired.push(String(message)); };
  window.confirm = () => { window.__fired.push('confirm'); return false; };
};

export async function collect(browser, file) {
  const page = await open(browser, file);
  try {
    await page.evaluate(INSTALL_COUNTER);

    const inventory = await page.evaluate(() => {
      const H = window.__wcag;
      const INTERACTIVE = 'a[href], button, input, select, textarea, summary, ' +
        '[role=button], [role=link], [role=checkbox], [role=radio], [role=switch], ' +
        '[role=tab], [role=menuitem], [role=option]';

      const describeOne = (el) => {
        const r = el.getBoundingClientRect();
        return {
          ref: H.describe(el),
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role') || '',
          hasHref: el.hasAttribute('href'),
          tabIndexAttr: el.getAttribute('tabindex'),
          tabbable: el.tabIndex >= 0,
          inlineHandlers: H.inlineHandlers(el),
          rect: { x: r.left, y: r.top, w: r.width, h: r.height },
        };
      };

      const all = [...document.querySelectorAll('body *')];
      const isMouseTarget = (el) => {
        if (!H.visible(el)) return false;
        const handlers = H.inlineHandlers(el);
        if (handlers.some((h) => /^on(click|mouse|pointer)/.test(h))) return true;
        // A hand cursor only invites a click on its own account if nothing
        // interactive above it already owns the click.
        if (getComputedStyle(el).cursor !== 'pointer') return false;
        return el.closest(INTERACTIVE) === null;
      };

      return {
        mouseTargets: all.filter(isMouseTarget).map(describeOne),
        anchorsWithoutHref: all
          .filter((el) => el.tagName === 'A' && !el.hasAttribute('href'))
          .map(describeOne),
        positiveTabindex: all
          .filter((el) => Number.parseInt(el.getAttribute('tabindex') || '0', 10) > 0)
          .map(describeOne),
      };
    });

    // One forward walk. Tab, look, press Enter where that cannot leave the
    // page, look again, Tab on.
    const steps = [];
    const activations = [];
    for (let i = 0; i < 120; i += 1) {
      await page.keyboard.press('Tab');
      const here = await page.evaluate(() => {
        const H = window.__wcag;
        const el = document.activeElement;
        if (!el || el === document.body || el === document.documentElement) return null;
        const r = el.getBoundingClientRect();
        const handlers = H.inlineHandlers(el);
        return {
          ref: H.describe(el),
          tag: el.tagName.toLowerCase(),
          name: H.accessibleish(el),
          rect: { x: r.left, y: r.top, w: r.width, h: r.height },
          visible: H.visible(el),
          navigates: el.tagName === 'A' && el.hasAttribute('href'),
          // Any handler that says this control is meant to do something.
          // Restricting this to click and key handlers was a defect: a div
          // with role="button" and onmousedown declares an action no key
          // press can reach, and the audit reported it as a control that
          // simply declared nothing, which is the opposite conclusion.
          activators: handlers.filter((h) => /^on(click|mouse|pointer|key|touch)/.test(h)),
          nativeButton: el.tagName === 'BUTTON' || (el.tagName === 'INPUT' && /^(submit|button|image|reset)$/.test(el.type)),
        };
      });
      if (here === null) break;
      if (steps.length > 0 && here.ref === steps[0].ref) break;
      steps.push(here);

      if (here.navigates) {
        activations.push({
          ref: here.ref,
          reached: true,
          hasInlineHandler: here.activators.length > 0,
          handler: here.activators.join(', '),
          firedOnEnter: null,
          notPressed: 'pressing Enter on a link with an href would leave the page',
        });
        continue;
      }

      await page.evaluate(() => { window.__fired = []; });
      await page.keyboard.press('Enter');
      const fired = await page.evaluate(() => window.__fired.length);
      activations.push({
        ref: here.ref,
        reached: true,
        hasInlineHandler: here.activators.length > 0,
        handler: here.activators.join(', '),
        firedOnEnter: fired > 0,
      });
    }

    return {
      ...inventory,
      tabSteps: steps.length,
      tabSequence: steps.map((s) => s.ref),
      unreachedByTab: unreached(inventory.mouseTargets, steps),
      activations,
    };
  } finally {
    await page.close();
  }
}
