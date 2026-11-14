import { SourceCode } from "./SourceCode.js";
import { Language } from "./lang/LanguageInterface.js";
import { English } from "./lang/English.js";
import { AbstractMarker } from "./AbstractMarker.js";
import { CODE_LINE_FEED, CODE_PERIOD, isWhiteSpaceCode, isWordBoundaryCode } from "./CharacterClass.js";

const isCapitalized = (text: string) => {
    if (!text || text.length === 0) {
        return false;
    }
    return /^\p{Uppercase_Letter}/u.test(text);
};

const CODE_DIGIT_ZERO = 0x30;
const CODE_DIGIT_NINE = 0x39;

/**
 * Lower-cased words of the list.
 * A word is compared with the list without case sensitivity, so look up the lower-cased word in this Set.
 * It is cached by the list, because the parsers are created for each `split()` and `splitAST()`.
 */
type LowerCasedWords = {
    // The copy of the list. It is used for detecting the list is changed
    source: string[];
    words: Set<string>;
};
const lowerCasedWordsCache = new WeakMap<string[], LowerCasedWords>();
const isSameList = (a: string[], b: string[]): boolean => {
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
const getLowerCasedWords = (list: string[]): Set<string> => {
    const cached = lowerCasedWordsCache.get(list);
    if (cached && isSameList(cached.source, list)) {
        return cached.words;
    }
    const words = new Set<string>();
    for (const word of list) {
        words.add(word.toLowerCase());
    }
    lowerCasedWordsCache.set(list, { source: list.slice(), words });
    return words;
};

export const DefaultOptions = {
    language: English
};

export interface AbbrMarkerOptions {
    language?: Language;
}

/**
 * abbreviation marker
 */
export class AbbrMarker implements AbstractMarker {
    private exclamationWords: Set<string>;
    private prepositiveAbbreviations: Set<string>;
    private abbreviations: Set<string>;

    constructor(readonly options?: AbbrMarkerOptions) {
        const lang = options && options.language ? options.language : DefaultOptions.language;
        this.exclamationWords = getLowerCasedWords(lang.EXCLAMATION_WORDS);
        this.prepositiveAbbreviations = getLowerCasedWords(lang.PREPOSITIVE_ABBREVIATIONS);
        this.abbreviations = getLowerCasedWords(lang.ABBREVIATIONS);
    }

    /**
     * Return true if the current position can be the start of a word.
     * A word should have left space (or CJK boundary, or the start of the text).
     */
    private isWordStart(sourceCode: SourceCode): boolean {
        const prevCode = sourceCode.readCode(-1);
        // Also treat CJK characters as word boundaries
        return prevCode === -1 || isWordBoundaryCode(prevCode);
    }

    /**
     * `mark` works only at the start of a word.
     */
    canMark(code: number, prevCode: number) {
        return !isWordBoundaryCode(code) && (prevCode === -1 || isWordBoundaryCode(prevCode));
    }

    /**
     * Get Word
     * word should have left space and right space (or CJK boundary),
     * @param {SourceCode} sourceCode
     * @param {number} startIndex
     * @returns {string}
     */
    private getWord(sourceCode: SourceCode, startIndex: number = 0): string {
        if (!this.isWordStart(sourceCode)) {
            return "";
        }
        let count = startIndex;
        let code = sourceCode.readCode(count);
        while (code !== -1 && !isWordBoundaryCode(code)) {
            count++;
            code = sourceCode.readCode(count);
        }
        if (count === startIndex) {
            return "";
        }
        const offset = sourceCode.offset;
        return sourceCode.sliceRange(offset + startIndex, offset + count);
    }

    private getPrevWord(sourceCode: SourceCode): string {
        let count = -1;
        let code = sourceCode.readCode(count);
        while (code !== -1 && isWhiteSpaceCode(code)) {
            count--;
            code = sourceCode.readCode(count);
        }
        while (code !== -1 && !isWhiteSpaceCode(code)) {
            count--;
            code = sourceCode.readCode(count);
        }
        return this.getWord(sourceCode, count + 1);
    }

    /**
     * Return true if there are only whitespaces between the start of the line and the current position
     * @param {SourceCode} sourceCode
     * @returns {boolean}
     */
    private isLineStart(sourceCode: SourceCode): boolean {
        let count = -1;
        let code = sourceCode.readCode(count);
        while (code !== -1) {
            if (code === CODE_LINE_FEED) {
                return true;
            }
            if (!isWhiteSpaceCode(code)) {
                return false;
            }
            count--;
            code = sourceCode.readCode(count);
        }
        return true;
    }

    mark(sourceCode: SourceCode) {
        // Fast path: most characters are not the start of a word
        const currentCode = sourceCode.readCode();
        if (currentCode === -1 || isWordBoundaryCode(currentCode) || !this.isWordStart(sourceCode)) {
            return;
        }
        if (sourceCode.isInContextRange()) {
            return;
        }
        const currentWord = this.getWord(sourceCode);
        if (currentWord.length === 0) {
            return;
        }
        const lastCode = currentWord.charCodeAt(currentWord.length - 1);
        // Allow: Multi-period abbr
        // Example: I visited the U.S.A. last year.
        // But, it can be the end of a sentence when the next word is capitalized like "U.S."
        // Example: I was born in the U.S.A. My name is Benjamin D. Lee.
        // https://github.com/textlint-rule/sentence-splitter/issues/21
        if (lastCode === CODE_PERIOD && /^([a-zA-Z]\.){3,}$/.test(currentWord)) {
            const nextWord = this.getWord(sourceCode, currentWord.length + 1);
            if (!isCapitalized(nextWord)) {
                return sourceCode.markContextRange([sourceCode.offset, sourceCode.offset + currentWord.length]);
            }
        }
        const lowerCasedCurrentWord = currentWord.toLowerCase();
        // EXCALAMATION_WORDS
        // Example: Yahoo!
        if (this.exclamationWords.has(lowerCasedCurrentWord)) {
            return sourceCode.markContextRange([sourceCode.offset, sourceCode.offset + currentWord.length]);
        }
        // PREPOSITIVE_ABBREVIATIONS
        // Example: Mr. Fuji
        if (this.prepositiveAbbreviations.has(lowerCasedCurrentWord)) {
            return sourceCode.markContextRange([sourceCode.offset, sourceCode.offset + currentWord.length]);
        }
        // Number + period
        // It is a list index: "1. First item" or "1. The first item. 2. The second item."
        // It is the end of a sentence: "It is Interstate 55. Twenty-five people got hurt."
        // https://github.com/textlint-rule/sentence-splitter/issues/41
        if (
            lastCode === CODE_PERIOD &&
            CODE_DIGIT_ZERO <= currentCode &&
            currentCode <= CODE_DIGIT_NINE &&
            /^\d+\.$/.test(currentWord)
        ) {
            const prevWord = this.getPrevWord(sourceCode);
            const nextWord = this.getWord(sourceCode, currentWord.length + 1);
            const isListIndex = this.isLineStart(sourceCode) || /[.!?]$/.test(prevWord) || !isCapitalized(nextWord);
            if (isListIndex) {
                sourceCode.markContextRange([sourceCode.offset, sourceCode.offset + currentWord.length]);
            }
            return;
        }
        // ABBREVIATIONS
        const isMatched = this.abbreviations.has(lowerCasedCurrentWord);
        // Special case: Capital <ABBR>. Capital
        // Example: `I` as a sentence boundary and `I` as an abbreviation
        // > We make a good team, you and I. Did you see Albert I. Jones yesterday?
        // Related: https://github.com/azu/sentence-splitter/pull/31
        const isCapitalAbbr = /^\p{Uppercase_Letter}\./u.test(currentWord);
        if (!isMatched && !isCapitalAbbr) {
            // Most words reach here. No need to look around the word
            return;
        }
        const prevWord = this.getPrevWord(sourceCode);
        const nextWord = this.getWord(sourceCode, currentWord.length + 1);
        if (isCapitalAbbr && isCapitalized(prevWord) && isCapitalized(nextWord)) {
            sourceCode.markContextRange([sourceCode.offset, sourceCode.offset + currentWord.length]);
        } else if (isMatched && !isCapitalized(nextWord)) {
            // Exception. This allows to write Capitalized word at next word
            // A.M. is store.
            sourceCode.markContextRange([sourceCode.offset, sourceCode.offset + currentWord.length]);
        }
    }
}
