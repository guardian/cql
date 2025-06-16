// ----- Types ----- //

enum ResultKind {
  Ok,
  Err,
}

type Ok<A> = {
  kind: ResultKind.Ok;
  value: A;
};

type Err<E> = {
  kind: ResultKind.Err;
  err: E;
};

/**
 * Represents either a value or an error; it's either an `Ok` or an `Err`.
 */
type Result<E, A> = Err<E> | Ok<A>;

// ----- Constructors ----- //

const ok = <A>(a: A): Ok<A> => ({ kind: ResultKind.Ok, value: a });
const err = <E>(e: E): Err<E> => ({ kind: ResultKind.Err, err: e });

// ----- Functions ----- //

/**
 * The method for turning a `Result<E, A>` into a plain value.
 * If this is an `Err`, apply the first function to the error value and
 * return the result. If this is an `Ok`, apply the second function to
 * the value and return the result.
 * @param f The function to apply if this is an `Err`
 * @param g The function to apply if this is an `Ok`
 * @param result The Result
 * @example
 * const flakyTaskResult: Result<string, number> = flakyTask(options);
 *
 * either(
 *     data => `We got the data! Here it is: ${data}`,
 *     error => `Uh oh, an error: ${error}`,
 * )(flakyTaskResult)
 */
const either =
  <E, A>(result: Result<E, A>) =>
  <C>(f: (e: E) => C, g: (a: A) => C) =>
    result.kind === ResultKind.Ok ? g(result.value) : f(result.err);

// ----- Exports ----- //

export { ResultKind, ok, err, either };

export type { Result };
