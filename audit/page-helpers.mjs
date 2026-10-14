/**
 * page-helpers.mjs
 *
 * Source text injected into the page before each collector runs. It is a
 * string rather than a module because it has to be evaluated inside the
 * browser, where this repository's ES modules are not loaded.
 *
 * Nothing in here judges anything. It describes and measures, and hands plain
 * JSON back to Node, where lib/judge/ decides what the measurements mean.
 * Keeping the judging out of the browser is what makes it unit testable
 * without launching one.
 */

export const HELPERS = `
window.__wcag = (function () {
  function describe(el) {
    if (!el || el === document.documentElement) return 'html';
    if (el === document.body) return 'body';
    var bits = [];
    var node = el;
    while (node && node !== document.body && bits.length < 4) {
      var bit = node.tagName.toLowerCase();
      if (node.id) { bit += '#' + node.id; bits.unshift(bit); break; }
      if (node.classList.length) bit += '.' + node.classList[0];
      var sibs = node.parentElement
        ? Array.prototype.filter.call(node.parentElement.children, function (c) {
            return c.tagName === node.tagName;
          })
        : [];
      if (sibs.length > 1) bit += ':nth-of-type(' + (sibs.indexOf(node) + 1) + ')';
      bits.unshift(bit);
      node = node.parentElement;
    }
    return bits.join(' > ');
  }

  function rect(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }

  // The colour a thing is painted against. Walks up until it finds an
  // ancestor whose background is not fully transparent. Returns null rather
  // than guessing white, because a wrong backdrop produces a wrong ratio and
  // a wrong ratio is worse than no ratio.
  function backdropOf(el, startAtParent) {
    var node = startAtParent ? el.parentElement : el;
    while (node) {
      var cs = getComputedStyle(node);
      var bg = cs.backgroundColor;
      var hasImage = cs.backgroundImage && cs.backgroundImage !== 'none';
      if (hasImage) return { colour: null, reason: 'background-image on ' + describe(node) };
      if (bg && !/^rgba\\(\\s*0,\\s*0,\\s*0,\\s*0\\s*\\)$/.test(bg) && bg !== 'transparent') {
        return { colour: bg, reason: null, from: describe(node) };
      }
      node = node.parentElement;
    }
    // Nothing in the chain declares a background, so what is painted is the
    // browser canvas. Its computed value comes back transparent, and the
    // colour actually painted depends on color-scheme and the operating
    // system theme. White is the answer for a light scheme and it is recorded
    // as an assumption rather than passed off as a measurement.
    var scheme = getComputedStyle(document.documentElement).colorScheme || 'normal';
    var dark = scheme.indexOf('dark') !== -1 && scheme.indexOf('light') === -1;
    return {
      colour: dark ? 'rgb(18, 18, 18)' : 'rgb(255, 255, 255)',
      reason: 'no element in the chain declares a background, so the browser canvas is assumed'
        + ' for a color-scheme of ' + scheme,
      from: 'canvas',
    };
  }

  function visible(el) {
    var r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    var node = el;
    while (node) {
      var cs = getComputedStyle(node);
      if (cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
      if (cs.display === 'none') return false;
      if (Number.parseFloat(cs.opacity) === 0) return false;
      node = node.parentElement;
    }
    return true;
  }

  // Why an element is not perceivable, named precisely. The element's own
  // opacity is usually 1 while an ancestor's is 0, so reporting the element's
  // own computed value produces a finding that reads as a contradiction.
  function whyHidden(el) {
    var r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return 'its box is zero by zero';
    var node = el;
    while (node) {
      var cs = getComputedStyle(node);
      var where = node === el ? 'it' : describe(node) + ', an ancestor,';
      if (cs.display === 'none') return where + ' is display:none';
      if (cs.visibility === 'hidden' || cs.visibility === 'collapse') {
        return where + ' is visibility:' + cs.visibility;
      }
      if (Number.parseFloat(cs.opacity) === 0) return where + ' is opacity:0';
      var box = node.getBoundingClientRect();
      if (box.height === 0 && cs.overflow !== 'visible') {
        return where + ' is zero high with overflow:' + cs.overflow;
      }
      if (box.width === 0 && cs.overflow !== 'visible') {
        return where + ' is zero wide with overflow:' + cs.overflow;
      }
      node = node.parentElement;
    }
    return null;
  }

  function inlineHandlers(el) {
    return Array.prototype.filter
      .call(el.attributes, function (a) { return a.name.indexOf('on') === 0; })
      .map(function (a) { return a.name; });
  }

  function accessibleish(el) {
    var aria = el.getAttribute('aria-label');
    if (aria) return aria.trim();
    var labelled = el.getAttribute('aria-labelledby');
    if (labelled) {
      var parts = labelled.split(/\\s+/).map(function (id) {
        var t = document.getElementById(id);
        return t ? t.textContent.trim() : '';
      });
      if (parts.join(' ').trim()) return parts.join(' ').trim();
    }
    if (el.tagName === 'IMG') return (el.getAttribute('alt') || '').trim();
    var text = (el.textContent || '').replace(/\\s+/g, ' ').trim();
    return text.slice(0, 60);
  }

  return {
    describe: describe,
    rect: rect,
    backdropOf: backdropOf,
    visible: visible,
    whyHidden: whyHidden,
    inlineHandlers: inlineHandlers,
    accessibleish: accessibleish,
  };
})();
`;
