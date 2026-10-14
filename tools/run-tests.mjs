/**
 * run-tests.mjs
 *
 * The test runner, and the reason it exists rather than a plain
 * `node --test`.
 *
 * A script that counts tests by parsing the test runner's printed output
 * breaks between Node versions, because Node 24 prints the spec reporter even
 * when its output is piped while Node 20 and 22 print TAP. Naming
 * `--test-reporter=tap` patches that and still leaves the count coming from
 * text somebody can reformat.
 *
 * So nothing here reads printed output. `run()` from node:test returns a
 * stream of structured events, and this counts `test:pass` and `test:fail`
 * as objects. The figures come out identical on every supported version
 * because they are not derived from a rendering.
 *
 * There is a trap inside that fix and it is worth stating, because it fails
 * silently. Attaching named listeners to the stream is not enough: an object
 * stream only flows once something reads it, named-event listeners do not
 * count as reading it, and `end` therefore never fires, so a check that runs
 * at the end never runs and the suite reports success having counted nothing.
 * It is consumed with `for await` below, and zero tests is a hard failure.
 */

import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir } from 'node:fs/promises';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function testFiles() {
  const dir = path.join(ROOT, 'test');
  const entries = await readdir(dir);
  return entries
    .filter((name) => name.endsWith('.test.mjs'))
    .sort()
    .map((name) => path.join(dir, name));
}

async function main() {
  const files = await testFiles();
  if (files.length === 0) {
    console.error('No test files found. That is a failure, not an empty success.');
    process.exit(1);
  }

  const stream = run({
    files,
    concurrency: 1,
    // A real browser is launched inside several of these suites, so the
    // default two minutes is not enough on a cold runner.
    timeout: 20 * 60 * 1000,
  });

  stream.compose(spec).pipe(process.stdout);

  let passed = 0;
  let failed = 0;
  const failures = [];

  for await (const event of stream) {
    if (event.type === 'test:pass') passed += 1;
    if (event.type === 'test:fail') {
      failed += 1;
      failures.push(`${event.data.name} (${path.basename(event.data.file ?? 'unknown')})`);
    }
  }

  const total = passed + failed;
  if (total === 0) {
    console.error('\nThe event stream produced no test results at all, which is a failure.');
    process.exit(1);
  }

  console.log(`\n${passed} of ${total} tests passed.`);
  if (failed > 0) {
    console.log('Failed:');
    for (const name of failures) console.log(`  ${name}`);
    process.exit(1);
  }
}

await main();
