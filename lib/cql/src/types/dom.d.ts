import { QueryChangeEventDetail } from "../cqlInput/CqlInput";
import { CqlQuery } from "../lang/ast";

export type QueryChangeEventDetail = {
  queryStr: string;
  queryAst?: CqlQuery;
  error?: string;
};

declare global {
  interface GlobalEventHandlersEventMap {
    queryChange: CustomEvent<QueryChangeEventDetail>;
  }
}
