import { Plot } from "wordgard/doc";
import {
  QueryChangeEventDetail,
  DebugChangeEventDetail,
} from "../cqlInput/CqlInput";
import { CqlQuery } from "../lang/ast";
import { GardSelection } from "wordgard/state";
import { Token } from "../lang/token";
import { PosMapper } from "../cqlInput/editor/utils";

export type QueryChangeEventDetail = {
  queryStr: string;
  queryAst?: CqlQuery;
  error?: string;
};

export type DebugChangeEventDetail = {
  selection: GardSelection;
  queryStr: string;
  tokens: Token[];
  doc: Plot.Doc;
  queryAst?: CqlQuery;
  mapping: PosMapper;
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
