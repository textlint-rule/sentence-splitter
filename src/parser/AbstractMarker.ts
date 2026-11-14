import { SourceCode } from "./SourceCode.js";

export abstract class AbstractMarker {
    abstract mark(source: SourceCode): void;

    /**
     * Optional hint for performance.
     * Return false if `mark` does nothing when the current character is `code` and the previous character is `prevCode`.
     * If it returns true, `mark` decides what to do.
     * @param code UTF-16 code unit of the character
     * @param prevCode UTF-16 code unit of the previous character. -1 if there is no previous character
     */
    canMark?(code: number, prevCode: number): boolean;
}
