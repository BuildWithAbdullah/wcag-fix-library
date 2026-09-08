# 2.5.8 Target Size (Minimum) (Level AA, WCAG 2.2)

The size of the target for pointer inputs is at least 24 by 24 CSS pixels,
except where one of five exceptions applies.

## 24, not 44

This is the most commonly misquoted number in accessibility reporting. Audit
tools and vendor reports frequently cite "44 by 44 per WCAG 2.5.8". That is
wrong, and it matters, because it inflates the finding count and sends clients
to redesign components that already conform.

| Requirement | Size | Where it comes from |
|---|---|---|
| WCAG 2.5.8 Target Size (Minimum) | 24 by 24 CSS px | Level AA, WCAG 2.2 |
| WCAG 2.5.5 Target Size (Enhanced) | 44 by 44 CSS px | Level AAA |
| Apple Human Interface Guidelines | 44 by 44 pt | Vendor guidance, not WCAG |
| Material Design | 48 by 48 dp | Vendor guidance, not WCAG |

44 is a good target. It is not the AA requirement. If a house standard is 44,
say "house standard, 44; WCAG 2.5.8 AA requires 24" rather than attributing the
number to the specification.

## The five exceptions

A target under 24 by 24 still conforms if any of these hold. Reports that
ignore them produce large numbers of false findings.

1. **Spacing.** A 24px diameter circle centred on the target does not intersect
   any other target's circle. A small control with generous space around it
   passes.
2. **Equivalent.** Another control on the same page does the same thing and is
   large enough.
3. **Inline.** The target is a link inside a sentence or block of text. Body
   copy links are exempt, which is why a page of prose does not generate
   hundreds of findings.
4. **User agent control.** The size comes from the browser and has not been
   modified by the author.
5. **Essential.** A particular presentation is legally required or essential to
   the information, for example a point on a map.

The inline and spacing exceptions do most of the work. Before reporting a
target size failure, check both. A skip link that is visually hidden until
focus is another case worth pausing on rather than flagging automatically.

## How to fix

Grow the target, not the icon. `min-width` and `min-height` of 24px with the
glyph centred inside leaves the design untouched and makes the hit area
conform. A `::before` pseudo-element with negative insets works where padding
would disturb the layout:

```css
.icon-btn { position: relative; }
.icon-btn::before {
  content: "";
  position: absolute;
  inset: -4px;          /* expands a 16px control to 24px */
}
```

## How to test

- Automated: axe `target-size` (axe-core 4.9 and later) checks size and applies
  the spacing exception. It does not apply every exception, so review its
  output rather than accepting it.
- Manual: measure the rendered box in DevTools, including padding, not the
  icon inside it.
