import assert from "assert";
import { AssertionError } from "assert";
import { Syntax, split as splitSentences } from "../src/sentence-splitter";

describe("sentence-utils", function() {
    it("should return array", function() {
        let sentences = splitSentences("text");
        assert.equal(sentences.length, 1);
        let sentence = sentences[0];
        assert.strictEqual(sentence.raw, "text");
        assert.strictEqual(sentence.value, "text");
        assert.deepEqual(sentences[0].loc.start, { line: 1, column: 0 });
        assert.deepEqual(sentences[0].loc.end, { line: 1, column: 4 });
    });
    it("should return sentences split by first line break", function() {
        let sentences = splitSentences("\ntext");
        assert.equal(sentences.length, 2);
        var whiteSpace0 = sentences[0];
        assert.strictEqual(whiteSpace0.type, Syntax.WhiteSpace);
        assert.strictEqual(whiteSpace0.raw, "\n");
        assert.deepEqual(whiteSpace0.loc.start, { line: 1, column: 0 });
        assert.deepEqual(whiteSpace0.loc.end, { line: 2, column: 0 });
        var sentence1 = sentences[1];
        assert.strictEqual(sentence1.type, Syntax.Sentence);
        assert.strictEqual(sentence1.raw, "text");
        assert.deepEqual(sentence1.loc.start, { line: 2, column: 0 });
        assert.deepEqual(sentence1.loc.end, { line: 2, column: 4 });
    });
    it("should return sentences split by last line break", function() {
        let sentences = splitSentences("text\n");
        assert.equal(sentences.length, 2);
        var sentence0 = sentences[0];
        assert.strictEqual(sentence0.type, Syntax.Sentence);
        assert.strictEqual(sentence0.raw, "text");
        assert.deepEqual(sentence0.loc.start, { line: 1, column: 0 });
        assert.deepEqual(sentence0.loc.end, { line: 1, column: 4 });
        var whiteSpace1 = sentences[1];
        assert.strictEqual(whiteSpace1.type, Syntax.WhiteSpace);
        assert.strictEqual(whiteSpace1.raw, "\n");
        assert.deepEqual(whiteSpace1.loc.start, { line: 1, column: 4 });
        assert.deepEqual(whiteSpace1.loc.end, { line: 2, column: 0 });
    });
    it("should return sentences split by line break*2", function() {
        let sentences = splitSentences("text\n\ntext");
        assert.equal(sentences.length, 4);
        var sentence0 = sentences[0];
        assert.strictEqual(sentence0.type, Syntax.Sentence);
        assert.strictEqual(sentence0.raw, "text");
        assert.deepEqual(sentence0.loc.start, { line: 1, column: 0 });
        assert.deepEqual(sentence0.loc.end, { line: 1, column: 4 });
        var whiteSpace1 = sentences[1];
        assert.strictEqual(whiteSpace1.type, Syntax.WhiteSpace);
        assert.strictEqual(whiteSpace1.raw, "\n");
        assert.deepEqual(whiteSpace1.loc.start, { line: 1, column: 4 });
        assert.deepEqual(whiteSpace1.loc.end, { line: 2, column: 0 });
        var whiteSpace2 = sentences[2];
        assert.strictEqual(whiteSpace2.type, Syntax.WhiteSpace);
        assert.strictEqual(whiteSpace2.raw, "\n");
        assert.deepEqual(whiteSpace2.loc.start, { line: 2, column: 0 });
        assert.deepEqual(whiteSpace2.loc.end, { line: 3, column: 0 });
        var sentence3 = sentences[3];
        assert.strictEqual(sentence3.type, Syntax.Sentence);
        assert.strictEqual(sentence3.raw, "text");
        assert.deepEqual(sentence3.loc.start, { line: 3, column: 0 });
        assert.deepEqual(sentence3.loc.end, { line: 3, column: 4 });
    });
    it("should return sentences split by 。", function() {
        let sentences = splitSentences("text。。text");
        assert.equal(sentences.length, 2);
        var sentence0 = sentences[0];
        assert.strictEqual(sentence0.raw, "text。。");
        assert.deepEqual(sentence0.loc.start, { line: 1, column: 0 });
        assert.deepEqual(sentence0.loc.end, { line: 1, column: 6 });
        var sentence1 = sentences[1];
        assert.strictEqual(sentence1.raw, "text");
        assert.deepEqual(sentence1.loc.start, { line: 1, column: 6 });
        assert.deepEqual(sentence1.loc.end, { line: 1, column: 10 });
    });
    it("should return sentences split by 。 and linebreak", function() {
        let sentences = splitSentences("text。\ntext");
        assert.equal(sentences.length, 3);
        var sentence0 = sentences[0];
        assert.strictEqual(sentence0.raw, "text。");
        assert.deepEqual(sentence0.loc.start, { line: 1, column: 0 });
        assert.deepEqual(sentence0.loc.end, { line: 1, column: 5 });
        var whiteSpace1 = sentences[1];
        assert.strictEqual(whiteSpace1.raw, "\n");
        assert.deepEqual(whiteSpace1.loc.start, { line: 1, column: 5 });
        assert.deepEqual(whiteSpace1.loc.end, { line: 2, column: 0 });
        var sentence2 = sentences[2];
        assert.strictEqual(sentence2.raw, "text");
        assert.deepEqual(sentence2.loc.start, { line: 2, column: 0 });
        assert.deepEqual(sentence2.loc.end, { line: 2, column: 4 });
    });
    it("should return sentences split by . and whitespace", function() {
        let sentences = splitSentences("1st text. 2nd text");
        assert.equal(sentences.length, 3);
        var sentence0 = sentences[0];
        assert.strictEqual(sentence0.raw, "1st text.");
        assert.deepEqual(sentence0.loc.start, { line: 1, column: 0 });
        assert.deepEqual(sentence0.loc.end, { line: 1, column: 9 });
        var whiteSpace1 = sentences[1];
        assert.strictEqual(whiteSpace1.raw, " ");
        assert.deepEqual(whiteSpace1.loc.start, { line: 1, column: 9 });
        assert.deepEqual(whiteSpace1.loc.end, { line: 1, column: 10 });
        var sentence2 = sentences[2];
        assert.strictEqual(sentence2.raw, "2nd text");
        assert.deepEqual(sentence2.loc.start, { line: 1, column: 10 });
        assert.deepEqual(sentence2.loc.end, { line: 1, column: 18 });
    });
    it("should return sentences split by !?", function() {
        let sentences = splitSentences("text!?text");
        assert.equal(sentences.length, 2);
        var sentence0 = sentences[0];
        assert.strictEqual(sentence0.raw, "text!?");
        assert.deepEqual(sentence0.loc.start, { line: 1, column: 0 });
        assert.deepEqual(sentence0.loc.end, { line: 1, column: 6 });
        var sentence1 = sentences[1];
        assert.strictEqual(sentence1.raw, "text");
        assert.deepEqual(sentence1.loc.start, { line: 1, column: 6 });
        assert.deepEqual(sentence1.loc.end, { line: 1, column: 10 });
    });
    it("should sentences split by last 。", function() {
        let sentences = splitSentences("text。");
        assert.equal(sentences.length, 1);
        let sentence = sentences[0];
        assert.strictEqual(sentence.raw, "text。");
        assert.deepEqual(sentences[0].loc.start, { line: 1, column: 0 });
        assert.deepEqual(sentences[0].loc.end, { line: 1, column: 5 });
    });
    context("with options", function() {
        it("should separate by whiteSpace", function() {
            var options = {
                newLineCharacters: "\n\n"
            };
            let sentences = splitSentences("text\n\ntext", options);
            assert.equal(sentences.length, 4);
            var sentence0 = sentences[0];
            assert.strictEqual(sentence0.raw, "text");
            assert.deepEqual(sentence0.loc.start, { line: 1, column: 0 });
            assert.deepEqual(sentence0.loc.end, { line: 1, column: 4 });
            var whiteSpace1 = sentences[1];
            assert.strictEqual(whiteSpace1.raw, "\n");
            assert.deepEqual(whiteSpace1.loc.start, { line: 1, column: 4 });
            assert.deepEqual(whiteSpace1.loc.end, { line: 2, column: 0 });
            var whiteSpace2 = sentences[2];
            assert.strictEqual(whiteSpace2.raw, "\n");
            assert.deepEqual(whiteSpace2.loc.start, { line: 2, column: 0 });
            assert.deepEqual(whiteSpace2.loc.end, { line: 3, column: 0 });
            var sentence3 = sentences[3];
            assert.strictEqual(sentence3.raw, "text");
            assert.deepEqual(sentence3.loc.start, { line: 3, column: 0 });
            assert.deepEqual(sentence3.loc.end, { line: 3, column: 4 });
        });
        it("should separate by charRegExp", function() {
            let sentences = splitSentences("text¶text", {
                charRegExp: /¶/
            });
            assert.equal(sentences.length, 2);
            var sentence0 = sentences[0];
            assert.strictEqual(sentence0.raw, "text¶");
            assert.deepEqual(sentence0.loc.start, { line: 1, column: 0 });
            assert.deepEqual(sentence0.loc.end, { line: 1, column: 5 });
            var sentence1 = sentences[1];
            assert.strictEqual(sentence1.raw, "text");
            assert.deepEqual(sentence1.loc.start, { line: 1, column: 5 });
            assert.deepEqual(sentence1.loc.end, { line: 1, column: 9 });
        });
        it("should separate by splitChars", function() {
            let sentences = splitSentences("text¶text", {
                separatorChars: ["¶"]
            });
            assert.equal(sentences.length, 2);
            var sentence0 = sentences[0];
            assert.strictEqual(sentence0.raw, "text¶");
            assert.deepEqual(sentence0.loc.start, { line: 1, column: 0 });
            assert.deepEqual(sentence0.loc.end, { line: 1, column: 5 });
            var sentence1 = sentences[1];
            assert.strictEqual(sentence1.raw, "text");
            assert.deepEqual(sentence1.loc.start, { line: 1, column: 5 });
            assert.deepEqual(sentence1.loc.end, { line: 1, column: 9 });
        });
        it("should not set separatorChars and charRegExp", function() {
            try {
                splitSentences("text¶text", {
                    separatorChars: ["¶"],
                    charRegExp: /¶/
                });
                throw new Error("FAIL");
            } catch (error) {
                assert.ok(error instanceof AssertionError, "AssertionError");
            }
        });
    });
});
