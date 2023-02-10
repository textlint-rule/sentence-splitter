import { SourceCode } from "./SourceCode.js";
import { AbstractParser } from "./AbstractParser.js";

/**
 * Space parser
 */
export class SpaceParser implements AbstractParser {
    test(sourceCode: SourceCode) {
        const string = sourceCode.read();
        if (!string) {
            return false;
        }
        // space without new line
        return /[^\S\n\r]/.test(string);
    }

    seek(sourceCode: SourceCode): void {
        while (this.test(sourceCode)) {
            sourceCode.peek();
        }
    }
}
