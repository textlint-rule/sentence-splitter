"use strict";

import { split } from "./sentence-splitter";

export function splitToSentences(text: string): string[] {
    return split(text).map(node => node.raw);
}
