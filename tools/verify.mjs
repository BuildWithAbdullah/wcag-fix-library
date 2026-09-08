/**
 * verify.mjs
 *
 * Every corrected example in this library is checked by machine, and every
 * failing example is checked to make sure it really does fail. Without this,
 * a "fix library" is just a pile of markup somebody hopes is right.
 *
 * For each folder under criteria/:
 *
 *   meta.json declares whether the criterion is detectable by axe-core.
 *
 *   axeDetectable: true
 *     pass.html must produce zero violations.
 *     fail.html must produce at least one violation from the declared rules.
 *     Either of those failing is a hard CI failure.
 *
 *   axeDetectable: false
 *     The criterion cannot be judged by a DOM scanner. The script still loads
 *     both files and reports what axe saw, which is usually nothing at all on
 *     a page that a keyboard user cannot operate. That gap is the point, so it
 *     is reported rather than asserted, and it never fails the build.
 *
 * Usage:  npm install && npm run verify
 */

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CRITERIA = path.join(ROOT, 'criteria');

const GREEN = '\x1b[32m', RED = '\x1b[31m', DIM = '\x1b[2m', YEL = '\x1b[33m', OFF = '\x1b[0m';

const DEFAULT_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function analyse(page, file, tags) {
  await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
  return new AxePuppeteer(page)
    .withTags(tags ?? DEFAULT_TAGS)
    .analyze();
}

const ids = (results) => results.violations.map((v) => v.id);

async function main() {
  const dirs = (await readdir(CRITERIA, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const failures = [];
  let automated = 0;
  let manual = 0;

  for (const dir of dirs) {
    const base = path.join(CRITERIA, dir);
    const meta = JSON.parse(await readFile(path.join(base, 'meta.json'), 'utf8'));
    const label = `${meta.sc} ${meta.name}`;

    const failRes = await analyse(page, path.join(base, 'fail.html'), meta.axeTags);
    const passRes = await analyse(page, path.join(base, 'pass.html'), meta.axeTags);

    if (!meta.axeDetectable) {
      manual++;
      console.log(`${YEL}MANUAL${OFF} ${label}`);
      console.log(
        `       ${DIM}axe reported ${failRes.violations.length} violation(s) on a page that fails this criterion.${OFF}`
      );
      console.log(`       ${DIM}Verify by: ${meta.manualCheck}${OFF}`);
      continue;
    }

    automated++;
    const problems = [];

    if (passRes.violations.length > 0) {
      problems.push(`pass.html is not clean: ${ids(passRes).join(', ')}`);
    }

    const expected = meta.axeRules ?? [];
    const hit = ids(failRes).filter((id) => expected.includes(id));
    if (hit.length === 0) {
      problems.push(
        `fail.html did not trigger any of [${expected.join(', ')}]; axe saw [${ids(failRes).join(', ') || 'nothing'}]`
      );
    }

    if (problems.length) {
      failures.push({ label, problems });
      console.log(`${RED}FAIL${OFF}   ${label}`);
      problems.forEach((p) => console.log(`       ${p}`));
    } else {
      console.log(`${GREEN}OK${OFF}     ${label} ${DIM}(fail.html: ${hit.join(', ')})${OFF}`);
    }
  }

  await browser.close();

  console.log(
    `\n${automated} criteria verified automatically, ${manual} require manual testing, ${failures.length} failing.`
  );

  if (failures.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
