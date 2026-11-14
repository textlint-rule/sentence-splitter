import { SourceCode } from "./SourceCode.js";
import { AbstractParser } from "./AbstractParser.js";
import { AbstractMarker } from "./AbstractMarker.js";
import { isDebug, seekLog } from "../logger.js";

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
    // true if all parsers and markers can tell that they ignore a character
    private canSkipPlainCharacters: boolean;

    /**
     * Eat any value without `parsers.test`
     */
    constructor(options: AnyValueParserOptions) {
        this.parsers = options.parsers;
        this.markers = options.markers;
        this.canSkipPlainCharacters =
            !isDebug &&
            this.parsers.every((parser) => parser.canTest !== undefined) &&
            this.markers.every((marker) => marker.canMark !== undefined);
    }

    test(sourceCode: SourceCode) {
        if (sourceCode.hasEnd) {
            return false;
        }
        const parsers = this.parsers;
        for (let i = 0; i < parsers.length; i++) {
            if (parsers[i].test(sourceCode)) {
                return false;
            }
        }
        return true;
    }

    seek(sourceCode: SourceCode) {
        const currentNode = sourceCode.readNode();
        if (!currentNode) {
            // Text mode
            while (this.test(sourceCode)) {
                this.mark(sourceCode);
                sourceCode.peek();
                this.skipPlainCharacters(sourceCode, Infinity);
            }
            return;
        }
        // node - should not over next node
        const nodeStart = currentNode.range[0];
        const nodeEnd = currentNode.range[1];
        while (nodeStart <= sourceCode.offset && sourceCode.offset < nodeEnd && this.test(sourceCode)) {
            seekLog(sourceCode);
            this.mark(sourceCode);
            sourceCode.peek();
            this.skipPlainCharacters(sourceCode, nodeEnd);
        }
    }

    /**
     * Skip the characters that are ignored by all parsers and all markers.
     * It is same as the loop of `test` -> `mark` -> `peek` for these characters, but it is faster.
     * Most characters of a text are skipped here.
     */
    private skipPlainCharacters(sourceCode: SourceCode, endOffset: number) {
        if (!this.canSkipPlainCharacters) {
            return;
        }
        const parsers = this.parsers;
        const markers = this.markers;
        let prevCode = sourceCode.readCode(-1);
        let code = sourceCode.readCode();
        next: while (code !== -1 && sourceCode.offset < endOffset) {
            for (let i = 0; i < parsers.length; i++) {
                if (parsers[i].canTest!(code)) {
                    break next;
                }
            }
            for (let i = 0; i < markers.length; i++) {
                if (markers[i].canMark!(code, prevCode)) {
                    break next;
                }
            }
            sourceCode.peek();
            prevCode = code;
            code = sourceCode.readCode();
        }
    }

    private mark(sourceCode: SourceCode) {
        const markers = this.markers;
        for (let i = 0; i < markers.length; i++) {
            markers[i].mark(sourceCode);
        }
    }
}
