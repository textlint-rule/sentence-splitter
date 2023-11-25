import type { TxtParagraphNode, TxtParentNode, TxtStrNode, TxtTextNode } from "@textlint/ast-node-types";
import { ASTNodeTypes } from "@textlint/ast-node-types";

import { SourceCode } from "./parser/SourceCode.js";
import { AbstractParser } from "./parser/AbstractParser.js";
import { NewLineParser } from "./parser/NewLineParser.js";
import { SpaceParser } from "./parser/SpaceParser.js";
import {
    DefaultOptions as DefaultSentenceSplitterOptions,
    SeparatorParser,
    SeparatorParserOptions
} from "./parser/SeparatorParser.js";
import { AnyValueParser } from "./parser/AnyValueParser.js";
import { AbbrMarker, AbbrMarkerOptions, DefaultOptions as DefaultAbbrMarkerOptions } from "./parser/AbbrMarker.js";
import { PairMaker } from "./parser/PairMaker.js";
import { nodeLog } from "./logger.js";

export const SentenceSplitterSyntax = {
    WhiteSpace: "WhiteSpace",
    Punctuation: "Punctuation",
    Sentence: "Sentence",
    Str: "Str",
    PairMark: "PairMark"
} as const;

export type SentencePairMarkContext = {
    type: "PairMark";
    range: readonly [startIndex: number, endIndex: number];
    loc: {
        start: {
            line: number;
            column: number;
        };
        end: {
            line: number;
            column: number;
        };
    };
};
// SentenceNode does not have sentence
// Nested SentenceNode is not allowed
export type TxtSentenceNodeChildren =
    | TxtParentNode["children"][number]
    | TxtWhiteSpaceNode
    | TxtPunctuationNode
    | TxtStrNode;
export type TxtSentenceNode = Omit<TxtParentNode, "type" | "children"> & {
    readonly type: "Sentence";
    /**
     * SentenceNode includes some context information
     * - "PairMark": pair mark information
     */
    readonly contexts: SentencePairMarkContext[];

    children: TxtSentenceNodeChildren[];
};
export type TxtWhiteSpaceNode = Omit<TxtTextNode, "type"> & {
    readonly type: "WhiteSpace";
};
export type TxtPunctuationNode = Omit<TxtTextNode, "type"> & {
    readonly type: "Punctuation";
};
export type SentenceSplitterTxtNode = TxtSentenceNode | TxtWhiteSpaceNode | TxtPunctuationNode | TxtStrNode;
export type SentenceSplitterTxtNodeType = (typeof SentenceSplitterSyntax)[keyof typeof SentenceSplitterSyntax];
export type TxtParentNodeWithSentenceNodeContent = TxtParentNode["children"][number] | SentenceSplitterTxtNode;
export type TxtParentNodeWithSentenceNode = Omit<TxtParentNode, "children"> & {
    children: TxtParentNodeWithSentenceNodeContent[];
};

class SplitParser {
    private sentenceNodeList: TxtSentenceNode[] = [];
    private results: TxtParentNodeWithSentenceNode["children"] = [];
    public source: SourceCode;

    constructor(text: string | TxtParentNode) {
        this.source = new SourceCode(text);
    }

    get current(): TxtSentenceNode | undefined {
        return this.sentenceNodeList[this.sentenceNodeList.length - 1];
    }

    pushNodeToCurrent(node: TxtSentenceNodeChildren) {
        const current = this.current;
        if (current) {
            current.children.push(node);
        } else {
            // Under the root
            this.results.push(node);
        }
    }

    // open with ParentNode
    open(parentNode: TxtSentenceNode) {
        this.sentenceNodeList.push(parentNode);
    }

    isOpened() {
        return this.sentenceNodeList.length > 0;
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
        // rest of the value is Punctuation
        // Except for the case of the last character of the value is a space
        // See "space-first-and-space-last" test case
        if (startPosition.offset !== endPosition.offset && !/^\s+$/.test(value)) {
            this.pushNodeToCurrent(createPunctuationNode(value, startPosition, endPosition));
        }
        const currentNode = this.sentenceNodeList.pop();
        if (!currentNode) {
            return;
        }
        if (currentNode.children.length === 0) {
            return;
        }
        const firstChildNode = currentNode.children[0];
        const endNow = this.source.now();
        // update Sentence node's location and range
        const rawValue = this.source.sliceRange(firstChildNode.range[0], endNow.offset);
        const contexts = this.source.consumedContexts
            .sort((a, b) => {
                return a.range[0] - b.range[0];
            })
            .map((context) => {
                return {
                    type: "PairMark" as const,
                    pairMark: context.pairMark,
                    range: context.range,
                    loc: context.loc
                };
            });
        this.results.push({
            ...currentNode,
            loc: {
                start: firstChildNode.loc.start,
                end: {
                    line: endNow.line,
                    column: endNow.column
                }
            },
            range: [firstChildNode.range[0], endNow.offset],
            raw: rawValue,
            contexts: contexts
        });
    }

    toList() {
        return this.results;
    }
}

export { DefaultAbbrMarkerOptions, DefaultSentenceSplitterOptions };

export interface splitOptions {
    /**
     * Separator & AbbrMarker options
     */
    SeparatorParser?: SeparatorParserOptions;
    AbbrMarker?: AbbrMarkerOptions;
}

const createParsers = (options: splitOptions = {}) => {
    const newLine = new NewLineParser();
    const space = new SpaceParser();
    const separator = new SeparatorParser(options.SeparatorParser);
    const abbrMarker = new AbbrMarker(options.AbbrMarker);
    const pairMaker = new PairMaker();
    // anyValueParser has multiple parser and markers.
    // anyValueParse eat any value if it reaches to other value.
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
export function split(text: string, options?: splitOptions): TxtParentNodeWithSentenceNode["children"] {
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

/**
 * Convert Paragraph Node to Paragraph node that convert children to Sentence node
 * This Node is based on TxtAST.
 * See https://github.com/textlint/textlint/blob/master/docs/txtnode.md
 */
export function splitAST(paragraphNode: TxtParagraphNode, options?: splitOptions): TxtParentNodeWithSentenceNode {
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
function createWhiteSpaceNode(
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
        type: SentenceSplitterSyntax.WhiteSpace,
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
        range: [startPosition.offset, endPosition.offset] as const
    };
}

function createPunctuationNode(
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
): TxtPunctuationNode {
    return {
        type: SentenceSplitterSyntax.Punctuation,
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

function createTextNode(
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
): TxtStrNode {
    return {
        type: SentenceSplitterSyntax.Str,
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

function createEmptySentenceNode(): TxtSentenceNode {
    return {
        type: SentenceSplitterSyntax.Sentence,
        raw: "",
        loc: {
            start: { column: NaN, line: NaN },
            end: { column: NaN, line: NaN }
        } as const,
        range: [NaN, NaN] as const,
        children: [],
        contexts: []
    };
}
