# 2.4.4 Link Purpose (In Context) (Level A)

The purpose of each link can be determined from the link text alone, or from
the link text together with its programmatically determined context.

## Why "in context" is weaker than it sounds

The criterion allows context to rescue a vague link, but only programmatically
determined context: the sentence, paragraph, list item, table cell or heading
the link sits inside.

The catch is how screen reader users actually navigate. Listing every link on
the page, with `Insert` plus `F7` in NVDA or the rotor in VoiceOver, is one of
the primary navigation methods. In that list there is no context at all. Twelve
entries reading "Read more" are twelve identical entries.

So a page can be argued into technical conformance and still be unusable in the
way people actually use it. Write links that stand alone.

## The four failures

**Empty links.** An anchor wrapping an icon with no text. Announced as "link"
and nothing more. Caught by axe as `link-name`. This is the single highest
volume finding on icon-heavy commerce templates, where the header alone will
have cart, search, account and wishlist all unnamed.

**A URL as the link text.** Some screen reader configurations read it out
character by character. Nobody wants to hear a slug spelled aloud.

**Repeated generic text.** "Read more", "Learn more", "Click here", "Details",
"Shop now". The fix that survives a designer review is to keep the visible text
short and append visually hidden text, so the layout is untouched and the
accessible name becomes unique.

**Identical names, different destinations.** Two "Size guide" links going to
different pages. Distinguish them in the accessible name.

## Which to use for the hidden part

Prefer visually hidden text inside the anchor over `aria-label`. Real text is
translated by browser page translation, it survives an icon font that fails to
load, and it is visible in the DOM to whoever maintains the template next.

`aria-label` also replaces the entire accessible name rather than adding to it,
which means voice control users who say "click read more" can no longer
activate a link whose visible text is "Read more" but whose label is something
else. That mismatch is its own failure, under 2.5.3 Label in Name.

## How to test

- Automated: axe `link-name` catches empty links.
- Manual: open the links list in a screen reader and read it top to bottom.
  Any entry you cannot act on without scrolling back into the page is a
  failure in practice, whether or not it conforms on paper.

## Notes

A link that opens a new tab or downloads a file should say so in its
accessible name. This is not required by 2.4.4 but it is required by nothing
else either, and it is the single most common piece of feedback from actual
screen reader users.

## The fifth case, and the criterion it actually belongs to

The failing page carries one more pattern: a link inside a paragraph with the
underline removed, so the only thing marking it as a link is its colour, at
1.94:1 against the surrounding text. Anyone who cannot distinguish the two
cannot find the link in the sentence, and that includes a sighted reader on a
washed-out screen in daylight. The usual defence is that it is obvious on
hover, which requires already knowing it is there.

axe reports it, with `link-in-text-block`. That rule is tagged `wcag141`, not
`wcag249`, so the defect is a failure of 1.4.1 Use of Colour, which this
library has no folder for. `tools/pairs.mjs` records it against this page and
says which criterion it belongs to, rather than filing the rule under 2.4.4
and leaving the declaration looking tidy. A real page fails several criteria at
once, and a declaration that pretends otherwise is the one that goes stale.

The correction is the underline. It is the one link affordance that needs no
colour vision, no hover and no explanation. Where a design cannot have
underlines in body copy, the alternative has to be a non-colour difference
present at rest: weight, a background, or a small icon. Hover is not an
alternative, because it cannot be found without being found first.

## The rule for the two identical links, which never runs

The two "Size guide" links going to two different pages are exactly what
`identical-links-same-purpose` is for. It is tagged `wcag2aaa`, so a scan
filtered to the A and AA conformance target never runs it, and forced on by
rule id it returns `incomplete` rather than a violation. There is no
configuration of axe that reports this page as failing on it, which is
measured and asserted in `test/axe.test.mjs` rather than asserted here.
