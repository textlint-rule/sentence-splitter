/**
 * Benchmark of split() and splitAST()
 *
 * Usage:
 *   pnpm run benchmark [markdown files...]
 *
 * If no file is passed, it uses README.md of this repository.
 * The text is repeated until it reaches 200,000 characters.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { parse } from "@textlint/markdown-to-ast";
import type { TxtNode, TxtParagraphNode } from "@textlint/ast-node-types";
import { split, splitAST } from "../src/sentence-splitter.js";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const TARGET_LENGTH = 200_000;
const files = process.argv.slice(2);
const sourceText = (files.length > 0 ? files : [path.join(__dirname, "../README.md")])
    .map((filePath) => fs.readFileSync(filePath, "utf-8"))
    .join("\n\n");
const text = (sourceText + "\n\n").repeat(Math.ceil(TARGET_LENGTH / (sourceText.length + 2)));

const collectParagraphs = (node: TxtNode, paragraphs: TxtParagraphNode[] = []): TxtParagraphNode[] => {
    if (node.type === "Paragraph") {
        paragraphs.push(node as TxtParagraphNode);
    }
    for (const child of (node as { children?: TxtNode[] }).children ?? []) {
        collectParagraphs(child, paragraphs);
    }
    return paragraphs;
};

/**
 * Return the median time(ms) of `fn`
 */
const measure = (fn: () => void): number => {
    // warm up
    fn();
    fn();
    const times: number[] = [];
    const start = performance.now();
    while (times.length < 5 || performance.now() - start < 2000) {
        const startTime = performance.now();
        fn();
        times.push(performance.now() - startTime);
    }
    times.sort((a, b) => a - b);
    return times[Math.floor(times.length / 2)];
};

const paragraphs = collectParagraphs(parse(text));
// split() is for plain text. Use a part of the text, because it is not for a large text.
const plainText = paragraphs
    .map((paragraph) => paragraph.raw)
    .join("\n\n")
    .slice(0, 20_000);
const results = {
    [`splitAST: ${paragraphs.length} paragraphs in ${text.length} characters`]: measure(() => {
        for (const paragraph of paragraphs) {
            splitAST(paragraph);
        }
    }),
    [`split: ${plainText.length} characters`]: measure(() => {
        split(plainText);
    })
};
for (const [name, time] of Object.entries(results)) {
    console.log(`${name}: ${time.toFixed(2)}ms`);
}
