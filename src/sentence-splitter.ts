import type { TxtParagraphNode, TxtParentNode, TxtStrNode, TxtTextNode } from "@textlint/ast-node-types";
import { English } from "./parser/lang/English.js";
import type { Language } from "./parser/lang/LanguageInterface.js";
import { getCharacterTable } from "./parser/CharacterTable.js";
import { scan } from "./parser/scanner.js";
import { build } from "./parser/builder.js";

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

export const DefaultSentenceSplitterOptions = {
    separatorCharacters: [
        ".", // period
        "．", // (ja) zenkaku-period
        "。", // (ja) 句点
        "?", // question mark
        "!", //  exclamation mark
        "？", // (ja) zenkaku question mark
        "！" // (ja) zenkaku exclamation mark
    ]
};

export interface SeparatorParserOptions {
    /**
     * Recognize each characters as separator
     * Example [".", "!", "?"]
     */
    separatorCharacters?: string[];
}

export const DefaultAbbrMarkerOptions = {
    language: English
};

export interface AbbrMarkerOptions {
    language?: Language;
}

export interface splitOptions {
    /**
     * Separator & AbbrMarker options
     */
    SeparatorParser?: SeparatorParserOptions;
    AbbrMarker?: AbbrMarkerOptions;
}

/*
 * Implementation note:
 *
 * It works in two steps, and they share only flat arrays of integers.
 *
 * 1. scan (parser/scanner.ts): read the text as UTF-16 code units, and write tokens into Int32Array.
 *    A token refers to the text by indexes. This step does not create node objects and strings.
 * 2. build (parser/builder.ts): create node objects from the tokens. Each node is created once.
 */
const resolveOptions = (options: splitOptions = {}) => {
    const separatorOptions = options.SeparatorParser;
    const abbrMarkerOptions = options.AbbrMarker;
    return {
        table: getCharacterTable(
            separatorOptions && separatorOptions.separatorCharacters
                ? separatorOptions.separatorCharacters
                : DefaultSentenceSplitterOptions.separatorCharacters
        ),
        language:
            abbrMarkerOptions && abbrMarkerOptions.language
                ? abbrMarkerOptions.language
                : DefaultAbbrMarkerOptions.language
    };
};

/**
 * split `text` into Sentence nodes
 */
export function split(text: string, options?: splitOptions): TxtParentNodeWithSentenceNode["children"] {
    const { table, language } = resolveOptions(options);
    return build(scan(text, table, language), text, undefined, 0, 1, 0, 0);
}

/**
 * Convert Paragraph Node to Paragraph node that convert children to Sentence node
 * This Node is based on TxtAST.
 * See https://github.com/textlint/textlint/blob/master/docs/txtnode.md
 */
export function splitAST(paragraphNode: TxtParagraphNode, options?: splitOptions): TxtParentNodeWithSentenceNode {
    const { table, language } = resolveOptions(options);
    // Scan only the text of the node, not the whole file.
    // `raw` starts at `range[0]` in the file, and the first line of `raw` starts at `loc.start.column`.
    const text = paragraphNode.raw;
    const children = paragraphNode.children;
    const startOffset = paragraphNode.range[0];
    // Header Node's children does not start with index 0
    // Example: # Header
    // It firstChildPadding is `2`
    const firstChildPadding = children[0] ? children[0].range[0] - startOffset : 0;
    return {
        ...paragraphNode,
        children: build(
            scan(text, table, language, children, startOffset),
            text,
            children,
            startOffset,
            paragraphNode.loc.start.line,
            paragraphNode.loc.start.column,
            firstChildPadding
        )
    };
}
