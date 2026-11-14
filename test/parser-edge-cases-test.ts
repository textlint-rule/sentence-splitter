import * as assert from "node:assert";
import { parse } from "@textlint/markdown-to-ast";
import type { TxtParagraphNode } from "@textlint/ast-node-types";
import {
    SentenceSplitterSyntax,
    split,
    splitAST,
    TxtParentNodeWithSentenceNode,
    TxtSentenceNode
} from "../src/sentence-splitter.js";

type Nodes = TxtParentNodeWithSentenceNode["children"];
const raws = (nodes: Nodes) => nodes.map((node) => node.raw);
const sentencesOf = (nodes: Nodes) =>
    nodes.filter((node): node is TxtSentenceNode => node.type === SentenceSplitterSyntax.Sentence);
/**
 * [type, raw, [type, raw] of children]
 */
const structure = (nodes: Nodes) =>
    nodes.map((node) => {
        return node.type === SentenceSplitterSyntax.Sentence
            ? [node.type, node.raw, node.children.map((child) => [child.type, child.raw])]
            : [node.type, node.raw];
    });

// These expected values are the results of the previous parser implementation.
describe("parser edge cases", () => {
    describe("large text", () => {
        it("should split a text that has many sentences and pair marks", () => {
            const count = 200;
            const nodes = split("「a。」b。 ".repeat(count));
            const sentences = sentencesOf(nodes);
            // Sentence and WhiteSpace
            assert.strictEqual(nodes.length, count * 2);
            assert.strictEqual(sentences.length, count);
            sentences.forEach((sentence, index) => {
                const start = index * 7;
                assert.strictEqual(sentence.raw, "「a。」b。");
                assert.deepStrictEqual(sentence.range, [start, start + 6]);
                assert.deepStrictEqual(
                    sentence.contexts.map((context) => context.range),
                    [[start, start + 3]]
                );
            });
            const lastSentence = sentences[count - 1];
            assert.deepStrictEqual(lastSentence.loc, {
                start: { line: 1, column: 1393 },
                end: { line: 1, column: 1399 }
            });
        });
    });
    describe("pair marks", () => {
        it("should close the pair marks that are crossed", () => {
            const sentences = sentencesOf(split("a (b [c) d] e. f"));
            assert.deepStrictEqual(
                sentences.map((sentence) => [
                    sentence.raw,
                    sentence.contexts.map((context) => [context.pairMark.key, context.range])
                ]),
                [
                    [
                        "a (b [c) d] e.",
                        [
                            ["round bracket", [2, 7]],
                            ["angled bracket", [5, 10]]
                        ]
                    ],
                    ["f", []]
                ]
            );
        });
        it("should not split after a pair mark that is not closed", () => {
            const sentences = sentencesOf(split("彼は「これ。それ。あれ"));
            assert.deepStrictEqual(raws(sentences), ["彼は「これ。それ。あれ"]);
            assert.deepStrictEqual(sentences[0].contexts, []);
        });
    });
    describe("separators", () => {
        it("should include a period after other separator into Punctuation if a space follows the period", () => {
            assert.deepStrictEqual(structure(split("Hi?. Next")), [
                [
                    "Sentence",
                    "Hi?.",
                    [
                        ["Str", "Hi"],
                        ["Punctuation", "?."]
                    ]
                ],
                ["WhiteSpace", " "],
                ["Sentence", "Next", [["Str", "Next"]]]
            ]);
        });
        it("should not include a period after other separator if a space does not follow the period", () => {
            assert.deepStrictEqual(structure(split("Hi?.x")), [
                [
                    "Sentence",
                    "Hi?",
                    [
                        ["Str", "Hi"],
                        ["Punctuation", "?"]
                    ]
                ],
                ["Sentence", ".x", [["Str", ".x"]]]
            ]);
        });
        it("should put sequential separators into a Punctuation", () => {
            assert.deepStrictEqual(structure(split("Hi!?。 Next")), [
                [
                    "Sentence",
                    "Hi!?。",
                    [
                        ["Str", "Hi"],
                        ["Punctuation", "!?。"]
                    ]
                ],
                ["WhiteSpace", " "],
                ["Sentence", "Next", [["Str", "Next"]]]
            ]);
        });
        it("should return Punctuation without Sentence if the text is only a separator", () => {
            assert.deepStrictEqual(structure(split("。")), [["Punctuation", "。"]]);
        });
        it("should ignore a separator that is not a single character", () => {
            const options = { SeparatorParser: { separatorCharacters: ["。", "!!", ""] } };
            assert.deepStrictEqual(raws(split("A。B!!C", options)), ["A。", "B!!C"]);
        });
        it("should treat a new line separator as WhiteSpace in split, because new line is tested first", () => {
            const options = { SeparatorParser: { separatorCharacters: ["\n", "。"] } };
            assert.deepStrictEqual(structure(split("A\nB。C", options)), [
                [
                    "Sentence",
                    "A\nB。",
                    [
                        ["Str", "A"],
                        ["WhiteSpace", "\n"],
                        ["Str", "B"],
                        ["Punctuation", "。"]
                    ]
                ],
                ["Sentence", "C", [["Str", "C"]]]
            ]);
        });
        it("should close a Sentence by a new line separator in splitAST, and it is not a node", () => {
            const options = { SeparatorParser: { separatorCharacters: ["\n", "。"] } };
            const paragraph = parse("A\nB。C").children[0] as TxtParagraphNode;
            const nodes = splitAST(paragraph, options).children;
            assert.deepStrictEqual(structure(nodes), [
                ["Sentence", "A\n", [["Str", "A"]]],
                [
                    "Sentence",
                    "B。",
                    [
                        ["Str", "B"],
                        ["Punctuation", "。"]
                    ]
                ],
                ["Sentence", "C", [["Str", "C"]]]
            ]);
            assert.deepStrictEqual(
                nodes.map((node) => node.range),
                [
                    [0, 2],
                    [2, 4],
                    [4, 5]
                ]
            );
        });
    });
    describe("white spaces and lines", () => {
        it("should return WhiteSpace nodes out of Sentence", () => {
            const nodes = split(" \n A. \n");
            assert.deepStrictEqual(structure(nodes), [
                ["WhiteSpace", " "],
                ["WhiteSpace", "\n"],
                ["WhiteSpace", " "],
                [
                    "Sentence",
                    "A.",
                    [
                        ["Str", "A"],
                        ["Punctuation", "."]
                    ]
                ],
                ["WhiteSpace", " "],
                ["WhiteSpace", "\n"]
            ]);
            assert.deepStrictEqual(
                nodes.map((node) => node.range),
                [
                    [0, 1],
                    [1, 2],
                    [2, 3],
                    [3, 5],
                    [5, 6],
                    [6, 7]
                ]
            );
        });
        it("should count CRLF as a line break", () => {
            assert.deepStrictEqual(
                split("A.\r\nB.").map((node) => [node.raw, node.loc]),
                [
                    ["A.", { start: { line: 1, column: 0 }, end: { line: 1, column: 2 } }],
                    ["\r\n", { start: { line: 1, column: 2 }, end: { line: 2, column: 0 } }],
                    ["B.", { start: { line: 2, column: 0 }, end: { line: 2, column: 2 } }]
                ]
            );
        });
        it("should count U+2028 as a line break, but it is a white space in Str", () => {
            assert.deepStrictEqual(
                split("A. B. C").map((node) => [node.raw, node.loc]),
                [["A. B. C", { start: { line: 1, column: 0 }, end: { line: 2, column: 4 } }]]
            );
        });
    });
    describe("abbreviations", () => {
        it("should recognize an uppercase letter out of BMP: Capital <ABBR>. Capital", () => {
            // U+1D400 MATHEMATICAL BOLD CAPITAL A, U+1D401 MATHEMATICAL BOLD CAPITAL B
            assert.deepStrictEqual(raws(split("Did Albert \u{1D400}. \u{1D401}ob go. Yes.")), [
                "Did Albert \u{1D400}. \u{1D401}ob go.",
                " ",
                "Yes."
            ]);
        });
        it("should split after an abbreviation if the next word starts with an uppercase letter out of BMP", () => {
            assert.deepStrictEqual(raws(split("It is etc. \u{1D401}ob went. Yes.")), [
                "It is etc.",
                " ",
                "\u{1D401}ob went.",
                " ",
                "Yes."
            ]);
        });
        it("should not split after an abbreviation if the next word starts with a lowercase letter out of BMP", () => {
            // U+1D41A MATHEMATICAL BOLD SMALL A
            assert.deepStrictEqual(raws(split("It is etc. \u{1D41A}b went. Yes.")), [
                "It is etc. \u{1D41A}b went.",
                " ",
                "Yes."
            ]);
        });
        it("should split after a number if the previous character is CJK and the next word is capitalized", () => {
            assert.deepStrictEqual(raws(split("日本 55. Twenty people.")), ["日本 55.", " ", "Twenty people."]);
        });
        it("should not split after a number at the start of a line", () => {
            assert.deepStrictEqual(raws(split("  1. First item.\n 2. Second item.")), [
                "  ",
                "1. First item.",
                "\n",
                " ",
                "2. Second item."
            ]);
        });
        it("should not split after a number that follows the end of a sentence", () => {
            assert.deepStrictEqual(raws(split("The first item. 2. The second item.")), [
                "The first item.",
                " ",
                "2. The second item."
            ]);
        });
        it("should use the current words of the language even if words are added to the lists", () => {
            const language = {
                ABBREVIATIONS: ["Foo."],
                PREPOSITIVE_ABBREVIATIONS: [] as string[],
                EXCLAMATION_WORDS: [] as string[]
            };
            const options = { AbbrMarker: { language } };
            const text = "It is foo. bar. baz. Wow! is. SEÑOR. Lopez.";
            assert.deepStrictEqual(raws(split(text, options)), [
                "It is foo. bar.",
                " ",
                "baz.",
                " ",
                "Wow!",
                " ",
                "is.",
                " ",
                "SEÑOR.",
                " ",
                "Lopez."
            ]);
            language.ABBREVIATIONS.push("Bar.");
            language.EXCLAMATION_WORDS.push("Wow!");
            // It is compared without case sensitivity, and it works for non-ASCII words
            language.PREPOSITIVE_ABBREVIATIONS.push("Señor.");
            assert.deepStrictEqual(raws(split(text, options)), [
                "It is foo. bar. baz.",
                " ",
                "Wow! is.",
                " ",
                "SEÑOR. Lopez."
            ]);
        });
    });
    describe("children of the paragraph", () => {
        const paragraph = parse("First `code.` is here. Second one.").children[0] as TxtParagraphNode;
        it("should stop at a gap between children", () => {
            const [str, , rest] = paragraph.children;
            const nodes = splitAST({ ...paragraph, children: [str, rest] } as TxtParagraphNode).children;
            assert.deepStrictEqual(raws(nodes), ["First "]);
        });
        it("should return no node if the first child is before the paragraph", () => {
            const nodes = splitAST({ ...paragraph, range: [5, 39] } as TxtParagraphNode).children;
            assert.deepStrictEqual(nodes, []);
        });
    });
});
