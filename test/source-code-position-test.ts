import * as assert from "node:assert";
import { parse } from "@textlint/markdown-to-ast";
import { StructuredSource } from "structured-source";
import { TxtNode, TxtParagraphNode } from "@textlint/ast-node-types";
import { splitAST } from "../src/sentence-splitter.js";

const collectParagraphs = (node: TxtNode, paragraphs: TxtParagraphNode[] = []): TxtParagraphNode[] => {
    if (node.type === "Paragraph") {
        paragraphs.push(node as TxtParagraphNode);
    }
    for (const child of (node as { children?: TxtNode[] }).children ?? []) {
        collectParagraphs(child, paragraphs);
    }
    return paragraphs;
};

type Located = {
    type: string;
    raw?: string;
    range: readonly [number, number];
    loc: { start: { line: number; column: number }; end: { line: number; column: number } };
    children?: Located[];
    contexts?: Located[];
};

const generatedTypes = new Set(["Sentence", "Str", "WhiteSpace", "Punctuation"]);

const assertSameAsFile = (text: string, paragraph: TxtParagraphNode) => {
    // loc must be the position in the file
    const source = new StructuredSource(text);
    const result = splitAST(paragraph);
    const visit = (node: Located) => {
        assert.deepStrictEqual(node.loc, source.rangeToLocation(node.range as [number, number]), JSON.stringify(node));
        if (generatedTypes.has(node.type)) {
            assert.strictEqual(node.raw, text.slice(node.range[0], node.range[1]), JSON.stringify(node));
        }
        (node.contexts ?? []).forEach(visit);
        if (node.type === "Sentence") {
            (node.children ?? []).forEach(visit);
        }
    };
    (result.children as Located[]).forEach(visit);
    return result;
};

const assertAllParagraphs = (text: string) => {
    const paragraphs = collectParagraphs(parse(text) as TxtNode);
    assert.ok(paragraphs.length > 0);
    return paragraphs.map((paragraph) => assertSameAsFile(text, paragraph));
};

describe("SourceCode positions of a paragraph in a file", () => {
    it("paragraph at the start of the file", () => {
        const [result] = assertAllParagraphs("This is a pen. That is a pen.\n");
        assert.deepStrictEqual(result.children[0].loc, { start: { line: 1, column: 0 }, end: { line: 1, column: 14 } });
    });
    it("paragraph after other blocks", () => {
        const text = "# Title\n\nFirst. Second.\n\nThird.\n";
        const results = assertAllParagraphs(text);
        assert.deepStrictEqual(results[0].children[0].range, [9, 15]);
        assert.strictEqual(results[0].children[0].loc.start.line, 3);
        assert.deepStrictEqual(results[1].children[0].range, [25, 31]);
        assert.strictEqual(results[1].children[0].loc.start.line, 5);
    });
    it("paragraph whose first line starts at a column (list item, block quote)", () => {
        const results = assertAllParagraphs(
            "- one. two.\n  three.\n- four.\n\n> five. six.\n> seven.\n\n  1. eight. nine.\n"
        );
        // "one." starts at column 2 of line 1, after "- "
        assert.deepStrictEqual(results[0].children[0].loc.start, { line: 1, column: 2 });
        // "five." starts at column 2 of line 5, after "> "
        assert.deepStrictEqual(results[2].children[0].loc.start, { line: 5, column: 2 });
    });
    it("multi-line paragraph: lines after the first have columns from the start of the line", () => {
        const text = "intro\n\nfoo.\nbar. baz.\n";
        const [, result] = assertAllParagraphs(text);
        const sentences = result.children.filter((node) => node.type === "Sentence");
        assert.deepStrictEqual(
            sentences.map((node) => [node.raw, node.loc]),
            [
                ["foo.", { start: { line: 3, column: 0 }, end: { line: 3, column: 4 } }],
                ["bar.", { start: { line: 4, column: 0 }, end: { line: 4, column: 4 } }],
                ["baz.", { start: { line: 4, column: 5 }, end: { line: 4, column: 9 } }]
            ]
        );
    });
    it("CRLF line breaks", () => {
        assertAllParagraphs("# Title\r\n\r\nfoo.\r\nbar. baz.\r\n\r\n- qux.\r\n  quux.\r\n");
    });
    it("surrogate pairs before and in the paragraph (UTF-16 code units)", () => {
        const text = "# 😀😀\n\n😀 is an emoji. 𠮷野家。\n🍣 again.\n";
        const [result] = assertAllParagraphs(text);
        const sentences = result.children.filter((node) => node.type === "Sentence");
        assert.deepStrictEqual(
            sentences.map((node) => node.raw),
            ["😀 is an emoji.", "𠮷野家。", "🍣 again."]
        );
    });
    it("pair mark contexts across lines", () => {
        const text = "head\n\nHe said 「foo.\nbar.」 Then.\n";
        const [, result] = assertAllParagraphs(text);
        const sentence = result.children.find((node) => node.type === "Sentence") as unknown as Located;
        assert.strictEqual(sentence.contexts?.length, 1);
        assert.deepStrictEqual(sentence.contexts?.[0].loc.end, { line: 4, column: 4 });
    });
    it("Japanese document with many paragraphs", () => {
        const text = Array.from({ length: 50 }, (_, i) => `段落${i}の文。次の文です。\n二行目。`).join("\n\n") + "\n";
        assert.strictEqual(assertAllParagraphs(text).length, 50);
    });
});
