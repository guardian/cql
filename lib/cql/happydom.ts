import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach } from "bun:test";

const bunFetch = fetch;
GlobalRegistrator.register();
window.fetch = bunFetch;

// happy-dom's CSS parser rejects some rules that wordgard injects for its theme
// (e.g. the StyleModule-generated `.ͼ1 { ... }` blocks that use CSS custom
// properties), throwing a SyntaxError from `insertRule`. That error would
// otherwise propagate out of `Wordgard.create` and prevent the editor from
// mounting. The injected theme styling is never asserted on in tests, so
// swallow those parse errors.
const originalInsertRule = window.CSSStyleSheet.prototype.insertRule;
window.CSSStyleSheet.prototype.insertRule = function (
  this: CSSStyleSheet,
  rule: string,
  index?: number,
): number {
  try {
    return originalInsertRule.call(this, rule, index);
  } catch {
    return index ?? 0;
  }
};

// Apply Jest globals as necessary
global.afterEach = afterEach;
