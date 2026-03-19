import { h } from "preact";

export const HelpText = () => (
  <div>
    <p>
      Press <code>+</code> to select a specific field to search.
    </p>
    <p>
      Join search terms with <code class="CqlToken__AND">OR</code> and{" "}
      <code class="CqlToken__AND">AND</code>. Consecutive search terms, e.g.{" "}
      <code class="CqlToken__STRING">this that</code>, are implicitly joined with{" "}
      <code class="CqlToken__OR">OR</code>.
    </p>
    <p>
      Group expressions with parenthesis, e.g.{" "}
      <code class="CqlToken__STRING">
        one <code class="CqlToken__LEFT_BRACKET">(</code>two{" "}
        <code class="CqlToken__AND">AND</code> three
        <code class="CqlToken__RIGHT_BRACKET">)</code>
      </code>
    </p>
  </div>
);
