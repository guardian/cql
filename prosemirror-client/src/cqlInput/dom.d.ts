import { QueryChangeEventDetail, QueryChangeEvent } from "./CqlInput";

export type QueryChangeEventDetail = {
  cqlQuery: string;
  query: string;
};

declare global {
  interface GlobalEventHandlersEventMap {
    "queryChange": CustomEvent<QueryChangeEventDetail>;
  }
}
