---
"@guardian/cql": patch
---

Don't create new chips for +/- if there's a non-whitespace character before them. Don't create a new chip for - if there's a non-whitespace character _after_ it, either.
