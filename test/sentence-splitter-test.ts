import * as assert from "node:assert";
import { ASTNodeTypes, TxtParagraphNode } from "@textlint/ast-node-types";
import {
    DefaultSentenceSplitterOptions,
    SentenceSplitterSyntax,
    split as splitSentences,
    splitAST,
    TxtParentNodeWithSentenceNode,
    TxtSentenceNode,
    TxtWhiteSpaceNode
} from "../src/sentence-splitter.js";
import { English } from "../src/parser/lang/index.js";
import { parse } from "@textlint/markdown-to-ast";

const getSentence = (children: TxtParentNodeWithSentenceNode["children"], index: number): TxtSentenceNode => {
    const sentence = children[index];
    assert.strictEqual(sentence.type, SentenceSplitterSyntax.Sentence);
    return sentence;
};
const getWhitespace = (children: TxtParentNodeWithSentenceNode["children"], index: number): TxtWhiteSpaceNode => {
    const sentence = children[index];
    assert.strictEqual(sentence.type, SentenceSplitterSyntax.WhiteSpace);
    return sentence;
};
describe("sentence-splitter", function () {
    it("should return array", function () {
        const sentences = splitSentences("text");
        assert.equal(sentences.length, 1);
        const sentence = getSentence(sentences, 0);
        assert.strictEqual(sentence.raw, "text");
        // @ts-expect-error
        assert.strictEqual(typeof sentence.value, "undefined");
        assert.deepStrictEqual(getSentence(sentences, 0).loc.start, { line: 1, column: 0 });
        assert.deepStrictEqual(getSentence(sentences, 0).loc.end, { line: 1, column: 4 });
    });

    it("should not split number", function () {
        const sentences = splitSentences("Temperature is 40.2 degrees.");
        assert.equal(sentences.length, 1);
        const [sentence] = sentences;
        assert.strictEqual(sentence.type, SentenceSplitterSyntax.Sentence);
        assert.strictEqual(sentence.raw, "Temperature is 40.2 degrees.");
        assert.deepStrictEqual(sentence.range, [0, 28]);
    });
    it("should not split in pair string which pair string is same mark", function () {
        const sentences = splitSentences(`I hear "I'm back to home." from radio.`);
        assert.equal(sentences.length, 1);
        const [sentence] = sentences;
        assert.strictEqual(sentence.type, SentenceSplitterSyntax.Sentence);
        assert.strictEqual(sentence.raw, `I hear "I'm back to home." from radio.`);
        assert.deepStrictEqual(sentence.range, [0, 38]);
    });
    it("should not split in pair string", function () {
        const sentences = splitSentences(`彼は「ココにある。」と言った。`);
        assert.equal(sentences.length, 1);
        const [sentence] = sentences;
        assert.strictEqual(sentence.type, SentenceSplitterSyntax.Sentence);
        assert.strictEqual(sentence.raw, `彼は「ココにある。」と言った。`);
        assert.deepStrictEqual(sentence.range, [0, 15]);
    });
    it("should not split in pair string and correct after sentence", function () {
        const sentences = splitSentences(`彼は「ココにある。」と言った。だけではそれは違った。`);
        assert.equal(sentences.length, 2);
        const [sentence1, sentence2] = sentences;
        assert.strictEqual(sentence1.type, SentenceSplitterSyntax.Sentence);
        assert.strictEqual(sentence1.raw, `彼は「ココにある。」と言った。`);
        assert.deepStrictEqual(sentence1.range, [0, 15]);

        assert.strictEqual(sentence2.type, SentenceSplitterSyntax.Sentence);
        assert.strictEqual(sentence2.raw, `だけではそれは違った。`);
        assert.deepStrictEqual(sentence2.range, [15, 26]);
    });
    it("should return sentences split by first line break", function () {
        const sentences = splitSentences("\ntext");
        assert.equal(sentences.length, 2);
        const whiteSpace0 = getWhitespace(sentences, 0);
        assert.strictEqual(whiteSpace0.type, SentenceSplitterSyntax.WhiteSpace);
        assert.strictEqual(whiteSpace0.raw, "\n");
        assert.deepStrictEqual(whiteSpace0.loc.start, { line: 1, column: 0 });
        assert.deepStrictEqual(whiteSpace0.loc.end, { line: 2, column: 0 });
        assert.equal(getSentence(sentences, 1).children.length, 1);
        const text = getSentence(sentences, 1).children[0];
        assert.strictEqual(text.type, ASTNodeTypes.Str);
        assert.strictEqual(text.raw, "text");
        assert.deepStrictEqual(text.loc.start, { line: 2, column: 0 });
        assert.deepStrictEqual(text.loc.end, { line: 2, column: 4 });
    });
    it("should return sentences split by last line break", function () {
        const sentences = splitSentences("text\n");
        assert.equal(sentences.length, 1);
        const [sentence0, whiteSpace1] = getSentence(sentences, 0).children;
        assert.strictEqual(sentence0.type, ASTNodeTypes.Str);
        assert.strictEqual(sentence0.raw, "text");
        assert.deepStrictEqual(sentence0.loc.start, { line: 1, column: 0 });
        assert.deepStrictEqual(sentence0.loc.end, { line: 1, column: 4 });
        assert.strictEqual(whiteSpace1.type, SentenceSplitterSyntax.WhiteSpace);
        assert.strictEqual(whiteSpace1.raw, "\n");
        assert.deepStrictEqual(whiteSpace1.loc.start, { line: 1, column: 4 });
        assert.deepStrictEqual(whiteSpace1.loc.end, { line: 2, column: 0 });
    });
    it("should return sentences split by line break*2", function () {
        const sentences = splitSentences("text\n\ntext");
        assert.equal(sentences.length, 1);
        assert.equal(getSentence(sentences, 0).children.length, 3);
        const [sentence0, whiteSpace1, sentence3] = getSentence(sentences, 0).children;
        assert.strictEqual(sentence0.type, ASTNodeTypes.Str);
        assert.strictEqual(sentence0.raw, "text");
        assert.deepStrictEqual(sentence0.loc.start, { line: 1, column: 0 });
        assert.deepStrictEqual(sentence0.loc.end, { line: 1, column: 4 });
        assert.strictEqual(whiteSpace1.type, SentenceSplitterSyntax.WhiteSpace);
        assert.strictEqual(whiteSpace1.raw, "\n\n");
        assert.deepStrictEqual(whiteSpace1.loc.start, { line: 1, column: 4 });
        assert.deepStrictEqual(whiteSpace1.loc.end, { line: 3, column: 0 });
        assert.strictEqual(sentence3.type, ASTNodeTypes.Str);
        assert.strictEqual(sentence3.raw, "text");
        assert.deepStrictEqual(sentence3.loc.start, { line: 3, column: 0 });
        assert.deepStrictEqual(sentence3.loc.end, { line: 3, column: 4 });
    });
    it("should return sentences split by 。", function () {
        const sentences = splitSentences("text。。text");
        assert.equal(sentences.length, 2);
        const [sentence0, punctuation] = getSentence(sentences, 0).children;
        assert.strictEqual(sentence0.raw, "text");
        assert.deepStrictEqual(sentence0.loc.start, { line: 1, column: 0 });
        assert.deepStrictEqual(sentence0.loc.end, { line: 1, column: 4 });
        assert.strictEqual(punctuation.raw, "。。");
        assert.deepStrictEqual(punctuation.loc.start, { line: 1, column: 4 });
        assert.deepStrictEqual(punctuation.loc.end, { line: 1, column: 6 });
        const [sentence1] = getSentence(sentences, 1).children;
        assert.strictEqual(sentence1.raw, "text");
        assert.deepStrictEqual(sentence1.loc.start, { line: 1, column: 6 });
        assert.deepStrictEqual(sentence1.loc.end, { line: 1, column: 10 });
    });
    it("should return sentences split by 。 and linebreak", function () {
        const sentences = splitSentences("text。\ntext");
        assert.equal(sentences.length, 3);
        const sentence0 = getSentence(sentences, 0);
        assert.strictEqual(sentence0.raw, "text。");
        assert.deepStrictEqual(sentence0.loc.start, { line: 1, column: 0 });
        assert.deepStrictEqual(sentence0.loc.end, { line: 1, column: 5 });
        const whiteSpace1 = getWhitespace(sentences, 1);
        assert.strictEqual(whiteSpace1.raw, "\n");
        assert.deepStrictEqual(whiteSpace1.loc.start, { line: 1, column: 5 });
        assert.deepStrictEqual(whiteSpace1.loc.end, { line: 2, column: 0 });
        const sentence2 = sentences[2];
        assert.strictEqual(sentence2.raw, "text");
        assert.deepStrictEqual(sentence2.loc.start, { line: 2, column: 0 });
        assert.deepStrictEqual(sentence2.loc.end, { line: 2, column: 4 });
    });
    it("should return sentences split by . and whitespace", function () {
        const sentences = splitSentences("1st text. 2nd text");
        assert.equal(sentences.length, 3);
        const sentence0 = getSentence(sentences, 0);
        assert.strictEqual(sentence0.raw, "1st text.");
        assert.deepStrictEqual(sentence0.loc.start, { line: 1, column: 0 });
        assert.deepStrictEqual(sentence0.loc.end, { line: 1, column: 9 });
        const whiteSpace1 = getWhitespace(sentences, 1);
        assert.strictEqual(whiteSpace1.raw, " ");
        assert.deepStrictEqual(whiteSpace1.loc.start, { line: 1, column: 9 });
        assert.deepStrictEqual(whiteSpace1.loc.end, { line: 1, column: 10 });
        const sentence2 = sentences[2];
        assert.strictEqual(sentence2.raw, "2nd text");
        assert.deepStrictEqual(sentence2.loc.start, { line: 1, column: 10 });
        assert.deepStrictEqual(sentence2.loc.end, { line: 1, column: 18 });
    });
    it("should return sentences split by multiple whitespaces", function () {
        const sentences = splitSentences("1st text.   2nd text");
        assert.equal(sentences.length, 3);
        const [sentence0, whitespace0, sentence1] = sentences;
        assert.strictEqual(sentence0.raw, "1st text.");
        assert.deepStrictEqual(sentence0.range, [0, 9]);
        assert.strictEqual(whitespace0.type, SentenceSplitterSyntax.WhiteSpace);
        assert.strictEqual(whitespace0.value, "   ");
        assert.deepStrictEqual(whitespace0.range, [9, 12]);
        assert.strictEqual(sentence1.raw, "2nd text");
        assert.deepStrictEqual(sentence1.range, [12, 20]);
    });
    it("should support start and end whitespace", function () {
        const sentences = splitSentences(" text. ");
        assert.equal(sentences.length, 1 + 2);
        const [whitespace0, sentence0, whitespace1] = sentences;
        assert.strictEqual(whitespace0.type, SentenceSplitterSyntax.WhiteSpace);
        assert.strictEqual(whitespace0.value, " ");
        assert.deepStrictEqual(whitespace0.range, [0, 1]);

        assert.strictEqual(sentence0.raw, "text.");
        assert.deepStrictEqual(sentence0.range, [1, 6]);

        assert.strictEqual(whitespace1.type, SentenceSplitterSyntax.WhiteSpace);
        assert.strictEqual(whitespace1.value, " ");
        assert.deepStrictEqual(whitespace1.range, [6, 7]);
    });
    it("should return sentences split by text and whitespaces, and new line", function () {
        const sentences = splitSentences("1st text. \n 2nd text");
        assert.strictEqual(sentences.length, 5);
        const [sentence0, whitespace1, lineBreak, whitespace2, sentence1] = sentences;
        assert.strictEqual(sentence0.raw, "1st text.");
        assert.deepStrictEqual(sentence0.range, [0, 9]);
        assert.strictEqual(lineBreak.type, SentenceSplitterSyntax.WhiteSpace);
        assert.strictEqual(whitespace1.type, SentenceSplitterSyntax.WhiteSpace);
        assert.strictEqual(whitespace1.value, " ");
        assert.strictEqual(lineBreak.type, SentenceSplitterSyntax.WhiteSpace);
        assert.strictEqual(lineBreak.value, "\n");
        assert.strictEqual(whitespace2.type, SentenceSplitterSyntax.WhiteSpace);
        assert.strictEqual(whitespace2.value, " ");
        assert.strictEqual(sentence1.raw, "2nd text");
        assert.deepStrictEqual(sentence1.range, [12, 20]);
    });
    it("should return sentences split by !?", function () {
        const sentences = splitSentences("text!?text");
        assert.equal(sentences.length, 2);
        const sentence0 = getSentence(sentences, 0);
        assert.strictEqual(sentence0.raw, "text!?");
        assert.deepStrictEqual(sentence0.loc.start, { line: 1, column: 0 });
        assert.deepStrictEqual(sentence0.loc.end, { line: 1, column: 6 });
        const sentence1 = getSentence(sentences, 1);
        assert.strictEqual(sentence1.raw, "text");
        assert.deepStrictEqual(sentence1.loc.start, { line: 1, column: 6 });
        assert.deepStrictEqual(sentence1.loc.end, { line: 1, column: 10 });
    });
    it("should sentences split by last 。", function () {
        const sentences = splitSentences("text。");
        assert.equal(sentences.length, 1);
        const sentence = getSentence(sentences, 0);
        assert.strictEqual(sentence.raw, "text。");
        assert.deepStrictEqual(getSentence(sentences, 0).loc.start, { line: 1, column: 0 });
        assert.deepStrictEqual(getSentence(sentences, 0).loc.end, { line: 1, column: 5 });
    });
    it("should not split line indexes", function () {
        const sentences = splitSentences("1. 1st text.\n2. 2nd text.");
        assert.equal(sentences.length, 3);
        const [sentence0, whiteSpace0, sentence1] = sentences;
        assert.strictEqual(whiteSpace0.type, SentenceSplitterSyntax.WhiteSpace);
        assert.strictEqual(whiteSpace0.raw, "\n");
        assert.strictEqual(sentence0.raw, "1. 1st text.");
        assert.strictEqual(sentence1.raw, "2. 2nd text.");
    });
    it("should not split inline list indexes", function () {
        const sentences = splitSentences("1. The first item. 2. The second item.");
        assert.equal(sentences.length, 3);
        assert.strictEqual(getSentence(sentences, 0).raw, "1. The first item.");
        assert.strictEqual(getSentence(sentences, 2).raw, "2. The second item.");
    });
    it("should not split number + period followed by a lowercase word", function () {
        const sentences = splitSentences("See section 4. it is important.");
        assert.equal(sentences.length, 1);
    });
    // https://github.com/textlint-rule/sentence-splitter/issues/41
    it("should split sentence that ends with a number", function () {
        const sentences = splitSentences(
            "The crash involved 158 cars on a big road called Interstate 55. Twenty-five people got hurt in the crash."
        );
        assert.equal(sentences.length, 3);
        assert.strictEqual(
            getSentence(sentences, 0).raw,
            "The crash involved 158 cars on a big road called Interstate 55."
        );
        assert.strictEqual(getSentence(sentences, 2).raw, "Twenty-five people got hurt in the crash.");
    });

    describe("splitAST", () => {
        it("should handle empty child", () => {
            const paragraphNode: TxtParagraphNode = {
                type: "Paragraph",
                children: [],
                loc: {
                    start: {
                        line: 1,
                        column: 0
                    },
                    end: {
                        line: 1,
                        column: 0
                    }
                },
                range: [0, 0],
                raw: ""
            };
            const resultParagraph = splitAST(paragraphNode);
            assert.deepStrictEqual(resultParagraph, paragraphNode, "same result");
        });
    });
    describe("CJK word boundary for EXCLAMATION_WORDS", () => {
        it("should not split Yahoo! surrounded by CJK characters", () => {
            const sentences = splitSentences("すごろくや公式サイトかYahoo!ショッピングでの購入を推奨");
            assert.equal(sentences.length, 1);
            assert.strictEqual(getSentence(sentences, 0).raw, "すごろくや公式サイトかYahoo!ショッピングでの購入を推奨");
        });
        it("should not split Yahoo! preceded by CJK character", () => {
            const sentences = splitSentences("これはYahoo!です");
            assert.equal(sentences.length, 1);
            assert.strictEqual(getSentence(sentences, 0).raw, "これはYahoo!です");
        });
        it("should not split Yum! followed by CJK character", () => {
            const sentences = splitSentences("美味しいYum!だね");
            assert.equal(sentences.length, 1);
            assert.strictEqual(getSentence(sentences, 0).raw, "美味しいYum!だね");
        });
        it("should still split normal exclamation in CJK text", () => {
            const sentences = splitSentences("すごい! 次の文です");
            assert.equal(sentences.length, 3); // sentence, whitespace, sentence
            assert.strictEqual(getSentence(sentences, 0).raw, "すごい!");
            assert.strictEqual(getSentence(sentences, 2).raw, "次の文です");
        });
        it("should not split Yahoo! in English (existing behavior preserved)", () => {
            const sentences = splitSentences("She works at Yahoo! in the accounting department.");
            assert.equal(sentences.length, 1);
        });
    });
    // https://github.com/textlint-rule/sentence-splitter/issues/21
    describe("Multi-period abbreviations", () => {
        it("should not split multi-period abbreviations in the middle of a sentence", () => {
            const sentences = splitSentences("I visited the U.S.A. last year.");
            assert.equal(sentences.length, 1);
        });
        it("should split multi-period abbreviations at the end of a sentence", () => {
            const sentences = splitSentences("I was born in the U.S.A. My name is Benjamin D. Lee.");
            assert.equal(sentences.length, 3);
            assert.strictEqual(getSentence(sentences, 0).raw, "I was born in the U.S.A.");
            assert.strictEqual(getSentence(sentences, 2).raw, "My name is Benjamin D. Lee.");
        });
    });
    describe("Lang Options", () => {
        it("should allow to pass lang", () => {
            const sentences = splitSentences("text", {
                AbbrMarker: {
                    language: English
                }
            });
            assert.equal(sentences.length, 1);
        });
    });
    describe("Lang Options are changed", () => {
        it("should use the current words of the language even if the list is changed in place", () => {
            const language = { ABBREVIATIONS: ["Foo."], PREPOSITIVE_ABBREVIATIONS: [], EXCLAMATION_WORDS: [] };
            const options = { AbbrMarker: { language } };
            const text = "It is foo. bar. End.";
            assert.deepStrictEqual(
                splitSentences(text, options).map((node) => node.raw),
                ["It is foo. bar.", " ", "End."]
            );
            language.ABBREVIATIONS[0] = "Bar.";
            assert.deepStrictEqual(
                splitSentences(text, options).map((node) => node.raw),
                ["It is foo.", " ", "bar.", " ", "End."]
            );
        });
    });
    describe("separatorCharacters are changed", () => {
        it("should use the current separators even if the list is changed in place", () => {
            const separatorCharacters = ["。"];
            const options = { SeparatorParser: { separatorCharacters } };
            const text = "A。B！C";
            assert.deepStrictEqual(
                splitSentences(text, options).map((node) => node.raw),
                ["A。", "B！C"]
            );
            separatorCharacters[0] = "！";
            assert.deepStrictEqual(
                splitSentences(text, options).map((node) => node.raw),
                ["A。B！", "C"]
            );
        });
    });
    describe("contexts", () => {
        it("should have only the pair marks in the sentence", () => {
            const sentences = splitSentences('He said "A. B". Next one. Third (x) here.').filter(
                (node): node is TxtSentenceNode => node.type === SentenceSplitterSyntax.Sentence
            );
            assert.deepStrictEqual(
                sentences.map((sentence) => {
                    return { raw: sentence.raw, contexts: sentence.contexts.map((context) => context.range) };
                }),
                [
                    { raw: 'He said "A. B".', contexts: [[8, 13]] },
                    { raw: "Next one.", contexts: [] },
                    { raw: "Third (x) here.", contexts: [[32, 34]] }
                ]
            );
        });
        it("should order the pair marks in the sentence by the start position", () => {
            const [sentence] = splitSentences("He said (it is [a. b] pen.) and 「c. d」.").filter(
                (node): node is TxtSentenceNode => node.type === SentenceSplitterSyntax.Sentence
            );
            assert.deepStrictEqual(
                sentence.contexts.map((context) => context.range),
                [
                    [8, 26],
                    [15, 20],
                    [32, 37]
                ]
            );
        });
    });
    describe("children of the paragraph are not ordered", () => {
        const paragraph = parse("First `code.` is here. Second one.").children[0] as TxtParagraphNode;
        it("should use the last node when ranges of children are overlapped", () => {
            const [str, code] = paragraph.children;
            const overlapped = {
                ...paragraph,
                // Str covers the whole paragraph, and Code overlaps it
                children: [{ ...str, range: paragraph.range, raw: paragraph.raw, loc: paragraph.loc }, code]
            } as TxtParagraphNode;
            assert.deepStrictEqual(
                splitAST(overlapped).children.map((node) => node.raw),
                ["First `code.` is here.", " ", "Second one."]
            );
        });
        it("should work when children are reversed", () => {
            const reversed = { ...paragraph, children: [...paragraph.children].reverse() } as TxtParagraphNode;
            assert.deepStrictEqual(
                splitAST(reversed).children.map((node) => node.raw),
                [" ", "is here.", " ", "Second one."]
            );
        });
    });
    describe("DefaultSentenceSplitterOptions", () => {
        it("should return object", () => {
            assert.ok(typeof DefaultSentenceSplitterOptions === "object");
        });
    });
});
