# @guardian/cql

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
