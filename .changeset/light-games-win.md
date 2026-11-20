---
"@guardian/cql": major
---

Nest theme properties to match UI, and add enough to enable light mode.

Previously, theme properties were sometimes nested, and sometimes flattened into the root theme. Now, they're nested as the UI is nested, so chipWrapper contains the overrides for chipHandle and chipContent.

It should be straightforward to port existing styling — just map your existing overrides to the new structure.
