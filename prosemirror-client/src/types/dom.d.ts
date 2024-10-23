import { QueryChangeEventDetail, QueryChangeEvent } from "../cqlInput/CqlInput";

export type QueryChangeEventDetail = {
  cqlQuery: string;
  query: string;
};

declare global {
  interface GlobalEventHandlersEventMap {
    "queryChange": CustomEvent<QueryChangeEventDetail>;
  }
}
