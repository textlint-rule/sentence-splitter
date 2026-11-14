/**
 * Character classes of a UTF-16 code unit.
 *
 * The parsers look at the text character by character, and asking RegExp for each character is slow.
 * This table keeps the answer of the RegExp for each code unit, so each code unit is tested by RegExp only once.
 * The RegExp is still the source of truth. It keeps the result same on any Unicode version of the runtime.
 */
const COMPUTED = 1;
const WHITE_SPACE = 2;
const CJK = 4;
const WHITE_SPACE_PATTERN = /\s/;
const CJK_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
// index: UTF-16 code unit, value: flags
const characterClasses = new Uint8Array(0x10000);

const computeCharacterClass = (code: number): number => {
    const character = String.fromCharCode(code);
    let flags = COMPUTED;
    if (WHITE_SPACE_PATTERN.test(character)) {
        flags |= WHITE_SPACE;
    }
    if (CJK_PATTERN.test(character)) {
        flags |= CJK;
    }
    characterClasses[code] = flags;
    return flags;
};

export const CODE_LINE_FEED = 0x0a;
export const CODE_CARRIAGE_RETURN = 0x0d;
export const CODE_PERIOD = 0x2e;

/**
 * Same as `/\s/.test(character)`
 * @param code UTF-16 code unit. It should be 0-65535
 */
export const isWhiteSpaceCode = (code: number): boolean => {
    return ((characterClasses[code] || computeCharacterClass(code)) & WHITE_SPACE) !== 0;
};

/**
 * Return true if the code unit is a white space or a CJK character.
 * CJK characters act as word boundaries because CJK text does not use spaces between words.
 * @param code UTF-16 code unit. It should be 0-65535
 */
export const isWordBoundaryCode = (code: number): boolean => {
    return ((characterClasses[code] || computeCharacterClass(code)) & (WHITE_SPACE | CJK)) !== 0;
};
