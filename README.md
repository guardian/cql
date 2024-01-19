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

One solution might be:
  - a text-based query DSL, addressing problem of affordances and consistency
  - a good syntax-highlighter/typeahead input, wrapped as something that is useable anywhere (e.g. lightweight web component), to address discoverability

Concerns:
  - ease of use. Is text OK for most users? Are complicated searches difficult to understand? Might be addressable w/ an additional, optional GUI component that helps users compose queries

An example, mostly incorrect grammar [here.](https://github.com/jonathonherbert/cql/blob/main/src/main/scala/grammar/grammar.txt)

Todo:

- [x] Scanning
- [ ] String ranges in scanned tokens
- [x] Parsing
- [x] Interpreting
- [ ] Add group syntax - in progress
- [ ] Typeahead
- [ ] ScalaJS to provide parser in web env
- [ ] Web component - environment and first pass at webcomponent
- [ ] Web component - syntax highlighting
- [ ] Web component - typeahead

Notes

Logical OR and AND come high up the grammar – see the Lox grammar for an example.
