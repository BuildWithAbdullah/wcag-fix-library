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
