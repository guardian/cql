import { getByText } from "@testing-library/dom";
import type { GetByText } from "@testing-library/dom";

export const tick = async () => new Promise<void>((res) => setTimeout(res));

/**
 * Shadow root code taken from
 * https://github.com/porsche-design-system/porsche-design-system/blob/main/packages/components-js/projects/jsdom-polyfill/src/testing.ts
 * - somewhat surprised this is not native to dom-testing-library, it's
 * essential for testing web components
 */

const getHTMLElementsWithShadowRoot = (
  container: HTMLElement,
): HTMLElement[] => {
  return Array.from(container.querySelectorAll<HTMLElement>("*")).filter(
    (el) => !!el.shadowRoot,
  );
};

const isParamContainer = (param: HTMLElement): boolean =>
  typeof param.querySelector === "function" &&
  typeof param.querySelectorAll === "function";

type Func = (
  container: HTMLElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  idOrRole: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any,
) => HTMLElement;

const shadowFactory =
  (getByFunc: Func, selfFunc: Func) =>
  (
    container: HTMLElement,
    idOrRole: Parameters<Func>[1],
    options?: Parameters<Func>[2],
  ): HTMLElement => {
    let resultElement: HTMLElement;

    if (!isParamContainer(container)) {
      // rewire parameters
      options = idOrRole;
      idOrRole = container;
      container = document.body; // body as fallback
    }

    try {
      resultElement = getByFunc(container, idOrRole, options);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      const elements = getHTMLElementsWithShadowRoot(container);

      for (const el of elements) {
        resultElement = selfFunc(
          el.shadowRoot as unknown as HTMLElement,
          idOrRole,
          options,
        );

        if (resultElement) {
          break;
        }
      }
    }

    return resultElement!;
  };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RemoveFirst<T extends any[]> = T["length"] extends 0
  ? undefined
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((...b: T) => void) extends (a: any, ...b: infer I) => void
    ? I
    : [];

export function getByTextShadowed<T extends HTMLElement>(
  ...args: Parameters<GetByText<T>>
): T;
export function getByTextShadowed<T extends HTMLElement>(
  ...args: RemoveFirst<Parameters<GetByText<T>>>
): T;
export function getByTextShadowed<T extends HTMLElement>(
  ...args: Parameters<GetByText<T>> | RemoveFirst<Parameters<GetByText<T>>>
): T {
  // @ts-expect-error test
  return shadowFactory(getByText, getByTextShadowed)(...args);
}
