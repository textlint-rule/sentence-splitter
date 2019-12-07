/**
 * @type {splitOptions}
 */
module.exports = {
    SeparatorParser: {
        // separator is ♪
        // treat continuous "♪" like "♪♪♪" as a single separator
        separatorCharacters: ["♪"]
    }
};
