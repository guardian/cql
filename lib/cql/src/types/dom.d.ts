import { Node } from "prosemirror-model";
import {
  QueryChangeEventDetail,
  DebugChangeEventDetail,
} from "../cqlInput/CqlInput";
import { CqlQuery } from "../lang/ast";
import { Selection } from "prosemirror-state";

export type QueryChangeEventDetail = {
  queryStr: string;
  queryAst?: CqlQuery;
  error?: string;
};

export type DebugChangeEventDetail = {
  selection: Selection;
  queryStr: string;
  tokens: Token[];
  doc: Node;
  queryAst?: CqlQuery;
  mapping: Mapping;
  error?:
    | {
        message: string;
        position?: number;
      }
    | undefined;
};

declare global {
  interface GlobalEventHandlersEventMap {
    queryChange: CustomEvent<QueryChangeEventDetail>;
    debugChange: CustomEvent<DebugChangeEventDetail>;
  }
}
