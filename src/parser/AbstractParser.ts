import { SourceCode } from "./SourceCode.js";

export abstract class AbstractParser {
    /**
     * Return true if the parser allow to next
     * @param source
     */
    abstract test(source: SourceCode): boolean;

    abstract seek(source: SourceCode): void;

    /**
     * Optional hint for performance.
     * Return false if `test` always returns false when the current character is `code`.
     * If it returns true, `test` decides the result.
     * @param code UTF-16 code unit of the character
     */
    canTest?(code: number): boolean;
}
