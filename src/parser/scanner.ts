import type { TxtNode } from "@textlint/ast-node-types";
import type { Language } from "./lang/LanguageInterface.js";
import {
    ABBREVIATION,
    AbbreviationIndex,
    EXCLAMATION_WORD,
    getAbbreviationIndex,
    isInAsciiFilter,
    PREPOSITIVE_ABBREVIATION
} from "./AbbreviationIndex.js";
import {
    isUppercaseSurrogatePair,
    NEW_LINE,
    PAIR_MARK,
    PAIR_MARK_END_CODES,
    PAIR_MARK_START_CODES,
    SEPARATOR,
    UPPERCASE,
    WHITE_SPACE,
    WORD_BOUNDARY
} from "./CharacterTable.js";

/**
 * The scanner does not create any node object.
 * It writes tokens into a flat Int32Array, and a token refers to the text by indexes.
 * A token is three integers: [kind, a, b].
 *
 * All indexes are indexes of the scanned text (`raw` of the paragraph), not offsets in the file.
 */
export const TOKEN_SIZE = 3;
/** Str node. a = start index, b = end index */
export const TOKEN_STR = 0;
/** WhiteSpace node. a = start index, b = end index */
export const TOKEN_WHITE_SPACE = 1;
/** Punctuation node. a = start index, b = end index */
export const TOKEN_PUNCTUATION = 2;
/** A child node of the paragraph that is not Str. a = index in children */
export const TOKEN_NODE = 3;
/** Open a Sentence. The following tokens are children of the Sentence. */
export const TOKEN_SENTENCE_OPEN = 4;
/** Close the Sentence. a = end index, b = count of the closed pair marks at this time */
export const TOKEN_SENTENCE_CLOSE = 5;

const CODE_PERIOD = 0x2e;
const CODE_LINE_FEED = 0x0a;

export type ScanResult = {
    tokens: Int32Array;
    /** Count of integers in `tokens` */
    tokenLength: number;
    /**
     * Closed pair marks in the order of closing. These are parallel arrays.
     * pairMarkIds[i] is the index of PAIR_MARKS.
     */
    pairMarkIds: Int32Array;
    pairMarkStarts: Int32Array;
    pairMarkEnds: Int32Array;
    pairMarkLength: number;
};

// The buffers are reused between calls. The builder reads them before the next scan.
const result: ScanResult = {
    tokens: new Int32Array(256 * TOKEN_SIZE),
    tokenLength: 0,
    pairMarkIds: new Int32Array(64),
    pairMarkStarts: new Int32Array(64),
    pairMarkEnds: new Int32Array(64),
    pairMarkLength: 0
};
// Stack of the opened pair marks
let openedPairMarkIds: Int32Array = new Int32Array(16);
let openedPairMarkStarts: Int32Array = new Int32Array(16);
let openedPairMarkLength = 0;

const grow = (array: Int32Array): Int32Array => {
    const newArray = new Int32Array(array.length * 2);
    newArray.set(array);
    return newArray;
};

const emit = (kind: number, a: number, b: number) => {
    const length = result.tokenLength;
    if (length + TOKEN_SIZE > result.tokens.length) {
        result.tokens = grow(result.tokens);
    }
    const tokens = result.tokens;
    tokens[length] = kind;
    tokens[length + 1] = a;
    tokens[length + 2] = b;
    result.tokenLength = length + TOKEN_SIZE;
};

// State of the current scan. These are module variables, so the helper functions do not need many arguments.
let text = "";
let textLength = 0;
// Characters before this index are not readable. It is 0 unless the range of the node is broken.
let lowerBound = 0;
let table: Uint8Array = new Uint8Array(0);
let language: Language;
let abbreviationIndex: AbbreviationIndex | undefined;

/**
 * Pair mark.
 * A separator in a pair is not a separator: I hear "I'm back to home." from radio.
 * It does not support the nest of the same pair mark.
 */
