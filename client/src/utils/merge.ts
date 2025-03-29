/* eslint-disable @typescript-eslint/no-explicit-any */
export function mergeDeep<A extends object, B extends object>(
  obj1: A,
  obj2: B
): A & B {
  const isObject = (obj: unknown) => obj && typeof obj === "object";

  return [obj1, obj2].reduce((prev, obj) => {
    Object.keys(obj).forEach((key) => {
      const pVal = (prev as any)[key];
      const oVal = (obj as any)[key];

      if (isObject(pVal) && isObject(oVal)) {
        (prev as any)[key] = mergeDeep(pVal, oVal);
      } else {
        (prev as any)[key] = oVal;
      }
    });

    return prev;
  }, {}) as A & B;
}
