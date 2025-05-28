import { mergeDeep } from "../utils/merge";

export type CqlTheme = {
  baseFontSize: string;
  baseBorderRadius: string;
  input: {
    layout: {
      padding: string;
    };
  };
  chipWrapper: {
    colors: {
      background: string;
    };
  };
  tokens: {
    colors: {
      STRING: string;
      AND: string;
      OR: string;
      RIGHT_BRACKET: string;
      LEFT_BRACKET: string;
    };
  };
};

const defaultTheme: CqlTheme = {
  baseFontSize: "28px",
  baseBorderRadius: "5px",

  input: {
    layout: {
      padding: "5px",
    },
  },
  chipWrapper: {
    colors: {
      background: "rgba(255,255,255,0.2)",
    },
  },
  tokens: {
    colors: {
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
