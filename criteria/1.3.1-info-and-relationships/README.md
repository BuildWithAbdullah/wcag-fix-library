# 1.3.1 Info and Relationships (Level A)

Information, structure and relationships conveyed through presentation can be
programmatically determined, or are available in text.

This is the criterion that catches "it looks right, so it must be right".
Everything on the failing page renders correctly for a sighted mouse user.
None of it is available to anyone else.

## The four failures on the example page

| Pattern | Caught by axe | Why it matters |
|---|---|---|
| Styled `div` used as a heading | No | Heading navigation is how most screen reader users skim a page. A page of fake headings has no outline at all. |
| `ul` containing `div` children | Yes (`list`) | The list role is lost, so item count and item-by-item navigation are lost. |
| Data table with no `th` | Partly | Cells are announced without their column, so "101 cm" arrives with no idea what it measures. |
| Radio group with no `fieldset` | No | The question the options answer is conveyed only by visual proximity. |

Two of the four are invisible to a DOM scanner. A clean automated report on a
page built this way is normal, and it is worth saying so plainly when a client
asks why their scan passed and their users still complain.

## How to test

- Automated: axe `list`, `listitem`, `th-has-data-cells`, `aria-required-children`.
- Manual: run a heading-level outline of the page and check it reads as a
  sensible table of contents. In NVDA, press `H` repeatedly, or open the
  elements list with `Insert` plus `F7`.
- Manual: tab into every group of related controls and confirm the group name
  is announced once on entry.

## Notes

`role="heading" aria-level="2"` on a div is valid and works, but it is a
repair, not a design. Reach for it when the tag is fixed by a page builder you
cannot edit. Otherwise use `h2`.

Do not add `role="list"` to a `ul` reflexively. It is only needed when CSS
`list-style: none` has removed the list semantics, which is a Safari and
VoiceOver behaviour rather than a universal one, and it costs nothing to add
when you are already writing the rule.
