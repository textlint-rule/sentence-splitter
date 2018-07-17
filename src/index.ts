"use strict";

import { split, Syntax } from "./sentence-splitter";

function splitPara(para: string): string[] {
    return split(para)
        .filter(node => node.type == Syntax.Sentence)
        .map(node => node.raw);
}

export function splitToSentences(text: string): string[] {
    var result = [];
    for (let para of text.split("\n")) {
        for (let sentence of splitPara(para)) {
            result.push(sentence);
        }
        result.push("");
    }
    result.pop();
    return result;
}
