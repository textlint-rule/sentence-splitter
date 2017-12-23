import { SourceCode } from "./SourceCode";

/**
 * Mark pair character
 */
export class PairParser {
    private pairs = {
        [`"`]: `"`,
        [`'`]: `'`,
        [`「`]: `」`,
        [`（`]: `）`,
        [`(`]: `)`,
        [`『`]: `』`,
        [`【`]: `】`
    };
    private pairKeys = Object.keys(this.pairs);
    private pairValues = Object.values(this.pairs);

    mark(sourceCode: SourceCode): void {
        const string = sourceCode.read();
        if (!string) {
            return;
        }
        if (this.pairKeys.some(key => key === string)) {
            sourceCode.enterContext(string);
        } else if (this.pairValues.some(value => value === string)) {
            sourceCode.leaveContext(string);
        }
    }
}
