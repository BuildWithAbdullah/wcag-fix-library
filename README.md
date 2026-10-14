# WCAG Fix Library

Failing markup and its corrected counterpart, side by side, indexed by WCAG
success criterion. Sixteen criteria, Levels A and AA.

Nine of them a scanner reports. Seven it does not, and those seven are the
reason this repository exists. Every one of the sixteen is checked by machine,
and the seven a scanner cannot see are checked by code in this repository that
drives a real browser, presses real keys and measures what is painted.

```
npm install
npm run verify     # 886 assertions about the repository, no browser
npm test           # 171 tests, including a real browser
npm run audit      # the seven criteria no scanner reports, judged
npm run axe        # the scanner's view, for comparison
```

## The ratio is the whole argument

A site can return zero automated violations and be unusable. A checkout drawer
a keyboard user cannot escape. A focus ring that vanishes on the dark footer. A
sticky header that covers the link the user just tabbed to. Form fields whose
borders are invisible. A layout that needs sideways scrolling to read a
sentence. None of those produce a finding in any scanner on the market.

That used to be a paragraph in this README. It is now an assertion.
`test/gap.test.mjs` runs axe-core against the seven failing examples a scanner
cannot judge and requires **zero violations on all seven**, while requiring
this repository's own judging to report failures on the same seven pages. Both
directions matter:

- If axe starts reporting one of those pages, the build goes red. That is the
  right outcome. The claim that a scanner cannot see that criterion has become
  false and the sentence has to be rewritten, rather than left standing while
  being untrue.
- If this repository's judging stops reporting one of them, the build also goes
  red. Without that, the result would be two clean reports and a page that
  plainly fails a criterion.

| Criterion | Level | Scanner | What breaks |
|---|---|---|---|
| [1.1.1 Non-text Content](criteria/1.1.1-non-text-content/) | A | 5 rules | Missing, useless and unnecessary alternatives; unnamed icon buttons; image submit buttons; a background image given a role and no name |
| [1.3.1 Info and Relationships](criteria/1.3.1-info-and-relationships/) | A | 3 rules | Fake headings, fake lists, list items with no list, ARIA lists with the wrong children, headerless tables, a header for a column that is not there |
| [1.4.3 Contrast (Minimum)](criteria/1.4.3-contrast-minimum/) | AA | 1 rule | Grey-on-white text, brand buttons, pale theme colour schemes |
| [1.4.4 Resize Text](criteria/1.4.4-resize-text/) | AA | 1 rule | `maximum-scale=1`, fixed-height text containers |
| [1.4.10 Reflow](criteria/1.4.10-reflow/) | AA | **nothing** | Fixed widths and non-collapsing grids at 320px, wide tables that scroll the page |
| [1.4.11 Non-text Contrast](criteria/1.4.11-non-text-contrast/) | AA | **nothing** | Invisible input borders, faint named icons, state carried by a fill below 3:1 |
| [2.1.1 Keyboard](criteria/2.1.1-keyboard/) | A | **nothing** | `div` with `onclick`, anchors with no `href`, positive `tabindex`, controls that take focus and ignore Enter |
| [2.1.2 No Keyboard Trap](criteria/2.1.2-no-keyboard-trap/) | A | **nothing** | Drawers that never take focus, over a page that is still fully tabbable |
| [2.4.1 Bypass Blocks](criteria/2.4.1-bypass-blocks/) | A | 3 rules | Missing or non-functional skip links, missing landmarks |
| [2.4.3 Focus Order](criteria/2.4.3-focus-order/) | A | **nothing** | CSS reordering, hidden content left in the tab order |
| [2.4.4 Link Purpose](criteria/2.4.4-link-purpose-in-context/) | A | 2 rules | Empty links, repeated "Read more", identical names, links marked by colour alone |
| [2.4.7 Focus Visible](criteria/2.4.7-focus-visible/) | AA | **nothing** | `outline: none`, hairline rings, rings that vanish on dark sections |
| [2.4.11 Focus Not Obscured](criteria/2.4.11-focus-not-obscured-minimum/) | AA | **nothing** | Sticky headers, consent bars and chat widgets covering the focused element |
| [2.5.8 Target Size (Minimum)](criteria/2.5.8-target-size-minimum/) | AA | 1 rule | Small controls, and the 24px versus 44px confusion |
| [3.3.2 Labels or Instructions](criteria/3.3.2-labels-or-instructions/) | A | 3 rules | Placeholders as labels, mismatched `for` and `id`, two labels on one field, ARIA fields with no name |
| [4.1.2 Name, Role, Value](criteria/4.1.2-name-role-value/) | A | 5 rules | Custom widgets, broken references, nested interactive controls |

