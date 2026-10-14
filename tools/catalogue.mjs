/**
 * catalogue.mjs
 *
 * Every finding this repository can report, in one place, with what each one
 * means. Run it to regenerate CATALOGUE.md; CI regenerates it and fails if
 * the committed file differs, so the list cannot drift away from the code.
 *
 * Three kinds, and the split is the argument of the whole repository.
 *
 *   automated    axe-core reports it, so a scanner in a pipeline catches it
 *   behavioural  this repository's own judging reports it from a real
 *                browser, and no scanner does
 *   residual     nothing reports it. The judging looked and did not reach
 *                it, or did not look. Every one of these is observed on a
 *                corrected page or a fixture and asserted there.
 *
 * Generate with `node tools/catalogue.mjs`, never with `npm run catalogue`
 * in a step that redirects to a file: npm writes two lines of its own to
 * stdout before the script's output, which passes locally when the script is
 * run directly and fails in CI. That cost a red build on a sister repository
 * on 11 October.
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUTOMATED, BEHAVIOURAL, FIXTURES } from './pairs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * What each finding means, keyed by id. A finding with no entry here is a
 * finding a reader cannot act on, so test/catalogue.test.mjs requires one for
 * every id any judge can produce.
 */
export const DESCRIPTIONS = {
  '1.4.10/document-overflows-at-320':
    'The document scrolls sideways at a 320px viewport, so reading a sentence needs scrolling in two directions.',
  '1.4.10/fixed-width-element':
    'An element is wider than the viewport because its width is a fixed length rather than a cap. max-width reflows; width does not.',
  '1.4.10/grid-tracks-do-not-collapse':
    'A grid still lays out more than one column at 320px. repeat(auto-fit, minmax(min(Npx, 100%), 1fr)) collapses with no breakpoint to maintain.',
  '1.4.10/wide-content-not-in-a-scroll-container':
    'A table or other data grid wider than the viewport scrolls the page rather than itself. The criterion allows the table to scroll; it does not allow the page to.',
  '1.4.10/scroll-container-tabbable-when-not-scrollable':
    'The corrected pattern keeps a focusable scroll container at every width, so on a wide screen a keyboard user stops on a region with nothing to scroll. The criterion is met either way and the cost is recorded rather than hidden.',
  '1.4.10/intrinsic-minimum-width-not-judged':
    'An element overflows with an auto width, so the width comes from an intrinsic minimum inside it that this judging does not trace: a long unbroken string, a fixed-width image, or a nested fixed-width descendant.',

  '1.4.11/control-boundary-below-3':
    'A control\'s border is below 3:1 against both the colour outside it and the colour inside it, so the user cannot see where the control is. Its text may pass 1.4.3 perfectly.',
  '1.4.11/control-shaped-box-without-a-perceivable-boundary':
    'A control-shaped box has no border and a fill below 3:1 against what is behind it, so nothing on its edge reaches the threshold.',
  '1.4.11/meaningful-icon-below-3':
    'A graphic carrying an accessible name, which makes it content rather than decoration, is drawn below 3:1 against its background.',
  '1.4.11/state-fill-below-3':
    'Two identically sized siblings differ only in background colour, below 3:1 between them, so a user cannot tell which state they are looking at.',
  '1.4.11/background-not-a-flat-colour-not-judged':
    'A boundary or graphic sits on a gradient, an image, or a colour in a space wider than sRGB. There is no single adjacent colour to compare against, so no ratio is reported and the element is named instead.',
  '1.4.11/state-difference-beyond-colour-not-judged':
    'Two states are distinguished by something other than a flat background colour, such as a knob that moves. That is the right way to build it and it is not something a contrast figure can express, so the thing that makes the control readable is not the thing measured.',

  '2.1.1/click-handler-on-unfocusable-element':
    'An element declares a pointer handler but is not focusable and carries no interactive role. A mouse user sees a control; a keyboard user cannot reach it.',
  '2.1.1/anchor-without-href':
    'An anchor with no href is neither focusable nor exposed as a link. The most common way a working navigation item becomes unreachable.',
  '2.1.1/positive-tabindex':
    'A positive tabindex lifts one element above every element without one, so the order it creates is correct only until the next control is added.',
  '2.1.1/control-unreachable-by-tab':
    'A control offered to a pointer that a Tab walk never arrived at. Measured by pressing the key, not by inspecting the markup.',
  '2.1.1/control-not-operable-by-enter':
    'A control that takes focus and declares an action, where pressing Enter fired nothing. Reachable and not operable fails this criterion as plainly as unreachable.',
  '2.1.1/action-attached-by-script-not-observed':
    'A control reached by Tab declares no inline handler, so this judging cannot tell whether a key press did anything. A listener added with addEventListener is invisible from outside the page.',
  '2.1.1/link-operability-not-pressed':
    'A link was reached but not activated, because pressing Enter on an href leaves the page and ends the walk. Its reachability is measured; its operability is reasoned from the fact that a native link responds to Enter without script.',

  '2.1.2/focus-not-moved-into-dialog':
    'A dialog opened and focus stayed outside it. The user has an overlay on screen and their focus position behind it.',
  '2.1.2/tab-leaves-open-dialog':
    'With a modal open, Tab reached an element outside it. An overlay is paint: it stops a mouse and it does not stop a Tab key.',
  '2.1.2/escape-does-not-close':
    'Escape was pressed with the dialog open and it stayed open. Escape is the only exit a keyboard user will try without being told.',
  '2.1.2/focus-not-returned-to-opener':
    'The dialog closed on a key press and focus did not go back to the control that opened it, so the next Tab starts again from the top of the document.',
  '2.1.2/dialog-could-not-be-opened-by-keyboard':
    'A dialog exists and no keyboard route opened it, so nothing about it was judged. Reported rather than counted as a pass, which is what silence would otherwise become.',
  '2.1.2/inert-fallback-branch-not-executed':
    'The corrected dialog holds focus with inert, and the browser supports inert, so the Tab cycling fallback written for browsers that do not was never executed and is unverified.',

  '2.4.3/visual-order-differs-from-dom-order':
    'A flex or grid container paints its children in a different order from their DOM order. Tab order follows the DOM, so the two now disagree whatever any individual step looks like.',
  '2.4.3/focus-enters-invisible-content':
    'Tab arrives at an element that cannot be seen. Hidden content has to be hidden from everyone, which means display:none or the hidden attribute, not opacity and a zero height.',
  '2.4.3/meaning-of-order-not-judged':
    'The comparison made here is painted position and visibility. The criterion asks for an order that preserves meaning, and meaning is not a geometric property.',

  '2.4.7/no-indicator-on-focus':
    'A Tab press focuses the control and nothing is painted. Measured on what reaches the screen, because the browser moves outline-offset on :focus-visible whether or not there is an outline to offset.',
  '2.4.7/indicator-contrast-below-3':
    'The focus ring is below 3:1 against the colour behind the element. The ring is painted outside the border box, so the element\'s own background is not what it has to contrast with.',
  '2.4.7/indicator-thinner-than-2px':
    'A hairline focus ring. 2.4.7 sets no thickness, so this is not a Level AA failure on its own; it is the most common way an indicator exists in the stylesheet and not on the screen.',
  '2.4.7/indicator-colour-not-resolvable':
    'The ring colour or the colour behind it could not be resolved to flat sRGB, so no ratio is reported. Nothing is assumed in either direction.',
  '2.4.7/box-shadow-layers-not-judged':
    'Part of the indicator is built from box-shadow layers. Their effective contrast is not computed, so the figure reported covers the outline layer only.',
  '2.4.7/forced-colors-branch-not-exercised':
    'The browser reports (forced-colors: active) as false, so any high contrast rule in the stylesheet was never applied and the indicator it defines was never measured.',

  '2.4.11/focused-element-entirely-obscured':
    'A focused control was completely covered by fixed or sticky content. The browser scrolled it to the top of the scrollport, decided it was in view, and stopped.',
  '2.4.11/fragment-target-entirely-obscured':
    'Activating a fragment link moved focus to a target whose head is completely covered. The first thing the skip link does is hide what it skipped to.',
  '2.4.11/focused-element-partly-obscured':
    'A focused control is partly covered. 2.4.11 at Level AA asks only that it is not entirely hidden, so this passes; it fails 2.4.12 at Level AAA, which is outside this library\'s scope.',
  '2.4.11/nothing-fixed-or-sticky-to-judge-against':
    'Nothing on the page is fixed or sticky, so the criterion is met without any measurement being informative. A different statement from measured and found correct.',
};

