# 2.4.1 Bypass Blocks (Level A)

A mechanism is available to bypass blocks of content that are repeated on
multiple pages.

## What counts as a mechanism

Any one of these satisfies the criterion:

- A skip link to the main content.
- Proper landmark regions, so assistive technology can jump between them.
- Headings that let the user jump past the repeated block.

In practice, provide the skip link and the landmarks. The skip link serves
sighted keyboard users, who get nothing from landmarks. The landmarks serve
screen reader users, who navigate by region far more than they use skip links.
Neither substitutes for the other.

## The three ways a skip link is broken

**Hidden with `display: none`.** This removes it from the tab order, so it can
never be focused, so it can never be used. Position it off screen instead.
`clip-path` and negative `left` both work.

**Never revealed on focus.** It stays off screen when focused, so a sighted
keyboard user sees the focus ring vanish for one `Tab` press and has no idea
what it landed on. Reveal it.

**Target not focusable.** `href="#main"` on an element with no `tabindex`
moves the scroll position in most browsers but does not move focus in several
of them. The next `Tab` then continues from wherever focus actually was, which
is the second navigation link, and the skip link has achieved nothing. Add
`tabindex="-1"` to the target.

That third one is the one that survives audits, because the link looks correct
in the DOM and the page visibly jumps when you click it. It only shows up when
you press `Tab` immediately afterwards.

## Landmarks

```html
<header>          <!-- banner -->
<nav>             <!-- navigation, name it if there is more than one -->
<main>            <!-- main, exactly one per page -->
<aside>           <!-- complementary -->
<footer>          <!-- contentinfo -->
```

Rules that matter in practice:

- Exactly one `main` per page.
- All content should sit inside some landmark. Content stranded outside them
  is what axe reports as `region`.
- If there are two or more `nav` elements, give each an `aria-label`, because
  "navigation, navigation, navigation" in the landmark list helps nobody.
- Do not add `role="banner"` to a `header` or `role="main"` to a `main`. The
  role is implicit and the redundancy is noise.

## How to test

- Automated: axe `bypass`, `region`, `landmark-one-main`.
- Manual: load the page, press `Tab` once. The skip link should be the first
  thing focused and it should be visible. Press `Enter`, then press `Tab`
  again and confirm focus is now inside the main content.

## A tooling detail worth knowing

Running axe against `fail.html` filtered to WCAG tags alone reports **nothing**,
even though the page has no skip link, no landmarks and no headings.

Two reasons:

- axe's own `bypass` rule returns `incomplete` rather than a violation. It
  cannot determine from the DOM alone whether a skip mechanism works, so it
  asks for review instead of failing.
- The rules that do fire (`region`, `landmark-one-main`, `page-has-heading-one`)
  are tagged `best-practice`, not `wcag2a`. A scan configured to report only
  WCAG-tagged results filters them out.

This is worth knowing because "we only report WCAG-tagged violations" is a
common and reasonable-sounding audit configuration, and it silently drops
landmark findings. `meta.json` in this folder therefore adds `best-practice` to
the tag set, and the harness supports a per-criterion `axeTags` override for
exactly this case.

The wider lesson: a clean report is a statement about the tool's configuration
as much as about the page.
