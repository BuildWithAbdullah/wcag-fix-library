/**
 * pairs.mjs
 *
 * The declaration. For every criterion in this library, exactly what the
 * failing example must exhibit and exactly what the corrected example must
 * still exhibit, asserted in both directions by test/pairs.test.mjs.
 *
 * Both directions is the part that earns its keep. Asserting that the failing
 * side produces at least one finding catches a repair that stops working.
 * Asserting that it produces exactly this set catches a repair that starts
 * reporting something else, which is the more common and quieter failure. And
 * asserting that the corrected side produces exactly its declared residual
 * catches the opposite mistake: a fix that silently stops covering one of the
 * cases it was written for, while the folder still says it does.
 *
 * `residual` is the important field. Every claim this library makes about
 * what it does not check is observed on a corrected page and listed here. A
 * change that quietly widens the checking makes one of these disappear and
 * fails the build, so the "What this does not check" section of the README
 * cannot drift away from the code the way a paragraph can.
 */

/** The criteria judged by axe-core, and the exact outcome of every rule. */
export const AUTOMATED = [
  {
    sc: '1.1.1',
    dir: '1.1.1-non-text-content',
    violations: ['button-name', 'image-alt', 'input-image-alt', 'role-img-alt', 'svg-img-alt'],
    incomplete: [],
    passesDespiteTheDefect: [],
    outsideTheTagFilter: [],
  },
  {
    sc: '1.3.1',
    dir: '1.3.1-info-and-relationships',
    violations: ['aria-required-children', 'list', 'listitem'],
    incomplete: [
      {
        rule: 'th-has-data-cells',
        note:
          'The failing table has a third column header with no cells under it. axe examines ' +
          'the header, cannot determine from the DOM whether the empty column is deliberate, ' +
          'and returns incomplete. It is therefore in neither the violations nor the passes, ' +
          'and a CI gate that reads only violations treats this table as clean.',
      },
      {
        rule: 'bypass',
        note:
          'Fires on every page in this library that has no skip mechanism, which is all of ' +
          'them except 2.4.1. axe cannot determine from the DOM whether a bypass exists, so it ' +
          'never returns a violation for it. See 2.4.1 for what that means in practice.',
      },
    ],
    passesDespiteTheDefect: [],
    outsideTheTagFilter: [],
  },
  {
    sc: '1.4.3',
    dir: '1.4.3-contrast-minimum',
    violations: ['color-contrast'],
    incomplete: [],
    passesDespiteTheDefect: [],
    outsideTheTagFilter: [],
  },
  {
    sc: '1.4.4',
    dir: '1.4.4-resize-text',
    violations: ['meta-viewport'],
    incomplete: [],
    passesDespiteTheDefect: [],
    outsideTheTagFilter: [],
  },
  {
    sc: '2.4.1',
    dir: '2.4.1-bypass-blocks',
    violations: ['landmark-one-main', 'page-has-heading-one', 'region'],
    incomplete: [
      {
        rule: 'bypass',
        note:
          'axe cannot determine from the DOM whether a skip mechanism works, so the rule named ' +
          'after this criterion returns incomplete and never a violation. The three rules that ' +
          'do report are landmark rules, and axe tags all three as best-practice rather than ' +
          'wcag2a, which is why this folder widens the tag filter. A scan of a page with no ' +
          'landmarks, no heading and no skip link, filtered to WCAG tags alone, reports nothing.',
      },
    ],
    passesDespiteTheDefect: [],
    outsideTheTagFilter: [],
  },
  {
    sc: '2.4.4',
    dir: '2.4.4-link-purpose-in-context',
    violations: ['link-in-text-block', 'link-name'],
    incomplete: [],
    passesDespiteTheDefect: [],
    outsideTheTagFilter: [
      {
        rule: 'identical-links-same-purpose',
        tag: 'wcag2aaa',
        forcedOutcome: 'incomplete',
        note:
          'The two "Size guide" links going to two different pages are the case this rule is ' +
          'for. It is tagged wcag2aaa, so the A and AA filter this library scans with never ' +
          'runs it. Enabled explicitly by rule id it returns incomplete rather than a ' +
          'violation, so there is no configuration of axe that reports this page as failing ' +
          'on it.',
      },
    ],
    note:
      'link-in-text-block is tagged wcag141, not wcag249. The bare link in the prose block is ' +
      'a failure of 1.4.1 Use of Colour, which this library has no folder for, and it is ' +
      'recorded against this page rather than filed under 2.4.4 and left to look tidy.',
  },
  {
    sc: '2.5.8',
    dir: '2.5.8-target-size-minimum',
    violations: ['target-size'],
    incomplete: [],
    passesDespiteTheDefect: [],
    outsideTheTagFilter: [],
  },
  {
    sc: '3.3.2',
    dir: '3.3.2-labels-or-instructions',
    violations: ['aria-input-field-name', 'label', 'select-name'],
    incomplete: [
      {
        rule: 'form-field-multiple-labels',
        note:
          'The Company field carries two label elements both pointing at it. axe examines it ' +
          'and returns incomplete, because which label wins is a browser and screen reader ' +
          'question rather than a DOM one. A field whose accessible name is undecided reports ' +
          'as neither passing nor failing.',
      },
    ],
    passesDespiteTheDefect: [],
    outsideTheTagFilter: [],
  },
  {
    sc: '4.1.2',
    dir: '4.1.2-name-role-value',
    violations: [
      'aria-command-name',
      'aria-hidden-focus',
      'aria-required-attr',
      'button-name',
      'target-size',
    ],
    incomplete: [
      {
        rule: 'aria-valid-attr-value',
        note:
          'The button whose aria-labelledby points at an id that does not exist. The name ' +
          'resolves to nothing, and axe returns incomplete rather than a violation. This is ' +
          'the single most useful entry in this file: a control with no accessible name at ' +
          'all, in a scan that reports zero violations.',
      },
      {
        rule: 'bypass',
        note: 'As on every page here with no skip mechanism.',
      },
      {
        rule: 'color-contrast',
        note:
          'Returned incomplete rather than passing on both sides of this pair, because at ' +
          'least one text node sits on a background axe will not resolve. Recorded so that a ' +
          'reader comparing this folder with 1.4.3 does not conclude the two disagree.',
      },
    ],
    passesDespiteTheDefect: [
      {
        rule: 'nested-interactive',
        note:
          'The failing page has a button inside an anchor with an href: one target, two ' +
          'conflicting roles, neither reliably operable. The rule named after exactly this ' +
          'defect examines it and reports a pass. Measured by enabling the rule on its own, ' +
          'so it is not a tag filter artefact.',
      },
      {
        rule: 'aria-toggle-field-name',
        note:
          'The div with role="switch" has text content, so it does have an accessible name ' +
          'and this rule is right to pass it. What it lacks is aria-checked, and the rule that ' +
          'catches that is aria-required-attr. Recorded because this rule was declared against ' +
          'this folder for a month and never fired, and the reason was that it was the wrong ' +
          'rule rather than a missing case.',
      },
    ],
    outsideTheTagFilter: [],
  },
];

