---
"@guardian/cql": patch
---

More changes after testing in Grid:

- Refactor placeholder to avoid decorations, to fix bug in Firefox where ephemerally selecting placeholder text was possible
- Handle overflowing input more gracefully within chip keys and values
- Remove chip if backspace or delete is pressed within a chip value
- Diff state on input to preserve user selection when nput `value` changes in some cases
