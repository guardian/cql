import { mergeDeep } from "../utils/merge";

export type CqlTheme = {
  baseFontSize: number;
  baseBorderRadius: number;
  colors: {
    input: {
      outlineFocused: string;
    };
    chipWrapper: {
      background: string;
    };
    tokens: {
      STRING: string;
      AND: string;
      OR: string;
      RIGHT_BRACKET: string;
      LEFT_BRACKET: string;
    };
  };
};

const defaultTheme: CqlTheme = {
  baseFontSize: 28,
  baseBorderRadius: 5,
  colors: {
    input: {
      outlineFocused: "lightblue",
    },
    chipWrapper: {
      background: "rgba(255,255,255,0.2)",
    },
    tokens: {
      STRING: "lightblue",
      AND: "magenta",
      OR: "magenta",
      RIGHT_BRACKET: "lightpink",
      LEFT_BRACKET: "lightpink",
    },
  },
};

export const applyPartialTheme = (theme: Partial<CqlTheme>): CqlTheme =>
  mergeDeep(defaultTheme, theme);
