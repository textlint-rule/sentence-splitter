import { SourceCode } from "./SourceCode";
import { AbstractParser } from "./AbstractParser";
import { PairMaker } from "./PairMaker";
import { AbbrMarker } from "./AbbrMarker";

/**
 * Any value without `parsers`
 */
export class AnyValueParser implements AbstractParser {
    private pair: PairMaker;
    private abbr: AbbrMarker;

    /**
     * Eat any value without `parsers`
     * @param {AbstractParser[]} parsers
     */
    constructor(private parsers: AbstractParser[]) {
        this.pair = new PairMaker();
        this.abbr = new AbbrMarker();
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
            this.abbr.mark(sourceCode);
            sourceCode.peek();
        }
    }
}
