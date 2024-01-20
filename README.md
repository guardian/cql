# CQL

An experiment to see if a query DSL, coupled with first-class typeahead and syntax highlighting, might provide a more consistent and discoverable way to search Guardian content.

At the moment at the Guardian, there are a few ways to query CAPI:
  - directly, via the API and a query string
  - via many different GUIs across many different tools, each with variable support for the search functionality CAPI has to offer.

Problems:
- API/query string provides all the affordances of CAPI search, but features are not discoverable
- API/query string requires user to understand query strings
- GUIs are inconsistent across estate
- GUIs do not provide all the affordances of CAPI search
- There is no way to move queries between API/GUI or GUI/GUI

| Feature                           | API/Query string  | GUI | Query language + input |
|-----------------------------------|-------------------|-----|------------------------|
| Comprehensible for non-developers | ❌                 | ✅   | ⚖️                     |
| Consistent across estate          | ✅                 | ❌   | ✅                      |
| Expose all search features        | ✅                 | ❌   | ✅                      |
| Can move queries across tools     | ✅                 | ❌   | ✅                      |

One solution might be:
  - a text-based query DSL, addressing problem of affordances and consistency
  - a good syntax-highlighter/typeahead input, wrapped as something that is useable anywhere (e.g. lightweight web component), to address discoverability

This repo is a PoC.

Concerns:
  - ease of use. Is text OK for most users? Are complicated searches difficult to understand? Might be addressable w/ an additional, optional GUI component that helps users compose queries
  - where is the language server located? Do we embed it in the input, or make it a feature of CAPI?
    - Typeahead feature might include section/tag lookup, interactions w/ API etc. – keeping this server side could reduce pace at which client would change, which if this component spreads across estate as a library would be helpful.

Example grammar [here.](https://github.com/jonathonherbert/cql/blob/main/src/main/scala/grammar/grammar.txt)

Todo:

- [x] Scanning
- [x] Parsing
- [x] Query string builder
- [x] Add group and binary syntax
- [ ] String ranges in scanned tokens
- [ ] Typeahead
- [ ] ScalaJS to provide parser in web env
- [ ] Web component - environment and first pass at component infra
- [ ] Web component - syntax highlighting
- [ ] Web component - typeahead
- [ ] Web component - async lookup

Notes

Logical OR and AND come high up the grammar – see the Lox grammar for an example.
