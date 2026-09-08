# 1.4.11 Non-text Contrast (Level AA)

User interface components and meaningful graphics have a contrast ratio of at
least 3:1 against adjacent colours.

Two things are covered, and the first is the one people forget.

**User interface components.** The parts of a control you need to see in order
to perceive the control and its state: the border of a text input, the outline
of a ghost button, the track and knob of a toggle, the box of a checkbox, the
focus indicator.

**Graphical objects.** Parts of graphics required to understand the content.
A meaningful warning icon is covered. A purely decorative flourish is not.

## Why it gets missed

The text passes. That is the whole problem. A form field with `#111` text, a
`#111` label and a `#dddddd` border scores perfectly on every contrast check
that a scanner runs, because scanners check text. Nothing on that page tells
you the user cannot see where the input begins.

Pale hairline borders are a house style in a large fraction of modern design
systems. `#ddd`, `#e5e5e5` and `#eee` are all under 1.6:1 on white and all
fail. Moving to `#767676` changes the visual weight far less than designers
expect and clears the bar with room to spare.

## No scanner will find this either

axe-core does not evaluate non-text contrast. Neither does Lighthouse. This is
a manual sample-the-pixels check, and it is one of the highest-yield manual
checks there is, because the failures are systemic rather than incidental.

## How to test

1. Screenshot the component at rest.
2. Use a colour picker on the boundary pixel and on the adjacent pixel.
3. Compute the ratio. Anything under 3:1 fails.
4. Repeat for hover, focus, checked, selected, disabled and error states.

Disabled controls are exempt. Everything else is not.

## Notes

State that is conveyed by colour alone is also a
[1.4.1 Use of Colour](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color)
failure, separately from this one. The corrected toggle moves its knob as well
as changing its fill, so it satisfies both.

Focus indicators sit under this criterion as well as under
[2.4.7](../2.4.7-focus-visible/). A focus ring that is invisible against the
background fails here even if it technically exists.
