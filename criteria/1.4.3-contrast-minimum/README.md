# 1.4.3 Contrast (Minimum) (Level AA)

Text and images of text have a contrast ratio of at least 4.5:1. Large text,
meaning 18.66px bold or 24px regular and above, needs 3:1.

## Thresholds worth memorising

| Foreground on white | Ratio | Verdict |
|---|---|---|
| `#767676` | 4.54:1 | Passes for normal text, with nothing to spare |
| `#595959` | 7.0:1 | Passes comfortably, survives a later size change |
| `#949494` | 2.85:1 | Fails |
| `#a8a8a8` | 2.2:1 | Fails |

On white, `#767676` is the boundary. Anything lighter fails for body text.
Specify `#595959` instead, so a later design tweak cannot silently push a
passing value under the line.

## Why contrast failures cluster

A site rarely has four contrast failures. It has one bad token used four
hundred times. Fix the token, not the instances. Two patterns account for most
of the volume.

**Theme colour schemes.** Modern themes ship several colour schemes, each with
its own background and its own text colour. When a scheme is added by picking a
background and leaving the inherited text colour alone, every section using
that scheme fails at once. On a pale scheme this produces near-white text on a
near-white surface, which is easy to miss on a bright monitor and impossible to
read on a dim one. The `scheme-pale` block in the examples is that failure
reduced to its smallest form.

**Opacity on an ancestor.** A container with `opacity: .7` blends every
descendant toward the page background. The computed colour in the stylesheet
passes; the rendered pixels do not. The tell is that changing the text colour
appears to do nothing at all. Look up the tree for `opacity` on a parent before
touching the colour again.

## How to test

- Automated: axe `color-contrast` handles solid backgrounds reliably.
- Automated tools skip text over images, gradients and video and park it in a
  "needs review" queue. That queue is not optional. It is where the real
  failures hide.
- Check every state, not only the resting one. Hover, focus, visited, disabled
  and placeholder each carry their own colour, and hover is the most commonly
  missed.

## Notes

Disabled controls are exempt. Placeholder text is not: if a placeholder is
carrying real instructions it must meet 4.5:1, and if it is carrying real
instructions it should have been a label or hint instead. See
[3.3.2](../3.3.2-labels-or-instructions/).

Logotypes are exempt. A brand colour used for body text is not a logotype.
