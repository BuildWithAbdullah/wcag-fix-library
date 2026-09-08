# 4.1.2 Name, Role, Value (Level A)

For all user interface components, the name and role can be programmatically
determined; states, properties and values can be programmatically set; and
notification of changes is available to user agents including assistive
technologies.

This is the criterion that custom widgets fail. It is also the one that
generates the highest finding counts on component-driven themes, because a
single broken component template repeats on every page it appears on.

## Name, role, value, in plain terms

- **Name.** What is it called? "Add to basket".
- **Role.** What kind of thing is it? Button, link, checkbox, dialog.
- **Value and state.** What is its current condition? Expanded, checked,
  selected, 3 of 5.

A native `<button>Add to basket</button>` supplies all three for free. Every
part you have to supply yourself is a part you can get wrong.

## The five failures

**Role without name or state.** `role="button"` on a div containing only an
icon. Announced as "button" and nothing else. If it toggles a panel, it also
needs `aria-expanded`, which is the value half of the criterion and the half
that is most often skipped.

**A broken `aria-labelledby` reference.** Pointing at an id that does not exist
on the page. The name resolves to empty, silently. This happens constantly when
components are duplicated and ids are not, and it is worth grepping every
`aria-labelledby` and `aria-describedby` value against the ids that actually
exist.

**Focusable content inside `aria-hidden="true"`.** The element is removed from
the accessibility tree but stays in the tab order. A screen reader user tabs
onto something that, as far as their software is concerned, is not there. axe
reports this as `aria-hidden-focus`. Use `inert`, which removes it from both.

**Nested interactive controls.** A button inside a link, a link inside a
button, a checkbox inside a link. The browser produces one target with two
conflicting roles. Screen readers disagree about what to announce and keyboard
activation is unpredictable. Product cards that wrap the whole card in an
anchor and then put a quick-add button inside are the standard source. Make the
controls siblings and style the card as a unit.

**A custom control that never reports state.** `role="switch"` with no
`aria-checked` is announced as a switch whose state is unknown, which is worse
than no role at all.

## The rule that resolves most of these

Use the native element. `button`, `a[href]`, `input`, `select`, `details`.
Native elements come with name, role, state, keyboard behaviour, forced colours
support and voice control naming already implemented, in every browser, for
free. Rebuilding any of them with ARIA means reimplementing all of it by hand
and maintaining it.

The first rule of ARIA is not to use ARIA when a native element will do. Bad
ARIA is worse than no ARIA, because it actively lies to the user about what
they are interacting with.

## How to test

- Automated: axe `button-name`, `aria-valid-attr-value`, `aria-hidden-focus`,
  `nested-interactive`, `aria-required-attr`.
- Manual: for every custom control, operate it with a screen reader and confirm
  it announces a name, a role, and a state that changes when the control
  changes. Inspect the accessibility tree in DevTools for the same three
  values.
