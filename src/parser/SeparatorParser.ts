import { SourceCode } from "./SourceCode";
import { AbstractParser } from "./AbstractParser";

const separatorPattern = /[.。?!？！]/;

/**
 * Separator parser
 */
export class SeparatorParser implements AbstractParser {
    test(sourceCode: SourceCode) {
        if (sourceCode.isInContext()) {
            return false;
        }
        const firstChar = sourceCode.read();
        if (!firstChar) {
            return false;
        }
        if (!separatorPattern.test(firstChar)) {
            return false;
        }
        const nextChar = sourceCode.read(1);
        // Text.<space>Text
        // It will avoid false-position like `1.23`
        if (firstChar === ".") {
            return nextChar === " ";
        }
        return true;
    }

    seek(sourceCode: SourceCode): void {
        while (this.test(sourceCode)) {
            sourceCode.peek();
        }
    }
}
