import { source } from "./pragmatic_segmenter/test";
import { split, Syntax } from "../src/sentence-splitter";
import * as assert from "assert";

describe("pragmatic_segmenter Golden rule", () => {
    source.filter(sourceItem => !(sourceItem as any).skip).forEach(sourceItem => {
        it(`${sourceItem.name}`, () => {
            const sentences = split(sourceItem.input);
            const sentenceTexts = sentences
                .filter(node => {
                    return node.type === Syntax.Sentence;
                })
                .map(node => {
                    return node.raw;
                });
            assert.deepStrictEqual(sentenceTexts, sourceItem.output);
        });
    });
});
