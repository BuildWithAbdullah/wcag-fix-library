/**
 * Observe 2.4.7 in two passes over one page load: every control's resting
 * indicator style while nothing is focused, then the same properties again at
 * each step of a real Tab walk.
 */

import { open } from '../browser.mjs';
import { environment } from '../browser.mjs';

const READ_STYLE = `(function (el) {
  var cs = getComputedStyle(el);
  return {
    outlineStyle: cs.outlineStyle,
    outlineWidth: cs.outlineWidth,
    outlineColor: cs.outlineColor,
    outlineOffset: cs.outlineOffset,
    boxShadow: cs.boxShadow,
    borderColor: cs.borderColor,
    borderWidth: cs.borderWidth,
    backgroundColor: cs.backgroundColor,
    textDecorationLine: cs.textDecorationLine,
    filter: cs.filter,
  };
})`;

export async function collect(browser, file) {
  const page = await open(browser, file);
  try {
    await page.evaluate(`window.__readStyle = ${READ_STYLE};`);

    const resting = await page.evaluate(() => {
      const H = window.__wcag;
      const out = {};
      const selector = 'a[href], button, input, select, textarea, [tabindex]';
      for (const el of document.querySelectorAll(selector)) {
        if (!H.visible(el)) continue;
        const backdrop = H.backdropOf(el, true);
        out[H.describe(el)] = {
          name: H.accessibleish(el),
          before: window.__readStyle(el),
          backdropBehind: backdrop.colour,
          backdropReason: backdrop.reason,
        };
      }
      return out;
    });

    const controls = [];
    for (let i = 0; i < 120; i += 1) {
      await page.keyboard.press('Tab');
      const here = await page.evaluate(() => {
        const H = window.__wcag;
        const el = document.activeElement;
        if (!el || el === document.body || el === document.documentElement) return null;
        return { ref: H.describe(el), after: window.__readStyle(el) };
      });
      if (here === null) break;
      if (controls.length > 0 && here.ref === controls[0].ref) break;
      const rest = resting[here.ref];
      if (!rest) continue;
      controls.push({ ref: here.ref, ...rest, after: here.after });
    }

    return { controls, environment: await environment(page) };
  } finally {
    await page.close();
  }
}
