import { SourceCode } from "./SourceCode.js";
import { AbstractParser } from "./AbstractParser.js";
import { CODE_CARRIAGE_RETURN, CODE_LINE_FEED } from "./CharacterClass.js";

/**
 * New Line Parser
 */
export class NewLineParser implements AbstractParser {
    canTest(code: number) {
        return code === CODE_LINE_FEED || code === CODE_CARRIAGE_RETURN;
    }

    test(sourceCode: SourceCode) {
        return this.canTest(sourceCode.readCode());
    }

    seek(sourceCode: SourceCode): void {
        while (this.test(sourceCode)) {
            sourceCode.peek();
        }
    }
}