/**
 * The criteria no scanner reports, judged by this repository's own code.
 * `fail` and `residual` are exact sets, asserted both ways.
 */
export const BEHAVIOURAL = [
  {
    sc: '1.4.10',
    dir: '1.4.10-reflow',
    collector: 'reflow',
    fail: [
      '1.4.10/document-overflows-at-320',
      '1.4.10/fixed-width-element',
      '1.4.10/grid-tracks-do-not-collapse',
      '1.4.10/intrinsic-minimum-width-not-judged',
      '1.4.10/wide-content-not-in-a-scroll-container',
    ],
    residual: ['1.4.10/scroll-container-tabbable-when-not-scrollable'],
  },
  {
    sc: '1.4.11',
    dir: '1.4.11-non-text-contrast',
    collector: 'non-text-contrast',
    fail: [
      '1.4.11/control-boundary-below-3',
      '1.4.11/control-shaped-box-without-a-perceivable-boundary',
      '1.4.11/meaningful-icon-below-3',
      '1.4.11/state-fill-below-3',
    ],
    residual: [
      '1.4.11/background-not-a-flat-colour-not-judged',
      '1.4.11/state-difference-beyond-colour-not-judged',
    ],
  },
  {
    sc: '2.1.1',
    dir: '2.1.1-keyboard',
    collector: 'keyboard',
    fail: [
      '2.1.1/action-attached-by-script-not-observed',
      '2.1.1/anchor-without-href',
      '2.1.1/click-handler-on-unfocusable-element',
      '2.1.1/control-unreachable-by-tab',
      '2.1.1/positive-tabindex',
    ],
    residual: ['2.1.1/action-attached-by-script-not-observed'],
  },
  {
    sc: '2.1.2',
    dir: '2.1.2-no-keyboard-trap',
    collector: 'keyboard-trap',
    fail: [
      '2.1.2/escape-does-not-close',
      '2.1.2/focus-not-moved-into-dialog',
      '2.1.2/focus-not-returned-to-opener',
      '2.1.2/tab-leaves-open-dialog',
    ],
    residual: ['2.1.2/inert-fallback-branch-not-executed'],
  },
  {
    sc: '2.4.3',
    dir: '2.4.3-focus-order',
    collector: 'focus-order',
    fail: [
      '2.4.3/focus-enters-invisible-content',
      '2.4.3/meaning-of-order-not-judged',
      '2.4.3/visual-order-differs-from-dom-order',
    ],
    residual: ['2.4.3/meaning-of-order-not-judged'],
  },
  {
    sc: '2.4.7',
    dir: '2.4.7-focus-visible',
    collector: 'focus-visible',
    fail: [
      '2.4.7/forced-colors-branch-not-exercised',
      '2.4.7/indicator-contrast-below-3',
      '2.4.7/indicator-thinner-than-2px',
      '2.4.7/no-indicator-on-focus',
    ],
    residual: [
      '2.4.7/box-shadow-layers-not-judged',
      '2.4.7/forced-colors-branch-not-exercised',
    ],
  },
  {
    sc: '2.4.11',
    dir: '2.4.11-focus-not-obscured-minimum',
    collector: 'focus-not-obscured',
    fail: [
      '2.4.11/focused-element-entirely-obscured',
      '2.4.11/focused-element-partly-obscured',
      '2.4.11/fragment-target-entirely-obscured',
    ],
    residual: ['2.4.11/focused-element-partly-obscured'],
  },
];

