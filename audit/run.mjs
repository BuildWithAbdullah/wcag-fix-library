/**
 * run.mjs
 *
 * The behavioural audit. For each of the seven criteria no scanner reports,
 * drive a real browser, collect observations, and judge them in Node.
 *
 * The split matters. Everything under audit/ touches a browser and decides
 * nothing; everything under lib/judge/ decides everything and has never seen
 * a browser. tools/verify.mjs asserts that split, so the judging stays unit
 * testable against fixture observations rather than only against whatever a
 * headless Chromium happened to do that morning.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './browser.mjs';
import { BEHAVIOURAL } from '../tools/pairs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const COLLECTORS = {
  reflow: () => import('./collectors/reflow.mjs'),
  'non-text-contrast': () => import('./collectors/non-text-contrast.mjs'),
  keyboard: () => import('./collectors/keyboard.mjs'),
  'keyboard-trap': () => import('./collectors/keyboard-trap.mjs'),
  'focus-order': () => import('./collectors/focus-order.mjs'),
  'focus-visible': () => import('./collectors/focus-visible.mjs'),
  'focus-not-obscured': () => import('./collectors/focus-not-obscured.mjs'),
};

const JUDGES = {
  reflow: () => import('../lib/judge/reflow.mjs'),
  'non-text-contrast': () => import('../lib/judge/non-text-contrast.mjs'),
  keyboard: () => import('../lib/judge/keyboard.mjs'),
  'keyboard-trap': () => import('../lib/judge/keyboard-trap.mjs'),
  'focus-order': () => import('../lib/judge/focus-order.mjs'),
  'focus-visible': () => import('../lib/judge/focus-visible.mjs'),
  'focus-not-obscured': () => import('../lib/judge/focus-not-obscured.mjs'),
};

export const COLLECTOR_NAMES = Object.keys(COLLECTORS);

/** Observe and judge one page with one collector. */
export async function observeAndJudge(browser, collectorName, file) {
  const collector = await COLLECTORS[collectorName]();
  const judge = await JUDGES[collectorName]();
  let observation = await collector.collect(browser, file);

  // Reflow is the one criterion that has to be measured at two widths: the
  // failure only exists at 320px, and the cost the fix pays only exists
  // where the table does not overflow.
  if (collectorName === 'reflow' && collector.collectWide) {
    const wide = await collector.collectWide(browser, file);
    observation = {
      ...observation,
      tabbableScrollContainers: [
        ...observation.tabbableScrollContainers,
        ...wide.tabbableScrollContainers,
      ],
    };
  }

  return { observation, findings: judge.judge(observation) };
}

/** Every behavioural criterion, both sides, plus the fixtures. */
export async function auditAll(browser, { fixtures = [] } = {}) {
  const results = [];
  for (const criterion of BEHAVIOURAL) {
    for (const side of ['fail', 'pass']) {
      const file = path.join(ROOT, 'criteria', criterion.dir, `${side}.html`);
      const { findings } = await observeAndJudge(browser, criterion.collector, file);
      results.push({ sc: criterion.sc, dir: criterion.dir, side, findings });
    }
  }
  for (const fixture of fixtures) {
    const file = path.join(ROOT, 'test', 'fixtures', fixture.file);
    const { findings } = await observeAndJudge(browser, fixture.collector, file);
    results.push({ sc: 'fixture', dir: fixture.file, side: 'fixture', findings });
  }
  return results;
}

async function main() {
  const { FIXTURES } = await import('../tools/pairs.mjs');
  const browser = await launch();
  let worst = 0;
  try {
    const results = await auditAll(browser, { fixtures: FIXTURES });
    for (const r of results) {
      const failures = r.findings.filter((f) => f.kind === 'failure');
      const limits = r.findings.filter((f) => f.kind === 'limit');
      const head = `${r.sc === 'fixture' ? 'fixture' : r.sc} ${r.side === 'fixture' ? '' : r.side}`.trim();
      console.log(`\n${head}  ${r.dir}`);
      for (const f of failures) console.log(`  FAIL  ${f.id}\n        ${f.detail}`);
      for (const f of limits) console.log(`  LIMIT ${f.id}\n        ${f.detail}`);
      if (!failures.length && !limits.length) console.log('  nothing reported');
      if (r.side === 'pass' && failures.length) worst = 1;
    }
    console.log(
      `\n${results.length} page(s) audited. A corrected page reporting a failure above is a ` +
        'defect in this library, not in the page.'
    );
  } finally {
    await browser.close();
  }
  process.exit(worst);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await main();
}
