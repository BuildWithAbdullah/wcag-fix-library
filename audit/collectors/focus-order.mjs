/** Observe 2.4.3: the painted order of reorderable containers, and the walk. */

import { open } from '../browser.mjs';
import { walk } from '../tab.mjs';

export async function collect(browser, file) {
  const page = await open(browser, file);
  try {
    const containers = await page.evaluate(() => {
      const H = window.__wcag;
      const out = [];
      let inspected = 0;

      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        const display = cs.display;
        if (!/^(flex|inline-flex|grid|inline-grid)$/.test(display)) continue;
        const kids = [...el.children].filter((k) => H.visible(k));
        if (kids.length < 2) continue;
        inspected += 1;

        const described = kids.map((k, index) => {
          const r = k.getBoundingClientRect();
          const ks = getComputedStyle(k);
          return {
            index,
            ref: H.describe(k),
            y: Math.round(r.top),
            x: Math.round(r.left),
            order: ks.order,
            gridRow: ks.gridRowStart,
            gridColumn: ks.gridColumnStart,
          };
        });

        // Painted order: down the page first, then across, which is reading
        // order for a left to right writing mode. Rows are banded so two
        // items on the same line are not separated by a pixel of rounding.
        const painted = [...described].sort(
          (a, b) => (Math.abs(a.y - b.y) > 8 ? a.y - b.y : a.x - b.x)
        );

        const domOrder = described.map((d) => d.ref);
        const visualOrder = painted.map((d) => d.ref);
        if (domOrder.join('|') === visualOrder.join('|')) continue;

        const reordered = described.filter((d) => d.order !== '0');
        const causes = [];
        if (reordered.length) {
          causes.push(`order is set to ${reordered.map((d) => d.order).join(' and ')}`);
        }
        if (/row-reverse|column-reverse/.test(cs.flexDirection)) {
          causes.push(`flex-direction: ${cs.flexDirection}`);
        }
        if (cs.direction === 'rtl') causes.push('direction: rtl');
        if (!causes.length) causes.push('explicit grid placement or wrapping');

        out.push({
          ref: H.describe(el),
          display,
          domOrder,
          visualOrder,
          cause: causes.join('; '),
        });
      }

      return { reorderedContainers: out, containersInspected: inspected };
    });

    const steps = await walk(page);
    const enriched = await page.evaluate((refs) => {
      const H = window.__wcag;
      const index = new Map();
      for (const el of document.querySelectorAll('*')) {
        const ref = H.describe(el);
        if (!index.has(ref)) index.set(ref, el);
      }
      return refs.map((ref) => {
        const el = index.get(ref);
        if (!el) return { hiddenBecause: null };
        return { hiddenBecause: H.whyHidden(el) };
      });
    }, steps.map((s) => s.ref));

    return {
      ...containers,
      tabSequence: steps.map((s, i) => ({ ...s, hiddenBecause: enriched[i].hiddenBecause })),
    };
  } finally {
    await page.close();
  }
}
