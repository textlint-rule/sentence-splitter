import type { TxtNode } from "@textlint/ast-node-types";
import { PAIR_MARKS, PairMark } from "./CharacterTable.js";
import {
    ScanResult,
    TOKEN_NODE,
    TOKEN_PUNCTUATION,
    TOKEN_SENTENCE_CLOSE,
    TOKEN_SENTENCE_OPEN,
    TOKEN_SIZE
} from "./scanner.js";

type Position = { line: number; column: number };
type Location = { start: Position; end: Position };
type PairMarkContext = {
    type: "PairMark";
    pairMark: PairMark;
    range: readonly [number, number];
    loc: Location;
};

const NODE_TYPES = ["Str", "WhiteSpace", "Punctuation"] as const;

// Start indexes of the lines. It is reused between calls.
const lineStarts: number[] = [0];
const lineTerminatorPattern = /[\r\n\u2028\u2029]/g;
/**
 * Collect the start indexes of the lines into `lineStarts`.
 * The line terminators are the same as structured-source.
 */
const collectLineStarts = (text: string) => {
    lineStarts.length = 1;
    lineTerminatorPattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = lineTerminatorPattern.exec(text)) !== null) {
        let index = match.index;
        if (text.charCodeAt(index) === 0x0d && text.charCodeAt(index + 1) === 0x0a) {
            index += 1;
        }
        lineStarts.push(index + 1);
        lineTerminatorPattern.lastIndex = index + 1;
    }
};

/**
 * Return the index of `lineStarts` for the index of the text. It is the last line that starts at `index` or before.
 */
const findLineIndex = (index: number): number => {
    let low = 0;
    let high = lineStarts.length;
    while (high - low > 1) {
        const middle = (low + high) >>> 1;
        if (lineStarts[middle] <= index) {
            low = middle;
        } else {
            high = middle;
        }
    }
    return low;
};

/**
 * Build the nodes from the tokens of the scanner.
 * This is the only place that creates node objects and slices strings.
 *
 * @param scanned tokens
 * @param text scanned text
 * @param children child nodes of the parent node. TOKEN_NODE refers to it by index
 * @param startOffset offset of `text` in the file
 * @param startLine line of the start of `text` in the file (1-based)
 * @param startColumn column of the start of `text` in the file
 * @param firstChildPadding offset of the first child in `text`
 */
export const build = (
    scanned: ScanResult,
    text: string,
    children: readonly TxtNode[] | undefined,
    startOffset: number,
    startLine: number,
    startColumn: number,
    firstChildPadding: number
): any[] => {
    const { tokens, tokenLength } = scanned;
    const results: any[] = [];
    if (tokenLength === 0) {
        return results;
    }
    collectLineStarts(text);
    const lineCount = lineStarts.length;
    // The tokens are ordered by index, so the line of an index is found by moving a cursor forward.
    let lineIndex = 0;
    let nextLineStart = lineCount > 1 ? lineStarts[1] : Infinity;
    // Position of the first line is translated by the start of the parent node
    let lineStart = -startColumn;
    const createPosition = (index: number): Position => {
        while (index >= nextLineStart) {
            lineIndex++;
            lineStart = nextLineStart;
            nextLineStart = lineIndex + 1 < lineCount ? lineStarts[lineIndex + 1] : Infinity;
        }
        return { line: startLine + lineIndex, column: index - lineStart };
    };
    const createPositionAtRandom = (index: number): Position => {
        const line = findLineIndex(index);
        return { line: startLine + line, column: line === 0 ? index + startColumn : index - lineStarts[line] };
    };

    // The pair mark contexts are created once in the order of the start, and each Sentence takes its part
    let contexts: PairMarkContext[] | undefined;
    const createContexts = (): PairMarkContext[] => {
        const { pairMarkIds, pairMarkStarts, pairMarkEnds, pairMarkLength } = scanned;
        // Order by the start. The pair marks are recorded in the order of closing.
        const order: number[] = [];
        for (let i = 0; i < pairMarkLength; i++) {
            order.push(i);
        }
        order.sort((a, b) => pairMarkStarts[a] - pairMarkStarts[b]);
        const list: PairMarkContext[] = [];
        // The range of a pair mark does not include the padding of the first child
        const contextOffset = startOffset - firstChildPadding;
        for (let i = 0; i < pairMarkLength; i++) {
            const pairMarkIndex = order[i];
            const start = pairMarkStarts[pairMarkIndex];
            const end = pairMarkEnds[pairMarkIndex];
            list.push({
                type: "PairMark",
                pairMark: PAIR_MARKS[pairMarkIds[pairMarkIndex]],
                range: [start + contextOffset, end + contextOffset],
                loc: {
                    start: createPositionAtRandom(start - firstChildPadding),
                    end: createPositionAtRandom(end - firstChildPadding)
                }
            });
        }
        return list;
    };

    // Nodes are pushed into the current Sentence, or the results
    let current = results;
    let isSentenceOpened = false;
    // Count of the pair marks that are closed before the current Sentence
    let prevContextCount = 0;
    for (let i = 0; i < tokenLength; i += TOKEN_SIZE) {
        const kind = tokens[i];
        if (kind <= TOKEN_PUNCTUATION) {
            // Str, WhiteSpace, or Punctuation
            const start = tokens[i + 1];
            const end = tokens[i + 2];
            const value = text.slice(start, end);
            current.push({
                type: NODE_TYPES[kind],
                raw: value,
                value: value,
                loc: {
                    start: createPosition(start),
                    end: createPosition(end)
                },
                range: [start + startOffset, end + startOffset]
            });
        } else if (kind === TOKEN_NODE) {
            current.push(children![tokens[i + 1]]);
        } else if (kind === TOKEN_SENTENCE_OPEN) {
            current = [];
            isSentenceOpened = true;
        } else if (kind === TOKEN_SENTENCE_CLOSE) {
            const end = tokens[i + 1];
            const contextCount = tokens[i + 2];
            const sentenceChildren = current;
            current = results;
            isSentenceOpened = false;
            const firstChild = sentenceChildren[0];
            const startOffsetOfSentence: number = firstChild.range[0];
            if (contextCount > prevContextCount && contexts === undefined) {
                contexts = createContexts();
            }
            results.push({
                type: "Sentence",
                raw: text.slice(Math.max(startOffsetOfSentence - startOffset, 0), Math.max(end, 0)),
                loc: {
                    start: firstChild.loc.start,
                    end: createPosition(end)
                },
                range: [startOffsetOfSentence, end + startOffset],
                children: sentenceChildren,
                // A Sentence has the pair marks that are closed in the Sentence.
                // The pair marks of a Sentence are sequential in the ordered list,
                // because a Sentence is not closed in a pair mark.
                contexts: contextCount > prevContextCount ? contexts!.slice(prevContextCount, contextCount) : []
            });
            prevContextCount = contextCount;
        }
    }
    // unreachable: the scanner always closes the opened Sentence
    if (isSentenceOpened) {
        throw new Error("Sentence is not closed");
    }
    return results;
};
