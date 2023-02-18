import { PairMark, SourceCode } from "./SourceCode.js";
import { AbstractMarker } from "./AbstractMarker.js";
import { debugLog } from "../logger.js";

const DEFAULT_PAIR_MARKS: PairMark[] = [
    {
        key: "double quote",
        start: `"`,
        end: `"`
    },
    {
        key: "angled bracket",
        start: `[`,
        end: `]`
    },
    {
        key: "round bracket",
        start: `(`,
        end: `)`
    },
    {
        key: "curly brace",
        start: `{`,
        end: `}`
    },
    {
        key: "かぎ括弧",
        start: `「`,
        end: `」`
    },
    {
        key: "丸括弧",
        start: `（`,
        end: `）`
    },
    {
        key: "二重かぎ括弧",
        start: `『`,
        end: `』`
    },
    {
        key: "波括弧",
        start: `｛`,
        end: `｝`
    },
    {
        key: "角括弧",
        start: `［`,
        end: `］`
    },
    {
        key: "重角括弧",
        start: `〚`,
        end: `〛`
    },
    {
        key: "隅付き括弧",
        start: `【`,
        end: `】`
    },
    {
        key: "二重隅付き括弧",
        start: `《`,
        end: `》`
    }
];

/**
 * Mark pair character
 * PairMarker aim to mark pair string as a single sentence.
 *
 * For example, Following sentence has two period(。). but it should treat a single sentence
 *
 * > I hear "I'm back to home." from radio.
 *
 */
export class PairMaker implements AbstractMarker {
    private PAIR_MARKS_KEY_Map = new Map<string, PairMark>(
        DEFAULT_PAIR_MARKS.flatMap((mark) => {
            return [
                [mark.start, mark],
                [mark.end, mark]
            ];
        })
    );

    mark(sourceCode: SourceCode): void {
        const string = sourceCode.read();
        if (!string) {
            return;
        }
        const pairMark = this.PAIR_MARKS_KEY_Map.get(string);
        if (!pairMark) {
            return;
        }
        // if current is in a context, should not start other context.
        // PairMaker does not support nest context by design.
        if (!sourceCode.isInContext(pairMark)) {
            const isStart = pairMark.start === string;
            if (isStart) {
                debugLog(`PairMaker -> enterContext: ${string} `);
                sourceCode.enterContext(pairMark);
            }
        } else {
            const isEnd = pairMark.end === string;
            // check that string is end mark?
            if (isEnd) {
                debugLog(`PairMaker -> leaveContext: ${string} `);
                sourceCode.leaveContext(pairMark);
            }
        }
    }
}