const OUTCOME_HEADINGS = {
  violation: 'reported as a violation',
  incomplete: 'examined, and reported as neither passing nor failing',
  passesDespiteTheDefect: 'examined, and reported as passing',
  outsideTheTagFilter: 'not run, because the tag filter excludes the rule',
};

export function buildAutomatedRows() {
  const rows = [];
  for (const c of AUTOMATED) {
    for (const rule of c.violations) {
      rows.push({ sc: c.sc, rule, outcome: 'violation', note: '' });
    }
    for (const entry of c.incomplete) {
      rows.push({ sc: c.sc, rule: entry.rule, outcome: 'incomplete', note: entry.note });
    }
    for (const entry of c.passesDespiteTheDefect ?? []) {
      rows.push({ sc: c.sc, rule: entry.rule, outcome: 'passesDespiteTheDefect', note: entry.note });
    }
    for (const entry of c.outsideTheTagFilter ?? []) {
      rows.push({
        sc: c.sc,
        rule: entry.rule,
        outcome: 'outsideTheTagFilter',
        note: `Tagged ${entry.tag}. Enabled by rule id it returns ${entry.forcedOutcome}. ${entry.note}`,
      });
    }
  }
  return rows.sort((a, b) => a.sc.localeCompare(b.sc) || a.rule.localeCompare(b.rule));
}

