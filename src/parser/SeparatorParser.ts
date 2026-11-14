import { SourceCode } from "./SourceCode.js";
import { AbstractParser } from "./AbstractParser.js";
import { CODE_PERIOD, isWhiteSpaceCode } from "./CharacterClass.js";

export const DefaultOptions = {
    separatorCharacters: [
        ".", // period
        "．", // (ja) zenkaku-period
        "。", // (ja) 句点
        "?", // question mark
        "!", //  exclamation mark
        "？", // (ja) zenkaku question mark
        "！" // (ja) zenkaku exclamation mark
    ]
};

export interface SeparatorParserOptions {
    /**
     * Recognize each characters as separator
     * Example [".", "!", "?"]
     */
    separatorCharacters?: string[];
}

/**
 * Separator parser
 */
export class SeparatorParser implements AbstractParser {
    // UTF-16 code units of the separator characters
    private separatorCodes: number[];
    // Bit set of `code & 31` of the separator characters.
    // It is used for filtering out most characters without looking up `separatorCodes`
    private separatorCodeBits: number = 0;

    constructor(readonly options?: SeparatorParserOptions) {
        const separatorCharacters =
            options && options.separatorCharacters ? options.separatorCharacters : DefaultOptions.separatorCharacters;
        this.separatorCodes = [];
        for (const character of separatorCharacters) {
            // A separator is compared with a single character(UTF-16 code unit) of the text
            if (character.length === 1) {
                const code = character.charCodeAt(0);
                this.separatorCodes.push(code);
                this.separatorCodeBits |= 1 << (code & 31);
            }
        }
    }

    canTest(code: number) {
        return (this.separatorCodeBits & (1 << (code & 31))) !== 0 && this.separatorCodes.includes(code);
    }

    test(sourceCode: SourceCode) {
        const firstCode = sourceCode.readCode();
        if (firstCode === -1) {
            return false;
        }
        if (!this.canTest(firstCode)) {
            return false;
        }
        if (sourceCode.isInContext()) {
            return false;
        }
        if (sourceCode.isInContextRange()) {
            return false;
        }
        // Need space after period
        // Example: "This is a pen. This is not a pen."
        // It will avoid false-position like `1.23`
        if (firstCode === CODE_PERIOD) {
            const nextCode = sourceCode.readCode(1);
            if (nextCode !== -1) {
                return isWhiteSpaceCode(nextCode);
            } else {
                return true;
            }
        }
        return true;
    }

    seek(sourceCode: SourceCode): void {
        while (this.test(sourceCode)) {
            sourceCode.peek();
        }
    }
}
