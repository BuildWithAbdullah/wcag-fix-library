# 2.1.2 No Keyboard Trap (Level A)

If focus can be moved to a component using the keyboard, then focus can be
moved away from it using the keyboard.

## The two failures people mean by "focus trap"

The term is used for opposite problems, which causes real confusion in audit
reports.

**A true trap.** Focus goes into a component and cannot get out. Common in
embedded third-party widgets, video players with custom controls, and rich
text editors that swallow `Tab`.

**A missing trap.** A modal or drawer opens visually, but focus is never moved
into it and the page behind stays tabbable. The user tabs off the trigger and
straight into content that is covered by an overlay they cannot see past and
cannot dismiss. Technically focus is not trapped inside the dialog; in practice
the user is stranded, and this is by far the more common of the two on
e-commerce templates.

`fail.html` is the second kind. It is what a drawer looks like when it was
built with `display: none` and a click handler and nothing else.

## What the corrected version does

1. Records which element opened the dialog.
2. Sets `inert` on the rest of the page, which removes it from the tab order
   and from the accessibility tree in one property.
3. Moves focus to the first focusable element inside the dialog.
4. Cycles `Tab` and `Shift` plus `Tab` within the dialog as a fallback for
   browsers without `inert`.
5. Closes on `Escape` and on a backdrop click.
6. Returns focus to the opener on close, so the user is put back where they
   were rather than at the top of the document.

Step 6 is the one that gets skipped. Without it, closing a drawer drops focus
to `body` and the next `Tab` starts again from the top of the page.

## No scanner will find this

A dialog that never receives focus is structurally indistinguishable from one
that does. There is no rule to write. This is found by opening the component
with a keyboard and trying to leave.

It is worth being blunt about what this means: a site can return zero automated
violations and still have a checkout drawer that a keyboard user cannot escape.
Automated coverage tops out somewhere around a third of the criteria, and the
operability failures are concentrated in the part it cannot see.

## How to test

1. `Tab` to the trigger and press `Enter`.
2. Where did focus go? It should be inside the dialog.
3. `Tab` all the way round. Does focus stay inside?
4. Press `Escape`. Does it close?
5. Where did focus go on close? It should be back on the trigger.

Repeat for every modal, drawer, off-canvas menu, cookie banner, newsletter
popup and lightbox on the site. The newsletter popup is the one that is always
broken.

## Notes

`inert` is supported in all current browsers. The manual `Tab` cycle is kept
here as a fallback and because plenty of production code still needs to run in
older embedded webviews.

`aria-modal="true"` tells assistive technology that content outside the dialog
is unavailable. It does not make the page inert by itself, so it complements
`inert` rather than replacing it.
