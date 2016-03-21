// LICENSE : MIT
"use strict";
import StructureSource from "structured-source";
const defaultOptions = {
    charRegExp: /[\.。\?\!？！]/,
    newLineCharacters: "\n"
};
export const Syntax = {
    "WhiteSpace": "WhiteSpace",
    "Sentence": "Sentence"
};
/**
 * @param {string} text
 * @param {{
 *      charRegExp: ?Object,
 *      newLineCharacters: ?String
 *  }} options
 * @returns {Array}
 */
export function split(text, options = {}) {
    const matchChar = options.charRegExp || defaultOptions.charRegExp;
    const newLineCharacters = options.newLineCharacters || defaultOptions.newLineCharacters;
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
    const newLineCharactersLength = newLineCharacters.length;
    for (; currentIndex < text.length; currentIndex++) {
        let char = text[currentIndex];
        let whiteTarget = text.slice(currentIndex, currentIndex + newLineCharactersLength);
        if (whiteTarget === newLineCharacters) {
            // (string)\n
            if (startPoint !== currentIndex) {
                results.push(createNode(Syntax.Sentence, startPoint, currentIndex));
            }
            for (let i = 0; i < newLineCharactersLength; i++) {
                // string(\n)
                let startIndex = currentIndex + i;
                results.push(createNode(Syntax.WhiteSpace, startIndex, startIndex + 1));
            }
            // string\n|
            startPoint = currentIndex + newLineCharactersLength;
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
/**
 * @param {string} text
 * @param {Object} loc
 * @param {number[]} range
 * @returns {{type: string, raw: string, value: string, loc: Object, range: number[]}}
 */
export function createWhiteSpaceNode(text, loc, range) {
    return {
        type: "WhiteSpace",
        raw: text,
        value: text,
        loc: loc,
        range: range
    }
}
/**
 * @param {string} text
 * @param {Object} loc
 * @param {number[]} range
 * @returns {{type: string, raw: string, value: string, loc: Object, range: number[]}}
 */
export function createSentenceNode(text, loc, range) {
    return {
        type: "Sentence",
        raw: text,
        value: text,
        loc: loc,
        range: range
    }
}