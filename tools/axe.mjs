/**
 * axe.mjs
 *
 * The axe-core half of the verification, and the place that knows the
 * difference between the four things a scanner can do with a defect.
 *
 *   violation   it found it and says so
 *   incomplete  it looked, could not decide, and reported neither way
 *   pass        it looked and reported the page as correct
 *   not run     the rule exists but the tag filter excluded it
 *
 * Only the first of those appears in the number everybody quotes. The other
 * three are the reason a page with zero violations is not a page without
 * defects, and tools/pairs.mjs declares every one of them that this library
 * exhibits so that all four are checked rather than described.
 */

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { AxePuppeteer } from '@axe-core/puppeteer';

export const WCAG_A_AND_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export async function metaFor(dir) {
  return JSON.parse(await readFile(`${dir}/meta.json`, 'utf8'));
}

async function run(page, file, configure) {
  await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
  const results = await configure(new AxePuppeteer(page)).analyze();
  return {
    violations: [...new Set(results.violations.map((v) => v.id))].sort(),
    incomplete: [...new Set(results.incomplete.map((v) => v.id))].sort(),
    passes: [...new Set(results.passes.map((v) => v.id))].sort(),
    inapplicable: [...new Set(results.inapplicable.map((v) => v.id))].sort(),
    nodeCounts: Object.fromEntries(results.violations.map((v) => [v.id, v.nodes.length])),
  };
}

/** The scan a practitioner runs: filtered to the conformance target. */
export const scanFiltered = (page, file, tags) =>
  run(page, file, (axe) => axe.withTags(tags ?? WCAG_A_AND_AA));

/** One rule, enabled by id, whatever its tags. Used to measure what a filtered scan skipped. */
export const scanRule = (page, file, ruleId) =>
  run(page, file, (axe) => axe.withRules([ruleId]));
