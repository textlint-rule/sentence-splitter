import type { Language } from "./lang/LanguageInterface.js";

export const EXCLAMATION_WORD = 1;
export const PREPOSITIVE_ABBREVIATION = 2;
export const ABBREVIATION = 4;

const FILTER_BITS = 4096;
const FILTER_MASK = FILTER_BITS - 1;

export type AbbreviationIndex = {
    /**
     * Lower-cased word to the flags of the lists that include the word
     */
    words: Map<string, number>;
    /**
     * Bit set of the hash of lower-cased ASCII words.
     * The scanner computes the same hash while it reads a word,
     * so it can skip most words without creating a string.
     */
    asciiFilter: Int32Array;
};

/**
 * Hash of a lower-cased ASCII word. Call it for each code unit from `hash = 0`.
 * The scanner inlines the same computation.
 */
export const hashStep = (hash: number, lowerCasedCode: number): number => {
    return (Math.imul(hash, 31) + lowerCasedCode) | 0;
};

const isAscii = (text: string): boolean => {
    for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) >= 0x80) {
            return false;
        }
    }
    return true;
};

const createIndex = (lists: string[][]): AbbreviationIndex => {
    const words = new Map<string, number>();
    const asciiFilter = new Int32Array(FILTER_BITS >> 5);
    for (let listIndex = 0; listIndex < lists.length; listIndex++) {
        const flag = 1 << listIndex;
        for (const word of lists[listIndex]) {
            const lowerCased = word.toLowerCase();
            words.set(lowerCased, (words.get(lowerCased) ?? 0) | flag);
            if (isAscii(lowerCased)) {
                let hash = 0;
                for (let i = 0; i < lowerCased.length; i++) {
                    hash = hashStep(hash, lowerCased.charCodeAt(i));
                }
                const bit = hash & FILTER_MASK;
                asciiFilter[bit >> 5] |= 1 << (bit & 31);
            }
        }
    }
    return { words, asciiFilter };
};

type IndexCache = {
    // The copies of the lists. They are used for detecting that a list is changed in place.
    lists: string[][];
    index: AbbreviationIndex;
};
const indexCaches = new WeakMap<Language, IndexCache>();

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

/**
 * Return the index of the abbreviations of the language.
 * The index is cached by the language object, and it is rebuilt when a list is changed.
 */
export const getAbbreviationIndex = (language: Language): AbbreviationIndex => {
    // The order is the order of the flags
    const lists = [language.EXCLAMATION_WORDS, language.PREPOSITIVE_ABBREVIATIONS, language.ABBREVIATIONS];
    const cache = indexCaches.get(language);
    if (
        cache &&
        isSameList(cache.lists[0], lists[0]) &&
        isSameList(cache.lists[1], lists[1]) &&
        isSameList(cache.lists[2], lists[2])
    ) {
        return cache.index;
    }
    const index = createIndex(lists);
    indexCaches.set(language, { lists: lists.map((list) => list.slice()), index });
    return index;
};

export const isInAsciiFilter = (asciiFilter: Int32Array, hash: number): boolean => {
    const bit = hash & FILTER_MASK;
    return (asciiFilter[bit >> 5] & (1 << (bit & 31))) !== 0;
};