const markPairMark = (index: number, code: number) => {
    let id = PAIR_MARK_START_CODES.indexOf(code);
    if (id === -1) {
        id = PAIR_MARK_END_CODES.indexOf(code);
    }
    let openedIndex = -1;
    for (let i = openedPairMarkLength - 1; i >= 0; i--) {
        if (openedPairMarkIds[i] === id) {
            openedIndex = i;
            break;
        }
    }
    if (openedIndex === -1) {
        if (PAIR_MARK_START_CODES[id] === code) {
            if (openedPairMarkLength === openedPairMarkIds.length) {
                openedPairMarkIds = grow(openedPairMarkIds);
                openedPairMarkStarts = grow(openedPairMarkStarts);
            }
            openedPairMarkIds[openedPairMarkLength] = id;
            openedPairMarkStarts[openedPairMarkLength] = index;
            openedPairMarkLength++;
        }
    } else if (PAIR_MARK_END_CODES[id] === code) {
        const length = result.pairMarkLength;
        if (length === result.pairMarkIds.length) {
            result.pairMarkIds = grow(result.pairMarkIds);
            result.pairMarkStarts = grow(result.pairMarkStarts);
            result.pairMarkEnds = grow(result.pairMarkEnds);
        }
        result.pairMarkIds[length] = id;
        result.pairMarkStarts[length] = openedPairMarkStarts[openedIndex];
        result.pairMarkEnds[length] = index;
        result.pairMarkLength = length + 1;
        // remove it from the stack
        for (let i = openedIndex + 1; i < openedPairMarkLength; i++) {
            openedPairMarkIds[i - 1] = openedPairMarkIds[i];
            openedPairMarkStarts[i - 1] = openedPairMarkStarts[i];
        }
        openedPairMarkLength--;
    }
};

/**
 * Return true if the word that starts at `start` is capitalized.
 * The word is an empty string if `start` is a word boundary or out of the text.
 */
const isCapitalizedWordAt = (start: number): boolean => {
    if (start >= textLength) {
        return false;
    }
    const code = text.charCodeAt(start);
    if (0xd800 <= code && code <= 0xdbff && start + 1 < textLength) {
        const nextCode = text.charCodeAt(start + 1);
        if (0xdc00 <= nextCode && nextCode <= 0xdfff) {
            return isUppercaseSurrogatePair(code, nextCode);
        }
    }
    // An uppercase letter is not a word boundary
    return (table[code] & UPPERCASE) !== 0;
};

/**
 * Return the start index of the previous word of the word that starts at `index`.
 * The previous word continues until a word boundary. It can be an empty string.
 * If the word at `index` is the first word, it returns `index`.
 */
const findPrevWordStart = (index: number): number => {
    let i = index - 1;
    while (i >= lowerBound && (table[text.charCodeAt(i)] & WHITE_SPACE) !== 0) {
        i--;
    }
    while (i >= lowerBound && (table[text.charCodeAt(i)] & WHITE_SPACE) === 0) {
        i--;
    }
    return i + 1;
};

/**
 * Return true if the word that starts at `start` ends with one of `.!?`.
 */
const isWordEndWithTerminalAt = (start: number): boolean => {
    let end = start;
    while (end < textLength && (table[text.charCodeAt(end)] & WORD_BOUNDARY) === 0) {
        end++;
    }
    if (end === start) {
        return false;
    }
    const lastCode = text.charCodeAt(end - 1);
    return lastCode === CODE_PERIOD || lastCode === 0x21 || lastCode === 0x3f;
};

/**
 * Return true if there are only white spaces between the start of the line and `index`
 */
const isLineStart = (index: number): boolean => {
    for (let i = index - 1; i >= lowerBound; i--) {
        const code = text.charCodeAt(i);
        if (code === CODE_LINE_FEED) {
            return true;
        }
        if ((table[code] & WHITE_SPACE) === 0) {
            return false;
        }
    }
    return true;
};

/**
 * /^([a-zA-Z]\.){3,}$/
 */
const isMultiPeriodWord = (start: number, end: number): boolean => {
    const length = end - start;
    if (length < 6 || (length & 1) !== 0) {
        return false;
    }
    for (let i = start; i < end; i += 2) {
        // a-z or A-Z
        const letter = text.charCodeAt(i) | 0x20;
        if (letter < 0x61 || letter > 0x7a || text.charCodeAt(i + 1) !== CODE_PERIOD) {
            return false;
        }
    }
    return true;
};

