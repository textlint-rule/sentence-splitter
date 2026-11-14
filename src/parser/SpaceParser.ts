import { SourceCode } from "./SourceCode.js";
import { AbstractParser } from "./AbstractParser.js";
import { CODE_CARRIAGE_RETURN, CODE_LINE_FEED, isWhiteSpaceCode } from "./CharacterClass.js";

/**
 * Space parser
 */
export class SpaceParser implements AbstractParser {
    test(sourceCode: SourceCode) {
        const code = sourceCode.readCode();
        if (code === -1) {
            return false;
        }
        // space without new line
        return code !== CODE_LINE_FEED && code !== CODE_CARRIAGE_RETURN && isWhiteSpaceCode(code);
    }

    seek(sourceCode: SourceCode): void {
        while (this.test(sourceCode)) {
            sourceCode.peek();
        }
    }
}
