/**
 * tab.mjs
 *
 * Walk the page the way a keyboard user walks it: real Tab key presses,
 * reading document.activeElement after each one.
 *
 * Why real key presses rather than element.focus(). Two reasons, and the
 * second one is the one that catches people out.
 *
 * Pressing Tab tells you what is actually reachable. Calling focus() on a
 * list of elements you selected yourself tells you only that the elements you
 * picked can be focused, which is the question you already knew the answer
 * to. The whole 2.1.1 failure mode is a control that a mouse user can see and
 * a Tab press never arrives at.
 *
 * And :focus-visible does not match a programmatic focus() when the last
 * input was not a keyboard. A corrected page whose entire indicator is
 * written under :focus-visible therefore looks like it has no focus
 * indicator at all if you focus it from script. Measuring 2.4.7 by calling
 * focus() reports the corrected page as failing. Press the key.
 */

const MAX_STEPS = 120;

export async function walk(page, { limit = MAX_STEPS } = {}) {
  await page.evaluate(() => {
    // Start from the top of the document so the first Tab lands on the first
    // tabbable element rather than wherever the browser happened to be.
    document.body.focus();
    if (document.activeElement !== document.body) document.activeElement.blur();
  });

  const steps = [];
  const seen = new Set();

  for (let i = 0; i < limit; i += 1) {
    await page.keyboard.press('Tab');
    const step = await page.evaluate(() => {
      const H = window.__wcag;
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const r = el.getBoundingClientRect();
      return {
        ref: H.describe(el),
        tag: el.tagName.toLowerCase(),
        name: H.accessibleish(el),
        rect: { x: r.left, y: r.top, w: r.width, h: r.height },
        visible: H.visible(el),
        scrollY: window.scrollY,
      };
    });
    if (step === null) break;
    // A cycle back to a step already recorded means the tab ring is closed
    // and there is nothing further to learn.
    const key = `${step.ref}@${steps.length > 0 ? '' : 'first'}`;
    if (seen.has(step.ref) && steps.length > 1 && step.ref === steps[0].ref) break;
    seen.add(key);
    steps.push(step);
  }

  return steps;
}

/**
 * The elements a Tab walk never arrives at, from a list of candidates the
 * page offers to a mouse. This is the comparison 2.1.1 is about.
 */
export function unreached(candidates, steps) {
  const arrived = new Set(steps.map((s) => s.ref));
  return candidates.filter((c) => !arrived.has(c.ref));
}