## Zero violations is not the same as no defects

A scanner can do four different things with a defect, and only one of them
reaches the number everybody quotes. [`CATALOGUE.md`](CATALOGUE.md) records all
four for every rule this library exercises, and `test/axe.test.mjs` asserts
each one both ways.

**It reports a violation.** The case everybody has in mind.

**It looks and declines to decide.** The result lands in `incomplete`, which is
neither a violation nor a pass, and a pipeline that gates on the violation
count treats the page as clean. Four rules here behave this way, and one of
them is worth the price of the repository on its own: the button in
[4.1.2](criteria/4.1.2-name-role-value/) whose `aria-labelledby` points at an
id that does not exist. The accessible name resolves to nothing. The control is
announced as "button" with no label at all. axe examines it and reports
neither. So does `th-has-data-cells` on a table with a header for a column
that is not there, and `form-field-multiple-labels` on a field with two labels
and no rule saying which one wins. And `bypass`, the rule named after
[2.4.1](criteria/2.4.1-bypass-blocks/), never returns a violation at all,
because whether a skip mechanism works is not a DOM question.

**It looks and reports a pass.** The failing example in
[4.1.2](criteria/4.1.2-name-role-value/) has a `<button>` inside an `<a href>`:
one target, two conflicting roles, neither reliably operable. The rule named
`nested-interactive` examines it and passes it. That is measured by enabling
the rule on its own, by id, so it is not an artefact of the tag filter.

**It never runs.** `identical-links-same-purpose` is the rule for two links
with the same name going to two different places, which the
[2.4.4](criteria/2.4.4-link-purpose-in-context/) example does. It is tagged
`wcag2aaa`, so a scan filtered to the A and AA conformance target never runs
it. Forced on by id, it returns `incomplete`. There is no configuration of axe
that reports that page as failing on it.

One criterion here widens its own tag filter, and the reason is the same
species of problem: axe classifies the landmark rules as `best-practice`
rather than `wcag2a`, so a WCAG-filtered scan of a page with no landmarks, no
heading and no skip link reports nothing at all. A clean automated report is a
statement about the tool's configuration as much as about the page.

## How the seven are judged

The browser observes. Node judges. Nothing under `lib/` has ever seen a
browser, and `npm run verify` asserts that: a judge that imports puppeteer, or
touches `document` or `window`, fails the build.

That split is not tidiness. It is what makes the judging testable. Every
branch of it is driven against hand-built observations in
`test/judges.test.mjs`, including the branches a real page would have to be
contrived to produce, so the checks are not limited to whatever that morning's
Chromium happened to do.

```
audit/collectors/*.mjs   drive a real browser, measure, decide nothing
lib/judge/*.mjs          decide everything, and have no DOM
lib/colour.mjs           parse what getComputedStyle actually returns
lib/contrast.mjs         WCAG relative luminance and contrast ratio
tools/pairs.mjs          what each side of each pair must exhibit, exactly
tools/catalogue.mjs      every finding, regenerated and checked in CI
```

Three things are measured by pressing keys rather than by reading markup, and
each of the three catches something reading cannot.

