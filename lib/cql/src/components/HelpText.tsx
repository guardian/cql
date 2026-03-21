import React from "react";

export const HelpText = () => (
  <div>
    <p>
      Press <code>+</code> to select a specific field to search.
    </p>
    <p>
      Join search terms with <code className="CqlToken__AND">OR</code> and{" "}
      <code className="CqlToken__AND">AND</code>. Consecutive search terms, e.g.{" "}
      <code className="CqlToken__STRING">this that</code>, are implicitly joined with{" "}
      <code className="CqlToken__OR">OR</code>.
    </p>
    <p>
      Group expressions with parenthesis, e.g.{" "}
      <code className="CqlToken__STRING">
        one <code className="CqlToken__LEFT_BRACKET">(</code>two{" "}
        <code className="CqlToken__AND">AND</code> three
        <code className="CqlToken__RIGHT_BRACKET">)</code>
      </code>
    </p>
  </div>
);