/**
 * Findings the sixteen criterion pages do not exhibit, driven out of purpose
 * built fixtures instead. A finding in the catalogue that no test has ever
 * seen fire is a finding nobody has checked, and four of the six defects the
 * 7 October pass found in a sister repository were in exactly that set.
 */
export const FIXTURES = [
  {
    file: 'unreachable-and-inoperable.html',
    collector: 'keyboard',
    expect: [
      '2.1.1/control-not-operable-by-enter',
      '2.1.1/link-operability-not-pressed',
      '2.1.1/action-attached-by-script-not-observed',
    ],
  },
  {
    file: 'dialog-with-no-keyboard-route.html',
    collector: 'keyboard-trap',
    expect: ['2.1.2/dialog-could-not-be-opened-by-keyboard'],
  },
  {
    file: 'nothing-sticky.html',
    collector: 'focus-not-obscured',
    expect: ['2.4.11/nothing-fixed-or-sticky-to-judge-against'],
  },
  {
    file: 'indicator-in-a-wide-gamut-colour.html',
    collector: 'focus-visible',
    expect: [
      '2.4.7/indicator-colour-not-resolvable',
      '2.4.7/forced-colors-branch-not-exercised',
    ],
  },
];

export const allCriteria = () => [...AUTOMATED, ...BEHAVIOURAL].sort((a, b) => a.sc.localeCompare(b.sc));
