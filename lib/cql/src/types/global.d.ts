import { Wordgard } from "wordgard/editor";

declare global {
  interface Window {
    CQL_VIEW: Wordgard | undefined;
  }
}
