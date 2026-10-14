# 3.3.2 Labels or Instructions (Level A)

Labels or instructions are provided when content requires user input.

Forms are where accessibility failures turn into lost revenue, because a form
is the point at which the user is trying to give you something.

## The placeholder problem

```html
<input type="email" placeholder="Email address">
```

This is the most common form failure on the web, and it fails several ways at
once:

- The label vanishes the moment the user types. Anyone interrupted mid-form
  has no way to recall what the field was for. This affects people with
  cognitive and memory disabilities most, and everybody else some of the time.
- Default placeholder colour fails [1.4.3](../1.4.3-contrast-minimum/) in
  every major browser.
- Support for exposing placeholder as an accessible name is inconsistent
  across screen readers, so some users get nothing.
- Autofill often leaves the field looking filled with no visible indication of
  what it was.

A placeholder may supplement a label. It must never replace one. If the visual
design has no room for a label, that is a design problem, and the usual answer
is a floating label that moves rather than disappears.

## The silent failure

```html
<label for="phone-number">Phone</label>
<input type="tel" id="phone">
```

`for` and `id` do not match. There is no visual symptom whatsoever, and
clicking the label no longer focuses the field, which is the quickest manual
check there is. This breaks routinely during template refactors when an `id`
is renamed.

axe reports it as `label`. Click every label on the page and watch whether the
field focuses.

## Instructions belong before the input

A format constraint discovered only after a failed submission is a failure.
Tie the hint to the field with `aria-describedby` so it is announced when focus
arrives, not after the fact.

```html
<label for="dob">Date of birth</label>
<span class="hint" id="dob-hint">For example, 31 03 1990</span>
<input type="text" id="dob" aria-describedby="dob-hint">
```

## Required fields

A red asterisk alone fails twice: it conveys information by colour alone, and
it has no programmatic equivalent. State what the marker means once, before the
fields; hide the decorative asterisk from assistive technology; and set the
`required` attribute so the state is exposed.

## Autocomplete

`autocomplete` tokens are required by 1.3.5 Identify Input Purpose at AA, and
they are worth adding for their own sake: they make the form faster to complete
for everyone and dramatically easier for anyone using voice input or a switch.

## How to test

- Automated: axe `label`, `select-name`, `form-field-multiple-labels`.
- Manual: click every visible label and confirm the field receives focus.
- Manual: `Tab` through the form with a screen reader running and confirm each
  field announces a name, a state, and any instruction that applies to it.

## Two more cases, and one of them reports as neither

**Two labels on one field.** A theme adds one, a plugin adds the other, and the
result is a control whose accessible name is one of the two with nothing in the
markup saying which. The page looks right. axe examines it and returns
`incomplete` for `form-field-multiple-labels`, because which label wins is a
browser and screen reader question rather than a DOM one, so a field whose name
is undecided reports as neither passing nor failing. The fix is one label, with
anything else the field needs to say in a hint tied to it with
`aria-describedby`, which is announced after the name instead of competing
with it.

**An ARIA text field with no name.** Rich text editors and search widgets
arrive as a `div` or a `span` with `role="textbox"`, which is enough to make a
screen reader announce an edit field and gives the user nothing to tell them
what it edits. axe reports this one properly, with `aria-input-field-name`.
Where the element has to stay a div, it needs everything a real field gets for
free: a name, and a visible label pointing at it. `aria-labelledby` works on an
element that is not a form control, where the `for` attribute does not.