/**
 * /^\d+\.$/
 */
const isNumberPeriodWord = (start: number, end: number): boolean => {
    if (end - start < 2 || text.charCodeAt(end - 1) !== CODE_PERIOD) {
        return false;
    }
    for (let i = start; i < end - 1; i++) {
        const code = text.charCodeAt(i);
        if (code < 0x30 || code > 0x39) {
            return false;
        }
    }
    return true;
};

/**
 * /^\p{Uppercase_Letter}\./u
 */
const isUppercasePeriodWord = (start: number, end: number): boolean => {
    const code = text.charCodeAt(start);
    if (0xd800 <= code && code <= 0xdbff && start + 1 < end) {
        const nextCode = text.charCodeAt(start + 1);
        if (0xdc00 <= nextCode && nextCode <= 0xdfff) {
            return (
                start + 2 < end &&
                text.charCodeAt(start + 2) === CODE_PERIOD &&
                isUppercaseSurrogatePair(code, nextCode)
            );
        }
    }
    return (table[code] & UPPERCASE) !== 0 && start + 1 < end && text.charCodeAt(start + 1) === CODE_PERIOD;
};

/**
 * Abbreviation.
 * `start` is the start of a word. If a separator in the word is not the end of a sentence, return the end of the word.
 * Otherwise, return -1.
 */
const findAbbreviationEnd = (start: number): number => {
    // Read the word, and compute the hash of the lower-cased word if the word is ASCII
    let end = start;
    let hash = 0;
    let isAsciiWord = true;
    while (end < textLength) {
        const code = text.charCodeAt(end);
        if ((table[code] & WORD_BOUNDARY) !== 0) {
            break;
        }
        if (code >= 0x80) {
            isAsciiWord = false;
        }
        // A-Z to a-z. It should be the same as hashStep() of AbbreviationIndex
        hash = (Math.imul(hash, 31) + (code >= 0x41 && code <= 0x5a ? code + 0x20 : code)) | 0;
        end++;
    }
    // Allow: Multi-period abbr
    // Example: I visited the U.S.A. last year.
    // But, it can be the end of a sentence when the next word is capitalized like "U.S."
    // Example: I was born in the U.S.A. My name is Benjamin D. Lee.
    // https://github.com/textlint-rule/sentence-splitter/issues/21
    if (isMultiPeriodWord(start, end) && !isCapitalizedWordAt(end + 1)) {
        return end;
    }
    if (abbreviationIndex === undefined) {
        abbreviationIndex = getAbbreviationIndex(language);
    }
    // Most ASCII words are rejected by the filter without creating a string
    const flags =
        isAsciiWord && !isInAsciiFilter(abbreviationIndex.asciiFilter, hash)
            ? 0
            : (abbreviationIndex.words.get(text.slice(start, end).toLowerCase()) ?? 0);
    // EXCLAMATION_WORDS
    // Example: Yahoo!
    // PREPOSITIVE_ABBREVIATIONS
    // Example: Mr. Fuji
    if ((flags & (EXCLAMATION_WORD | PREPOSITIVE_ABBREVIATION)) !== 0) {
        return end;
    }
    // Number + period
    // It is a list index: "1. First item" or "1. The first item. 2. The second item."
    // It is the end of a sentence: "It is Interstate 55. Twenty-five people got hurt."
    // https://github.com/textlint-rule/sentence-splitter/issues/41
    if (isNumberPeriodWord(start, end)) {
        const isListIndex =
            isLineStart(start) || isWordEndWithTerminalAt(findPrevWordStart(start)) || !isCapitalizedWordAt(end + 1);
        return isListIndex ? end : -1;
    }
    // ABBREVIATIONS
    const isMatched = (flags & ABBREVIATION) !== 0;
    const isUppercasePeriod = isUppercasePeriodWord(start, end);
    if (!isMatched && !isUppercasePeriod) {
        return -1;
    }
    const isNextWordCapitalized = isCapitalizedWordAt(end + 1);
    // Special case: Capital <ABBR>. Capital
    // Example: `I` as a sentence boundary and `I` as an abbreviation
    // > We make a good team, you and I. Did you see Albert I. Jones yesterday?
    // Related: https://github.com/azu/sentence-splitter/pull/31
    if (isUppercasePeriod && isNextWordCapitalized && isCapitalizedWordAt(findPrevWordStart(start))) {
        return end;
    }
    // Exception. This allows to write Capitalized word at next word
    // A.M. is store.
    if (isMatched && !isNextWordCapitalized) {
        return end;
    }
    return -1;
};

