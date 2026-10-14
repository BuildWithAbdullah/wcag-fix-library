/**
 * The pure core: colour parsing, luminance, contrast. No browser, no DOM.
 *
 * The published figures are checked against values anybody can look up, and
 * the parsing is checked against the shapes getComputedStyle actually
 * returns rather than the shapes an author writes.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseColour, over, isTransparent } from '../lib/colour.mjs';
import { luminance, ratio, round, THRESHOLDS } from '../lib/contrast.mjs';

const r = (a, b) => round(ratio(parseColour(a), parseColour(b)));

test('contrast of black on white is exactly 21', () => {
  assert.equal(r('#000000', '#ffffff'), 21);
});

test('contrast of a colour with itself is 1', () => {
  assert.equal(r('#767676', '#767676'), 1);
});

test('the order of the two colours does not matter', () => {
  assert.equal(r('#767676', '#ffffff'), r('#ffffff', '#767676'));
});

test('767676 on white is the canonical 4.54, which is why it is the usual safe grey', () => {
  assert.equal(r('#767676', '#ffffff'), 4.54);
  assert.ok(r('#767676', '#ffffff') >= THRESHOLDS.textNormal);
});

test('777777 on white is below 4.5, which is why one digit matters', () => {
  assert.ok(r('#777777', '#ffffff') < THRESHOLDS.textNormal);
});

test('the border colour on the failing 1.4.11 example is nowhere near 3 to 1', () => {
  assert.equal(r('#dddddd', '#ffffff'), 1.36);
  assert.ok(r('#dddddd', '#ffffff') < THRESHOLDS.nonText);
});

test('the corrected 1.4.11 icon colour is above 3 to 1 and the figure is 4.72', () => {
  // The folder README quoted 4.6 for a month. It is 4.72. A figure in prose
  // that nothing checks is a figure that is eventually wrong.
  assert.equal(r('#b35c00', '#ffffff'), 4.72);
});

test('the failing dark panel focus ring is 1.04 to 1 against the panel', () => {
  assert.equal(r('#1a1a1a', '#14161a'), 1.04);
});

test('luminance of white is 1 and of black is 0', () => {
  assert.equal(luminance(parseColour('#ffffff')), 1);
  assert.equal(luminance(parseColour('#000000')), 0);
});

test('luminance refuses a colour that is not opaque, because the ratio is undefined', () => {
  assert.equal(luminance([0, 0, 0, 0.5]), null);
  assert.equal(ratio([0, 0, 0, 0.5], [255, 255, 255, 1]), null);
});

test('the shapes getComputedStyle returns all parse', () => {
  assert.deepEqual(parseColour('rgb(26, 26, 26)'), [26, 26, 26, 1]);
  assert.deepEqual(parseColour('rgba(26, 26, 26, 0.5)'), [26, 26, 26, 0.5]);
  assert.deepEqual(parseColour('rgba(0, 0, 0, 0)'), [0, 0, 0, 0]);
  assert.deepEqual(parseColour('rgb(0 0 0 / 50%)'), [0, 0, 0, 0.5]);
});

test('hex in every length parses, including the alpha forms', () => {
  assert.deepEqual(parseColour('#fff'), [255, 255, 255, 1]);
  assert.deepEqual(parseColour('#ffffff'), [255, 255, 255, 1]);
  assert.deepEqual(parseColour('#ffffff00'), [255, 255, 255, 0]);
  assert.deepEqual(parseColour('#f00f'), [255, 0, 0, 1]);
});

test('transparent is a colour with zero alpha, not a missing colour', () => {
  assert.deepEqual(parseColour('transparent'), [0, 0, 0, 0]);
  assert.ok(isTransparent(parseColour('transparent')));
  assert.ok(!isTransparent(parseColour('#000000')));
});

test('a colour outside sRGB comes back as null rather than as black', () => {
  // This is the assertion that matters most in this file. A wide gamut value
  // resolved to a default produces a confident wrong ratio, and a confident
  // wrong ratio turns an unjudgeable control into a passing one.
  assert.equal(parseColour('color(display-p3 0.1 0.3 0.9)'), null);
  assert.equal(parseColour('oklch(0.7 0.1 200)'), null);
  assert.equal(parseColour('lab(50% 40 59.5)'), null);
  assert.equal(parseColour('currentcolor'), null);
  assert.equal(parseColour(''), null);
  assert.equal(parseColour(undefined), null);
});

test('a translucent colour composites over its backdrop before being judged', () => {
  assert.deepEqual(over([0, 0, 0, 0.2], [255, 255, 255, 1]), [204, 204, 204, 1]);
  assert.equal(round(ratio(over(parseColour('rgba(0,0,0,0.2)'), parseColour('#ffffff')), parseColour('#ffffff'))), 1.61);
});

test('compositing refuses a backdrop that is itself translucent', () => {
  assert.equal(over([0, 0, 0, 0.5], [255, 255, 255, 0.5]), null);
});

test('a threshold is a number with a reason, and the focus ring one is 3 not 4.5', () => {
  assert.equal(THRESHOLDS.nonText, 3);
  assert.equal(THRESHOLDS.focusIndicator, 3);
  assert.equal(THRESHOLDS.textNormal, 4.5);
  assert.equal(THRESHOLDS.textLarge, 3);
});
