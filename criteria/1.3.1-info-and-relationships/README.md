# 1.3.1 Info and Relationships (Level A)

Information, structure and relationships conveyed through presentation can be
programmatically determined, or are available in text.

This is the criterion that catches "it looks right, so it must be right".
Everything on the failing page renders correctly for a sighted mouse user.
None of it is available to anyone else.

## The seven failures on the example page

| Pattern | What axe does | Why it matters |
|---|---|---|
| Styled `div` used as a heading | nothing | Heading navigation is how most screen reader users skim a page. A page of fake headings has no outline at all. |
| `ul` containing `div` children | reports `list` | The list role is lost, so item count and item-by-item navigation are lost. |
| Data table with no `th` | nothing | Cells are announced without their column, so "101 cm" arrives with no idea what it measures. |
| Radio group with no `fieldset` | nothing | The question the options answer is conveyed only by visual proximity. |
| `li` with no list around it | reports `listitem` | What a correct list becomes the first time each item is wrapped in a div for a grid. It still looks like a list and is no longer announced as one. |
| `role="list"` with `div` children | reports `aria-required-children` | Hand-written ARIA fails this way far more often than native HTML does, because nothing in the markup looks wrong. |
| A header for a column that is not there | **examines it and declines to decide** | A column was added to the header row and never to the body rows. Sighted users see a slightly odd empty column; a screen reader user gets an announced header for a column that does not exist, and every cell after it is announced against the wrong header. |

Three of the seven produce nothing from a scanner, and a fourth produces
neither a pass nor a failure: `th-has-data-cells` returns `incomplete` on that
last row, so a pipeline that gates on the violation count treats the table as
clean. A clean automated report on a page built this way is normal, and it is
worth saying so plainly when a client asks why their scan passed and their
users still complain.

## How to test

- Automated: axe reports `list`, `listitem` and `aria-required-children`, and
  returns `incomplete` for `th-has-data-cells`. All four outcomes are asserted
  in `test/axe.test.mjs`, in both directions.
- Manual: run a heading-level outline of the page and check it reads as a
  sensible table of contents. In NVDA, press `H` repeatedly, or open the
  elements list with `Insert` plus `F7`.
- Manual: tab into every group of related controls and confirm the group name
  is announced once on entry.
- Manual: arrow through every table cell by cell with a screen reader and
  listen to the header announced with each one. This is the only way to catch
  a header that heads nothing, and it is the defect most likely to be present
  in a template that has been edited for a year.

## Notes

`role="heading" aria-level="2"` on a div is valid and works, but it is a
repair, not a design. Reach for it when the tag is fixed by a page builder you
cannot edit. Otherwise use `h2`.

Do not add `role="list"` to a `ul` reflexively. It is only needed when CSS
`list-style: none` has removed the list semantics, which is a Safari and
VoiceOver behaviour rather than a universal one, and it costs nothing to add
when you are already writing the rule.
