/**
 * axe-report.mjs
 *
 * The scanner's view of this library, printed the way a practitioner would
 * want it: for every criterion, what a WCAG filtered scan reports on the
 * failing example, and what it does with the rules it does not report.
 *
 * The last column is the point. Nine criteria here produce violations. Seven
 * produce nothing at all, and on top of that several of the nine have rules
 * axe examines and declines to decide. Run this and the gap is a table rather
 * than an argument.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../audit/browser.mjs';
import { scanFiltered, metaFor, WCAG_A_AND_AA } from './axe.mjs';
import { AUTOMATED, BEHAVIOURAL } from './pairs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GREEN = '\x1b[32m';
const YEL = '\x1b[33m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

async function main() {
  const browser = await launch();
  const working = await browser.newPage();
  try {
    let violationTotal = 0;
    let silent = 0;

    for (const c of [...AUTOMATED, ...BEHAVIOURAL].sort((a, b) => a.sc.localeCompare(b.sc))) {
      const dir = path.join(ROOT, 'criteria', c.dir);
      const meta = await metaFor(dir);
      const result = await scanFiltered(working, path.join(dir, 'fail.html'), meta.axeTags ?? WCAG_A_AND_AA);
      const label = `${meta.sc} ${meta.name}`;
      if (result.violations.length > 0) {
        violationTotal += result.violations.length;
        console.log(`${GREEN}${String(result.violations.length).padStart(2)} violations${OFF}  ${label}`);
        console.log(`                ${DIM}${result.violations.join(', ')}${OFF}`);
      } else {
        silent += 1;
        console.log(`${YEL} 0 violations${OFF}  ${label}`);
      }
      if (result.incomplete.length > 0) {
        console.log(
          `                ${DIM}examined and not decided: ${result.incomplete.join(', ')}${OFF}`
        );
      }
    }

    console.log(
      `\n${violationTotal} violations across the 16 failing examples. ` +
        `${silent} of the 16 produce none at all.`
    );
    console.log(
      'Those are the ones `npm run audit` judges, and the ones a pipeline with a scanner in it ' +
        'will never tell anybody about.'
    );
  } finally {
    await browser.close();
  }
}

await main();
