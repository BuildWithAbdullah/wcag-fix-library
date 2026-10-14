/**
 * The seven criteria no scanner reports, driven in a real browser, with the
 * declared sets in tools/pairs.mjs asserted in both directions.
 *
 * The second direction is the one that earns its keep. Asserting that a
 * failing example produces at least one finding catches a repair that has
 * stopped working. Asserting that it produces exactly this set catches a
 * repair that has started reporting something else, and asserting that the
 * corrected example produces exactly its declared residual catches a fix that
 * has quietly stopped covering a case the folder still claims.
 */

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../audit/browser.mjs';
import { observeAndJudge } from '../audit/run.mjs';
import { BEHAVIOURAL, FIXTURES } from '../tools/pairs.mjs';
import { idsOf } from '../lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let browser;
before(async () => {
  browser = await launch();
});
after(async () => {
  if (browser) await browser.close();
});

for (const criterion of BEHAVIOURAL) {
  test(`${criterion.sc} the failing example exhibits exactly its declared set`, async () => {
    const file = path.join(ROOT, 'criteria', criterion.dir, 'fail.html');
    const { findings } = await observeAndJudge(browser, criterion.collector, file);
    assert.deepEqual(
      idsOf(findings),
      [...criterion.fail].sort(),
      `${criterion.dir}/fail.html does not exhibit what tools/pairs.mjs declares for it`
    );
  });

  test(`${criterion.sc} the corrected example exhibits no failure and exactly its declared residual`, async () => {
    const file = path.join(ROOT, 'criteria', criterion.dir, 'pass.html');
    const { findings } = await observeAndJudge(browser, criterion.collector, file);
    const failures = findings.filter((f) => f.kind === 'failure');
    assert.deepEqual(
      failures.map((f) => `${f.id}: ${f.detail}`),
      [],
      `${criterion.dir}/pass.html still fails its own criterion`
    );
    assert.deepEqual(
      idsOf(findings),
      [...criterion.residual].sort(),
      `${criterion.dir}/pass.html does not leave exactly the residual tools/pairs.mjs declares. ` +
        'A residual that has gone away means the judging now reaches further than the README ' +
        'says it does, and the README has to be rewritten rather than the assertion relaxed.'
    );
  });

  test(`${criterion.sc} every finding carries a detail line naming the element`, async () => {
    const file = path.join(ROOT, 'criteria', criterion.dir, 'fail.html');
    const { findings } = await observeAndJudge(browser, criterion.collector, file);
    for (const f of findings) {
      assert.ok(f.detail.length > 60, `${f.id} has a detail line too short to act on`);
      assert.equal(f.criterion, criterion.sc);
    }
  });
}

for (const fixture of FIXTURES) {
  test(`fixture ${fixture.file} drives exactly the findings it is there for`, async () => {
    const file = path.join(ROOT, 'test', 'fixtures', fixture.file);
    const { findings } = await observeAndJudge(browser, fixture.collector, file);
    for (const expected of fixture.expect) {
      assert.ok(
        idsOf(findings).includes(expected),
        `${fixture.file} no longer produces ${expected}, so nothing drives that finding any more`
      );
    }
  });
}

test('every catalogued finding is produced by something, on a real page', async () => {
  // The assertion that stops the catalogue filling up with findings nobody
  // has ever seen fire. Four of the six defects found in a sister repository
  // on 7 October were in exactly that set: declared, never observed.
  const produced = new Set();
  for (const criterion of BEHAVIOURAL) {
    for (const side of ['fail', 'pass']) {
      const file = path.join(ROOT, 'criteria', criterion.dir, `${side}.html`);
      const { findings } = await observeAndJudge(browser, criterion.collector, file);
      for (const id of idsOf(findings)) produced.add(id);
    }
  }
  for (const fixture of FIXTURES) {
    const file = path.join(ROOT, 'test', 'fixtures', fixture.file);
    const { findings } = await observeAndJudge(browser, fixture.collector, file);
    for (const id of idsOf(findings)) produced.add(id);
  }

  const declared = new Set();
  for (const c of BEHAVIOURAL) {
    for (const id of c.fail) declared.add(id);
    for (const id of c.residual) declared.add(id);
  }
  for (const f of FIXTURES) for (const id of f.expect) declared.add(id);

  assert.deepEqual(
    [...produced].sort(),
    [...declared].sort(),
    'the set of findings observed on real pages and the set declared are not the same set'
  );
});
