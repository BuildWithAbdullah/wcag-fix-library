/**
 * The nine criteria axe-core does report, with all four of the things a
 * scanner can do with a defect asserted rather than described.
 *
 * The old version of this check required at least one declared rule to fire.
 * That is weak in a way that is easy to miss: twelve rules were declared
 * across five criteria for a month and never fired once, because the
 * declaration only had to be partly true. Three of the twelve were simply the
 * wrong rule for the defect on the page, one was tagged AAA and could never
 * run under this library's filter, and the rest were cases the pages did not
 * contain. Set equality in both directions would have caught all of it on
 * the first run.
 */

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../audit/browser.mjs';
import { scanFiltered, scanRule, metaFor, WCAG_A_AND_AA } from '../tools/axe.mjs';
import { AUTOMATED } from '../tools/pairs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let browser;
let page;
before(async () => {
  browser = await launch();
  page = await browser.newPage();
});
after(async () => {
  if (browser) await browser.close();
});

const dirOf = (c) => path.join(ROOT, 'criteria', c.dir);

for (const criterion of AUTOMATED) {
  test(`${criterion.sc} the failing example produces exactly the declared violations`, async () => {
    const dir = dirOf(criterion);
    const meta = await metaFor(dir);
    const result = await scanFiltered(page, path.join(dir, 'fail.html'), meta.axeTags ?? WCAG_A_AND_AA);
    assert.deepEqual(
      result.violations,
      [...criterion.violations].sort(),
      `${criterion.dir}/fail.html violations differ from the declaration in tools/pairs.mjs`
    );
  });

  test(`${criterion.sc} the corrected example produces no violations at all`, async () => {
    const dir = dirOf(criterion);
    const meta = await metaFor(dir);
    const result = await scanFiltered(page, path.join(dir, 'pass.html'), meta.axeTags ?? WCAG_A_AND_AA);
    assert.deepEqual(result.violations, [], `${criterion.dir}/pass.html is not clean`);
  });

  test(`${criterion.sc} every rule declared as incomplete really is incomplete`, async () => {
    const dir = dirOf(criterion);
    const meta = await metaFor(dir);
    const result = await scanFiltered(page, path.join(dir, 'fail.html'), meta.axeTags ?? WCAG_A_AND_AA);
    for (const entry of criterion.incomplete) {
      assert.ok(
        result.incomplete.includes(entry.rule),
        `${criterion.sc} declares ${entry.rule} as incomplete and it is not in the incomplete set`
      );
      assert.ok(
        !result.violations.includes(entry.rule),
        `${criterion.sc} declares ${entry.rule} as incomplete and axe now reports it as a violation, ` +
          'which is good news and means the note in tools/pairs.mjs is out of date'
      );
    }
  });

  test(`${criterion.sc} the incomplete set is exactly what is declared, with nothing extra`, async () => {
    const dir = dirOf(criterion);
    const meta = await metaFor(dir);
    const result = await scanFiltered(page, path.join(dir, 'fail.html'), meta.axeTags ?? WCAG_A_AND_AA);
    assert.deepEqual(
      result.incomplete,
      criterion.incomplete.map((e) => e.rule).sort(),
      `${criterion.dir}/fail.html has an incomplete set that differs from the declaration. An ` +
        'undeclared incomplete is a defect axe looked at and reported neither way, which is ' +
        'exactly the category this library exists to make visible.'
    );
  });

  test(`${criterion.sc} every rule declared as passing despite the defect really does pass`, async () => {
    const dir = dirOf(criterion);
    for (const entry of criterion.passesDespiteTheDefect ?? []) {
      // Enabled on its own by rule id, so the result cannot be an artefact of
      // the tag filter. This is the measurement behind the claim that axe
      // examines the defect and reports the page as correct.
      const result = await scanRule(page, path.join(dir, 'fail.html'), entry.rule);
      assert.deepEqual(
        result.violations,
        [],
        `${criterion.sc} declares ${entry.rule} as passing and it now reports a violation`
      );
      assert.ok(
        result.passes.includes(entry.rule),
        `${criterion.sc} declares ${entry.rule} as passing and it did not run or did not pass; ` +
          `it reported incomplete ${JSON.stringify(result.incomplete)} and inapplicable ` +
          `${JSON.stringify(result.inapplicable)}`
      );
    }
  });

  test(`${criterion.sc} every rule declared outside the tag filter is absent, and has the declared forced outcome`, async () => {
    const dir = dirOf(criterion);
    const meta = await metaFor(dir);
    for (const entry of criterion.outsideTheTagFilter ?? []) {
      const filtered = await scanFiltered(page, path.join(dir, 'fail.html'), meta.axeTags ?? WCAG_A_AND_AA);
      for (const set of ['violations', 'incomplete', 'passes', 'inapplicable']) {
        assert.ok(
          !filtered[set].includes(entry.rule),
          `${entry.rule} is declared as excluded by the tag filter and it appears in ${set}`
        );
      }
      const forced = await scanRule(page, path.join(dir, 'fail.html'), entry.rule);
      const outcome = forced.violations.includes(entry.rule)
        ? 'violation'
        : forced.incomplete.includes(entry.rule)
          ? 'incomplete'
          : forced.passes.includes(entry.rule)
            ? 'pass'
            : 'inapplicable';
      assert.equal(
        outcome,
        entry.forcedOutcome,
        `${entry.rule} forced on by rule id now reports ${outcome}, and tools/pairs.mjs says ` +
          `${entry.forcedOutcome}`
      );
    }
  });
}

test('the one criterion that widens its tag filter is the only one that needs to', async () => {
  // 2.4.1 widens the filter because axe tags its landmark rules as
  // best-practice rather than wcag2a. If another folder quietly acquires an
  // override, the figures in the README stop meaning the same thing.
  const widened = [];
  for (const criterion of AUTOMATED) {
    const meta = await metaFor(dirOf(criterion));
    if (meta.axeTags) widened.push(criterion.sc);
  }
  assert.deepEqual(widened, ['2.4.1']);
});

test('a clean scan of a corrected page is clean under a wider filter too', async () => {
  // Otherwise every pass.html here is clean only because the filter is
  // narrow, and the library is demonstrating its own tag configuration
  // rather than correct markup.
  const wide = [...WCAG_A_AND_AA, 'best-practice'];
  const allowed = new Set([
    // Every page here is a fragment rather than a whole document, so it has
    // no main landmark and no single h1 by design. Listed so the exception
    // is a decision rather than a gap.
    'landmark-one-main',
    'page-has-heading-one',
    'region',
    'color-contrast-enhanced',
  ]);
  for (const criterion of AUTOMATED) {
    const result = await scanFiltered(page, path.join(dirOf(criterion), 'pass.html'), wide);
    const unexpected = result.violations.filter((id) => !allowed.has(id));
    assert.deepEqual(
      unexpected,
      [],
      `${criterion.dir}/pass.html fails ${unexpected.join(', ')} once best-practice rules are included`
    );
  }
});
