import { SourceCode } from "./SourceCode";
import { AbstractParser } from "./AbstractParser";
import { AbstractMarker } from "./AbstractMarker";

export interface AnyValueParserOptions {
    parsers: AbstractParser[];
    markers: AbstractMarker[];
}

/**
 * Any value without `parsers`
 */
export class AnyValueParser implements AbstractParser {
    private parsers: AbstractParser[];
    private markers: AbstractMarker[];

    /**
     * Eat any value without `parsers.test`
     */
    constructor(options: AnyValueParserOptions) {
        this.parsers = options.parsers;
        this.markers = options.markers;
    }

    test(sourceCode: SourceCode) {
        if (sourceCode.hasEnd) {
            return false;
        }
        return this.parsers.every(parser => !parser.test(sourceCode));
    }

    seek(sourceCode: SourceCode) {
        while (this.test(sourceCode)) {
            this.markers.forEach(marker => marker.mark(sourceCode));
            sourceCode.peek();
        }
    }
}
