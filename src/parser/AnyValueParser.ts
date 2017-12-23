import { SourceCode } from "./SourceCode";
import { AbstractParser } from "./AbstractParser";
import { PairParser } from "./PairParser";

/**
 * Any value without `parsers`
 */
export class AnyValueParser implements AbstractParser {
    private pair: PairParser;

    /**
     * Eat any value without `parsers`
     * @param {AbstractParser[]} parsers
     */
    constructor(private parsers: AbstractParser[]) {
        this.pair = new PairParser();
    }

    test(sourceCode: SourceCode) {
        if (sourceCode.hasEnd) {
            return false;
        }
        return this.parsers.every(parser => !parser.test(sourceCode));
    }

    seek(sourceCode: SourceCode) {
        while (this.test(sourceCode)) {
            this.pair.mark(sourceCode);
            sourceCode.peek();
        }
    }
}
