/**
 * Observe 1.4.10 at 320 CSS px. The viewport width is the measurement.
 */

import { open } from '../browser.mjs';
import { TARGET_WIDTH } from '../../lib/judge/reflow.mjs';

export async function collect(browser, file) {
  const page = await open(browser, file, { width: TARGET_WIDTH, height: 800 });
  try {
    return await page.evaluate((target) => {
      const H = window.__wcag;
      const doc = document.documentElement;

      const scrollAncestor = (el) => {
        let node = el.parentElement;
        while (node && node !== doc) {
          const ox = getComputedStyle(node).overflowX;
          if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') {
            return { ref: H.describe(node), overflowX: ox };
          }
          node = node.parentElement;
        }
        return { ref: 'html', overflowX: getComputedStyle(doc).overflowX };
      };

      const wide = [];
      let unresolvedWidths = 0;
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width <= target) continue;
        if (!H.visible(el)) continue;
        const cs = getComputedStyle(el);
        const ancestor = scrollAncestor(el);
        const tracks = cs.gridTemplateColumns && cs.gridTemplateColumns !== 'none'
          ? cs.gridTemplateColumns.split(/\s+(?![^(]*\))/).filter(Boolean)
          : null;
        // The inline and stylesheet declaration, not the used value.
        // getComputedStyle resolves `width` to a used pixel length, which
        // makes a fixed width and a reflowing auto width look identical.
        // el.style plus the matched rules is the only honest source.
        let declared = el.style.width || '';
        if (!declared) {
          for (const sheet of document.styleSheets) {
            let rules;
            try { rules = sheet.cssRules; } catch { continue; }
            for (const rule of rules) {
              if (!rule.selectorText || !rule.style || !rule.style.width) continue;
              try { if (el.matches(rule.selectorText)) declared = rule.style.width; } catch { /* ignore */ }
            }
          }
        }
        if (!declared) declared = 'auto';

        wide.push({
          ref: H.describe(el),
          rect: { x: r.left, y: r.top, w: r.width, h: r.height },
          widthDeclared: declared,
          gridTemplateColumns: cs.gridTemplateColumns,
          gridTracks: tracks,
          isDataGrid: el.tagName === 'TABLE' || cs.display === 'table',
          nearestScrollAncestorRef: ancestor.ref,
          nearestScrollAncestorOverflowX: ancestor.overflowX,
        });
      }

      // Overflow this judging cannot attribute to anything it looked at: the
      // element declares no width, is not a multi-track grid, is not a data
      // grid, and nothing above it is a scroll container, so the width comes
      // from an intrinsic minimum somewhere inside it that is not traced.
      unresolvedWidths = wide.filter(
        (el) =>
          el.widthDeclared === 'auto' &&
          !el.isDataGrid &&
          !(el.gridTracks && el.gridTracks.length > 1) &&
          el.nearestScrollAncestorOverflowX === 'visible'
      ).length;

      const tabbableScrollContainers = [];
      for (const el of document.querySelectorAll('[tabindex="0"]')) {
        const ox = getComputedStyle(el).overflowX;
        if (ox !== 'auto' && ox !== 'scroll') continue;
        tabbableScrollContainers.push({
          ref: H.describe(el),
          scrollsAtCurrentWidth: el.scrollWidth > el.clientWidth,
          measuredAtWidth: window.innerWidth,
        });
      }

      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        document: {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
        },
        wide,
        tabbableScrollContainers,
        unresolvedWidths,
      };
    }, TARGET_WIDTH);
  } finally {
    await page.close();
  }
}

/**
 * The corrected page has to be measured at a wide viewport as well, because
 * the trade the fix makes (a permanently focusable scroll container) only
 * shows up where the table does not overflow.
 */
export async function collectWide(browser, file) {
  const page = await open(browser, file, { width: 1280, height: 900 });
  try {
    return await page.evaluate(() => {
      const H = window.__wcag;
      const tabbableScrollContainers = [];
      for (const el of document.querySelectorAll('[tabindex="0"]')) {
        const ox = getComputedStyle(el).overflowX;
        if (ox !== 'auto' && ox !== 'scroll') continue;
        tabbableScrollContainers.push({
          ref: H.describe(el),
          scrollsAtCurrentWidth: el.scrollWidth > el.clientWidth,
          measuredAtWidth: window.innerWidth,
        });
      }
      return { tabbableScrollContainers };
    });
  } finally {
    await page.close();
  }
}
