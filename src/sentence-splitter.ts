// LICENSE : MIT
"use strict";
import { TxtNode, TxtParentNode, ASTNodeTypes } from "@textlint/ast-node-types";
import { SourceCode } from "./parser/SourceCode";
import { AbstractParser } from "./parser/AbstractParser";
import { NewLineParser } from "./parser/NewLineParser";
import { SpaceParser } from "./parser/SpaceParser";
import { SeparatorParser } from "./parser/SeparatorParser";
import { AnyValueParser } from "./parser/AnyValueParser";

export const Syntax = {
    WhiteSpace: "WhiteSpace",
    Punctuation: "Punctuation",
    Sentence: "Sentence"
};

export interface ToTypeNode<T extends string> extends TxtNode {
    readonly type: T;
}

export interface WhiteSpaceNode extends TxtNode {
    readonly type: "WhiteSpace";
}

export interface PunctuationNode extends TxtNode {
    readonly type: "Punctuation";
}

export interface SentenceNode extends TxtParentNode {
    readonly type: "Sentence";
}

export class SplitParser {
    private nodeList: TxtParentNode[] = [];
    private results: (TxtParentNode | TxtNode)[] = [];
    public source: SourceCode;

    constructor(text: string | TxtParentNode) {
        this.source = new SourceCode(text);
    }

    get current(): TxtParentNode | undefined {
        return this.nodeList[this.nodeList.length - 1];
    }

    pushNodeToCurrent(node: TxtNode) {
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
        const { value, startPosition, endPosition } = this.source.seekNext(parser);
        this.pushNodeToCurrent(createWhiteSpaceNode(value, startPosition, endPosition));
        return endPosition;
    }

    nextSpace(parser: AbstractParser) {
        const { value, startPosition, endPosition } = this.source.seekNext(parser);
        this.pushNodeToCurrent(createNode("WhiteSpace", value, startPosition, endPosition));
    }

    nextValue(parser: AbstractParser) {
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
        currentNode.raw = this.source.slice(firstChildNode.range[0], endNow.offset);
        currentNode.value = this.source.slice(firstChildNode.range[0], endNow.offset);
        this.results.push(currentNode);
    }

    toList() {
        return this.results;
    }
}

// From Text to AST
export function split(text: string) {
    const newLine = new NewLineParser();
    const space = new SpaceParser();
    const separator = new SeparatorParser();
    const anyValue = new AnyValueParser([newLine, space, separator]);
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
                splitParser.open(createEmptySentenceNode());
            }
            splitParser.nextValue(anyValue);
        }
    }
    splitParser.close(anyValue);
    return splitParser.toList();
}

// From AST to AST
export function splitAST(paragraphNode: TxtParentNode): (TxtParentNode | TxtNode)[] {
    const newLine = new NewLineParser();
    const space = new SpaceParser();
    const separator = new SeparatorParser();
    const anyValue = new AnyValueParser([newLine, space, separator]);
    const splitParser = new SplitParser(paragraphNode);
    const sourceCode = splitParser.source;
    while (!sourceCode.hasEnd) {
        const currentNode = sourceCode.readNode();
        if (!currentNode) {
            break;
        }
        if (currentNode.type === ASTNodeTypes.Str) {
            if (newLine.test(sourceCode)) {
                splitParser.nextLine(newLine);
            } else if (space.test(sourceCode)) {
                // Add WhiteSpace
                splitParser.nextSpace(space);
            } else if (separator.test(sourceCode)) {
                splitParser.close(separator);
            } else {
                if (!splitParser.isOpened()) {
                    splitParser.open(createEmptySentenceNode());
                }
                splitParser.nextValue(anyValue);
            }
        } else {
            splitParser.pushNodeToCurrent(currentNode);
            sourceCode.peekNode(currentNode);
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
): PunctuationNode {
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

export function createEmptySentenceNode(): SentenceNode {
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

export function createNode<T extends string>(
    type: T,
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
): ToTypeNode<T> {
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
