/**
 * verify.mjs
 *
 * Assertions about the repository itself, rather than about the pages. It
 * runs with no browser and no network, so it is the fast check, and it is the
 * one that catches a folder added without a meta.json, a finding catalogued
 * with no description, a judge that has quietly started importing puppeteer,
 * or a dash somebody pasted in from a word processor.
 *
 * Two of the checks are self-referential and that is deliberate.
 *
 * The count printed at the end includes its own comparison, so the figure
 * beside the command in the README is the figure a reader gets when they run
 * it. Without that the two differ by one and the first person to notice
 * assumes the README is stale.
 *
 * The needles for the dash check and the institution check are assembled from
 * code points rather than written out, because a rule that forbids a
 * character cannot contain that character in a file the rule covers. That has
 * now been hit on four separate repositories.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUTOMATED, BEHAVIOURAL, FIXTURES } from './pairs.mjs';
import { DESCRIPTIONS, buildFindingRows, render, counts } from './catalogue.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const OFF = '\x1b[0m';

let checks = 0;
const problems = [];

function assert(condition, message) {
  checks += 1;
  if (!condition) problems.push(message);
}

const EM = String.fromCharCode(8212);
const EN = String.fromCharCode(8211);
const INSTITUTION = String.fromCharCode(70, 65, 83, 84) + '-' + String.fromCharCode(78, 85, 67, 69, 83);

/**
 * Everything git would track, and nothing else.
 *
 * Reading .gitignore rather than hard-coding a skip list is not tidiness. The
 * assertion count below is one per text file, so counting package-lock.json
 * would make the figure quoted in the README depend on whether npm install
 * had been run, and a fresh clone would report four fewer assertions than the
 * README claims. A count that moves with the state of the working directory
 * is not a count anybody can check.
 */
async function ignored(dir) {
  const names = new Set(['.git']);
  try {
    const body = await readFile(path.join(dir, '.gitignore'), 'utf8');
    for (const line of body.split('\n')) {
      const trimmed = line.trim().replace(/\/$/, '');
      if (trimmed && !trimmed.startsWith('#')) names.add(trimmed);
    }
  } catch {
    // No .gitignore is not an error; the default skip list still applies.
  }
  return names;
}

async function walk(dir, skip, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, skip, out);
    else out.push(full);
  }
  return out;
}

const TEXT = /\.(mjs|js|json|md|html|yml|yaml|txt)$/;

