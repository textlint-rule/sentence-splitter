import { SourceCode } from "./SourceCode";
import { AbstractMarker } from "./AbstractMarker";
import { debugLog } from "../logger";

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
    private pairs = {
        [`"`]: `"`,
        [`「`]: `」`,
        [`（`]: `）`,
        [`(`]: `)`,
        [`『`]: `』`,
        [`【`]: `】`,
        [`《`]: `》`
    };
    private pairKeys = Object.keys(this.pairs);
    private pairValues = Object.values(this.pairs);

    mark(sourceCode: SourceCode): void {
        const string = sourceCode.read();
        if (!string) {
            return;
        }
        // if current is in a context, should not start other context.
        // PairMaker does not support nest context by design.
        if (!sourceCode.isInContext()) {
            const keyIndex = this.pairKeys.indexOf(string);
            if (keyIndex !== -1) {
                const key = this.pairKeys[keyIndex];
                debugLog(`PairMaker -> enterContext: ${key} `, { keyIndex });
                sourceCode.enterContext(key);
            }
        } else {
            // check that string is end mark?
            const valueIndex = this.pairValues.indexOf(string);
            if (valueIndex !== -1) {
                const key = this.pairKeys[valueIndex];
                debugLog(`PairMaker -> leaveContext: ${this.pairValues[valueIndex]} `, { valueIndex });
                sourceCode.leaveContext(key);
            }
        }
    }
}
