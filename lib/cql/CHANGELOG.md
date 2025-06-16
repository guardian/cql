# @guardian/cql

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
