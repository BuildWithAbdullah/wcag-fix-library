/**
 * Observe 2.4.11 by letting the browser do the scrolling.
 *
 * The important part is that nothing here scrolls deliberately. Pressing Tab
 * makes the browser scroll the newly focused element into view by its own
 * rules, and the failure this criterion describes is a consequence of those
 * rules meeting a sticky header. Scrolling by hand first and measuring
 * afterwards measures something else.
 */

import { open, environment } from '../browser.mjs';

const MAX_TAB = 60;

/**
 * Paint order, to the extent it can be read from computed style. An
 * intersection is not an occlusion: the skip link on the corrected example in
 * this library sits at z-index 30 and overlaps a header at z-index 10, and
 * reporting that as the header hiding the skip link is a false failure on a
 * page that is right. Geometry alone is not enough.
 *
 * Installed as its own function rather than inside the one below, because
 * defining it in that function's body means it does not exist until that
 * function has been called once, and the first caller needs it first.
 */
const STACK_OF = `window.__stackOf = function (el) {
  var node = el;
  while (node && node !== document.documentElement) {
    var cs = getComputedStyle(node);
    if (cs.position !== 'static' && cs.zIndex !== 'auto') {
      var n = Number.parseInt(cs.zIndex, 10);
      if (Number.isFinite(n)) return n;
    }
    node = node.parentElement;
  }
  return 0;
};

// At the same stacking level the later element in the document paints on top,
// which is how the consent banner at z-index 20 covers part of the chat
// launcher at z-index 20 on the corrected example. A strict greater-than
// comparison loses that, and losing it loses the one honest observation the
// corrected page has to make about this criterion.
window.__paintsAbove = function (cover, el) {
  var a = window.__stackOf(cover);
  var b = window.__stackOf(el);
  if (a !== b) return a > b;
  return (el.compareDocumentPosition(cover) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
};`;

const OBSCURERS = `(function () {
  var H = window.__wcag;
  var out = [];
  for (var i = 0, els = document.querySelectorAll('body *'); i < els.length; i += 1) {
    var el = els[i];
    var cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
    if (!H.visible(el)) continue;
    var r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    out.push({
      ref: H.describe(el),
      position: cs.position,
      zIndex: cs.zIndex,
      rect: { x: r.left, y: r.top, w: r.width, h: r.height },
      el: el,
    });
  }
  return out;
})`;

export async function collect(browser, file) {
  const page = await open(browser, file, { width: 1280, height: 720 });
  try {
    await page.evaluate(`${STACK_OF}\nwindow.__obscurers = ${OBSCURERS};`);

    const obscurers = await page.evaluate(() =>
      window.__obscurers().map((o) => ({ ref: o.ref, position: o.position, zIndex: o.zIndex }))
    );

    const steps = [];
    for (let i = 0; i < MAX_TAB; i += 1) {
      await page.keyboard.press('Tab');
      const here = await page.evaluate(() => {
        const H = window.__wcag;
        const el = document.activeElement;
        if (!el || el === document.body || el === document.documentElement) return null;
        const r = el.getBoundingClientRect();
        const rect = { x: r.left, y: r.top, w: r.width, h: r.height };
        const mine = window.__stackOf(el);
        const covers = window.__obscurers()
          .filter((o) => o.el !== el && !o.el.contains(el))
          .filter((o) => window.__paintsAbove(o.el, el))
          .map((o) => ({ ref: o.ref, position: o.position, zIndex: o.zIndex, rect: o.rect }));
        return {
          ref: H.describe(el),
          name: H.accessibleish(el),
          rect,
          covers,
          stackLevel: mine,
          scrollY: window.scrollY,
        };
      });
      if (here === null) break;
      if (steps.length > 0 && here.ref === steps[0].ref) break;
      steps.push({ ...here, via: `Tab press ${i + 1}` });
    }

    // Then the same question for a fragment link, because the skip link is
    // the one control on a page whose entire job is to move focus somewhere
    // the user has not seen yet.
    await page.goto(page.url(), { waitUntil: 'load' });
    await page.evaluate(`${STACK_OF}\nwindow.__obscurers = ${OBSCURERS};`);
    const fragmentTarget = await page.evaluate(() => {
      const H = window.__wcag;
      const link = [...document.querySelectorAll('a[href^="#"]')][0];
      if (!link) return null;
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return null;
      link.click();
      const r = target.getBoundingClientRect();
      const rect = { x: r.left, y: r.top, w: r.width, h: r.height };
      const mine = window.__stackOf(target);
      let worst = null;
      for (const o of window.__obscurers()) {
        if (o.el === target || o.el.contains(target)) continue;
        if (!window.__paintsAbove(o.el, target)) continue;
        const w = Math.max(0, Math.min(rect.x + rect.w, o.rect.x + o.rect.w) - Math.max(rect.x, o.rect.x));
        const h = Math.max(0, Math.min(rect.y + rect.h, o.rect.y + o.rect.h) - Math.max(rect.y, o.rect.y));
        const fraction = rect.w * rect.h > 0 ? (w * h) / (rect.w * rect.h) : 0;
        if (!worst || fraction > worst.fraction) worst = { cover: o.ref, fraction };
      }
      // The target of a skip link is a region, not a control, and a region is
      // taller than the viewport. What matters is whether the top of it, the
      // part the user is being sent to read, is behind something.
      const head = { x: rect.x, y: rect.y, w: rect.w, h: Math.min(rect.h, 48) };
      let headWorst = null;
      for (const o of window.__obscurers()) {
        if (o.el === target || o.el.contains(target)) continue;
        if (!window.__paintsAbove(o.el, target)) continue;
        const w = Math.max(0, Math.min(head.x + head.w, o.rect.x + o.rect.w) - Math.max(head.x, o.rect.x));
        const h = Math.max(0, Math.min(head.y + head.h, o.rect.y + o.rect.h) - Math.max(head.y, o.rect.y));
        const fraction = head.w * head.h > 0 ? (w * h) / (head.w * head.h) : 0;
        if (!headWorst || fraction > headWorst.fraction) headWorst = { cover: o.ref, fraction };
      }
      return {
        ref: H.describe(target),
        via: H.describe(link) + ' ("' + H.accessibleish(link) + '")',
        cover: headWorst ? headWorst.cover : null,
        fraction: headWorst ? headWorst.fraction : 0,
        wholeRegionFraction: worst ? worst.fraction : 0,
      };
    });

    return { obscurers, steps, fragmentTarget, environment: await environment(page) };
  } finally {
    await page.close();
  }
}
