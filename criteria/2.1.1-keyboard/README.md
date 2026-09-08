# 2.1.1 Keyboard (Level A)

All functionality is operable through a keyboard interface, without requiring
specific timings for individual keystrokes.

This is the criterion that decides whether a site is usable at all by anyone
who does not use a mouse: screen reader users, people with tremor or limited
fine motor control, people using switch access or voice control, and anyone
whose trackpad has just died.

## Why a scanner cannot judge it

A `div` with an `onclick` handler is valid HTML. There is nothing in the DOM
that marks it as broken. axe has no rule for it, because inferring intent from
an event listener is not something a static rule can do reliably.

`fail.html` in this folder cannot be operated with a keyboard at all. Run the
verification script and look at what axe reports for it. That gap is the
strongest available answer to "our automated scan came back clean".

## The four failures

**A div with a click handler.** Not focusable, no role, no key handling. The
fix is `<button>`. If you genuinely cannot change the tag, you need
`tabindex="0"`, `role="button"`, and a key handler for both Enter and Space,
and you have now written twelve lines to reimplement an element that already
exists.

**An anchor with no `href`.** Without `href`, an `a` element is not focusable
and is not exposed as a link. This is the most common way a navigation item
that "works fine" turns out to be unreachable. If it navigates, give it an
`href`. If it acts on the current page, it was always a button.

**Mouse-only custom controls.** Colour swatches, star ratings, image galleries,
quantity steppers, custom dropdowns. Built from `span` and `div`, wired to
`click`, shipped.

**Positive `tabindex`.** `tabindex="1"` does not mean "first". It moves the
element into a separate tab sequence that runs ahead of every element in the
document, so adding it to one control disorders the whole page. The only two
values worth using are `0` and `-1`.

## How to test

Put the mouse away. Then:

1. `Tab` from the top of the page to the bottom.
2. Confirm every interactive element receives focus.
3. Confirm you can see where focus is at all times (see
   [2.4.7](../2.4.7-focus-visible/)).
4. Operate each control: `Enter` on links and buttons, `Space` on buttons and
   checkboxes, arrow keys inside radio groups, tabs and menus.
5. Confirm you can get back out of everything you got into (see
   [2.1.2](../2.1.2-no-keyboard-trap/)).

Ten minutes on a page. It finds more real barriers than any scan.

## Notes

Native elements come with focusability, roles, key handling, high contrast mode
support and voice control target names already built. Every one of those has to
be written and maintained by hand on a `div`, and the ARIA Authoring Practices
version of a custom widget is typically an order of magnitude more code than
the native element it replaces.
