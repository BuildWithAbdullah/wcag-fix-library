/** Observe 1.4.11: the colours of boundaries and of named graphics. */

import { open } from '../browser.mjs';

export async function collect(browser, file) {
  const page = await open(browser, file);
  try {
    return await page.evaluate(() => {
      const H = window.__wcag;
      const CONTROL = 'input, select, textarea, button, [role=button], [role=checkbox], [role=switch]';

      const hasBorder = (cs) =>
        cs.borderStyle !== 'none' && Number.parseFloat(cs.borderTopWidth) > 0;

      const controls = [];
      for (const el of document.querySelectorAll(CONTROL)) {
        if (!H.visible(el)) continue;
        const cs = getComputedStyle(el);
        if (!hasBorder(cs)) continue;
        const outside = H.backdropOf(el, true);
        controls.push({
          ref: H.describe(el),
          borderColour: cs.borderTopColor,
          borderWidth: cs.borderTopWidth,
          backdropOutside: outside.colour,
          backdropOutsideReason: outside.reason,
          backgroundInside: cs.backgroundColor,
        });
      }

      // A box shaped like a control whose only edge is its own fill. A toggle
      // track, a tag, a swatch: no border to carry the boundary, so the fill
      // has to.
      const unborderedBoxes = [];
      for (const el of document.querySelectorAll('body *')) {
        if (!H.visible(el)) continue;
        const cs = getComputedStyle(el);
        if (hasBorder(cs)) continue;
        if (el.textContent.trim() !== '') continue;
        if (el.children.length > 0) continue;
        const bg = cs.backgroundColor;
        if (!bg || bg === 'rgba(0, 0, 0, 0)') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 16 || r.height < 16) continue;
        const backdrop = H.backdropOf(el, true);
        unborderedBoxes.push({
          ref: H.describe(el),
          background: bg,
          backdrop: backdrop.colour,
          backdropReason: backdrop.reason,
          rect: { x: r.left, y: r.top, w: r.width, h: r.height },
        });
      }

      // A graphic with an accessible name is a graphic the content needs.
      // One without is decorative and exempt, which is the distinction the
      // criterion actually draws.
      const icons = [];
      for (const svg of document.querySelectorAll('svg')) {
        if (!H.visible(svg)) continue;
        const name = H.accessibleish(svg) || svg.getAttribute('aria-label') || '';
        const role = svg.getAttribute('role') || '';
        if (!name || svg.getAttribute('aria-hidden') === 'true') continue;
        if (role !== 'img' && role !== 'graphics-document') continue;
        const painted = [...svg.querySelectorAll('path, circle, rect, polygon, line, ellipse')];
        const backdrop = H.backdropOf(svg, true);
        for (const shape of painted) {
          const scs = getComputedStyle(shape);
          const ink = scs.fill && scs.fill !== 'none' ? scs.fill : scs.stroke;
          if (!ink || ink === 'none') continue;
          icons.push({
            ref: H.describe(svg) + ' > ' + shape.tagName.toLowerCase(),
            name,
            fill: ink,
            backdrop: backdrop.colour,
            backdropReason: backdrop.reason,
          });
        }
      }

      // Siblings of identical geometry are the shape a two state control
      // takes when the two states are two elements rather than one element
      // with a class.
      const statePairs = [];
      for (const parent of document.querySelectorAll('body, body *')) {
        const kids = [...parent.children].filter((k) => H.visible(k));
        for (let i = 0; i < kids.length; i += 1) {
          for (let j = i + 1; j < kids.length; j += 1) {
            const a = kids[i];
            const b = kids[j];
            if (a.tagName !== b.tagName) continue;
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            if (Math.abs(ra.width - rb.width) > 1 || Math.abs(ra.height - rb.height) > 1) continue;
            if (ra.width < 16 || ra.height < 16) continue;
            const ca = getComputedStyle(a);
            const cb = getComputedStyle(b);
            if (ca.backgroundColor === cb.backgroundColor) continue;
            if (a.textContent.trim() !== '' || b.textContent.trim() !== '') continue;
            statePairs.push({
              aRef: H.describe(a),
              bRef: H.describe(b),
              aBackground: ca.backgroundColor,
              bBackground: cb.backgroundColor,
            });
          }
        }
      }

      return { controls, unborderedBoxes, icons, statePairs };
    });
  } finally {
    await page.close();
  }
}
