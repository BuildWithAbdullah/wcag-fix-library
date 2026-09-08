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
