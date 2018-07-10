import * as assert from "assert";
import { ASTNodeTypes, TxtParentNode } from "@textlint/ast-node-types";
import { split as splitSentences, splitAST, Syntax } from "../src/sentence-splitter";

describe("sentence-splitter", function() {
    it("should return array", function() {
        const sentences = splitSentences("text");
        assert.equal(sentences.length, 1);
        const sentence = sentences[0];
        assert.strictEqual(sentence.raw, "text");
        assert.strictEqual(typeof sentence.value, "undefined");
        assert.deepEqual(sentences[0].loc.start, { line: 1, column: 0 });
        assert.deepEqual(sentences[0].loc.end, { line: 1, column: 4 });
    });

    it("should not split number", function() {
        const sentences = splitSentences("Temperature is 40.2 degrees.");
        assert.equal(sentences.length, 1);
        const [sentence] = sentences;
        assert.strictEqual(sentence.type, Syntax.Sentence);
        assert.strictEqual(sentence.raw, "Temperature is 40.2 degrees.");
        assert.deepEqual(sentence.range, [0, 28]);
    });
    it("should not split in pair string which pair string is same mark", function() {
        const sentences = splitSentences(`I hear "I'm back to home." from radio.`);
        assert.equal(sentences.length, 1);
        const [sentence] = sentences;
        assert.strictEqual(sentence.type, Syntax.Sentence);
        assert.strictEqual(sentence.raw, `I hear "I'm back to home." from radio.`);
        assert.deepEqual(sentence.range, [0, 38]);
    });
    it("should not split in pair string", function() {
        const sentences = splitSentences(`彼は「ココにある。」と言った。`);
        assert.equal(sentences.length, 1);
        const [sentence] = sentences;
        assert.strictEqual(sentence.type, Syntax.Sentence);
        assert.strictEqual(sentence.raw, `彼は「ココにある。」と言った。`);
        assert.deepEqual(sentence.range, [0, 15]);
    });
    it("should not split in pair string and correct after sentence", function() {
        const sentences = splitSentences(`彼は「ココにある。」と言った。だけではそれは違った。`);
        assert.equal(sentences.length, 2);
        const [sentence1, sentence2] = sentences;
        assert.strictEqual(sentence1.type, Syntax.Sentence);
        assert.strictEqual(sentence1.raw, `彼は「ココにある。」と言った。`);
        assert.deepEqual(sentence1.range, [0, 15]);

        assert.strictEqual(sentence2.type, Syntax.Sentence);
        assert.strictEqual(sentence2.raw, `だけではそれは違った。`);
        assert.deepEqual(sentence2.range, [15, 26]);
    });
    it("should return sentences split by first line break", function() {
        const sentences = splitSentences("\ntext");
        assert.equal(sentences.length, 2);
        const whiteSpace0 = sentences[0];
        assert.strictEqual(whiteSpace0.type, Syntax.WhiteSpace);
        assert.strictEqual(whiteSpace0.raw, "\n");
        assert.deepEqual(whiteSpace0.loc.start, { line: 1, column: 0 });
        assert.deepEqual(whiteSpace0.loc.end, { line: 2, column: 0 });
        assert.equal(sentences[1].children.length, 1);
        const text = sentences[1].children[0];
        assert.strictEqual(text.type, ASTNodeTypes.Str);
        assert.strictEqual(text.raw, "text");
        assert.deepEqual(text.loc.start, { line: 2, column: 0 });
        assert.deepEqual(text.loc.end, { line: 2, column: 4 });
    });
    it("should return sentences split by last line break", function() {
        const sentences = splitSentences("text\n");
        assert.equal(sentences.length, 1);
        const [sentence0, whiteSpace1] = sentences[0].children;
        assert.strictEqual(sentence0.type, ASTNodeTypes.Str);
        assert.strictEqual(sentence0.raw, "text");
        assert.deepEqual(sentence0.loc.start, { line: 1, column: 0 });
        assert.deepEqual(sentence0.loc.end, { line: 1, column: 4 });
        assert.strictEqual(whiteSpace1.type, Syntax.WhiteSpace);
        assert.strictEqual(whiteSpace1.raw, "\n");
        assert.deepEqual(whiteSpace1.loc.start, { line: 1, column: 4 });
        assert.deepEqual(whiteSpace1.loc.end, { line: 2, column: 0 });
    });
    it("should return sentences split by line break*2", function() {
        const sentences = splitSentences("text\n\ntext");
        assert.equal(sentences.length, 1);
        assert.equal(sentences[0].children.length, 3);
        const [sentence0, whiteSpace1, sentence3] = sentences[0].children;
        assert.strictEqual(sentence0.type, ASTNodeTypes.Str);
        assert.strictEqual(sentence0.raw, "text");
        assert.deepEqual(sentence0.loc.start, { line: 1, column: 0 });
        assert.deepEqual(sentence0.loc.end, { line: 1, column: 4 });
        assert.strictEqual(whiteSpace1.type, Syntax.WhiteSpace);
        assert.strictEqual(whiteSpace1.raw, "\n\n");
        assert.deepEqual(whiteSpace1.loc.start, { line: 1, column: 4 });
        assert.deepEqual(whiteSpace1.loc.end, { line: 3, column: 0 });
        assert.strictEqual(sentence3.type, ASTNodeTypes.Str);
        assert.strictEqual(sentence3.raw, "text");
        assert.deepEqual(sentence3.loc.start, { line: 3, column: 0 });
        assert.deepEqual(sentence3.loc.end, { line: 3, column: 4 });
    });
    it("should return sentences split by 。", function() {
        const sentences = splitSentences("text。。text");
        assert.equal(sentences.length, 2);
        const [sentence0, punctuation] = sentences[0].children;
        assert.strictEqual(sentence0.raw, "text");
        assert.deepEqual(sentence0.loc.start, { line: 1, column: 0 });
        assert.deepEqual(sentence0.loc.end, { line: 1, column: 4 });
        assert.strictEqual(punctuation.raw, "。。");
        assert.deepEqual(punctuation.loc.start, { line: 1, column: 4 });
        assert.deepEqual(punctuation.loc.end, { line: 1, column: 6 });
        const [sentence1] = sentences[1].children;
        assert.strictEqual(sentence1.raw, "text");
        assert.deepEqual(sentence1.loc.start, { line: 1, column: 6 });
        assert.deepEqual(sentence1.loc.end, { line: 1, column: 10 });
    });
    it("should return sentences split by 。 and linebreak", function() {
        const sentences = splitSentences("text。\ntext");
        assert.equal(sentences.length, 3);
        const sentence0 = sentences[0];
        assert.strictEqual(sentence0.raw, "text。");
        assert.deepEqual(sentence0.loc.start, { line: 1, column: 0 });
        assert.deepEqual(sentence0.loc.end, { line: 1, column: 5 });
        const whiteSpace1 = sentences[1];
        assert.strictEqual(whiteSpace1.raw, "\n");
        assert.deepEqual(whiteSpace1.loc.start, { line: 1, column: 5 });
        assert.deepEqual(whiteSpace1.loc.end, { line: 2, column: 0 });
        const sentence2 = sentences[2];
        assert.strictEqual(sentence2.raw, "text");
        assert.deepEqual(sentence2.loc.start, { line: 2, column: 0 });
        assert.deepEqual(sentence2.loc.end, { line: 2, column: 4 });
    });
    it("should return sentences split by . and whitespace", function() {
        const sentences = splitSentences("1st text. 2nd text");
        assert.equal(sentences.length, 3);
        const sentence0 = sentences[0];
        assert.strictEqual(sentence0.raw, "1st text.");
        assert.deepEqual(sentence0.loc.start, { line: 1, column: 0 });
        assert.deepEqual(sentence0.loc.end, { line: 1, column: 9 });
        const whiteSpace1 = sentences[1];
        assert.strictEqual(whiteSpace1.raw, " ");
        assert.deepEqual(whiteSpace1.loc.start, { line: 1, column: 9 });
        assert.deepEqual(whiteSpace1.loc.end, { line: 1, column: 10 });
        const sentence2 = sentences[2];
        assert.strictEqual(sentence2.raw, "2nd text");
        assert.deepEqual(sentence2.loc.start, { line: 1, column: 10 });
        assert.deepEqual(sentence2.loc.end, { line: 1, column: 18 });
    });
    it("should return sentences split by multiple whitespaces", function() {
        const sentences = splitSentences("1st text.   2nd text");
        assert.equal(sentences.length, 3);
        const [sentence0, whitespace0, sentence1] = sentences;
        assert.strictEqual(sentence0.raw, "1st text.");
        assert.deepEqual(sentence0.range, [0, 9]);
        assert.strictEqual(whitespace0.type, Syntax.WhiteSpace);
        assert.strictEqual(whitespace0.value, "   ");
        assert.deepEqual(whitespace0.range, [9, 12]);
        assert.strictEqual(sentence1.raw, "2nd text");
        assert.deepEqual(sentence1.range, [12, 20]);
    });
    it("should support start and end whitespace", function() {
        const sentences = splitSentences(" text. ");
        assert.equal(sentences.length, 1 + 2);
        const [whitespace0, sentence0, whitespace1] = sentences;
        assert.strictEqual(whitespace0.type, Syntax.WhiteSpace);
        assert.strictEqual(whitespace0.value, " ");
        assert.deepEqual(whitespace0.range, [0, 1]);

        assert.strictEqual(sentence0.raw, "text.");
        assert.deepEqual(sentence0.range, [1, 6]);

        assert.strictEqual(whitespace1.type, Syntax.WhiteSpace);
        assert.strictEqual(whitespace1.value, " ");
        assert.deepEqual(whitespace1.range, [6, 7]);
    });
    it("should return sentences split by text and whitespaces, and new line", function() {
        const sentences = splitSentences("1st text. \n 2nd text");
        assert.equal(sentences.length, 3);
        const [sentence0, lineBreak, sentence1] = sentences;
        assert.strictEqual(sentence0.raw, "1st text.");
        assert.deepEqual(sentence0.range, [0, 9]);
        assert.strictEqual(lineBreak.type, Syntax.WhiteSpace);
        assert.strictEqual(lineBreak.value, " \n ");
        assert.strictEqual(sentence1.raw, "2nd text");
        assert.deepEqual(sentence1.range, [12, 20]);
    });
    it("should return sentences split by !?", function() {
        const sentences = splitSentences("text!?text");
        assert.equal(sentences.length, 2);
        const sentence0 = sentences[0];
        assert.strictEqual(sentence0.raw, "text!?");
        assert.deepEqual(sentence0.loc.start, { line: 1, column: 0 });
        assert.deepEqual(sentence0.loc.end, { line: 1, column: 6 });
        const sentence1 = sentences[1];
        assert.strictEqual(sentence1.raw, "text");
        assert.deepEqual(sentence1.loc.start, { line: 1, column: 6 });
        assert.deepEqual(sentence1.loc.end, { line: 1, column: 10 });
    });
    it("should sentences split by last 。", function() {
        const sentences = splitSentences("text。");
        assert.equal(sentences.length, 1);
        const sentence = sentences[0];
        assert.strictEqual(sentence.raw, "text。");
        assert.deepEqual(sentences[0].loc.start, { line: 1, column: 0 });
        assert.deepEqual(sentences[0].loc.end, { line: 1, column: 5 });
    });

    describe("splitAST", () => {
        it("should handle empty child", () => {
            const paragraphNode: TxtParentNode = {
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
            assert.deepEqual(resultParagraph, paragraphNode, "same result");
        });
    });
});
