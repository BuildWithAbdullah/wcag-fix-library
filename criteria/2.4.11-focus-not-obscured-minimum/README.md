# 2.4.11 Focus Not Obscured (Minimum) (Level AA)

When a user interface component receives keyboard focus, the component is not
entirely hidden by author-created content.

New in WCAG 2.2. It is the criterion that catches the sticky header, and it is
the one most often missed, because the site passes 2.4.7 Focus Visible with a
perfectly good focus ring that nobody can see.

## Why "entirely"

At AA the bar is that some part of the focused element remains visible. A
header that clips the top two pixels of a link is not a failure of this
criterion. A header that covers the link completely is.

2.4.12 Focus Not Obscured (Enhanced) is the AAA version, and it removes the
word: no part of the component may be hidden. If a design is being built rather
than repaired, aim at 2.4.12, because the AA version means arguing about how
much of a control is showing.

## The mechanism

The browser scrolls a newly focused element into view only when it considers
that element outside the scrollport. A `position: sticky` header does not
change the scrollport. It is painted over the top of it.

So the sequence is:

1. Shift+Tab moves focus to a link sitting just above the top of the window.
2. The browser scrolls the link to the top edge of the scrollport. As far as
   it is concerned, the job is done and the link is visible.
3. The header paints over that same strip.
4. The user sees nothing move except the scrollbar.

Nothing in that sequence is a bug in any one component. The header is correct,
the focus ring is correct, the scrolling is correct. The failure only exists
where they meet, which is why it survives component-level review.

## Shift+Tab is the direction that fails

Tabbing forwards scrolls the page down, and content arriving from below is
usually clear of a top-anchored header by the time it is focused. Shift+Tab
scrolls the page up, which brings the focused element to the *top* edge every
time, directly under the header.

A test that only tabs forwards will not find this. Most do only tab forwards.

## The fix

Declare the obscured strips as scroll padding on the scrolling element:

```css
:root {
  --obscured-top: 88px;    /* sticky header */
  --obscured-bottom: 96px; /* consent bar, promo bar, back-to-top */
  scroll-padding-top: var(--obscured-top);
  scroll-padding-bottom: var(--obscured-bottom);
}
```

`scroll-padding` shrinks the region the browser treats as the usable
scrollport. Anything landing inside the padding is now considered out of view,
so the browser scrolls further until it is clear. It applies to every
scroll-into-view path at once: sequential focus navigation, fragment links,
`scrollIntoView()`, and `:target`. This is WCAG technique C43.

Three details decide whether it keeps working:

**Put it on the scroll container, not on the element.** `scroll-padding` goes
on whatever actually scrolls. That is `:root` for a normal page, but it is the
scrolling `div` if the content lives in one, and setting it on `:root` in that
case does nothing at all. The per-element alternative is `scroll-margin-top` on
the targets, which is useful for one awkward anchor and unmaintainable as a
site-wide policy.

**Measure the overlays, do not guess them.** A hard-coded value is wrong as soon
as the header wraps to two rows at a narrow width, an announcement bar is added
above it, or the banner text runs to three lines on a phone. `pass.html` keeps
the properties in sync with a `ResizeObserver`, and the difference is not
theoretical: its 96px starting value for the bottom bar measures 128px once the
banner is actually laid out. The common version of this bug is a site where the
fix works on desktop and the overlay still covers the focused link on a phone,
because the value was taken once at 1440px.

**Do not measure into the same property that sizes the element.** If
`--obscured-top` both receives `header.offsetHeight` and sets the header's
`min-height`, the `ResizeObserver` writes a height, the height resizes the
element, the observer fires again, and the value grows every frame until the
layout is nonsense. It is silent, it only appears once the observer is added,
and it is easy to write by accident. Measure into one property, size with
another.

## What scroll padding does not fix

It is a scrolling fix, so it fails wherever there is no scrolling left to do.

- **The top of the document.** The first few elements cannot be scrolled clear
  of a header that overlaps them, because the page is already at scroll
  position zero. Reserve real space for the header instead of overlaying the
  first screen.
- **The bottom of the document.** Same problem inverted. The last focusable
  element on a fully scrolled page cannot move out from under a fixed footer
  bar. Making the bar dismissible is the fix; padding the end of the document
  is the workaround.
- **Overlays that appear after focus has landed.** A consent banner that
  animates in three seconds after load, or a toast that slides over the corner,
  can cover an element that is already focused. No scroll happens, so nothing
  triggers. Keep persistent overlays out of the flow of focusable content, and
  give them a real dismiss control.
- **Overlays that are wider than they look.** A chat widget with an invisible
  padded hit area, or a full-width transparent gradient over a footer, obscures
  the region it covers whether or not it appears to.
- **Corner widgets, where reserving is the wrong trade.** scroll-padding is a
  horizontal band; it cannot know that a 64px launcher only overlaps the right
  edge. Reserving for a launcher floating 120px above the fold costs a quarter
  of the scrollport on a laptop to protect controls it could never entirely
  cover. `pass.html` leaves it out and says why. A corner widget big enough to
  swallow a whole control has to be counted, or moved.

## The exception, and what it does not cover

The criterion has a note: if the user opened the content that is doing the
obscuring, and can reveal the focused component again without moving focus,
that is not a failure. A dropdown the user opened, which closes on Escape, is
fine.

It does not extend to anything the site opened by itself. A cookie banner, a
newsletter modal, a promotional bar and a chat launcher are all author-opened,
so the exception does not apply to any of them, no matter how easy they are to
close.

## A ring clipped by `overflow: hidden` is a different problem

A focus indicator cut off by a carousel viewport or a dropdown panel with
`overflow: hidden` is not 2.4.11, because the component itself is still
visible. It is a 2.4.7 and 1.4.11 problem: the indicator is no longer
perceivable at the required contrast.

Worth knowing because the fix is unrelated and easy to reach for by mistake.
Negative `outline-offset` draws the ring inside the element's own box, where an
ancestor's overflow cannot clip it:

```css
.dropdown-link:focus-visible { outline-offset: -3px; }
```

## No scanner will find this

There is no axe rule, and there cannot usefully be one. Running this library's
own harness over `fail.html` returns zero violations, on a page where five of
the fourteen links reached by Shift+Tab at 1280px, and six of fourteen at
360px, are entirely covered by the header. Deciding this needs the
rendered page, the current scroll position, the stacking order and the geometry
of every fixed element on screen at the moment focus moved. A DOM scan sees a
header, a link and a focus style, all of them correct.

## How to test

Scroll to the middle of the page first, so the sticky header is engaged and any
consent bar has appeared. Then:

1. Press Tab through a full screen of content and watch every stop.
2. Press Shift+Tab back through the same content. This is where it breaks.
3. Activate the skip link from a scrolled position and confirm the target does
   not land under the header.
4. Repeat at 320px wide, where the header is usually taller than it is on
   desktop.
5. Repeat with the consent banner still showing, before accepting it, since
   that is the state a first-time visitor is in.

## Related

- [2.4.7 Focus Visible](../2.4.7-focus-visible/) - the indicator has to exist
  and be perceivable before this criterion is worth asking about
- [2.4.3 Focus Order](../2.4.3-focus-order/) - where focus goes when the
  obscuring overlay is dismissed
