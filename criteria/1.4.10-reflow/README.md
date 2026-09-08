# 1.4.10 Reflow (Level AA)

Content can be presented without loss of information or functionality, and
without requiring scrolling in two dimensions, at a width equivalent to 320 CSS
pixels.

In practice: at 320px wide, the page must scroll vertically only. If the user
has to scroll sideways to read a sentence, it fails.

## No scanner will find this

There is no axe rule for reflow. It is a layout property, judged by rendering
the page at a specific viewport and looking at it. Every reflow failure in
every audit was found by a person resizing a window.

The verification script in this repository reports how many violations axe
found on `fail.html`, which is a page that plainly fails this criterion. The
answer is normally zero. That number is the argument for manual testing,
stated in one line.

## The three sources of horizontal overflow

1. **Fixed widths.** `width: 960px` on a container. Use `max-width`.
2. **Grids and flex rows that never collapse.** `repeat(4, 240px)` holds four
   columns at every viewport. `repeat(auto-fit, minmax(min(240px, 100%), 1fr))`
   reflows without a media query. The inner `min()` matters: without it, the
   240px floor itself overflows a 320px viewport.
3. **A single wide child.** One oversized image, one long unbroken string, one
   embedded iframe with a hard-coded width. The container is fine; one child
   pushes the scrollbar onto the document.

## The documented exception

Content that requires a two-dimensional layout for meaning or use is exempt.
Data tables, maps, diagrams and code blocks qualify. The exemption covers the
component, not the page, so scope the overflow to the component:

```css
.table-scroll { overflow-x: auto; }
```

A scroll container that a mouse user can drag must also be reachable by
keyboard. Give it `tabindex="0"` so it can receive focus and be scrolled with
the arrow keys, and give it an accessible name so its purpose is announced.
axe flags the missing `tabindex` case as `scrollable-region-focusable`.

## Finding the overflow

Run this in the console at a 320px viewport. It lists every element wider than
the document:

```js
[...document.querySelectorAll('*')]
  .filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth)
  .forEach(el => console.log(el));
```

## Notes

Reflow is not the same as [1.4.4 Resize Text](../1.4.4-resize-text/). Resize
Text is about scaling type to 200 percent. Reflow is about the layout surviving
a narrow viewport. Audit reports mix them up constantly.
