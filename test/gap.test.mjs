/**
 * The headline assertion, and the one the whole repository is built around.
 *
 * For each of the seven criteria this library judges itself, two things are
 * asserted at once on the same page:
 *
 *   axe-core, filtered to the conformance target, reports zero violations
 *   this repository's own judging reports failures
 *
 * Either direction failing is informative and neither is a disaster.
 *
 * If axe starts reporting one of these pages, that is good news and the
 * build going red is the right response: the claim in the README that a
 * scanner cannot see this criterion has become false for that criterion and
 * the sentence has to be rewritten. A library that quietly keeps saying
 * "no scanner reports this" after a scanner starts reporting it is worse
 * than no library.
 *
 * If this repository's judging stops reporting the page, its own check has
 * broken, and without this assertion the result would be two clean reports
 * and a page that fails a criterion.
 *
 * The number this produces, zero violations across seven failing pages, is
 * the most useful figure in the repository, and it is now a measurement
 * rather than a sentence somebody wrote once.
 */

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../audit/browser.mjs';
import { observeAndJudge } from '../audit/run.mjs';
import { scanFiltered, metaFor, WCAG_A_AND_AA } from '../tools/axe.mjs';
import { BEHAVIOURAL } from '../tools/pairs.mjs';

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

for (const criterion of BEHAVIOURAL) {
  test(`${criterion.sc} a scanner reports nothing on a page that plainly fails it`, async () => {
    const dir = path.join(ROOT, 'criteria', criterion.dir);
    const meta = await metaFor(dir);
    const result = await scanFiltered(page, path.join(dir, 'fail.html'), meta.axeTags ?? WCAG_A_AND_AA);
    assert.deepEqual(
      result.violations,
      [],
      `axe now reports ${result.violations.join(', ')} on ${criterion.dir}/fail.html. This is ` +
        'good news. The claim that this criterion is invisible to a scanner is no longer true ' +
        'and the README and meta.json have to be corrected, rather than this assertion relaxed.'
    );
  });

  test(`${criterion.sc} this repository reports failures on the same page`, async () => {
    const file = path.join(ROOT, 'criteria', criterion.dir, 'fail.html');
    const { findings } = await observeAndJudge(browser, criterion.collector, file);
    const failures = findings.filter((f) => f.kind === 'failure');
    assert.ok(
      failures.length > 0,
      `${criterion.dir}/fail.html produced no failure from this repository's own judging, and no ` +
        'violation from axe either, so nothing anywhere reports a page that fails this criterion'
    );
  });

  test(`${criterion.sc} meta.json says axeDetectable is false, and that is now measured`, async () => {
    const meta = await metaFor(path.join(ROOT, 'criteria', criterion.dir));
    assert.equal(meta.axeDetectable, false);
    assert.deepEqual(meta.axeRules, []);
  });
}

test('seven of the sixteen failing examples produce no scanner violation at all', async () => {
  let silent = 0;
  for (const criterion of BEHAVIOURAL) {
    const dir = path.join(ROOT, 'criteria', criterion.dir);
    const meta = await metaFor(dir);
    const result = await scanFiltered(page, path.join(dir, 'fail.html'), meta.axeTags ?? WCAG_A_AND_AA);
    if (result.violations.length === 0) silent += 1;
  }
  assert.equal(
    silent,
    7,
    'the count of criteria no scanner reports has changed, which means the ratio quoted in the ' +
      'README is wrong'
  );
});
