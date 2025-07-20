# @guardian/cql

## 1.3.5

### Patch Changes

- 0be2010: Serialise chip values as plain text when they're all that's selected, to avoid surrounding their content into quotes
- 8d00ca5: Handle strings pasted into chip values as text, to permit them to include reserved characters

## 1.3.4

### Patch Changes

- 4156c05: Only focus the whole document when double-clicking on the outer editor
- 60b7f00: Pasting is better behaved when plain text queries are pasted

## 1.3.3

### Patch Changes

- 5325e02: Account for whitespace at the start of the document when it begins with a chip
- fc1f615: Proper minus for chip polarity minus

## 1.3.2

### Patch Changes

- d0a4e3e: Do not attempt to parse HTML on paste if the HTML is not a cql doc

## 1.3.1

### Patch Changes

- d9ebea2: Double clicking on the input selects everything; blurring the input removes the selection correctly, deselected selected chips

## 1.3.0

### Minor Changes

- fe653b6: Parse shortcuts from query strings, and add chips when shortcuts are pressed in the UI

## 1.2.0

### Minor Changes

- 84b424f: Adjust keymapping to account for cross-platform behaviour

## 1.1.0

### Minor Changes

- 0322be7: Permit all unreserved characters in chip keys

## 1.0.0

### Major Changes

- 20227b8: Make field prefix generally optional, normalising output to remove it by default.

  This ensures instantiating chips with `+` is still possible, while keeping the syntax of the output cleaner.

  This is a breaking change, as it changes the output of query string.

### Patch Changes

- b533b58: Correct mappings to ensure that suggestions are correctly applied when chip values are quoted
- eb1651f: Preserve selection on paste

## 0.1.10

### Patch Changes

- f8db4a8: Remove speculative tab handler, as it's trapping focus

## 0.1.9

### Patch Changes

- 20f9525: Skip to end of line on init to match focus behaviour elsewhere
  Call ProseMirror's focus method to fix an issue with focus not applying in consuming apps
  Add autofocus support

## 0.1.8

### Patch Changes

- 7448926: Shocking U-turn: propagate all events, delegate to the consumer :D

## 0.1.7

### Patch Changes

- 2015347: Cmd-Shift-Z for redo

## 0.1.6

### Patch Changes

- 5934944: Hide horizontal scrollbar to match browser input scroll behaviour
- cdbd00b: Additional styling options for ease of integration w/ Grid
- cdbd00b: When updating the query from the input value, move the selection within the chip value if it is on the edge of the doc diff, and there's a chip behind where it would be

## 0.1.5

### Patch Changes

- d7772df: Alter selection index on hover
- f7be8aa: Make the typeahead suggestion label optional
  Makes typehead searches case insensitive, where the search is through a static list of values

## 0.1.4

### Patch Changes

- e1ffb73: More changes after testing in Grid:

  - Refactor placeholder to avoid decorations, to fix bug in Firefox where ephemerally selecting placeholder text was possible
  - Handle overflowing input more gracefully within chip keys and values
  - Remove chip if backspace or delete is pressed within a chip value
  - Diff state on input to preserve user selection when nput `value` changes in some cases

## 0.1.3

### Patch Changes

- 5a7c926: Do not block updates on the state of the current query AST

## 0.1.2

### Patch Changes

- 614055d: Changes in response to @paperboyo's feedback:
  - Add separator on initial render of chip key if readonly
  - Hitting backspace or delete within a chip removes the chip
  - Ensure caret behaves itself when navigating out of empty chips
  - Ensure chip values are readonly until a chip key is set, and remove the colon separator until a chip key is set
  - Do not permit selections within readonly chipkeys
  - popover=manual for typeahead, to ensure that the popover is not dismissed when
    the user clicks into a suggestion position
  - Fix scrollbar in popover
  - Cmd-A within a value selects the value first, then the entire query
  - Show the popover if it has been dismissed and we receive ArrowUp|ArrowDown
  - Ctrl-Arrow(Left|Right) moves to start/end of line
  - Do not leak events to the wider DOM
  - Add placeholder

## 0.1.1

### Patch Changes

- 886f2f9: Many small changes to prepare for use in Grid

## 0.1.3

### Patch Changes

- 93e9521: Initial release

## 0.1.2

### Patch Changes

- 7f1cfe3: Initial release

## 0.1.1

### Patch Changes

- 50dfa89: Initial release
