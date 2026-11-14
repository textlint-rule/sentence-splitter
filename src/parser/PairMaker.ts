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
// key: UTF-16 code unit of the start mark or the end mark
const PAIR_MARKS_CODE_Map = new Map<number, PairMark>(
    DEFAULT_PAIR_MARKS.flatMap((mark) => {
        return [
            [mark.start.charCodeAt(0), mark],
            [mark.end.charCodeAt(0), mark]
        ];
    })
);

// Bit set of `code & 31` of the pair marks.
// It is used for filtering out most characters without looking up the Map
let PAIR_MARKS_CODE_BITS = 0;
for (const code of PAIR_MARKS_CODE_Map.keys()) {
    PAIR_MARKS_CODE_BITS |= 1 << (code & 31);
}

export class PairMaker implements AbstractMarker {
    canMark(code: number) {
        return (PAIR_MARKS_CODE_BITS & (1 << (code & 31))) !== 0 && PAIR_MARKS_CODE_Map.has(code);
    }

    mark(sourceCode: SourceCode): void {
        const code = sourceCode.readCode();
        if (code === -1) {
            return;
        }
        const pairMark = this.canMark(code) ? PAIR_MARKS_CODE_Map.get(code) : undefined;
        if (!pairMark) {
            return;
        }
        const string = String.fromCharCode(code);
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
