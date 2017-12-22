// LICENSE : MIT
"use strict";
import { TxtNode, TxtParentNode } from "@textlint/ast-node-types";

const assert = require("assert");
const StructureSource = require("structured-source");

const defaultOptions = {
    // charRegExp is deprecated
    charRegExp: /[\.。\?\!？！]/,
    // separator char list
    separatorChars: [".", "。", "?", "!", "？", "！"],
    newLineCharacters: "\n",
    whiteSpaceCharacters: [" ", "　"]
};
export const Syntax = {
    WhiteSpace: "WhiteSpace",
    Sentence: "Sentence"
};

export interface SplitOption {
    charRegExp?: any;
    separatorChars?: string[];
    newLineCharacters?: string;
    whiteSpaceCharacters?: string[];
}

export class SplitParser {
    private index: number = 0;
    private nodeList: TxtParentNode[] = [];
    private results: (TxtParentNode | TxtNode)[] = [];
    private source: any;

    constructor(private text: string) {
        this.source = new StructureSource(text);
    }

    now() {
        const position = this.source.indexToPosition(this.index);
        return {
            line: position.line as number,
            column: position.column as number,
            offset: this.index
        };
    }

    get current(): TxtParentNode | undefined {
        return this.nodeList[this.nodeList.length - 1];
    }

    private pushNodeToCurrent(node: TxtNode) {
        const current = this.current;
        if (current) {
            current.children.push(node);
        } else {
            // Under the root
            this.results.push(node);
        }
    }

    read() {
        if (this.index <= this.text.length) {
            return this.text[this.index];
        } else {
            return false;
        }
    }

    // open with ParentNode
    open(parentNode: TxtParentNode) {
        this.nodeList.push(parentNode);
    }

    isOpened() {
        return this.nodeList.length > 0;
    }

    peek = () => {
        this.index += 1;
    };

    private next = (
        test: (text: string) => boolean
    ): {
        value: string;
        startPosition: {
            line: number;
            column: number;
            offset: number;
        };
        endPosition: {
            line: number;
            column: number;
            offset: number;
        };
    } => {
        const startPosition = this.now();
        let value = "";
        let char: string | boolean;
        while ((char = this.read())) {
            if (!test(char)) {
                break;
            }
            value += char;
            this.peek();
        }
        const endPosition = this.now();
        return {
            value,
            startPosition,
            endPosition
        };
    };

    nextLine(test: (text: string) => boolean) {
        console.log("nextLine");
        const { value, startPosition, endPosition } = this.next(test);
        this.pushNodeToCurrent(createWhiteSpaceNode(value, startPosition, endPosition));
        return endPosition;
    }

    nextSpace(test: (text: string) => boolean) {
        console.log("nextSpace");
        const { value, startPosition, endPosition } = this.next(test);
        this.pushNodeToCurrent(createNode("WhiteSpace", value, startPosition, endPosition));
        return this.now();
    }

    nextValue(test: (text: string) => boolean) {
        console.log("nextValue");
        const { value, startPosition, endPosition } = this.next(test);
        this.pushNodeToCurrent(createTextNode(value, startPosition, endPosition));
        return this.now();
    }

    // close current Node and remove it from list
    close(test: (text: string) => boolean) {
        const { value, startPosition, endPosition } = this.next(test);
        if (startPosition.offset !== endPosition.offset) {
            this.pushNodeToCurrent(createPunctuationNode(value, startPosition, endPosition));
        }
        const currentNode = this.nodeList.pop();
        if (!currentNode) {
            return;
        }
        if (currentNode.children.length === 0) {
            return;
        }
        const firstChildNode: TxtNode = currentNode.children[0];
        const endNow = this.now();
        currentNode.loc = {
            start: firstChildNode.loc.start,
            end: nowToLoc(endNow)
        };
        currentNode.range = [firstChildNode.range[0], endNow.offset];
        currentNode.raw = this.text.slice(firstChildNode.range[0], endNow.offset);
        currentNode.value = this.text.slice(firstChildNode.range[0], endNow.offset);
        this.results.push(currentNode);
    }

