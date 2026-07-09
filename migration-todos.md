# ProseMirror → Wordgard Migration

Handoff notes for continuing the migration of the CQL editor (`lib/cql`) from
**ProseMirror** to **Wordgard** (`wordgard@0.1.1`). The goal is full behavioural
parity while keeping the project structure broadly similar.

Reference docs:
- Migration guide: https://wordgard.net/docs/prosemirror/
- Reference manual: https://wordgard.net/docs/ref/

---

## Current status (snapshot)

- All **source files** migrated and compile-clean (schema, utils, diff, commands,
  editor, placeholder, nodeView, popovers, plugins/cql, CqlInput, page, types).
- New test harness `lib/cql/src/cqlInput/editor/wordgardTestChain.ts` created
  (replacement for `jest-prosemirror`'s `ProsemirrorTestChain`) — compile-clean.
- `lib/cql/src/cqlInput/editor/plugins/cql.spec.ts` (1206 lines) fully migrated
  off ProseMirror — compile-clean.
- **Validated green**: `utils.spec.ts` 34/34, `editor.spec.ts` 7/7.
- **`cql.spec.ts`: 39 pass / 38 fail / 4 todo** (81 total). Was 0 (construction
  crash) → 29 (crash fixed) → 39 (selection-placement fixed).

Run tests from `lib/cql`:
```
cd lib/cql
bun test src/cqlInput/editor/plugins/cql.spec.ts
```
(happy-dom is preloaded via `bunfig.toml`.)

---

## Key Wordgard API facts (verified)

- Package exports: `wordgard/doc`, `/types`, `/schema`, `/table`, `/state`,
  `/editor`, `/command`, `/history`, `/collab`, `/phrases`. It is CodeMirror-6-like.
- **Construction**: `Wordgard.create({ parent, doc, config: [...] })`.
- **Input model**: keymap runs only on `keydown` → dispatch synthetic
  `KeyboardEvent("keydown", …)` on `view.contentDOM` (NOT `view.dom`). The `char`
  binding matches a single-codepoint `event.key` with no ctrl/alt/meta.
  `allowDefault:true` bindings (`+`/`-`/`:`) that succeed → `preventDefault`
  (char NOT inserted); that return false → char is inserted.
- **beforeinput** `inputType:"insertText"` does NOT run char bindings (mobile
  path) — see mobile TODO below.
- **Commands**: use `Command.bind(insertText, {from,to,insert,userEvent})` then
  `Command.dispatch(view, bound)`. `insertText`, `Command`, `selectAll` are
  public exports of `wordgard/command`.
- **`GardSelection`** (`wordgard/state`): `anchor`, `head`, `from`, `to`, `empty`,
  `.map`, `.ranges`. Statics `cursor(pos)`, `range(anchor,head?)`, `node`,
  `near(cx,pos,bias?)`, `atStart(cx)`, `atEnd(cx)`. **No `$from`, no `.eq()`.**
  `state` is a valid Context.
- **Doc/Plot** (`wordgard/doc`): `doc.length` (not `content.size`);
  `doc.iterate(f)` / `doc.iterate(from,to,f)` (not `descendants`);
  `Node.Type` has `.name`; `Plot`/`Leaf` union (`Leaf` has no `iterate`).
- **Events on `contentDOM`**: blur, keydown, beforeinput, paste all dispatch on
  `view.contentDOM`.

Verified-API memory: `/memories/repo/wordgard-api.md`.

---

## Gotchas already solved

### 1. Construction crash in happy-dom (RESOLVED)
`new Wordgard` builds `DOMObserver` before `docTile` is assigned; its
`readSelectionRange` calls `wg.docTile.nearest(...)` when `document.getSelection()`
returns a non-null anchorNode (which happy-dom always does) → crash.
**Fix**: call `document.getSelection()?.removeAllRanges()` immediately before
`Wordgard.create`. Applied in `createCqlEditor` and the test harness setup.

### 2. Selection placement / caret must land INSIDE `queryStr` (RESOLVED)
`GardSelection.near(state, doc.length)` (and `atEnd`/`atStart`, and the CQL
`endOfLine`/`startOfLine` commands) resolve to the **document boundary**
(parent = `Doc`), NOT inside the `queryStr` textblock. That broke
`getNodeTypeAtSelection` (returned `Doc`), typing (`"a AND"` + `" b"` → `"a ANDb "`),
and `+` chip creation.

Interior positions work perfectly:
- empty doc `length === 2`; caret at pos **1** is inside `queryStr`; `+` there
  creates a chip.
- `"a AND"` `length === 7`; caret at pos **6** is inside; `" b"` → `"a AND b"`.

**Fix** in `WordgardTestChain.selectText`:
- `"start"` → `GardSelection.near(state, Math.min(1, doc.length))`
- `"end"`   → `GardSelection.near(state, Math.max(0, doc.length - 1))`
- numeric  → `GardSelection.near(state, target)` (positions from
  `getPosFromQueryPos` are already interior and work)

---

## Remaining failures in `cql.spec.ts` (38) — grouped

### B. Typeahead popover tests (`chip keys`, `chip values > text suggestions`) — ~15
- Symptoms: popover not appearing, `":"`/option text not found, wrong caret
  node type after selection.
- These depend on: (1) a chip being created (works now at interior positions),
  (2) the typeahead plugin emitting suggestions and toggling the popover element
  visibility, (3) `selectPopoverOptionWithEnter/Click` applying the suggestion.
- Investigate one at a time, e.g.
  `applies the given key when a popover option is selected at the start of the query`
  (`insertText("+")` then select "Tag" → expect `waitFor("tag:")`).
- Verify the plugin's typeahead update runs on Wordgard transactions and that
  the popover DOM `data-isvisible` toggles. Check `plugins/cql.ts` typeahead
  wiring vs the PM `view.update`/`state` lifecycle.

### C. Chip behaviour — ~9
Tests like: `:` at end of chip key moves into value position; polarity click
changes polarity; Enter at end of chip key de-chips (preserving polarity);
shortcut moves selection into value; read-only chip keys; escape chip keys.
- These exercise `plugins/cql.ts` char binding for `:`, click handlers on the
  polarity handle, Enter handling, and the read-only mark logic. Work through
  after the popover group, since some overlap.

### D. Caret movement / blur — 2
- `permits additional query fields before query fields`
- `should clear the selection when the user blurs the input` — blur is dispatched
  on `view.contentDOM`; verify the plugin's blur handler clears selection state.

### E. Deletion — 2
- `removes the chip via click` (delete handle click), and
  `removes a chip via Cmd+Backspace`. The Cmd+Backspace test uses
  `fireEvent.keyDown(editor.view.contentDOM, { key:"Backspace", metaKey:true })`.
  Verify the delete keybinding/command fires and removes the chip node.

### F. Paste behaviour — ~6
- Paste is dispatched as a `ClipboardEvent("paste", …)` on `view.contentDOM`
  with a `DataTransfer` (defensively re-defined via `Object.defineProperty` if
  not wired). Tests assert both the resulting query and the preserved selection.
- Verify Wordgard's paste path invokes the plugin's paste handling and that
  selection mapping matches PM. Selections in these tests use
  `GardSelection.near(state, n)`.

### G. Mobile text-input tests — 2 (DEFERRED)
- `chip values > via text input (mobile) > creates a chip when '+'/'-' is received as text input`.
- `typeViaHandleTextInput` dispatches `InputEvent("beforeinput",{inputType:"insertText",data})`
  on `contentDOM`. Wordgard's beforeinput path does NOT run char bindings, so a
  lone `"+"`/`"-"` won't auto-convert to a chip.
- **Likely fix**: add a `Transaction.appender` rule in `plugins/cql.ts` that
  detects a single `"+"`/`"-"` text insert (userEvent `"input.type"`) at a
  chip-eligible position and converts it to a chip. Desktop `"+"` is
  `preventDefault`ed before insertion, so it won't double-fire.

---

## Suggested order of attack

2. **Typeahead popover (B)** — largest group; fixing the popover lifecycle likely
   cascades to several chip-key and text-suggestion tests.
3. **Chip behaviour (C)** — `:`, Enter de-chip, polarity, read-only, escape.
4. **Deletion (E)** and **caret/blur (D)**.
5. **Paste (F)**.
6. **Mobile (G)** — add the `Transaction.appender` rule.

Re-run after each group:
```
cd lib/cql && bun test src/cqlInput/editor/plugins/cql.spec.ts
```

---

## Cleanup checklist (before declaring done)

- [ ] Delete the temporary probe: `lib/cql/src/cqlInput/editor/plugins/probe.spec.ts`.
- [ ] Remove ProseMirror deps from `lib/cql/package.json`: `prosemirror-*`,
      `jest-prosemirror`, `prosemirror-test-builder`, `prosemirror-dev-tools`.
- [ ] `grep -r 'from "prosemirror-' lib/cql/src` must be empty. NOTE: identifier
      names (`ProseMirrorToken`, `createProseMirrorTokenToDocumentMap`,
      `queryToProseMirrorDoc`, `toProseMirrorTokens`) and `// ProseMirror` comments
      legitimately REMAIN — only the package imports must go.
- [ ] Verify from `lib/cql`: `bun test`, `bun run lint`, `bun run knip`,
      `bun run build:lib`, `bun run build:page`.

---

## Reference / recovery

- Original PM code (HEAD is tag `@guardian/cql@1.8.5`, commit `4c77111`):
  `git --no-pager show HEAD:lib/cql/src/cqlInput/editor/{commands,utils,plugins/cql,nodeView,schema}.ts`
- Verified Wordgard API notes: `/memories/repo/wordgard-api.md`
- Migration plan / working notes: `/memories/session/plan.md`
- Wordgard install: repo-root `node_modules/wordgard/` (declarations in
  `dist/*.d.ts`, compiled source in `dist/editor.js`).
