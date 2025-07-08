---
"@guardian/cql": major
---

Make field prefix generally optional, normalising output to remove it by default.

This ensures instantiating chips with `+` is still possible, while keeping the syntax of the output cleaner.

This is a breaking change, as it changes the output of query string.