    toList() {
        return this.results;
    }
}

/**
 * @param {string} text
 * @param {{
 *      charRegExp: ?Object,
 *      separatorChars: ?string[],
 *      newLineCharacters: ?String,
 *      whiteSpaceCharacters: ?string[]
 *  }} options
 * @returns {Array}
 */
export function split(text: string, options: SplitOption = {}) {
    const charRegExp = options.charRegExp;
    const separatorChars = options.separatorChars || defaultOptions.separatorChars;
    const whiteSpaceCharacters = options.whiteSpaceCharacters || defaultOptions.whiteSpaceCharacters;
    assert(
        !(options.charRegExp && options.separatorChars),
        "should use either one `charRegExp` or `separatorChars`.\n" + "`charRegExp` is deprecated."
    );
    /**
     * Is the `char` separator symbol?
     * @param {string} char
     * @returns {boolean}
     */
    const testCharIsSeparator = (char: string) => {
        if (charRegExp) {
            return charRegExp.test(char);
        }
        return separatorChars.indexOf(char) !== -1;
    };
    const newLineCharacters = options.newLineCharacters || defaultOptions.newLineCharacters;

    const isNewLineText = (text: string) => text === newLineCharacters;
    const isWhiteSpaceText = (text: string) => whiteSpaceCharacters.indexOf(text) !== -1;
    const isValue = (text: string) => {
        const isOtherMatch = testCharIsSeparator(text) || isNewLineText(text) || isWhiteSpaceText(text);
        return !isOtherMatch;
    };

    const splitParser = new SplitParser(text);
    let char: string | boolean;
    while ((char = splitParser.read())) {
        console.log("char", char);
        if (isNewLineText(char)) {
            splitParser.nextLine(isNewLineText);
        } else if (isWhiteSpaceText(char)) {
            // Add WhiteSpace
            splitParser.nextSpace(isWhiteSpaceText);
        } else if (testCharIsSeparator(char)) {
            splitParser.close(testCharIsSeparator);
        } else {
            if (!splitParser.isOpened()) {
                splitParser.open(createSentenceNode());
            }
            splitParser.nextValue(isValue);
        }
    }

    splitParser.close(() => true);
    return splitParser.toList();
}

/**
 * WhiteSpace is space or linebreak
 */
export function createWhiteSpaceNode(
    text: string,
    startPosition: {
        line: number;
        column: number;
        offset: number;
    },
    endPosition: {
        line: number;
        column: number;
        offset: number;
    }
) {
    return createNode("WhiteSpace", text, startPosition, endPosition);
}

export function createPunctuationNode(
    text: string,
    startPosition: {
        line: number;
        column: number;
        offset: number;
    },
    endPosition: {
        line: number;
        column: number;
        offset: number;
    }
) {
    return createNode("Punctuation", text, startPosition, endPosition);
}

export function createTextNode(
    text: string,
    startPosition: {
        line: number;
        column: number;
        offset: number;
    },
    endPosition: {
        line: number;
        column: number;
        offset: number;
    }
) {
    return createNode("Str", text, startPosition, endPosition);
}

export function createSentenceNode(): TxtParentNode {
    return {
        type: "Sentence",
        raw: "",
        value: "",
        loc: {
            start: { column: NaN, line: NaN },
            end: { column: NaN, line: NaN }
        },
        range: [NaN, NaN],
        children: []
    };
}

export function createNode(
    type: string,
    text: string,
    startPosition: {
        line: number;
        column: number;
        offset: number;
    },
    endPosition: {
        line: number;
        column: number;
        offset: number;
    }
): TxtNode {
    return {
        type: type,
        raw: text,
        value: text,
        loc: {
            start: nowToLoc(startPosition),
            end: nowToLoc(endPosition)
        },
        range: [startPosition.offset, endPosition.offset]
    };
}

function nowToLoc(now: { line: number; column: number; offset: number }) {
    return {
        line: now.line,
        column: now.column
    };
}
