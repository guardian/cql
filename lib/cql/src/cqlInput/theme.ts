import { DeepPartial } from "../types/utils";
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
    color: {
      background: string;
    };
  };
  chipContent: {
    layout: {
      padding: string;
    };
    color: {
      readonly: string;
    };
  };
  chipHandle: {
    color: {
      background: string;
      border: string;
    };
  };
  typeahead: {
    layout: {
      minWidth: string;
    };
    selectedOption: {
      color: {
        background: string;
        text: string;
      };
    };
  };
  tokens: {
    color: {
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
    color: {
      background: "rgba(255,255,255,0.2)",
    },
  },
  chipContent: {
    layout: {
      padding: "5px",
    },
    color: {
      readonly: "#bbb",
    },
  },
  chipHandle: {
    color: {
      background: "#3737378f",
      border: "none",
    },
  },
  typeahead: {
    layout: {
      minWidth: "400px",
    },
    selectedOption: {
      color: {
        background: "rgba(255,255,255,0.1)",
        text: "#eee",
      },
    },
  },
  tokens: {
    color: {
      STRING: "lightblue",
      AND: "magenta",
      OR: "magenta",
      RIGHT_BRACKET: "lightpink",
      LEFT_BRACKET: "lightpink",
    },
  },
};

export const applyPartialTheme = (theme: DeepPartial<CqlTheme>): CqlTheme =>
  mergeDeep(defaultTheme, theme);
