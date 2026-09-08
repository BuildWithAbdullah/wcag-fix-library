# 1.4.4 Resize Text (Level AA)

Text can be resized up to 200 percent without assistive technology and without
loss of content or functionality.

## The one-line failure

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
```

`maximum-scale=1` and `user-scalable=no` disable pinch-to-zoom. On a phone that
removes the only magnification tool most people know how to use. It is a single
line, it is present in a great many shipped themes and page builder templates,
and removing it is usually a two-minute fix with no visual consequence at all.

Both iOS Safari and Android Chrome now ignore `user-scalable=no` in most
contexts, which leads to the argument that the attribute is harmless. It is
still a failure. The declaration is a statement of intent that some browsers
and many in-app webviews continue to honour, and the criterion is about what
the author published rather than which browsers currently route around it.

## The second failure, which is the harder one

Fixed heights on containers that hold text. At 200 percent the text is clipped
or overlaps rather than reflowing. Search the stylesheet for `height:` on any
element that contains copy and ask whether `min-height` would do instead.
Announcement bars, promo strips, card titles and button labels are the usual
offenders.

## How to test

- Automated: axe `meta-viewport` catches the meta tag. It cannot see clipping.
- Manual: set browser zoom to 200 percent and read the whole page. Look for
  clipped text, overlapping text, and controls that have moved off screen.
- Manual on a real device: try to pinch-zoom. Simulators are not reliable here.

## Notes

This criterion is about text scaling. Page reflow at narrow widths is
[1.4.10](../1.4.10-reflow/). The two are commonly conflated in audit reports,
and a site can pass one while failing the other.
