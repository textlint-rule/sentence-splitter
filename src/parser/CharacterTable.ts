/**
 * Character classes of UTF-16 code units.
 *
 * The scanner reads the text as code units, and looks up `table[codeUnit]` to get the classes as bit flags.
 * The tables are built from the RegExp once, so the RegExp is the source of truth.
 */
/** `\s` */
export const WHITE_SPACE = 1;
/** `\r` and `\n` */
export const NEW_LINE = 2;
/** Han, Hiragana, Katakana, and Hangul. They act as word boundaries. */
export const CJK = 4;
/** Start or end of a pair mark */
export const PAIR_MARK = 8;
/** Separator character. It depends on the options. */
export const SEPARATOR = 16;
/** `\p{Uppercase_Letter}` */
export const UPPERCASE = 32;
/** A word is separated by white spaces or CJK characters */
export const WORD_BOUNDARY = WHITE_SPACE | CJK;

const CODE_UNIT_COUNT = 0x10000;

export type PairMark = {
    key: string;
    start: string;
    end: string;
};
export const PAIR_MARKS: PairMark[] = [
    { key: "double quote", start: `"`, end: `"` },
    { key: "angled bracket", start: `[`, end: `]` },
    { key: "round bracket", start: `(`, end: `)` },
    { key: "curly brace", start: `{`, end: `}` },
    { key: "かぎ括弧", start: `「`, end: `」` },
    { key: "丸括弧", start: `（`, end: `）` },
    { key: "二重かぎ括弧", start: `『`, end: `』` },
    { key: "波括弧", start: `｛`, end: `｝` },
    { key: "角括弧", start: `［`, end: `］` },
    { key: "重角括弧", start: `〚`, end: `〛` },
    { key: "隅付き括弧", start: `【`, end: `】` },
    { key: "二重隅付き括弧", start: `《`, end: `》` }
];
/** Code unit of the start mark. The index is the index of PAIR_MARKS. */
export const PAIR_MARK_START_CODES = PAIR_MARKS.map((mark) => mark.start.charCodeAt(0));
/** Code unit of the end mark. The index is the index of PAIR_MARKS. */
export const PAIR_MARK_END_CODES = PAIR_MARKS.map((mark) => mark.end.charCodeAt(0));

let baseTable: Uint8Array | undefined;
/**
 * Create the table that does not depend on the options.
 */
const getBaseTable = (): Uint8Array => {
    if (baseTable) {
        return baseTable;
    }
    const table = new Uint8Array(CODE_UNIT_COUNT);
    // A string that has all code units. The index of a character is the code unit of the character.
    const chunks: string[] = [];
    for (let code = 0; code < CODE_UNIT_COUNT; code += 0x1000) {
        const codes: number[] = [];
        for (let i = 0; i < 0x1000; i++) {
            codes.push(code + i);
        }
        chunks.push(String.fromCharCode(...codes));
    }
    const allCodeUnits = chunks.join("");
    const mark = (pattern: RegExp, flag: number) => {
        for (const match of allCodeUnits.matchAll(pattern)) {
            table[match.index] |= flag;
        }
    };
    mark(/\s/g, WHITE_SPACE);
    mark(/[\r\n]/g, NEW_LINE);
    // A surrogate code unit does not match these patterns, same as testing a single code unit
    mark(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, CJK);
    mark(/\p{Uppercase_Letter}/gu, UPPERCASE);
    for (let i = 0; i < PAIR_MARKS.length; i++) {
        table[PAIR_MARK_START_CODES[i]] |= PAIR_MARK;
        table[PAIR_MARK_END_CODES[i]] |= PAIR_MARK;
    }
    baseTable = table;
    return table;
};

type TableCache = {
    // The copy of separatorCharacters. It is used for detecting that the list is changed in place.
    separatorCharacters: ArrayLike<string>;
    table: Uint8Array;
};
const tableCaches: TableCache[] = [];
const MAX_TABLE_CACHE = 4;
let tableCacheIndex = 0;

const isSameList = (a: ArrayLike<unknown>, b: ArrayLike<unknown>): boolean => {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
};

/**
 * Return the character class table for the separator characters.
 * Only a character of a single code unit works as a separator, because the scanner reads the text as code units.
 */
export const getCharacterTable = (separatorCharacters: ArrayLike<string>): Uint8Array => {
    for (let i = 0; i < tableCaches.length; i++) {
        const cache = tableCaches[i];
        if (isSameList(cache.separatorCharacters, separatorCharacters)) {
            return cache.table;
        }
    }
    const table = getBaseTable().slice();
    for (let i = 0; i < separatorCharacters.length; i++) {
        const character = separatorCharacters[i];
        if (typeof character === "string" && character.length === 1) {
            table[character.charCodeAt(0)] |= SEPARATOR;
        }
    }
    tableCaches[tableCacheIndex] = {
        separatorCharacters:
            typeof separatorCharacters === "string" ? separatorCharacters : Array.from(separatorCharacters),
        table
    };
    tableCacheIndex = (tableCacheIndex + 1) % MAX_TABLE_CACHE;
    return table;
};

const uppercaseLetterPattern = /^\p{Uppercase_Letter}/u;
/**
 * Return true if the code point of the surrogate pair is an uppercase letter
 */
export const isUppercaseSurrogatePair = (highSurrogate: number, lowSurrogate: number): boolean => {
    return uppercaseLetterPattern.test(String.fromCharCode(highSurrogate, lowSurrogate));
};