**2.1.1 presses Tab, then presses Enter.** The failing example offers six
controls to a mouse and a Tab walk arrives at two of them, in the wrong order,
because of a positive `tabindex`. A markup check sees the `onclick` on a
`div`; only a key press sees that the control is never reached. Then Enter is
pressed on each control that was reached, with the page's own `alert` replaced
by a counter, so a control that takes focus and then does nothing is reported
as reachable and not operable.

**2.1.2 opens the drawer with a key and tries to get out with keys only.** The
transcript is the finding: focus stayed on the opener, Tab reached two
elements outside the open dialog, Escape did nothing, and closing it left focus
on an element that had just been removed from the page. Nothing in that
sequence is clicked, because a dialog closed with a mouse says nothing about
whether a keyboard user could have closed it.

**2.4.11 lets the browser do the scrolling.** Pressing Tab makes the browser
scroll each newly focused element into view by its own rules, and the failure
is a consequence of those rules meeting a sticky header: the element is
scrolled to the top of the scrollport, the browser decides it is in view, and
the header paints over it. Five focus steps on the failing example end up
completely covered, and so does the target of the skip link.

## Two measurement defects worth knowing about

Both of these produced a confident wrong answer rather than an error, and both
are now the subject of a test.

**A property that changes is not an indicator that appears.** The obvious way
to check 2.4.7 is to diff the computed indicator properties before and after
focus and call any difference an indicator. Written that way, the failing
example here passes. It carries a global `*:focus { outline: none }`, and
Chrome's own user agent stylesheet sets `outline-offset: 1px` on
`:focus-visible` whether or not there is an outline to offset. So the page that
removes focus from every element on the site satisfied a check written to catch
exactly that. The judging now asks what reaches the screen: an offset with no
outline paints nothing, and an outline colour with a width of zero paints
nothing.

**An intersection is not an occlusion.** The first version of the 2.4.11
measurement reported the corrected page as failing, because the skip link at
`z-index: 30` geometrically overlaps the header at `z-index: 10`. Paint order
has to be part of the comparison, and at equal stacking levels document order
decides, which is how the consent banner covers part of the chat launcher on a
page where both sit at `z-index: 20`.

There is a third, in the measurement of 2.4.7 and 2.4.3: focus has to be moved
with a real Tab press and not with `element.focus()`. `:focus-visible` does not
match a programmatic focus when the last input was not a keyboard, so a
corrected page whose entire indicator is written under `:focus-visible` reports
as having no indicator at all if it is focused from script.

## What this does not check

72 catalogued findings in all, of which 34 are axe-core rule outcomes.
24 findings this repository judges for itself, and 14 limits.

Those 14 are the interesting ones. A limit is not a pass and not a failure. It
is this repository saying, in a line a machine checks, what its own tools did
not reach. Each one is observed on a corrected page or a fixture and asserted
there, so a change that quietly widens the judging makes one disappear and
fails the build, and this section has to be rewritten rather than left to
drift. That is the difference between stating a limit in a paragraph and
stating it in an assertion.

- **A gradient or an image behind a control gets no ratio.** There is no single
  adjacent colour to compare against, and sampling one pixel would report the
  figure for that pixel. The corrected 1.4.11 example carries a button on a
  gradient on purpose, so the refusal is observed every run.
- **A colour outside sRGB gets no ratio either.** `lib/colour.mjs` returns
  null for `color()`, `oklch()` and `lab()` rather than falling back to black,
  because a wrong ink colour produces a confident wrong ratio and that is worse
  than no ratio.
- **Box-shadow indicator layers are not computed.** The two-tone ring on the
  corrected 2.4.7 example is measured on its outline layer only.
- **The high contrast branch is never exercised.** Windows high contrast mode
  discards author colours, and `(forced-colors: active)` is false in the test
  browser, so any `@media (forced-colors: active)` rule is never applied.
- **The inert fallback in the corrected drawer never runs.** The browser
  supports `inert`, so the Tab cycling path written for browsers that do not is
  unverified.
