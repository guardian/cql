---
"@guardian/cql": major
---

BREAKING CHANGE: Models the logical precedence of operators unambiguously in the grammar, which makes it easier to parse with the correct precedence downstream.

In doing so, preserves the lexeme of the operator used in binaries, so we can round trip e.g. `1 2 OR 3` correctly — the first OR binary has a lexeme of `` (the OR is implicit), the second is explicit.

Consumers that parse the AST will need to adapt to the changes to the tree.