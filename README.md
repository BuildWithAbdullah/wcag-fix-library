# WCAG Fix Library

Failing markup and its corrected counterpart, side by side, indexed by WCAG
success criterion. Every corrected example is verified by machine, and every
failing example is verified to actually fail.

This exists because most accessibility "snippet libraries" are a list of things
someone believes are correct. Nothing checks them, so nothing stops them
drifting. Here, `npm run verify` loads every page in a real browser, runs
axe-core against it, and fails the build if a `pass.html` is not clean or a
`fail.html` has quietly stopped failing.

## The part that matters more than the snippets

Nine of the sixteen criteria in this library can be judged by an automated
scanner. Seven cannot.

That ratio is the whole argument. A site can return zero automated violations
and still be unusable: a checkout drawer a keyboard user cannot escape, a focus
ring that vanishes on the dark footer, a sticky header that covers the link the
user just tabbed to, form fields whose borders are invisible,
a layout that needs sideways scrolling to read a sentence. None of those
produce a finding in any scanner on the market.

So each criterion here is labelled with which category it falls into, and the
verification script reports, for the manual ones, how many violations axe found
on a page that plainly fails. The answer is usually zero. That number is the
most useful thing in this repository.

| Criterion | Level | Automated | What breaks |
|---|---|---|---|
| [1.1.1 Non-text Content](criteria/1.1.1-non-text-content/) | A | Yes | Missing, useless and unnecessary alternatives; unnamed icon buttons |
| [1.3.1 Info and Relationships](criteria/1.3.1-info-and-relationships/) | A | Partly | Fake headings, fake lists, headerless tables, ungrouped radios |
| [1.4.3 Contrast (Minimum)](criteria/1.4.3-contrast-minimum/) | AA | Yes | Grey-on-white text, brand buttons, pale theme colour schemes |
| [1.4.4 Resize Text](criteria/1.4.4-resize-text/) | AA | Yes | `maximum-scale=1`, fixed-height text containers |
| [1.4.10 Reflow](criteria/1.4.10-reflow/) | AA | **No** | Fixed widths and non-collapsing grids at 320px |
| [1.4.11 Non-text Contrast](criteria/1.4.11-non-text-contrast/) | AA | **No** | Invisible input borders, faint icons, colour-only state |
| [2.1.1 Keyboard](criteria/2.1.1-keyboard/) | A | **No** | `div` with `onclick`, anchors with no `href`, positive `tabindex` |
| [2.1.2 No Keyboard Trap](criteria/2.1.2-no-keyboard-trap/) | A | **No** | Drawers and modals that never take or return focus |
| [2.4.1 Bypass Blocks](criteria/2.4.1-bypass-blocks/) | A | Yes | Missing or non-functional skip links, missing landmarks |
| [2.4.3 Focus Order](criteria/2.4.3-focus-order/) | A | **No** | CSS reordering, hidden content left in the tab order |
| [2.4.4 Link Purpose](criteria/2.4.4-link-purpose-in-context/) | A | Yes | Empty links, repeated "Read more", identical names |
| [2.4.7 Focus Visible](criteria/2.4.7-focus-visible/) | AA | **No** | `outline: none`, rings that vanish on dark sections |
| [2.4.11 Focus Not Obscured](criteria/2.4.11-focus-not-obscured-minimum/) | AA | **No** | Sticky headers, consent bars and chat widgets covering the focused element |
| [2.5.8 Target Size (Minimum)](criteria/2.5.8-target-size-minimum/) | AA | Yes | Small controls, and the 24px versus 44px confusion |
| [3.3.2 Labels or Instructions](criteria/3.3.2-labels-or-instructions/) | A | Yes | Placeholders as labels, mismatched `for` and `id` |
| [4.1.2 Name, Role, Value](criteria/4.1.2-name-role-value/) | A | Yes | Custom widgets, broken references, nested interactive controls |

## Layout

Each folder holds four files:

```
criteria/2.4.1-bypass-blocks/
  README.md     what the criterion requires, how it fails in production, how to test
  fail.html     the failing pattern, commented
  pass.html     the corrected pattern, commented
  meta.json     which axe rules apply, or why none do
```

`fail.html` and `pass.html` are standalone. Open either directly in a browser,
or point axe DevTools at it.

## Verifying

```bash
npm install
npm run verify
```

Output looks like this:

```
OK     1.1.1 Non-text Content (fail.html: image-alt, button-name)
OK     2.4.1 Bypass Blocks (fail.html: bypass, region)
MANUAL 2.1.2 No Keyboard Trap
       axe reported 0 violation(s) on a page that fails this criterion.
       Verify by: Open every modal, drawer and menu with the keyboard...
```

The build fails if a corrected example stops being clean or a failing example
stops failing. It never fails on the manual criteria, because asserting a
scanner's blindness would be asserting the wrong thing.

## Scope and standard

WCAG 2.2, Levels A and AA, which is the conformance target used by ADA Title
II and Title III practice in the United States, Section 508, EN 301 549 and the
European Accessibility Act.

Patterns are deliberately framework-free. They are plain HTML and CSS so they
can be lifted into a theme, a page builder, a React component or a Liquid
snippet without translation.

## Related

- [shopify-accessibility-patterns](https://github.com/BuildWithAbdullah/shopify-accessibility-patterns) - the same fixes at Liquid theme level
- [wix-squarespace-accessibility](https://github.com/BuildWithAbdullah/wix-squarespace-accessibility) - workarounds for closed platforms

## Licence

MIT. Use them, ship them, no attribution required.

## Notes on the harness

`meta.json` may set `axeTags` to override the default tag filter for one
criterion. This exists because of a real finding: axe classifies the landmark
rules (`region`, `landmark-one-main`) as `best-practice` rather than `wcag2a`,
so a scan filtered to WCAG tags alone reports nothing at all on a page with no
landmarks, no headings and no skip link. See
[2.4.1](criteria/2.4.1-bypass-blocks/#a-tooling-detail-worth-knowing).

A clean automated report is a statement about the tool's configuration as much
as about the page.