/** Every finding id this repository declares, with the kind it belongs to. */
export function buildFindingRows() {
  const kinds = new Map();
  const mark = (id, kind) => {
    const existing = kinds.get(id);
    if (existing && existing !== kind) kinds.set(id, 'both');
    else if (!existing) kinds.set(id, kind);
  };
  for (const c of BEHAVIOURAL) {
    for (const id of c.fail) mark(id, 'behavioural');
    for (const id of c.residual) mark(id, 'residual');
  }
  for (const f of FIXTURES) for (const id of f.expect) mark(id, 'residual');

  // A limit is a residual wherever it is observed. A finding that appears in
  // a fail set and a residual set is a limit observed on both sides, and the
  // residual kind is the honest label for it, because that is what it is
  // saying about the judging.
  return [...kinds.entries()]
    .map(([id, kind]) => ({
      id,
      criterion: id.split('/')[0],
      kind: kind === 'both' ? 'residual' : kind,
      description: DESCRIPTIONS[id] ?? null,
    }))
    .sort((a, b) => a.criterion.localeCompare(b.criterion) || a.id.localeCompare(b.id));
}

export function counts() {
  const findings = buildFindingRows();
  return {
    automatedRules: buildAutomatedRows().length,
    behavioural: findings.filter((f) => f.kind === 'behavioural').length,
    residual: findings.filter((f) => f.kind === 'residual').length,
    total: buildAutomatedRows().length + findings.length,
  };
}

export function render() {
  const automated = buildAutomatedRows();
  const findings = buildFindingRows();
  const n = counts();
  const lines = [];

  lines.push('# Catalogue of findings');
  lines.push('');
  lines.push('Generated by `node tools/catalogue.mjs`. CI regenerates this file and fails if it');
  lines.push('differs from the committed copy, so it cannot drift away from the code.');
  lines.push('');
  lines.push(`${n.total} findings in all: ${n.automatedRules} axe-core rule outcomes,`);
  lines.push(`${n.behavioural} judged by this repository, ${n.residual} recorded as limits.`);
  lines.push('');
  lines.push('## What axe-core does with each rule');
  lines.push('');
  lines.push('Four outcomes, and only the first appears in the number everybody quotes.');
  lines.push('');
  lines.push('| Criterion | Rule | What axe does | Note |');
  lines.push('|---|---|---|---|');
  for (const row of automated) {
    lines.push(
      `| ${row.sc} | \`${row.rule}\` | ${OUTCOME_HEADINGS[row.outcome]} | ${row.note.replace(/\s+/g, ' ')} |`
    );
  }
  lines.push('');
  lines.push('## Findings this repository judges, which no scanner reports');
  lines.push('');
  lines.push('| Criterion | Finding | What it means |');
  lines.push('|---|---|---|');
  for (const row of findings.filter((f) => f.kind === 'behavioural')) {
    lines.push(`| ${row.criterion} | \`${row.id}\` | ${row.description} |`);
  }
  lines.push('');
  lines.push('## Limits: what nothing here checks');
  lines.push('');
  lines.push('Each one is observed on a corrected page or a fixture and asserted there, so a');
  lines.push('change that quietly widens the judging fails the build and this section has to be');
  lines.push('rewritten rather than left standing.');
  lines.push('');
  lines.push('| Criterion | Finding | What it means |');
  lines.push('|---|---|---|');
  for (const row of findings.filter((f) => f.kind === 'residual')) {
    lines.push(`| ${row.criterion} | \`${row.id}\` | ${row.description} |`);
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const text = render();
  if (process.argv.includes('--write')) {
    await writeFile(path.join(ROOT, 'CATALOGUE.md'), text, 'utf8');
    const n = counts();
    console.error(`CATALOGUE.md written: ${n.total} findings.`);
  } else {
    process.stdout.write(text);
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await main();
}
