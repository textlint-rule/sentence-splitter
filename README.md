# sentence-splitter

Split {Japanese, English} text into sentences.

## Installation

    npm install sentence-splitter

## Usage

```ts
export interface SeparatorParserOptions {
    /**
     * Recognize each characters as separator
     * Example [".", "!", "?"]
     */
    separatorCharacters?: string[]
}

export interface splitOptions {
    /**
     * Separator options
     */
    SeparatorParser?: SeparatorParserOptions;
}

/**
 * split `text` into Sentence nodes
 */
export declare function split(text: string, options?: splitOptions): SentenceSplitterTxtNode[];

/**
 * Convert Paragraph Node to Paragraph node that convert children to Sentence node
 * This Node is based on TxtAST.
 * See https://github.com/textlint/textlint/blob/master/docs/txtnode.md
 */
export declare function splitAST(paragraphNode: TxtParentNode, options?: splitOptions): SentenceSplitterTxtNode;
```

See also [TxtAST](https://github.com/textlint/textlint/blob/master/docs/txtnode.md "TxtAST").

### Example

- Online playground: <https://sentence-splitter.netlify.app/>

## Node

This node is based on [TxtAST](https://github.com/textlint/textlint/blob/master/docs/txtnode.md "TxtAST").

### Node's type

- `Str`: Str node has `value`. It is same as TxtAST's `Str` node.
- `Sentence`: Sentence Node has `Str`, `WhiteSpace`, or `Punctuation` nodes as children
- `WhiteSpace`: WhiteSpace Node has `\n`.
- `Punctuation`: Punctuation Node has `.`, `。`

Get these `SentenceSplitterSyntax` constants value from the module:

```js
import { SentenceSplitterSyntax } from "sentence-splitter";

console.log(SentenceSplitterSyntax.Sentence);// "Sentence"
```

### Node's interface

```ts
export type TxtSentenceNode = Omit<TxtParentNode, "type"> & {
    readonly type: "Sentence";
};
export type TxtWhiteSpaceNode = Omit<TxtTextNode, "type"> & {
    readonly type: "WhiteSpace";
};
export type TxtPunctuationNode = Omit<TxtTextNode, "type"> & {
    readonly type: "Punctuation";
};
```

Fore more details, Please see [TxtAST](https://github.com/textlint/textlint/blob/master/docs/txtnode.md "TxtAST").

### Node layout

Node layout image.

```
<WhiteSpace />
<Sentence>
    <Str />
    <Punctuation />
    <Str />
    <Punctuation />
</Sentence>
<WhiteSpace />
```

Note: This library will not split `Str` into `Str` and `WhiteSpace`(tokenize)
Because, Tokenize need to implement language specific context.

### in textlint rule

You can use `splitAST` in textlint rule.
`splitAST` function can preverse original AST's position unlike `split` function.

```ts
import { splitAST, SentenceSplitterSyntax } from "sentence-splitter";

export default function(context, options = {}) {
    const { Syntax, RuleError, report, getSource } = context;
    return {
        [Syntax.Paragraph](node) {
            const resultNode = splitAST(node);
            const sentenceNodes = resultNode.children.filter(childNode => childNode.type === SentenceSplitterSyntax.Sentence);
            console.log(sentenceNodes); // => Sentence nodes
        }
    }
}
```

Example

- [textlint-ja/textlint-rule-max-ten: textlint rule that limit maxinum ten(、) count of sentence.](https://github.com/textlint-ja/textlint-rule-max-ten)

## Reference

This library use ["Golden Rule" test](test/pragmatic_segmenter/test.ts) of `pragmatic_segmenter` for testing.

- [diasks2/pragmatic_segmenter: Pragmatic Segmenter is a rule-based sentence boundary detection gem that works out-of-the-box across many languages.](https://github.com/diasks2/pragmatic_segmenter "diasks2/pragmatic_segmenter: Pragmatic Segmenter is a rule-based sentence boundary detection gem that works out-of-the-box across many languages.")

## Tests

Run tests:

    npm test

Create `input.json` from `_input.md`

    npm run createInputJson    

Update snapshots(`output.json`):

    npm run updateSnapshot

### Adding snapshot testcase

1. Create `test/fixtures/<test-case-name>/` directory
2. Put `test/fixtures/<test-case-name>/_input.md` with testing content
3. Run `npm run updateSnapshot`
4. Check the `test/fixtures/<test-case-name>/output.json`
5. If it is ok, commit it

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## License

MIT
