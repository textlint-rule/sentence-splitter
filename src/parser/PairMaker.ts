import { SourceCode } from "./SourceCode";

/**
 * Mark pair character
 */
export class PairMaker {
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
        const keyIndex = this.pairKeys.indexOf(string);
        if (keyIndex !== -1) {
            sourceCode.enterContext(string);
        } else {
            const valueIndex = this.pairValues.indexOf(string);
            if (valueIndex !== -1) {
                const key = this.pairKeys[valueIndex];
                sourceCode.leaveContext(key);
            }
        }
    }
}
