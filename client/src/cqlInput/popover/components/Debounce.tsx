import { h, FunctionComponent } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";

type Props<ComponentProps> = {
  component: FunctionComponent<ComponentProps>;
  throttleInMs: number;
} & ComponentProps;

/**
 * Debounce the props for a given component
 */
export const Debounce = <ComponentProps extends object>({
  component: Component,
  throttleInMs,
  ...props
}: Props<ComponentProps>) => {
  const [isPending, setIsPending] = useState(false);
  const [renderToggle, setRenderToggle] = useState(false);
  const [timer, setTimer] = useState<Timer>();

  useEffect(() => {
    if (isPending) {
      clearInterval(timer);
    }

    setTimer(
      setTimeout(() => {
        setRenderToggle(!renderToggle);
        setIsPending(false);
      }, throttleInMs)
    );

    setIsPending(true);
  }, Object.values(props));

  const memoisedProps = useMemo(() => props as ComponentProps, [renderToggle]);

  return <Component {...memoisedProps} />;
};
