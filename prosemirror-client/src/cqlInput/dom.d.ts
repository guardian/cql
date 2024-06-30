import { QueryChangeEventDetail, QueryChangeEvent } from "./CqlInput";

export type QueryChangeEvent = "queryChange";

export type QueryChangeEventDetail = {
  cqlQuery: string;
  query: string;
};

interface CustomEventMap {
  [QueryChangeEvent]: CustomEvent<QueryChangeEventDetail>;
}
declare global {
  interface Document {
    addEventListener<K extends keyof CustomEventMap>(
      type: K,
      listener: (this: Document, ev: CustomEventMap[K]) => void
    ): void;
    dispatchEvent<K extends keyof CustomEventMap>(ev: CustomEventMap[K]): void;
  }
}
