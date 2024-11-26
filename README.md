# CQL

An experiment to see if a query DSL, coupled with first-class typeahead and syntax highlighting, might provide a more consistent and discoverable way to search Guardian content.

![intro](https://github.com/guardian/cql/assets/7767575/22d3dba7-ace6-4c3a-8dcf-9755728fa98b)

Play in the sandbox at https://cql-sandbox.gutools.co.uk/.

## Why?

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

See index.html in the prosemirror client for todos.

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
query                       -> query_binary?
query_binary                -> query_content (('AND' | 'OR')? query_content)*
query_content               -> query_group | query_str | query_quoted_str
query_group                 -> '(' query_binary* ')'
query_quoted_str            -> '"' string '"'
query_str                   -> /\w/
query_field                 -> '+' query_field_key ':'? query_field_value? // Permit incomplete meta queries for typeahead
query_field_key             -> 'tag' | 'section' | ...etc
query_field_value           -> /\w/
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

Typeahead will require parsing AST nodes, not just tokens, as typeahead for query_field_value will require knowing query_field_key, which we only know in a query_field node. We currently have no way of mapping from a position to a node. We'll need to keep positions when we consume tokens, every node should probably have a start and end.

Typeahead happens on server. Rationale: typeahead must hit CAPI anyhow, so it's dependent on some server somewhere, and making it an LS feature keeps the client simpler.

What do we serve for typeahead?
1. Provide values for every incomplete query_field node for every query. Client then keeps those values for display when selection is in right place.
2. Provide typehead as combination of position and query to server. Store less data upfront, but must query every time position changes.

Option 1. preferable to avoid high request volumes, keep typeahead in sync with query, and keep latency low (chance that typeahead result will be cached, when for example clicking into existing incomplete query_field)

Checking out Grid repo – QuerySyntax has a grammar for search queries. Actual string search limited to tokens or quoted strings. Chips can refer to nested fields. Good polish on dates, e.g. today, yesterday, multiple formats. Love the ambition in the tests, e.g.

```
// TODO: date:"last week"
// TODO: date:last.week
// TODO: date:last.three.hours
// TODO: date:two.days.ago (?)
// TODO: date:2.days.ago (?)
// TODO: date:2.january (this year)
```

NB: query_field will only be parseable at the top level. We could use `-` rather than `+` for negation. (`NOT` is used in the binary syntax for negation. Not added yet.)

Re: Typeahead – this requires a parse phase, no? B/c we must associate key value pairs for value lookups.

Currently the client knows a lot about tokens in order to facilitate
 - syntax highlighting
 - typeahead
We can have it know less:
 - explicit ranges for syntax highlighting
 - explicit ranges for typeahead
Why would we like it to know less? B/c less coupling with language means
 - we can iterate on server and update n) clients across estate simultaneously
 - we can potentially use component with other language servers, languages

Future refactor. Connect a typeahead client first.

Date typeahead: autofocus when the value is not yet present. Display but do not autofocus when value is present (even if incorrect.)

The input/overlay combination has a few edge cases are hard to address:
 - [ ] Chrome does not issue a scroll event when the selection is programmatically changed https://issues.chromium.org/issues/41081857

Using contenteditable will also make it possible to render chips inline, without needing to use e.g. a Threads component, and preserve the syntax highlighting.

How do we handle chips as plain text? Is it possible? Two problems:
- We must render things which aren't content but are interactive, e.g. 'remove' icons. Suspect easily solved w/ non-contenteditable additions to appropriate tokens renderings.
- We must render things which _are_ content (from the POV of language) but are perhaps best non-interactive, e.g. colon char between meta key and val.

Try a plaintext rendering, see how it goes. The closer we can be to plaintext, the simpler the implementation and the fewer edge cases.

## Or, use a library

Don't do that:
- bundle size

But, maybe _do:_
- less code to maintain
- robustly solve edge cases w/ contenteditable, which is [gnarly](https://www.youtube.com/watch?v=EEF2DlOUkag)

What to use?

### CodeMirror
- Designed for languages, syntax highlighting, etc.
- Kinda large for a bare install: dist/assets/index-BJKhd53Z.js 358.90 kB │ gzip: 116.51 kB

### ProseMirror
- Team already know it
- Kinda a bit smaller – dist/assets/index-BKb-Hbln.js 176.79 kB │ gzip: 54.46 kB

Hmm.

## Avoiding coupling between server and client

We'd like to have a thin interface between server and client. What do we need to know?

- All the chips, and where
- All the necessary styling for syntax highlighting

That's a lot of things. Unavoidable things to know:

- Chips are pairs of (key, value?)
- Where tokens of different sorts start and end

Perhaps tokens are all we need: the parser can just understand those sorts of tokens that relate to chip keys and values by name.

## Async vs. sync – why not both? 🤷

Async vs. sync language server trades off a few things:

### Async

- ✅ Update once, available everywhere
- ❌ Latency can be a problem for UX – worse in US/AU. How to limit this feeling?
- ❌ Maintenance cost, ownership cost – some team must own and maintain this service, with gladness in their heart

### Sync

- ✅ Instant UI for everything but resolver lookups
- ✅ Smaller surface area for sync bugs
- ❌ Must bundle into code, increasing weight of client (likely negligible) and possibly necessitating publishing (more dev friction)

Can we have both?
- Async better for widely used product (e.g. CAPI), where cost of updates across estate increases – async mitigates that cost vs. ownership/maintenance story
- Sync better for smaller products, where search is e.g. only used in that product, and benefit of central server negligible

Perhaps an API that accepts a language service that is optionally asynchronous?

This will necessitate a rethink in how we handle suggestions, as at the moment they're included in the LS response. Suggestions are necessarily async (value lookups may go across the wire).
- Factor them out into a separate, async call. This would mean a rethink of the suggestions API.
- Make suggestions event-driven, to ensure we make a single call.

### Pluses and minuses of pluses and minuses

Do we need a `+` for discovery? Or can we get away without?

+ Always display all indexed fields after a '+' — how do you discover what's available w/o this mechanism
+ Being able to start with an exclusion ('-')
+ Reverse polarity
- Extra char
- Users must discover what '+' does (and may never discover what '-' is)