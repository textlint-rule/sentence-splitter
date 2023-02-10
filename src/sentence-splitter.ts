// LICENSE : MIT
"use strict";
import type { TxtNode, TxtParentNode, TxtTextNode, TxtStrNode, TxtNodeType } from "@textlint/ast-node-types";
import { ASTNodeTypes } from "@textlint/ast-node-types";

import { SourceCode } from "./parser/SourceCode";
import { AbstractParser } from "./parser/AbstractParser";
import { NewLineParser } from "./parser/NewLineParser";
import { SpaceParser } from "./parser/SpaceParser";
import { SeparatorParser, SeparatorParserOptions } from "./parser/SeparatorParser";
import { AnyValueParser } from "./parser/AnyValueParser";
import { AbbrMarker } from "./parser/AbbrMarker";
import { PairMaker } from "./parser/PairMaker";
import { nodeLog } from "./logger";

export const Syntax = {
    WhiteSpace: "WhiteSpace",
    Punctuation: "Punctuation",
    Sentence: "Sentence",
    Str: "Str"
} as const;
export type SentenceSplitterNodeType = (typeof Syntax)[keyof typeof Syntax];

export type SentenceSplitterTxtNode = Omit<TxtParentNode, "type"> & {
    type: SentenceSplitterNodeType | TxtNodeType;
};
export type SentenceNode = SentenceSplitterTxtNode & {
    readonly type: "Sentence";
};

export type ToTxtNodeType<T extends SentenceSplitterNodeType | TxtNodeType> = Omit<TxtTextNode, "type"> & {
    readonly type: T | TxtNodeType;
};

export type WhiteSpaceNode = SentenceSplitterTxtNode & {
    readonly type: "WhiteSpace";
};

export type PunctuationNode = SentenceSplitterTxtNode & {
    readonly type: "Punctuation";
};
export type StrNode = TxtStrNode;

export class SplitParser {
    private nodeList: SentenceNode[] = [];
    private results: SentenceSplitterTxtNode[] = [];
    public source: SourceCode;

    constructor(text: string | TxtParentNode) {
        this.source = new SourceCode(text);
    }

    get current(): SentenceNode | undefined {
        return this.nodeList[this.nodeList.length - 1];
    }

    pushNodeToCurrent(node: SentenceSplitterTxtNode) {
        const current = this.current;
        if (current) {
            current.children.push(node);
        } else {
            // Under the root
            this.results.push(node);
        }
    }

    // open with ParentNode
    open(parentNode: SentenceNode) {
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
        this.pushNodeToCurrent(createWhiteSpaceNode(value, startPosition, endPosition));
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
            end: {
                line: endNow.line,
                column: endNow.column
            }
        };
        const rawValue = this.source.sliceRange(firstChildNode.range[0], endNow.offset);
        currentNode.range = [firstChildNode.range[0], endNow.offset];
        currentNode.raw = rawValue;
        this.results.push(currentNode);
    }

    toList() {
        return this.results;
    }
}

export interface splitOptions {
    /**
     * Separator options
     */
    SeparatorParser?: SeparatorParserOptions;
}

const createParsers = (options: splitOptions = {}) => {
    const newLine = new NewLineParser();
    const space = new SpaceParser();
    const separator = new SeparatorParser(options.SeparatorParser);
    const abbrMarker = new AbbrMarker();
    const pairMaker = new PairMaker();
    // anyValueParser has multiple parser and markers.
    // anyValueParse eat any value if it reach to other value.
    const anyValueParser = new AnyValueParser({
        parsers: [newLine, separator],
        markers: [abbrMarker, pairMaker]
    });
    return {
        newLine,
        space,
        separator,
        abbrMarker,
        anyValueParser
    };
};

/**
 * split `text` into Sentence nodes
 */
export function split(text: string, options?: splitOptions): SentenceSplitterTxtNode[] {
    const { newLine, space, separator, anyValueParser } = createParsers(options);
    const splitParser = new SplitParser(text);
    const sourceCode = splitParser.source;
    while (!sourceCode.hasEnd) {
        if (newLine.test(sourceCode)) {
            splitParser.nextLine(newLine);
        } else if (space.test(sourceCode)) {
            splitParser.nextSpace(space);
        } else if (separator.test(sourceCode)) {
            splitParser.close(separator);
        } else {
            if (!splitParser.isOpened()) {
                splitParser.open(createEmptySentenceNode());
            }
            splitParser.nextValue(anyValueParser);
        }
    }
    splitParser.close(space);
    return splitParser.toList();
}

