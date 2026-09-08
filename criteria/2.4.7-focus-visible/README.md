# 2.4.7 Focus Visible (Level AA)

Any keyboard operable user interface has a mode of operation where the keyboard
focus indicator is visible.

## The line to search for first

```css
*:focus { outline: none; }
```

Or `outline: 0`, or `:focus { box-shadow: none }`. This is the first thing to
grep for in any stylesheet. It is usually added early, by someone who objected
to the ring appearing on mouse click, and it disables keyboard navigation for
the entire site in one declaration.

`:focus-visible` is the answer to that objection. It applies the indicator for
keyboard and other non-pointer input and suppresses it for mouse clicks, which
is exactly the behaviour that was wanted. It is supported in every current
browser.

## Three ways to fail while having an indicator

**Too faint.** A 1px light grey ring on a light background technically exists.
It cannot be seen on a laptop screen at an angle in daylight.

**No offset.** An outline drawn directly on the edge of a dark button against a
dark background merges with the button.

**Wrong for one section.** A dark ring is fine everywhere except the dark
footer, where it disappears. This is the failure that survives testing, because
the tester tabbed through the header and stopped.

The two-tone pattern in `pass.html` solves the last one without per-section
overrides: one light layer and one dark layer, so at least one of them contrasts
with whatever is behind it.

## The contrast requirement

Under [1.4.11](../1.4.11-non-text-contrast/) the indicator needs 3:1 against
the adjacent colour. Under WCAG 2.2, 2.4.11 Focus Not Obscured (Minimum) adds
that the focused element must not be entirely hidden by author content, which
in practice means sticky headers and cookie banners that cover the element the
user just tabbed to.

## Windows high contrast mode

Forced colours mode discards author colours, and a coloured outline can vanish
entirely. Declaring a transparent outline inside `@media (forced-colors: active)`
lets the operating system repaint it in the user's own colours.

## No scanner will find this

There is no axe rule. Judging whether an indicator is perceivable requires
looking at rendered pixels against their surroundings in each state.

## How to test

`Tab` through the whole page, slowly, and never lose sight of the focus ring.
Do it once in each colour scheme the site ships, and once with a dark section
in view. If you cannot tell where focus is at any point, that point is the
failure.
