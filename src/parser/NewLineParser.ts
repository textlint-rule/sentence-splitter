import { SourceCode } from "./SourceCode.js";
import { AbstractParser } from "./AbstractParser.js";

/**
 * New Line Parser
 */
export class NewLineParser implements AbstractParser {
    test(sourceCode: SourceCode) {
        const string = sourceCode.read();
        if (!string) {
            return false;
        }
        return /[\r\n]/.test(string);
    }

    seek(sourceCode: SourceCode): void {
        while (this.test(sourceCode)) {
            sourceCode.peek();
        }
    }
}
