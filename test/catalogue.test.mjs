/**
 * The catalogue against the declaration, both ways. No browser.
 *
 * Set equality in one direction catches a finding added to a judge and never
 * documented. The other direction catches the quieter mistake: a finding
 * documented, counted in the README, and no longer produced by anything.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTOMATED, BEHAVIOURAL, FIXTURES } from '../tools/pairs.mjs';
import {
  DESCRIPTIONS,
  buildAutomatedRows,
  buildFindingRows,
  counts,
  render,
} from '../tools/catalogue.mjs';

test('every declared finding has a description and every description is declared', () => {
  const declared = new Set();
  for (const c of BEHAVIOURAL) {
    for (const id of c.fail) declared.add(id);
    for (const id of c.residual) declared.add(id);
  }
  for (const f of FIXTURES) for (const id of f.expect) declared.add(id);

  const described = new Set(Object.keys(DESCRIPTIONS));
  assert.deepEqual(
    [...declared].sort(),
    [...described].sort(),
    'the declared finding set and the described finding set are not the same set'
  );
});

test('every finding id belongs to a criterion folder that exists in the declaration', () => {
  const criteria = new Set([...AUTOMATED, ...BEHAVIOURAL].map((c) => c.sc));
  for (const row of buildFindingRows()) {
    assert.ok(criteria.has(row.criterion), `${row.id} names a criterion no folder declares`);
  }
});

test('a finding that is both a failure somewhere and a limit elsewhere is catalogued as a limit', () => {
  // 2.1.1/action-attached-by-script-not-observed is observed on both sides of
  // its pair. It is a statement about the judging either way, so the limit
  // label is the honest one.
  const row = buildFindingRows().find((r) => r.id === '2.1.1/action-attached-by-script-not-observed');
  assert.equal(row.kind, 'residual');
});

test('no axe rule is declared with two different outcomes for one criterion', () => {
  const seen = new Map();
  for (const row of buildAutomatedRows()) {
    const key = `${row.sc}|${row.rule}`;
    assert.ok(!seen.has(key), `${row.sc} declares ${row.rule} twice, as ${seen.get(key)} and as ${row.outcome}`);
    seen.set(key, row.outcome);
  }
});

test('every criterion judged by this repository declares at least one limit', () => {
  for (const c of BEHAVIOURAL) {
    assert.ok(c.residual.length > 0, `${c.sc} declares no limit`);
  }
});

test('the counts the README quotes come from the declaration, not from a constant', () => {
  const n = counts();
  assert.equal(n.automatedRules, buildAutomatedRows().length);
  assert.equal(n.behavioural, buildFindingRows().filter((r) => r.kind === 'behavioural').length);
  assert.equal(n.residual, buildFindingRows().filter((r) => r.kind === 'residual').length);
  assert.equal(n.total, n.automatedRules + n.behavioural + n.residual);
});

test('rendering the catalogue twice produces the same bytes', () => {
  // A generated file checked in CI has to be deterministic or the check is a
  // coin toss. Object iteration order is stable here only because every list
  // is sorted before it is rendered.
  assert.equal(render(), render());
});

test('the rendered catalogue mentions every finding id exactly where it belongs', () => {
  const text = render();
  for (const row of buildFindingRows()) {
    assert.ok(text.includes(`\`${row.id}\``), `${row.id} is missing from the rendered catalogue`);
  }
  for (const row of buildAutomatedRows()) {
    assert.ok(text.includes(`\`${row.rule}\``), `${row.rule} is missing from the rendered catalogue`);
  }
});
