// LICENSE : MIT
"use strict";
import { TxtNode, TxtParentNode } from "@textlint/ast-node-types";

const StructureSource = require("structured-source");
export const Syntax = {
    WhiteSpace: "WhiteSpace",
    Sentence: "Sentence"
};

export abstract class AbstractParser {
    abstract test(source: SourceCode): boolean;

    abstract seek(source: SourceCode): void;
}

export class SourceCode {
    private source: any;
    private index: number = 0;

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

    get hasEnd() {
        return this.readOrFalse() === false;
    }

    readOrFalse() {
        const char = this.read();
        return char !== "" ? char : false;
    }

    /**
     * read char
     * if can not read, return empty string
     * @returns {string}
     */
    read(over: number = 0) {
        const index = this.index + over;
        if (0 <= index && index < this.text.length) {
            return this.text[index];
        }
        return false;
    }

    peek() {
        this.index += 1;
    }

    seekNext(
        parser: AbstractParser
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
    } {
        const startPosition = this.now();
        parser.seek(this);
        const endPosition = this.now();
        const value = this.text.slice(startPosition.offset, endPosition.offset);
        return {
            value,
            startPosition,
            endPosition
        };
    }
}

export class SplitParser {
    private nodeList: TxtParentNode[] = [];
    private results: (TxtParentNode | TxtNode)[] = [];
    public source: SourceCode;

    constructor(private text: string) {
        this.source = new SourceCode(text);
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

    // open with ParentNode
    open(parentNode: TxtParentNode) {
        this.nodeList.push(parentNode);
    }

    isOpened() {
        return this.nodeList.length > 0;
    }

    nextLine(parser: AbstractParser) {
        console.log("nextLine");
        const { value, startPosition, endPosition } = this.source.seekNext(parser);
        this.pushNodeToCurrent(createWhiteSpaceNode(value, startPosition, endPosition));
        return endPosition;
    }

    nextSpace(parser: AbstractParser) {
        console.log("nextSpace");
        const { value, startPosition, endPosition } = this.source.seekNext(parser);
        this.pushNodeToCurrent(createNode("WhiteSpace", value, startPosition, endPosition));
    }

    nextValue(parser: AbstractParser) {
        console.log("nextValue");
        const { value, startPosition, endPosition } = this.source.seekNext(parser);
        this.pushNodeToCurrent(createTextNode(value, startPosition, endPosition));
    }

    // close current Node and remove it from list
    close(parser: AbstractParser) {
        const { value, startPosition, endPosition } = this.source.seekNext(parser);
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
        const endNow = this.source.now();
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

export function split(text: string) {
    class NewLineParser {
        test(sourceCode: SourceCode) {
            const string = sourceCode.read();
            if (!string) {
                return false;
            }
            return /[\r\n]/.test(string);
        }

        seek(sourceCode: SourceCode): void {
            while (this.test(sourceCode)) {
                sourceCode.peek();
            }
        }
    }

    class SpaceParser {
        test(sourceCode: SourceCode) {
            const string = sourceCode.read();
            if (!string) {
                return false;
            }
            return /\s/.test(string);
        }

        seek(sourceCode: SourceCode): void {
            while (this.test(sourceCode)) {
                sourceCode.peek();
            }
        }
    }

    class SeparatorParser {
        test(sourceCode: SourceCode) {
            const firstChar = sourceCode.read();
            if (!firstChar) {
                return false;
            }
            if (!/[.。?!？！]/.test(firstChar)) {
                return false;
            }
            const nextChar = sourceCode.read(1);
            if (firstChar === ".") {
                return nextChar === " ";
            }
            return true;
        }

        seek(sourceCode: SourceCode): void {
            while (this.test(sourceCode)) {
                sourceCode.peek();
            }
        }
    }

    const newLine = new NewLineParser();
    const space = new SpaceParser();
    const separator = new SeparatorParser();

    class AnyValueParser extends AbstractParser {
        test(sourceCode: SourceCode) {
            if (sourceCode.hasEnd) {
                return false;
            }
            return !newLine.test(sourceCode) && !space.test(sourceCode) && !separator.test(sourceCode);
        }

        seek(sourceCode: SourceCode) {
            while (this.test(sourceCode)) {
                sourceCode.peek();
            }
        }
    }

    const anyValue = new AnyValueParser();
    const splitParser = new SplitParser(text);
    const sourceCode = splitParser.source;
    while (!sourceCode.hasEnd) {
        if (newLine.test(sourceCode)) {
            splitParser.nextLine(newLine);
        } else if (space.test(sourceCode)) {
            // Add WhiteSpace
            splitParser.nextSpace(space);
        } else if (separator.test(sourceCode)) {
            splitParser.close(separator);
        } else {
            if (!splitParser.isOpened()) {
                splitParser.open(createSentenceNode());
            }
            splitParser.nextValue(anyValue);
        }
    }

    splitParser.close(anyValue);
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
