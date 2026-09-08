# 1.1.1 Non-text Content (Level A)

All non-text content that is presented to the user has a text alternative that
serves the equivalent purpose, except for a listed set of cases such as pure
decoration.

## How it actually fails in the wild

Missing `alt` is the version everyone knows about, and it is the least common
of the four problems below on a site that has had any attention at all.

1. **No alt attribute.** Caught by every scanner. Easy.
2. **Alt text that is not an alternative.** `alt="chart-q3.png"`,
   `alt="image"`, `alt="DSC_0041"`. A scanner sees an alt attribute and passes
   the element. A screen reader user gets nothing usable. This is the single
   most common false pass in an automated report.
3. **Decorative images given a name.** Dividers, spacer graphics, background
   flourishes. Every one of them adds an announcement to the reading order.
   The fix is `alt=""`, not a better description.
4. **Icon-only controls with no name.** The most common real failure on
   e-commerce templates: close buttons, cart buttons, hamburger menus, social
   links. Announced as "button" with no further information.

## How to test

- Automated: axe `image-alt`, `role-img-alt`, `input-image-alt`, `button-name`.
- Manual, and this is the part that matters: read every alt value out loud
  and ask whether it replaces the image or merely mentions it. No scanner can
  do this for you.
- With images disabled in the browser, the page should still make sense.

## Notes

`alt=""` and a missing `alt` attribute are not equivalent. An empty alt says
"deliberately decorative, skip this". A missing alt leaves the assistive
technology to guess, and several screen readers fall back to announcing the
filename.

For an icon-only control, prefer visually hidden text inside the button over
`aria-label`. Real text is translated by page translation tools, survives an
icon font that fails to load, and is visible in the DOM when someone else
debugs the template later.
