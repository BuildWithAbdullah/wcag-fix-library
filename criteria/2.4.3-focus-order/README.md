# 2.4.3 Focus Order (Level A)

If a page can be navigated sequentially and the navigation sequences affect
meaning or operation, focusable components receive focus in an order that
preserves meaning and operability.

Put plainly: `Tab` should move through the page in the order the page reads.

## The two causes

**CSS reordering.** `flex-direction: row-reverse`, the `order` property, and
`grid-template-areas` all change where things appear without changing where
they are in the DOM. Focus follows the DOM. When the two disagree, focus jumps
around the screen: right column, then back to the left column, then down.

For a sighted keyboard user this is disorienting rather than fatal. For a
screen magnifier user at 400 percent, who sees a small window onto the page,
focus jumping to an off-screen region with no warning is genuinely
disqualifying. They have no way to know where it went.

The fix is to put the DOM in the order the content should be read and use
layout that does not require reordering. Reordering is fine when it does not
affect meaning, for example rearranging equal-weight cards in a grid.

**Hidden content left in the tab order.** `opacity: 0`, `height: 0`,
`visibility: visible` with a zero-size parent, `transform: translateX(-100%)`
and `position: absolute; left: -9999px` all leave elements focusable. Focus
lands on something nobody can see, the focus ring vanishes, and the user has to
tab blindly until it reappears.

Off-canvas menus are the usual source. The menu slides out of view with a
transform, and its twelve links stay in the tab order permanently.

Use `display: none`, the `hidden` attribute, or `inert`. All three remove the
content from the tab order and from the accessibility tree together. The one
deliberate exception is the skip link in
[2.4.1](../2.4.1-bypass-blocks/), which must stay focusable in order to work.

## No scanner will find this

Focus order is a relationship between DOM order and visual order. Both are
individually valid. axe has no rule for it, and there is no realistic way to
write one.

## How to test

`Tab` through the page and watch where the focus ring goes. If it moves
backwards up the screen, or vanishes, or lands on something invisible, you have
found it.

Do it at 400 percent zoom as well. Failures that are mildly annoying at 100
percent become impassable when only a fraction of the page is visible.

## Notes

Positive `tabindex` values are the third way to break focus order and are
covered in [2.1.1](../2.1.1-keyboard/). The only values worth using are `0` and
`-1`.
