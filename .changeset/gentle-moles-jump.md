---
"@guardian/cql": patch
---

Fix `queryChange`'s serialised `queryStr` dropping quotes from a plain phrase containing a reserved character (`:`, `(`, `)`, or `"`) with no whitespace, e.g. `"hello:world"`. Previously only whitespace triggered re-quoting for plain phrases, while chip keys/values already correctly checked reserved characters too — the two now use the same predicate (`shouldQuoteFieldValue`). Without this fix, a quoted phrase containing a colon is silently corrupted into an unquoted string, which then gets mis-parsed as a `key:value` chip the next time it's read.
