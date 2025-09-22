### Notes

Concerns:
  - ease of use. Is text OK for most users? Are complicated searches difficult to understand? Might be addressable w/ an additional, optional GUI component that helps users compose queries
  - where is the language server located? Do we embed it in the input, or make it a feature of CAPI?
    - Typeahead feature might include section/tag lookup, interactions w/ API etc. – keeping this server side could reduce pace at which client would change, which if this component spreads across estate as a library would be helpful.

See index.html in the prosemirror client for todos.

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
query_binary                -> query_expr (('AND' | 'OR')? query_binary)*
query_expr                  -> [(MINUS | PLUS)] (query_group | query_str query_field)
query_group                 -> '(' query_binary ')'
query_str                   -> query_quoted_str | query_plain_str
query_quoted_str            -> '"' string '"'
query_plain_str             -> /\w/
query_field                 -> query_field_key ':' query_field_value
query_field_key             -> query_str
query_field_value           -> query_str
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

## Pluses and minuses of pluses and minuses

Do we need a `+` for discovery? Or can we get away without?

+ Always display all indexed fields after a '+' — how do you discover what's available w/o this mechanism
+ Being able to start with an exclusion ('-')
+ Reverse polarity
- Extra char
- Users must discover what '+' does (and may never discover what '-' is)

## Relative dates

Where do we resolve relative dates?
1. As they're accepted, within the query. Relative dates are made absolute within the CQL query, e.g. `+from-date:1970-01-01`.
    - ✅ less work for interpreter
    - ✅ no problem versioning queries
    - ❌ not possible to share relative dates
    - ❌ queries less clear, e.g. is that date exactly 15 days ago?
2. As they're interpreted. Relative dates are kept within CQL, e.g. `+from-date:-5d`, and it's up to the interpreter to ... interpret them into absolute dates.
    - ❌ more work for interpreter
    - ❌ have to consider compatibility if the format changes
    - ✅ sharing queries preserves relative date
    - ✅ nice clear relative dates

## Representing positive and negative search terms

How do we represent positive and negative search terms in the lexical grammar?

1. ❌ As PLUS,STRING,COLON,STRING / MINUS,STRING,COLON,STRING — we'd like to understand the key/value tokens for correct typeahead behaviour at the token level, as this makes correct typeahead behaviour possible even if the syntax for the CFG is invalid
2. ⚖️ As CHIP_KEY_POSITIVE, CHIP_KEY_NEGATIVE — this permits typeahead at token level, but means we have two token types for chip keys, which everything downstream will need to reason about
3. ⚖️ Just take the first character of the lexeme, which is guaranteed to be `+|-` — trivial to implement, but it feels icky not to have a token representation; what if the symbols change? Every piece of code that makes this assumption will have to change too, without a clear interface to test whether we've caught every case

Probably 2.

## Escaping

Escaping outside of quotes should function as expected, e.g.

```
"\"" -> `str<">`
a\"b -> `str<a"b>`
a\+b -> `str<a+b>`
```

What must be escaped in an unquoted string? Reserved chars, so `[-+:"]`. If in quotes, only quotes themselves need to be escaped. Should we require escaping anyhow, or change the rules? It's quite convenient to be able to quote escaped chars such that you don't have to read them.

```
"a+b" -> `str<a+b>`
```

Same rules can then apply to chip key/value:

```
"a\"b":c -> `chipKey<a"b>, chipValue<c>`
"a+b":"d:e" -> `chipKey<a+b>, chipValue<c>`
```

Interpreter can normalise by quoting values with escapable chars.

# Negations

How do we handle negations? Desired behaviour:

- `+` or `-` creates chip, opens chip key suggestion menu: thus must generate `[+-]:` and move the caret between `[+-]` and `:`
- a chip key with no suggestions, `-notakey:`, turns back into a queryStr on 'enter': `-notakey`
