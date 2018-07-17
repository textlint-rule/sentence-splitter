"use strict";

import { TxtNode, TxtParentNode } from "@textlint/ast-node-types";
import { split } from "./sentence-splitter";

export function splitToSentences(text: string): (TxtParentNode | TxtNode)[] {
    return split(text);
}
