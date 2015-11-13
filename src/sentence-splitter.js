// LICENSE : MIT
"use strict";
import StructureSource from "structured-source";
const defaultOptions = {
    charRegExp: /[\.。\n\?\!、]/
};
export default function splitSentences(text, options = defaultOptions) {
    const src = new StructureSource(text);
    let results = [];
    let startPoint = 0;
    let isSplitPoint = false;
    let currentIndex = 0;
    let matchChar = options.charRegExp || defaultOptions.charRegExp;
    for (; currentIndex < text.length; currentIndex++) {
        let char = text[currentIndex];
        if (matchChar.test(char)) {
            isSplitPoint = true;
        } else {
            if (isSplitPoint) {
                let range = [startPoint, currentIndex];
                let location = src.rangeToLocation(range);
                results.push(createSentenceNode(text.slice(startPoint, currentIndex), location, range));
                // reset stat
                startPoint = currentIndex;
                isSplitPoint = false;
            }
        }
    }
    let range = [startPoint, currentIndex];
    let location = src.rangeToLocation(range);
    results.push(createSentenceNode(text.slice(startPoint, currentIndex), location, range));
    return results;
}
export function createSentenceNode(text, loc, range) {
    return {
        type: "Sentence",
        raw: text,
        loc: loc,
        range: range
    }
}