export interface SentenceParentNode extends TxtNode {
    children: Array<TxtNode | TxtTextNode | SentenceNode>;
}

/**
 * Convert Paragraph Node to Paragraph node that convert children to Sentence node
 * This Node is based on TxtAST.
 * See https://github.com/textlint/textlint/blob/master/docs/txtnode.md
 */
export function splitAST(paragraphNode: TxtParentNode, options?: splitOptions): SentenceSplitterTxtNode {
    const { newLine, space, separator, anyValueParser } = createParsers(options);
    const splitParser = new SplitParser(paragraphNode);
    const sourceCode = splitParser.source;
    while (!sourceCode.hasEnd) {
        const currentNode = sourceCode.readNode();
        if (!currentNode) {
            break;
        }
        if (currentNode.type === ASTNodeTypes.Str) {
            if (space.test(sourceCode)) {
                nodeLog("space", sourceCode);
                splitParser.nextSpace(space);
            } else if (separator.test(sourceCode)) {
                nodeLog("separator", sourceCode);
                splitParser.close(separator);
            } else if (newLine.test(sourceCode)) {
                nodeLog("newline", sourceCode);
                splitParser.nextLine(newLine);
            } else {
                if (!splitParser.isOpened()) {
                    nodeLog("open -> createEmptySentenceNode()");
                    splitParser.open(createEmptySentenceNode());
                }
                nodeLog("other str value", sourceCode);
                splitParser.nextValue(anyValueParser);
            }
        } else if (currentNode.type === ASTNodeTypes.Break) {
            nodeLog("break", sourceCode);
            // Break
            // https://github.com/azu/sentence-splitter/issues/23
            splitParser.pushNodeToCurrent(currentNode);
            sourceCode.peekNode(currentNode);
        } else {
            if (!splitParser.isOpened()) {
                nodeLog("open -> createEmptySentenceNode()");
                splitParser.open(createEmptySentenceNode());
            }
            nodeLog("other node", sourceCode);
            splitParser.pushNodeToCurrent(currentNode);
            sourceCode.peekNode(currentNode);
        }
    }

    nodeLog("end separator");
    // It follow some text that is not ended with period.
    // TODO: space is correct?
    splitParser.close(space);
    return {
        ...paragraphNode,
        children: splitParser.toList()
    };
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
    return {
        type: Syntax.WhiteSpace,
        raw: text,
        value: text,
        loc: {
            start: {
                line: startPosition.line,
                column: startPosition.column
            },
            end: {
                line: endPosition.line,
                column: endPosition.column
            }
        },
        range: [startPosition.offset, endPosition.offset]
    };
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
    return {
        type: Syntax.Punctuation,
        raw: text,
        value: text,
        loc: {
            start: {
                line: startPosition.line,
                column: startPosition.column
            },
            end: {
                line: endPosition.line,
                column: endPosition.column
            }
        },
        range: [startPosition.offset, endPosition.offset]
    };
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
): StrNode {
    return {
        type: Syntax.Str,
        raw: text,
        value: text,
        loc: {
            start: {
                line: startPosition.line,
                column: startPosition.column
            },
            end: {
                line: endPosition.line,
                column: endPosition.column
            }
        },
        range: [startPosition.offset, endPosition.offset]
    };
}

export function createEmptySentenceNode(): SentenceNode {
    return {
        type: Syntax.Sentence,
        raw: "",
        loc: {
            start: { column: NaN, line: NaN },
            end: { column: NaN, line: NaN }
        } as const,
        range: [NaN, NaN] as const,
        children: []
    };
}

export function createNode<T extends SentenceSplitterNodeType | TxtNodeType>(
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
): ToTxtNodeType<T> {
    return {
        type: type,
        raw: text,
        value: text,
        loc: {
            start: {
                line: startPosition.line,
                column: startPosition.column
            },
            end: {
                line: endPosition.line,
                column: endPosition.column
            }
        },
        range: [startPosition.offset, endPosition.offset]
    };
}