- **An order that is geometrically tidy can still be meaningless.** 2.4.3 is
  judged on painted position and visibility. The criterion asks for an order
  that preserves meaning, and meaning is not a geometric property.
- **An action attached with `addEventListener` cannot be attributed.** Four
  controls on the corrected 2.1.1 example are reached by Tab and declare no
  inline handler, so whether a key press did anything is not observable from
  outside the page.
- **Partial obscuring is reported and not failed.** 2.4.11 at Level AA asks
  only that the focused component is not *entirely* hidden. The chat launcher
  on the corrected example is 13% covered by the consent banner every run,
  which passes 2.4.11 and fails 2.4.12 at Level AAA. Reporting a AAA
  requirement as a AA one is how an audit loses a reader's trust on the second
  page.

And the one that is not a tooling limit at all: nothing here is a substitute
for using the page with a keyboard and a screen reader. The seven criteria this
repository judges are judged better than a scanner judges them. They are not
judged as well as a person using them.

## Layout

```
criteria/2.4.1-bypass-blocks/
  README.md     what the criterion requires, how it fails in production, how to test
  fail.html     the failing pattern, commented
  pass.html     the corrected pattern, commented
  meta.json     level, whether a scanner reports it, and the manual check it still needs
```

`fail.html` and `pass.html` are standalone. Open either directly in a browser,
or point axe DevTools at it. Every folder's `meta.json` carries a manual check
worth doing even where a scanner reports the criterion, because a rule can see
that `alt` exists and cannot see that it is wrong.

## Verifying

```bash
npm install
npm run verify
```

886 assertions about the repository, with no browser and no network: every
folder has its four files, every catalogued finding has a description a reader
can act on, every finding id belongs to the criterion it names, no judge
imports a browser driver, `CATALOGUE.md` matches what its generator produces,
and the figures in this README are the figures the commands print. The count
includes its own comparison, so the number above is the number the command
reports rather than one less.

```bash
npm test
```

171 tests. 17 on the colour and contrast core, 42 on the judges against
hand-built observations, 8 on the catalogue, 56 on the axe-core outcomes, 22 on
the gap between the two, and 26 on the pairs. The last three launch a real
browser.

The runner is `tools/run-tests.mjs` rather than `node --test`, and the reason
is worth a sentence. A script that counts tests by parsing the runner's printed
output breaks between Node versions: Node 24 prints the spec reporter even when
its output is piped, where 20 and 22 print TAP. This one reads the structured
event stream from `node:test` and counts `test:pass` and `test:fail` as
objects, so the figures are identical on every supported version because they
are not derived from a rendering. Zero tests is a hard failure.

```bash
npm run audit
npm run axe
```

The first judges the seven criteria no scanner reports and prints every
finding with the element it was measured on. The second runs axe over all
sixteen failing examples so the two can be read side by side. A corrected page
reporting a failure from the first command is a defect in this library rather
than in the page, and CI treats it that way.

## Scope and standard

WCAG 2.2, Levels A and AA, which is the conformance target used by ADA Title II
and Title III practice in the United States, Section 508, EN 301 549 and the
European Accessibility Act.

Patterns are deliberately framework-free. They are plain HTML and CSS so they
can be lifted into a theme, a page builder, a React component or a Liquid
snippet without translation.

## Related

- [shopify-accessibility-patterns](https://github.com/BuildWithAbdullah/shopify-accessibility-patterns) - the same fixes at Liquid theme level
- [wix-squarespace-accessibility](https://github.com/BuildWithAbdullah/wix-squarespace-accessibility) - workarounds for closed platforms
- [accessible-react-components](https://github.com/BuildWithAbdullah/accessible-react-components) - the ARIA Authoring Practices patterns with behavioural audits
- [site-audit-cli](https://github.com/BuildWithAbdullah/site-audit-cli) - accessibility, performance, SEO and security in one run

## Licence

MIT. Use them, ship them, no attribution required.