/**
 * Return true if all ranges of the children are ordered and not overlapped.
 * In this case, the child at an offset is found by moving a cursor forward.
 */
const isOrderedChildren = (children: readonly TxtNode[]): boolean => {
    let prevEnd = -Infinity;
    for (let i = 0; i < children.length; i++) {
        const range = children[i].range;
        // `!(a <= b)` is also true for NaN
        if (!(prevEnd <= range[0]) || !(range[0] <= range[1])) {
            return false;
        }
        prevEnd = range[1];
    }
    return true;
};

/**
 * Scan the text, and write tokens.
 *
 * - Text mode(`children` is undefined): scan the whole text.
 * - Node mode: `text` is `raw` of the parent node, and `startOffset` is the offset of `text` in the file.
 *   It scans Str nodes of `children`, and other nodes are put into tokens as they are.
 */
export const scan = (
    inputText: string,
    characterTable: Uint8Array,
    inputLanguage: Language,
    children?: readonly TxtNode[],
    startOffset: number = 0
): ScanResult => {
    text = inputText;
    textLength = inputText.length;
    table = characterTable;
    language = inputLanguage;
    abbreviationIndex = undefined;
    lowerBound = startOffset < 0 ? -startOffset : 0;
    result.tokenLength = 0;
    result.pairMarkLength = 0;
    openedPairMarkLength = 0;

    const isNodeMode = children !== undefined;
    const isOrdered = isNodeMode && isOrderedChildren(children);
    let childIndex = 0;
    // current index of text
    let index = isNodeMode && children.length > 0 ? children[0].range[0] - startOffset : 0;
    // A separator before this index is a part of an abbreviation
    let abbreviationEnd = 0;
    let isSentenceOpened = false;
    if (!(index >= lowerBound)) {
        return result;
    }
    while (index < textLength) {
        // Characters until `limit` are in the current Str node
        let limit = textLength;
        if (isNodeMode) {
            const offset = index + startOffset;
            let node: TxtNode | undefined;
            if (isOrdered) {
                while (childIndex < children.length && children[childIndex].range[1] <= offset) {
                    childIndex++;
                }
                if (childIndex < children.length && children[childIndex].range[0] <= offset) {
                    node = children[childIndex];
                }
            } else {
                // last match, because the ranges may be overlapped
                for (let i = children.length - 1; i >= 0; i--) {
                    const range = children[i].range;
                    // `< range[1]` prevent infinity loop
                    // https://github.com/azu/sentence-splitter/issues/9
                    if (range[0] <= offset && offset < range[1]) {
                        node = children[i];
                        childIndex = i;
                        break;
                    }
                }
            }
            if (node === undefined) {
                break;
            }
            if (node.type !== "Str") {
                // Break does not open a Sentence
                // https://github.com/azu/sentence-splitter/issues/23
                if (!isSentenceOpened && node.type !== "Break") {
                    emit(TOKEN_SENTENCE_OPEN, 0, 0);
                    isSentenceOpened = true;
                }
                emit(TOKEN_NODE, childIndex, 0);
                index += node.range[1] - node.range[0];
                continue;
            }
            const nodeEnd = node.range[1] - startOffset;
            if (nodeEnd < limit) {
                limit = nodeEnd;
            }
        }
        const start = index;
        let code = text.charCodeAt(index);
        let flags = table[code];
        // space without new line
        if ((flags & (WHITE_SPACE | NEW_LINE)) === WHITE_SPACE) {
            index++;
            while (index < textLength && (table[text.charCodeAt(index)] & (WHITE_SPACE | NEW_LINE)) === WHITE_SPACE) {
                index++;
            }
            emit(TOKEN_WHITE_SPACE, start, index);
            continue;
        }
        // Need space after period
        // Example: "This is a pen. This is not a pen."
        // It will avoid false-position like `1.23`
        const isSeparator =
            (flags & SEPARATOR) !== 0 &&
            openedPairMarkLength === 0 &&
            index >= abbreviationEnd &&
            (code !== CODE_PERIOD ||
                index + 1 >= textLength ||
                (table[text.charCodeAt(index + 1)] & WHITE_SPACE) !== 0);
        // Text mode tests new line before separator, and node mode tests separator before new line.
        // The order is observable if a new line is a separator.
        if ((flags & NEW_LINE) !== 0 && !(isNodeMode && isSeparator)) {
            index++;
            while (index < textLength && (table[text.charCodeAt(index)] & NEW_LINE) !== 0) {
                index++;
            }
            emit(TOKEN_WHITE_SPACE, start, index);
            continue;
        }
        if (isSeparator) {
            // The separators are Punctuation, and close the current Sentence.
            // If the separators are only white spaces, they are not a node.
            let isWhiteSpaceOnly = true;
            do {
                if ((flags & WHITE_SPACE) === 0) {
                    isWhiteSpaceOnly = false;
                }
                index++;
                if (index >= textLength) {
                    break;
                }
                code = text.charCodeAt(index);
                flags = table[code];
            } while (
                (flags & SEPARATOR) !== 0 &&
                (code !== CODE_PERIOD ||
                    index + 1 >= textLength ||
                    (table[text.charCodeAt(index + 1)] & WHITE_SPACE) !== 0)
            );
            if (!isWhiteSpaceOnly) {
                emit(TOKEN_PUNCTUATION, start, index);
            }
            if (isSentenceOpened) {
                emit(TOKEN_SENTENCE_CLOSE, index, result.pairMarkLength);
                isSentenceOpened = false;
            }
            continue;
        }
        // Other value is Str. It continues until a new line, a separator, or the end of the Str node.
        if (!isSentenceOpened) {
            emit(TOKEN_SENTENCE_OPEN, 0, 0);
            isSentenceOpened = true;
        }
        // A word should have left space (or CJK boundary, or the start of the text)
        let isPrevWordBoundary = index - 1 < lowerBound || (table[text.charCodeAt(index - 1)] & WORD_BOUNDARY) !== 0;
        for (;;) {
            if (flags === 0 && !isPrevWordBoundary) {
                // Fast path: a plain character in a word
            } else {
                if (isPrevWordBoundary && (flags & WORD_BOUNDARY) === 0 && index >= abbreviationEnd) {
                    const end = findAbbreviationEnd(index);
                    if (end !== -1) {
                        abbreviationEnd = end;
                    }
                }
                if ((flags & PAIR_MARK) !== 0) {
                    markPairMark(index, code);
                }
                isPrevWordBoundary = (flags & WORD_BOUNDARY) !== 0;
            }
            index++;
            if (index >= limit) {
                break;
            }
            code = text.charCodeAt(index);
            flags = table[code];
            if ((flags & (NEW_LINE | SEPARATOR)) !== 0) {
                if ((flags & NEW_LINE) !== 0) {
                    break;
                }
                if (
                    openedPairMarkLength === 0 &&
                    index >= abbreviationEnd &&
                    (code !== CODE_PERIOD ||
                        index + 1 >= textLength ||
                        (table[text.charCodeAt(index + 1)] & WHITE_SPACE) !== 0)
                ) {
                    break;
                }
            }
        }
        emit(TOKEN_STR, start, index);
    }
    // It follow some text that is not ended with period.
    // The rest spaces are included in the Sentence, but they are not a node.
    while (index < textLength && (table[text.charCodeAt(index)] & (WHITE_SPACE | NEW_LINE)) === WHITE_SPACE) {
        index++;
    }
    if (isSentenceOpened) {
        emit(TOKEN_SENTENCE_CLOSE, index, result.pairMarkLength);
    }
    return result;
};
