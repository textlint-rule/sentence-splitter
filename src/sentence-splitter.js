// LICENSE : MIT
"use strict";
import StructureSource from "structured-source";
const defaultOptions = {
    charRegExp: /[\.。\?\!、]/
};
const whiteSpace = /\n/;
export const Syntax = {
    "WhiteSpace": "WhiteSpace",
    "Sentence": "Sentence"
};
export default function splitSentences(text, options = defaultOptions) {
    const src = new StructureSource(text);
    let createNode = (type, start, end)=> {
        let range = [start, end];
        let location = src.rangeToLocation(range);
        let slicedText = text.slice(start, end);
        let node;
        if (type === Syntax.WhiteSpace) {
            node = createWhiteSpaceNode(slicedText, location, range);
        } else if (type === Syntax.Sentence) {
            node = createSentenceNode(slicedText, location, range);
        }
        return node;
    };
    let results = [];
    let startPoint = 0;
    let currentIndex = 0;
    let isSplitPoint = false;
    let matchChar = options.charRegExp || defaultOptions.charRegExp;
    for (; currentIndex < text.length; currentIndex++) {
        let char = text[currentIndex];
        if (whiteSpace.test(char)) {
            // (string)\n
            if (startPoint !== currentIndex) {
                results.push(createNode(Syntax.Sentence, startPoint, currentIndex));
            }
            // string(\n)
            results.push(createNode(Syntax.WhiteSpace, currentIndex, currentIndex + 1));
            // string\n|
            startPoint = currentIndex + 1;
            isSplitPoint = false;
        } else if (matchChar.test(char)) {
            isSplitPoint = true;
        } else {
            // why `else`
            // it for support 。。。 pattern
            if (isSplitPoint) {
                results.push(createNode(Syntax.Sentence, startPoint, currentIndex));
                // reset stat
                startPoint = currentIndex;
                isSplitPoint = false;
            }
        }
    }

    if (startPoint !== currentIndex) {
        results.push(createNode(Syntax.Sentence, startPoint, currentIndex));
    }
    return results;
}
export function createWhiteSpaceNode(text, loc, range) {
    return {
        type: "WhiteSpace",
        raw: text,
        loc: loc,
        range: range
    }
}
export function createSentenceNode(text, loc, range) {
    return {
        type: "Sentence",
        raw: text,
        loc: loc,
        range: range
    }
}