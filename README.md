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

Todo:

- [x] Scanning
- [x] Parsing
- [x] Query string builder
- [x] Add group and binary syntax
- [x] String ranges in scanned tokens
- [x] Parse hints for typeahead
- [x] ~~ScalaJS to provide parser in web env~~ ScalaJS adds 180kb to your bundle as the price of entry? Yeah we're not doing that
- [x] Add a language server for funsies
- [x] Web component - environment and first pass at component infra
- [x] Web component - syntax highlighting
  - [] Ensure untokenised string components still display, we're getting 500s and invisible characters on trailing + chars
- [x] Web component - typeahead
- [ ] Web component - async lookup

### Notes

Logs for examples of queries: https://logs.gutools.co.uk/s/content-platforms/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(columns:!(request),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b0be43a0-59d7-11e8-a75a-b7af20e8f748,key:Name,negate:!f,params:(query:Kong-PROD),type:phrase),query:(match_phrase:(Name:Kong-PROD)))),index:b0be43a0-59d7-11e8-a75a-b7af20e8f748,interval:auto,query:(language:kuery,query:%2Fsearch),sort:!(!('@timestamp',desc)))

We should sample e.g. 200 queries and translate them into CQL.

Toy examples:

```
sausages
"hot dog" OR "hottest dog"
"hot dog" +tag:dogs -tags:food
(hot AND (dog OR wheels)) +section:film
"hot dog" +from:2024-01-12 +to:2024-02-12
```

Grammar:

```
query_list         -> query* EOF
query              -> query_binary | query_meta
query_binary       -> query_content ('AND' | 'OR' query_content)?
query_content      -> query_group | query_str | query_quoted_str | query_binary
query_group        -> '(' query_content* ')'
query_quoted_str   -> '"' string '"'
query_str          -> /\w/
query_meta         -> '+' query_meta_key? ':'? query_meta_value? // Permit incomplete meta queries for typeahead
query_meta_key     -> 'tag' | 'section' | ...etc
query_meta_value   -> /\w/
```

How do we disambiguate search params from strings in the tokeniser?
Or is `+tag:`, `+section:` the lexeme, not `+` `tag` `:`?

Scanning tokens – should `+` (or `:`) be its own token, or part of search param token? No – there's no context where they're used in another combination, we can think of them as assymetrical quote marks for a particular token type.

Should search_key or search_value be recognised as tokens, or just the literals `:`, `+` and strings – you can then build the grammar from `+` string `:` string? No – +tag:hai and +tag: hai would parse as the same thing, which would be incorrect. Search key/value pairs and their separators are contiguous.

Logical OR and AND come high up the grammar – see the Lox grammar for an example.

Is typeahead a language feature? We could implement cheaply by matching `+\w` or `:\w` on client. But hey, be nice to do this in the language. One way: add `+` and `:` tokens, and consider them part of the grammar (parser), but consider their presence invalid (interpreter). If the cursor is at a `+` or `:` token, or a key or value token, open the relevant typeahead. Value typeahead will need to backtrack to figure out correct key.

Does this have to be baked into the client? Much nicer to centralise language server features, as the component will proliferate everywhere and updating the estate will be a colossal pain. But: must contend with latency and availability problems 🤔

Components options:
 - Svelte will export web components with `customComponent` properties in compiler and component config. However, from-scratch context menus will be a drag.
 - Preact will work with headlessUI, if we can adapt it for a typeahead menu. It also provides a webcomponent layer.

Typeahead will require parsing AST nodes, not just tokens, as typeahead for query_meta_value will require knowing query_meta_key, which we only know in a query_meta node. We currently have no way of mapping from a position to a node. We'll need to keep positions when we consume tokens, every node should probably have a start and end.

Checking out Grid repo – QuerySyntax has a grammar for search queries. Actual string search limited to tokens or quoted strings. Chips can refer to nested fields. Good polish on dates, e.g. today, yesterday, multiple formats. Love the ambition in the tests, e.g.

```
// TODO: date:"last week"
// TODO: date:last.week
// TODO: date:last.three.hours
// TODO: date:two.days.ago (?)
// TODO: date:2.days.ago (?)
// TODO: date:2.january (this year)
```

NB: query_meta will only be parseable at the top level. We could use `-` rather than `+` for negation. (`NOT` is used in the binary syntax for negation. Not added yet.)
