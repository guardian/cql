---
"@guardian/cql": minor
---

Add negations to grammar, permitting users to add negations inline by removing the wrapping chip when they are in chip key position and no typeahead suggestion is present on Enter: e.g. `-nosuggestion{Enter}` will produce the query `-nosuggestion`, not `nosuggestion:`
