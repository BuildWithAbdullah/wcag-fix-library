/**
 * The judges, driven against hand-built observations. No browser.
 *
 * This file exists because of the split between audit/ and lib/judge/.
 * Everything a browser produces is a plain object, so every branch of the
 * judging can be exercised directly, including the branches a real page would
 * have to be contrived to produce. A suite that can only drive the judging
 * through a browser can only test the branches that morning's Chromium
 * happened to take.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { idsOf, failure, limit, finding } from '../lib/findings.mjs';
import { judge as judgeReflow, TARGET_WIDTH } from '../lib/judge/reflow.mjs';
import { judge as judgeKeyboard } from '../lib/judge/keyboard.mjs';
import { judge as judgeTrap } from '../lib/judge/keyboard-trap.mjs';
import { judge as judgeOrder } from '../lib/judge/focus-order.mjs';
import {
  judge as judgeIndicator,
  paintedDelta,
  inertDelta,
} from '../lib/judge/focus-visible.mjs';
import { judge as judgeObscured, coveredFraction } from '../lib/judge/focus-not-obscured.mjs';
import { judge as judgeNonText, boundaryRatio } from '../lib/judge/non-text-contrast.mjs';
import { parseColour } from '../lib/colour.mjs';

// --- the finding shape ---------------------------------------------------

test('a finding needs an id that names its criterion', () => {
  assert.throws(() => finding('nonsense', 'failure', 'detail'), TypeError);
  assert.equal(failure('1.4.10/x', 'detail').criterion, '1.4.10');
});

test('a finding with no detail is refused, because a reader cannot act on it', () => {
  assert.throws(() => failure('1.4.10/x', ''), TypeError);
  assert.throws(() => failure('1.4.10/x', '   '), TypeError);
});

test('a finding of an unknown kind is refused', () => {
  assert.throws(() => finding('1.4.10/x', 'warning', 'detail'), TypeError);
});

test('idsOf deduplicates and sorts, because the unit of every assertion is the set', () => {
  assert.deepEqual(
    idsOf([failure('2.1.1/b', 'one'), failure('2.1.1/a', 'two'), failure('2.1.1/b', 'three')]),
    ['2.1.1/a', '2.1.1/b']
  );
});

// --- 1.4.10 --------------------------------------------------------------

const reflowObs = (over = {}) => ({
  viewport: { width: TARGET_WIDTH, height: 800 },
  document: { scrollWidth: 320, clientWidth: 320 },
  wide: [],
  tabbableScrollContainers: [],
  unresolvedWidths: 0,
  ...over,
});

test('reflow refuses to judge at any width other than 320, which is the measurement', () => {
  assert.throws(
    () => judgeReflow(reflowObs({ viewport: { width: 1280, height: 900 } })),
    /must be judged at 320px/
  );
});

test('reflow reports a sideways scroll from the document measurement alone', () => {
  const out = judgeReflow(reflowObs({ document: { scrollWidth: 1024, clientWidth: 320 } }));
  assert.deepEqual(idsOf(out), ['1.4.10/document-overflows-at-320']);
});

test('a wide element capped with max-width is not a fixed width and is not reported', () => {
  const wide = [
    {
      ref: 'div.layout',
      rect: { x: 0, y: 0, w: 992, h: 400 },
      widthDeclared: 'auto',
      gridTemplateColumns: 'none',
      gridTracks: null,
      isDataGrid: false,
      nearestScrollAncestorRef: 'html',
      nearestScrollAncestorOverflowX: 'auto',
    },
  ];
  assert.deepEqual(idsOf(judgeReflow(reflowObs({ wide }))), []);
});

test('a percentage width is not a fixed width either', () => {
  const wide = [
    {
      ref: 'div.x',
      rect: { x: 0, y: 0, w: 400, h: 10 },
      widthDeclared: '120%',
      gridTracks: null,
      isDataGrid: false,
      nearestScrollAncestorOverflowX: 'auto',
      nearestScrollAncestorRef: 'html',
    },
  ];
  assert.deepEqual(idsOf(judgeReflow(reflowObs({ wide }))), []);
});

test('a wide data grid inside a scroll container is the documented exception', () => {
  const inContainer = {
    ref: 'table.price',
    rect: { x: 0, y: 0, w: 720, h: 100 },
    widthDeclared: 'auto',
    gridTracks: null,
    isDataGrid: true,
    nearestScrollAncestorRef: 'div.table-scroll',
    nearestScrollAncestorOverflowX: 'auto',
  };
  assert.deepEqual(idsOf(judgeReflow(reflowObs({ wide: [inContainer] }))), []);
  const onThePage = { ...inContainer, nearestScrollAncestorRef: 'html', nearestScrollAncestorOverflowX: 'visible' };
  assert.deepEqual(idsOf(judgeReflow(reflowObs({ wide: [onThePage] }))), [
    '1.4.10/wide-content-not-in-a-scroll-container',
  ]);
});

test('a scroll container that does scroll at this width costs nothing and is not reported', () => {
  const scrolls = [{ ref: 'div.t', scrollsAtCurrentWidth: true, measuredAtWidth: 320 }];
  assert.deepEqual(idsOf(judgeReflow(reflowObs({ tabbableScrollContainers: scrolls }))), []);
});

// --- 2.1.1 ---------------------------------------------------------------

const keyboardObs = (over = {}) => ({
  mouseTargets: [],
  anchorsWithoutHref: [],
  positiveTabindex: [],
  unreachedByTab: [],
  activations: [],
  tabSteps: 0,
  tabSequence: [],
  ...over,
});

test('a native button with a pointer handler is operable for free and is not reported', () => {
  const obs = keyboardObs({
    mouseTargets: [
      { ref: 'button.btn', tag: 'button', role: '', hasHref: false, tabbable: true, inlineHandlers: ['onclick'] },
    ],
  });
  assert.deepEqual(idsOf(judgeKeyboard(obs)), []);
});

test('an anchor with an href is interactive; the same anchor without one is not', () => {
  const el = (hasHref) => ({
    ref: 'a', tag: 'a', role: '', hasHref, tabbable: hasHref, inlineHandlers: ['onclick'],
  });
  assert.deepEqual(idsOf(judgeKeyboard(keyboardObs({ mouseTargets: [el(true)] }))), []);
  assert.deepEqual(idsOf(judgeKeyboard(keyboardObs({ mouseTargets: [el(false)] }))), [
    '2.1.1/click-handler-on-unfocusable-element',
  ]);
});

test('a div given role=button and a tabindex is reachable and is not reported as unfocusable', () => {
  const obs = keyboardObs({
    mouseTargets: [
      { ref: 'div.x', tag: 'div', role: 'button', hasHref: false, tabbable: true, inlineHandlers: ['onclick'] },
    ],
  });
  assert.deepEqual(idsOf(judgeKeyboard(obs)), []);
});

test('a control that declares an action and does nothing on Enter is reachable and not operable', () => {
  const obs = keyboardObs({
    activations: [
      { ref: 'div.rate', reached: true, hasInlineHandler: true, handler: 'onmousedown', firedOnEnter: false },
    ],
  });
  assert.deepEqual(idsOf(judgeKeyboard(obs)), ['2.1.1/control-not-operable-by-enter']);
});

test('a control that fired on Enter is operable, and silence is a limit rather than a pass', () => {
  const fired = keyboardObs({
    activations: [{ ref: 'button', reached: true, hasInlineHandler: true, handler: 'onclick', firedOnEnter: true }],
  });
  assert.deepEqual(idsOf(judgeKeyboard(fired)), []);
  const silent = keyboardObs({
    activations: [{ ref: 'button', reached: true, hasInlineHandler: false, handler: '', firedOnEnter: false }],
  });
  assert.deepEqual(idsOf(judgeKeyboard(silent)), ['2.1.1/action-attached-by-script-not-observed']);
});

test('a positive tabindex is reported whatever else is true of the element', () => {
  const obs = keyboardObs({
    positiveTabindex: [{ ref: 'input', tag: 'input', tabIndexAttr: '3', inlineHandlers: [] }],
  });
  assert.deepEqual(idsOf(judgeKeyboard(obs)), ['2.1.1/positive-tabindex']);
});

// --- 2.1.2 ---------------------------------------------------------------

const dialog = (over = {}) => ({
  ref: 'div#drawer',
  opened: true,
  opener: 'button#open',
  focusAfterOpen: 'button#close',
  focusMovedIn: true,
  escapedWhileOpen: [],
  escapeClosedIt: true,
  closedByKeyboard: true,
  focusAfterClose: 'button#open',
  usedInert: false,
  ...over,
});

const trapObs = (d, env = { inertSupported: true, forcedColors: false }) => ({
  dialogs: [d],
  environment: env,
});

test('a dialog that takes focus, contains Tab, closes on Escape and returns focus reports nothing', () => {
  assert.deepEqual(idsOf(judgeTrap(trapObs(dialog()))), []);
});

test('each of the four trap failures is reported on its own', () => {
  assert.deepEqual(idsOf(judgeTrap(trapObs(dialog({ focusMovedIn: false })))), [
    '2.1.2/focus-not-moved-into-dialog',
  ]);
  assert.deepEqual(idsOf(judgeTrap(trapObs(dialog({ escapedWhileOpen: ['p > a'] })))), [
    '2.1.2/tab-leaves-open-dialog',
  ]);
  assert.deepEqual(idsOf(judgeTrap(trapObs(dialog({ escapeClosedIt: false })))), [
    '2.1.2/escape-does-not-close',
  ]);
  assert.deepEqual(idsOf(judgeTrap(trapObs(dialog({ focusAfterClose: 'the document body' })))), [
    '2.1.2/focus-not-returned-to-opener',
  ]);
});

test('focus return is only judged when the dialog was closed with a key', () => {
  // Closing with the mouse and then measuring focus measures where the mouse
  // put it, which says nothing about the keyboard path.
  const mouseClosed = dialog({ closedByKeyboard: false, focusAfterClose: 'the document body', escapeClosedIt: false });
  assert.deepEqual(idsOf(judgeTrap(trapObs(mouseClosed))), ['2.1.2/escape-does-not-close']);
});

test('a dialog with no keyboard route in is reported as unjudged, not as correct', () => {
  assert.deepEqual(idsOf(judgeTrap(trapObs({ ref: 'div#m', opened: false }))), [
    '2.1.2/dialog-could-not-be-opened-by-keyboard',
  ]);
});

test('the inert fallback is only unverified where the browser supports inert', () => {
  assert.deepEqual(idsOf(judgeTrap(trapObs(dialog({ usedInert: true })))), [
    '2.1.2/inert-fallback-branch-not-executed',
  ]);
  const noInert = judgeTrap(trapObs(dialog({ usedInert: true }), { inertSupported: false, forcedColors: false }));
  assert.deepEqual(idsOf(noInert), []);
});

// --- 2.4.3 ---------------------------------------------------------------

const orderObs = (over = {}) => ({
  reorderedContainers: [],
  containersInspected: 1,
  tabSequence: [{ ref: 'a', name: 'One', visible: true, rect: { x: 0, y: 0, w: 40, h: 20 }, hiddenBecause: null }],
  ...over,
});

test('focus order always reports the limit, because meaning is not geometric', () => {
  assert.deepEqual(idsOf(judgeOrder(orderObs())), ['2.4.3/meaning-of-order-not-judged']);
});

test('a container painted in a different order from its DOM order is reported', () => {
  const out = judgeOrder(
    orderObs({
      reorderedContainers: [
        {
          ref: 'div.layout',
          display: 'flex',
          domOrder: ['nav', 'article'],
          visualOrder: ['article', 'nav'],
          cause: 'order is set to 2',
        },
      ],
    })
  );
  assert.ok(idsOf(out).includes('2.4.3/visual-order-differs-from-dom-order'));
});

test('a tab step that cannot be seen names the ancestor that hid it', () => {
  const out = judgeOrder(
    orderObs({
      tabSequence: [
        {
          ref: 'nav.submenu > a',
          name: 'Hidden one',
          visible: false,
          rect: { x: 0, y: 0, w: 87, h: 20 },
          hiddenBecause: 'nav.submenu, an ancestor, is opacity:0',
        },
      ],
    })
  );
  assert.ok(idsOf(out).includes('2.4.3/focus-enters-invisible-content'));
  const detail = out.find((f) => f.id === '2.4.3/focus-enters-invisible-content').detail;
  // The element's own opacity is 1. Reporting that would read as a
  // contradiction, which is why the reason names the ancestor.
  assert.match(detail, /nav\.submenu, an ancestor, is opacity:0/);
});

// --- 2.4.7 ---------------------------------------------------------------

const style = (over = {}) => ({
  outlineStyle: 'none',
  outlineWidth: '0px',
  outlineColor: 'rgb(0, 0, 0)',
  outlineOffset: '0px',
  boxShadow: 'none',
  borderColor: 'rgb(0, 0, 0)',
  borderWidth: '0px',
  backgroundColor: 'rgba(0, 0, 0, 0)',
  textDecorationLine: 'none',
  filter: 'none',
  ...over,
});

test('an outline offset that moves with no outline to offset paints nothing', () => {
  // The defect that made the first version of this check pass a page with
  // outline:none on every element. Chrome sets outline-offset on
  // :focus-visible whether or not there is an outline.
  const before = style();
  const after = style({ outlineOffset: '1px' });
  assert.deepEqual(paintedDelta(before, after), []);
  assert.deepEqual(inertDelta(before, after), ['outlineOffset']);
});

test('an outline colour that changes with a width of zero paints nothing either', () => {
  assert.deepEqual(paintedDelta(style(), style({ outlineColor: 'rgb(0, 95, 204)' })), []);
});

test('an outline that appears paints something', () => {
  assert.deepEqual(
    paintedDelta(style(), style({ outlineStyle: 'solid', outlineWidth: '3px' })),
    ['outline appears']
  );
});

test('a background, a border, an underline, a shadow and a filter all count', () => {
  assert.deepEqual(paintedDelta(style(), style({ backgroundColor: 'rgb(0, 0, 0)' })), ['backgroundColor']);
  assert.deepEqual(
    paintedDelta(style(), style({ borderWidth: '2px', borderColor: 'rgb(0, 95, 204)' })),
    ['border']
  );
  assert.deepEqual(paintedDelta(style(), style({ textDecorationLine: 'underline' })), ['textDecorationLine']);
  assert.deepEqual(paintedDelta(style(), style({ boxShadow: '0 0 0 3px #005fcc' })), ['boxShadow']);
  assert.deepEqual(paintedDelta(style(), style({ filter: 'invert(1)' })), ['filter']);
});

const indicatorObs = (controls) => ({ controls, environment: { forcedColors: true, inertSupported: true } });

test('a page with no painted indicator is reported, and the inert change is named', () => {
  const out = judgeIndicator(
    indicatorObs([
      {
        ref: 'a',
        name: 'Continue shopping',
        before: style(),
        after: style({ outlineOffset: '1px' }),
        backdropBehind: 'rgb(255, 255, 255)',
      },
    ])
  );
  assert.deepEqual(idsOf(out), ['2.4.7/no-indicator-on-focus']);
  assert.match(out[0].detail, /outlineOffset did change/);
});

test('a ring is measured against what is behind the element, not its own background', () => {
  // A pale ring on a dark button over a white page is invisible. Measuring
  // it against the button turns it into a pass.
  const out = judgeIndicator(
    indicatorObs([
      {
        ref: 'button.btn',
        name: 'Add to basket',
        before: style({ backgroundColor: 'rgb(26, 26, 26)' }),
        after: style({
          backgroundColor: 'rgb(26, 26, 26)',
          outlineStyle: 'solid',
          outlineWidth: '1px',
          outlineColor: 'rgb(204, 204, 204)',
        }),
        backdropBehind: 'rgb(255, 255, 255)',
      },
    ])
  );
  assert.deepEqual(idsOf(out), ['2.4.7/indicator-contrast-below-3', '2.4.7/indicator-thinner-than-2px']);
});

test('a ring in a colour outside sRGB produces a limit and never a ratio', () => {
  const out = judgeIndicator(
    indicatorObs([
      {
        ref: 'button',
        name: 'Focus me',
        before: style(),
        after: style({
          outlineStyle: 'solid',
          outlineWidth: '3px',
          outlineColor: 'color(display-p3 0.1 0.3 0.9)',
        }),
        backdropBehind: 'rgb(255, 255, 255)',
      },
    ])
  );
  assert.deepEqual(idsOf(out), ['2.4.7/indicator-colour-not-resolvable']);
});

test('a correct 3px ring at 3 to 1 or better reports nothing at all', () => {
  const out = judgeIndicator(
    indicatorObs([
      {
        ref: 'button',
        name: 'Add',
        before: style(),
        after: style({ outlineStyle: 'solid', outlineWidth: '3px', outlineColor: 'rgb(0, 95, 204)' }),
        backdropBehind: 'rgb(255, 255, 255)',
      },
    ])
  );
  assert.deepEqual(idsOf(out), []);
});

// --- 2.4.11 --------------------------------------------------------------

test('coverage is a fraction of the focused element, not of the thing covering it', () => {
  const target = { x: 10, y: 10, w: 100, h: 20 };
  assert.equal(coveredFraction(target, { x: 0, y: 0, w: 1280, h: 88 }), 1);
  assert.equal(coveredFraction(target, { x: 0, y: 0, w: 1280, h: 20 }), 0.5);
  assert.equal(coveredFraction(target, { x: 0, y: 500, w: 1280, h: 88 }), 0);
});

const obscuredObs = (steps, over = {}) => ({
  obscurers: [{ ref: 'header', position: 'sticky', zIndex: '10' }],
  steps,
  fragmentTarget: null,
  environment: { forcedColors: false, inertSupported: true },
  ...over,
});

test('entirely covered fails the criterion and partly covered does not', () => {
  const entirely = obscuredObs([
    {
      ref: 'a',
      name: 'Returns form',
      via: 'Tab press 7',
      rect: { x: 10, y: 10, w: 100, h: 20 },
      covers: [{ ref: 'header', position: 'sticky', zIndex: '10', rect: { x: 0, y: 0, w: 1280, h: 88 } }],
    },
  ]);
  assert.deepEqual(idsOf(judgeObscured(entirely)), ['2.4.11/focused-element-entirely-obscured']);

  const partly = obscuredObs([
    {
      ref: 'button.chat',
      name: 'Chat',
      via: 'Tab press 20',
      rect: { x: 10, y: 10, w: 100, h: 20 },
      covers: [{ ref: 'div.consent', position: 'fixed', zIndex: '20', rect: { x: 0, y: 20, w: 1280, h: 88 } }],
    },
  ]);
  const out = judgeObscured(partly);
  assert.deepEqual(idsOf(out), ['2.4.11/focused-element-partly-obscured']);
  assert.equal(out[0].kind, 'limit');
  assert.match(out[0].detail, /2\.4\.12/);
});

test('a page with nothing fixed or sticky says so rather than reporting a clean measurement', () => {
  assert.deepEqual(idsOf(judgeObscured(obscuredObs([], { obscurers: [] }))), [
    '2.4.11/nothing-fixed-or-sticky-to-judge-against',
  ]);
});

// --- 1.4.11 --------------------------------------------------------------

test('a boundary is judged against the better of its two adjacent colours', () => {
  const dark = parseColour('#1a1a1a');
  const white = parseColour('#ffffff');
  const border = parseColour('#cccccc');
  // Poor against the white page, excellent against the dark button it edges.
  assert.ok(boundaryRatio(border, [white, dark]) > 3);
  assert.ok(boundaryRatio(border, [white, null]) < 3);
});

test('a boundary with no resolvable adjacent colour yields null rather than a figure', () => {
  assert.equal(boundaryRatio(parseColour('#ffffff'), [null, null]), null);
  assert.equal(boundaryRatio(parseColour('#ffffff'), [parseColour('transparent')]), null);
});

const nonTextObs = (over = {}) => ({
  controls: [],
  unborderedBoxes: [],
  icons: [],
  statePairs: [],
  ...over,
});

test('a gradient behind a control produces a limit, not a silent pass', () => {
  // The defect this closes: the control on the gradient in the corrected
  // example produced no finding at all, because the inside colour parsed as
  // transparent and the outside one was null, so the ratio was null and the
  // case fell through every branch.
  const out = judgeNonText(
    nonTextObs({
      controls: [
        {
          ref: 'button.btn-over',
          borderColour: 'rgb(255, 255, 255)',
          borderWidth: '2px',
          backdropOutside: null,
          backdropOutsideReason: 'background-image on span.on-gradient',
          backgroundInside: 'rgba(0, 0, 0, 0)',
        },
      ],
    })
  );
  assert.deepEqual(idsOf(out), ['1.4.11/background-not-a-flat-colour-not-judged']);
  assert.match(out[0].detail, /span\.on-gradient/);
});

test('a named graphic is judged and an unnamed one is never collected', () => {
  const out = judgeNonText(
    nonTextObs({
      icons: [{ ref: 'svg > path', name: 'Warning', fill: 'rgb(255, 217, 160)', backdrop: 'rgb(255, 255, 255)' }],
    })
  );
  assert.deepEqual(idsOf(out), ['1.4.11/meaningful-icon-below-3']);
});

test('two states that differ by more than a flat colour are a limit, because the fix is positional', () => {
  const out = judgeNonText(
    nonTextObs({
      statePairs: [
        {
          aRef: 'span.toggle:nth-of-type(1)',
          bRef: 'span.toggle:nth-of-type(2)',
          aBackground: 'rgba(0, 0, 0, 0)',
          bBackground: 'rgb(11, 107, 58)',
        },
      ],
    })
  );
  assert.deepEqual(idsOf(out), ['1.4.11/state-difference-beyond-colour-not-judged']);
});

test('two states that differ only in a flat colour below 3 to 1 are a failure', () => {
  const out = judgeNonText(
    nonTextObs({
      statePairs: [
        { aRef: 'span.off', bRef: 'span.on', aBackground: 'rgb(236, 236, 236)', bBackground: 'rgb(245, 245, 245)' },
      ],
    })
  );
  assert.deepEqual(idsOf(out), ['1.4.11/state-fill-below-3']);
});

test('a control boundary at 4.54 to 1 is past the threshold and reports nothing', () => {
  const out = judgeNonText(
    nonTextObs({
      controls: [
        {
          ref: 'input#email',
          borderColour: 'rgb(118, 118, 118)',
          borderWidth: '1px',
          backdropOutside: 'rgb(255, 255, 255)',
          backdropOutsideReason: null,
          backgroundInside: 'rgb(255, 255, 255)',
        },
      ],
    })
  );
  assert.deepEqual(idsOf(out), []);
});
