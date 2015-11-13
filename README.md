# sentence-splitter

split {Japanese, English} text into sentences.

## Installation

    npm install sentence-splitter

## Usage

- `splitSentences(text, [options])`: `SentenceNode[]`

```js
import splitSentences from "sentence-splitter";
let sentences = splitSentences("text\n\ntext");
console.log(JSON.stringify(sentences, null, 4));
/*
[
    {
        "type": "Sentence",
        "raw": "text\n\n",
        "loc": {
            "start": {
                "line": 1,
                "column": 0
            },
            "end": {
                "line": 3,
                "column": 0
            }
        },
        "range": [
            0,
            6
        ]
    },
    {
        "type": "Sentence",
        "raw": "text",
        "loc": {
            "start": {
                "line": 3,
                "column": 0
            },
            "end": {
                "line": 3,
                "column": 4
            }
        },
        "range": [
            6,
            10
        ]
    }
]
*/

// with splitting char options
let sentences = splitSentences("text¶text", {
    charRegExp: /¶/
});
sentences.length; // 2
```

- `line`: start with **1**
- `column`: start with **0**

See more detail on [Why do `line` of location in JavaScript AST(ESTree) start with 1 and not 0?](https://gist.github.com/azu/8866b2cb9b7a933e01fe "Why do `line` of location in JavaScript AST(ESTree) start with 1 and not 0?")

## Tests

    npm test

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## License

MIT