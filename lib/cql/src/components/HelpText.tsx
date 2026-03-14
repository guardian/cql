import { h } from "preact";

export const HelpText = () => (
  <div>
    <p>
      Press <tt>+</tt> to select a specific field to search.
    </p>
    <p>
      Join search terms with <tt class="CqlToken__AND">OR</tt> and{" "}
      <tt class="CqlToken__AND">AND</tt>. Consecutive search terms, e.g.{" "}
      <tt class="CqlToken__STRING">this that</tt>, are implicitly joined with{" "}
      <tt class="CqlToken__OR">OR</tt>.
    </p>
    <p>
      Group expressions with parenthesis, e.g.{" "}
      <tt class="CqlToken__STRING">
        one <tt class="CqlToken__LEFT_BRACKET">(</tt>two{" "}
        <tt class="CqlToken__AND">AND</tt> three
        <tt class="CqlToken__RIGHT_BRACKET">)</tt>
      </tt>
    </p>
  </div>
);