async function main() {
  const files = (await walk(ROOT, await ignored(ROOT))).sort();
  const textFiles = files.filter((f) => TEXT.test(f));
  const rel = (f) => path.relative(ROOT, f);

  // --- every text file, one assertion each -------------------------------
  for (const file of textFiles) {
    const body = await readFile(file, 'utf8');
    const name = rel(file);
    assert(
      !body.includes(EM) && !body.includes(EN),
      `${name} contains an em dash or en dash. Use a comma, a colon or a full stop.`
    );
    assert(!body.includes(INSTITUTION), `${name} names an institution that must not appear here.`);
    assert(!/\r\n/.test(body), `${name} has Windows line endings.`);
    assert(body.length === 0 || body.endsWith('\n'), `${name} does not end with a newline.`);
  }

  // --- criterion folders --------------------------------------------------
  const criteriaDir = path.join(ROOT, 'criteria');
  const dirs = (await readdir(criteriaDir, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  assert(dirs.length === 16, `expected 16 criterion folders, found ${dirs.length}`);

  const declared = new Map([...AUTOMATED, ...BEHAVIOURAL].map((c) => [c.dir, c]));
  for (const dir of dirs) {
    assert(declared.has(dir), `criteria/${dir} has no entry in tools/pairs.mjs`);
    for (const file of ['README.md', 'fail.html', 'pass.html', 'meta.json']) {
      const full = path.join(criteriaDir, dir, file);
      let ok = true;
      try {
        await stat(full);
      } catch {
        ok = false;
      }
      assert(ok, `criteria/${dir} is missing ${file}`);
    }

    const meta = JSON.parse(await readFile(path.join(criteriaDir, dir, 'meta.json'), 'utf8'));
    const entry = declared.get(dir);
    if (entry) {
      assert(meta.sc === entry.sc, `criteria/${dir} meta.json sc is ${meta.sc}, pairs.mjs says ${entry.sc}`);
    }
    assert(typeof meta.name === 'string' && meta.name.length > 0, `criteria/${dir} meta.json has no name`);
    assert(meta.level === 'A' || meta.level === 'AA', `criteria/${dir} meta.json level must be A or AA`);
    assert(
      typeof meta.manualCheck === 'string' && meta.manualCheck.length > 20,
      `criteria/${dir} meta.json needs a manualCheck a person can follow`
    );
    const isAutomated = AUTOMATED.some((c) => c.dir === dir);
    assert(
      meta.axeDetectable === isAutomated,
      `criteria/${dir} meta.json axeDetectable is ${meta.axeDetectable}, pairs.mjs files it as ` +
        `${isAutomated ? 'automated' : 'behavioural'}`
    );

    const fail = await readFile(path.join(criteriaDir, dir, 'fail.html'), 'utf8');
    const pass = await readFile(path.join(criteriaDir, dir, 'pass.html'), 'utf8');
    assert(fail !== pass, `criteria/${dir} fail.html and pass.html are identical`);
    for (const [label, body] of [['fail', fail], ['pass', pass]]) {
      assert(/^<!doctype html>/i.test(body.trim()), `criteria/${dir}/${label}.html has no doctype`);
      assert(/<html lang="[a-z]{2}"/.test(body), `criteria/${dir}/${label}.html has no lang attribute`);
      // Either comment syntax. Several of these pages carry their whole
      // explanation in CSS comments beside the rules being demonstrated,
      // which is the right place for it.
      assert(
        /<!--/.test(body) || /\/\*/.test(body),
        `criteria/${dir}/${label}.html has no explanatory comments in either syntax`
      );
    }
  }

  // --- the declaration ----------------------------------------------------
  assert(AUTOMATED.length === 9, `expected 9 automated criteria, pairs.mjs declares ${AUTOMATED.length}`);
  assert(
    BEHAVIOURAL.length === 7,
    `expected 7 behavioural criteria, pairs.mjs declares ${BEHAVIOURAL.length}`
  );

  for (const c of AUTOMATED) {
    assert(c.violations.length > 0, `${c.sc} declares no axe violations, so it is not axe detectable`);
    const seen = new Set();
    for (const rule of c.violations) {
      assert(!seen.has(rule), `${c.sc} declares the axe rule ${rule} twice`);
      seen.add(rule);
    }
    for (const entry of c.incomplete) {
      assert(
        typeof entry.note === 'string' && entry.note.length > 40,
        `${c.sc} declares ${entry.rule} as incomplete with no explanation of what that means here`
      );
    }
    for (const entry of c.passesDespiteTheDefect ?? []) {
      assert(
        typeof entry.note === 'string' && entry.note.length > 40,
        `${c.sc} declares ${entry.rule} as passing with no explanation`
      );
    }
    for (const entry of c.outsideTheTagFilter ?? []) {
      assert(typeof entry.tag === 'string', `${c.sc} declares ${entry.rule} outside the filter with no tag`);
      assert(
        ['violation', 'incomplete', 'pass'].includes(entry.forcedOutcome),
        `${c.sc} declares ${entry.rule} with no measured outcome when forced on by rule id`
      );
    }
  }

  for (const c of BEHAVIOURAL) {
    assert(c.fail.length > 0, `${c.sc} declares nothing for its failing example to exhibit`);
    assert(
      c.residual.length > 0,
      `${c.sc} declares no residual. Every criterion judged here has something it does not reach, ` +
        'and a criterion claiming otherwise has not been looked at hard enough.'
    );
    const sorted = [...c.fail].sort();
    assert(
      c.fail.join('|') === sorted.join('|'),
      `${c.sc} fail set is not in sorted order, which makes a diff of this file hard to read`
    );
    for (const id of [...c.fail, ...c.residual]) {
      assert(id.startsWith(`${c.sc}/`), `${c.sc} declares ${id}, which belongs to another criterion`);
    }
  }

  // --- the catalogue ------------------------------------------------------
  const rows = buildFindingRows();
  for (const row of rows) {
    assert(
      typeof row.description === 'string' && row.description.length > 40,
      `${row.id} is catalogued with no description a reader can act on`
    );
  }
  const describedIds = Object.keys(DESCRIPTIONS).sort();
  const catalogued = rows.map((r) => r.id).sort();
  assert(
    describedIds.join('|') === catalogued.join('|'),
    'tools/catalogue.mjs DESCRIPTIONS and the declared finding set are not the same set: ' +
      `described but not declared [${describedIds.filter((i) => !catalogued.includes(i)).join(', ')}], ` +
      `declared but not described [${catalogued.filter((i) => !describedIds.includes(i)).join(', ')}]`
  );

  const committed = await readFile(path.join(ROOT, 'CATALOGUE.md'), 'utf8');
  assert(
    committed === render(),
    'CATALOGUE.md differs from what tools/catalogue.mjs generates. Run `node tools/catalogue.mjs --write`.'
  );

  // --- fixtures -----------------------------------------------------------
  for (const fixture of FIXTURES) {
    let ok = true;
    try {
      await stat(path.join(ROOT, 'test', 'fixtures', fixture.file));
    } catch {
      ok = false;
    }
    assert(ok, `test/fixtures/${fixture.file} is declared in pairs.mjs and does not exist`);
    assert(fixture.expect.length > 0, `test/fixtures/${fixture.file} declares nothing to observe`);
  }

  // --- the split between observing and judging ----------------------------
  const libFiles = files.filter((f) => rel(f).startsWith('lib/') && f.endsWith('.mjs'));
  assert(libFiles.length >= 8, `expected at least 8 modules under lib/, found ${libFiles.length}`);
  for (const file of libFiles) {
    const body = await readFile(file, 'utf8');
    assert(
      !/from ['"]puppeteer/.test(body) && !/@axe-core/.test(body),
      `${rel(file)} imports a browser driver. Everything under lib/ judges observations and ` +
        'must stay runnable without launching anything, or the judging can only ever be tested ' +
        'against whatever a headless browser did that morning.'
    );
    assert(
      // Not preceded by a dot or a word character, so `obs.document.scrollWidth`
      // in a judge reading an observation is not mistaken for DOM access.
      !/(?<![.\w])(document|window)\s*\./.test(body),
      `${rel(file)} touches document or window. The collectors under audit/ do that; the judges do not.`
    );
  }
  for (const judge of BEHAVIOURAL.map((c) => `lib/judge/${c.collector}.mjs`)) {
    let ok = true;
    try {
      await stat(path.join(ROOT, judge));
    } catch {
      ok = false;
    }
    assert(ok, `${judge} is named in pairs.mjs and does not exist`);
  }

  // --- the README has to carry the figures this script prints -------------
  const readme = await readFile(path.join(ROOT, 'README.md'), 'utf8');
  const n = counts();
  for (const phrase of [
    `${n.total} catalogued findings`,
    `${n.behavioural} findings this repository judges`,
    `${n.residual} limits`,
  ]) {
    const matches = readme.split('\n').filter((line) => line.includes(phrase)).length;
    assert(
      matches >= 1,
      `README.md does not contain the exact phrase "${phrase}" on a single line. The figures ` +
        'beside the commands have to be the figures the commands print, and a phrase that has ' +
        'been reflowed across a line break cannot be matched.'
    );
  }
  assert(/^## Verifying$/m.test(readme), 'README.md has no "## Verifying" section');

  // --- package.json -------------------------------------------------------
  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
  for (const script of ['test', 'verify', 'audit', 'axe', 'catalogue']) {
    assert(pkg.scripts && pkg.scripts[script], `package.json has no ${script} script`);
  }
  assert(
    pkg.scripts.test.includes('tools/run-tests.mjs'),
    'package.json test script must go through tools/run-tests.mjs, which counts structured ' +
      'events rather than parsing reporter output'
  );
  assert(typeof pkg.engines?.node === 'string', 'package.json declares no engines.node floor');
  assert(pkg.license === 'MIT', 'package.json licence must be MIT');

  // --- the count includes this comparison ---------------------------------
  const expected = checks + 1;
  checks += 1;
  const line = `${expected} assertions about the repository`;

  if (problems.length) {
    console.log(`${RED}${problems.length} problem(s):${OFF}`);
    for (const p of problems) console.log(`  ${p}`);
    console.log(`\n${checks - problems.length} of ${line} passed.`);
    process.exit(1);
  }

  console.log(`${GREEN}${line} passed.${OFF}`);
}

await main();
