# sentence-splitter

Split {Japanese, English} text into sentences.

## Installation

    npm install sentence-splitter

## Usage

- `splitSentences(text, [options])`: `Node[]`

```js
import splitSentences from "sentence-splitter";
let sentences = splitSentences("text.\n\ntext");
console.log(JSON.stringify(sentences, null, 4));
/*
[
    {
        "type": "Sentence",
        "raw": "text.",
        "value": "text.",
        "loc": {
            "start": {
                "line": 1,
                "column": 0
            },
            "end": {
                "line": 1,
                "column": 5
            }
        },
        "range": [
            0,
            5
        ]
    },
    {
        "type": "WhiteSpace",
        "raw": "\n",
        "value": "\n",
        "loc": {
            "start": {
                "line": 1,
                "column": 5
            },
            "end": {
                "line": 2,
                "column": 0
            }
        },
        "range": [
            5,
            6
        ]
    },
    {
        "type": "WhiteSpace",
        "raw": "\n",
        "value": "\n",
        "loc": {
            "start": {
                "line": 2,
                "column": 0
            },
            "end": {
                "line": 3,
                "column": 0
            }
        },
        "range": [
            6,
            7
        ]
    },
    {
        "type": "Sentence",
        "raw": "text",
        "value": "text",
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
            7,
            11
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

### Node's type

- `Sentence`: Sentence Node contain punctuation.
- `WhiteSpace`: WhiteSpace Node has `\n`.

## FAQ

### How to know real sentence?

`sentence-splitter` split text into `Sentence` and `WhiteSpace`

`sentence-splitter` following text to **3** Sentence and **3** WhiteSpace.

Some markdown parser take cognizance 1 Sentence + 1 WhiteSpace + 1Sentence as 1 Sentence.
if you want to replicate this algorithm, then you should write this algorithm.

```markdown
TextA
TextB

TextC
```

Output: 

```json
[
    {
        "type": "Sentence",
        "raw": "TextA",
        "value": "TextA",
        "loc": {
            "start": {
                "line": 1,
                "column": 0
            },
            "end": {
                "line": 1,
                "column": 5
            }
        },
        "range": [
            0,
            5
        ]
    },
    {
        "type": "WhiteSpace",
        "raw": "\n",
        "value": "\n",
        "loc": {
            "start": {
                "line": 1,
                "column": 5
            },
            "end": {
                "line": 2,
                "column": 0
            }
        },
        "range": [
            5,
            6
        ]
    },
    {
        "type": "Sentence",
        "raw": "TextB",
        "value": "TextB",
        "loc": {
            "start": {
                "line": 2,
                "column": 0
            },
            "end": {
                "line": 2,
                "column": 5
            }
        },
        "range": [
            6,
            11
        ]
    },
    {
        "type": "WhiteSpace",
        "raw": "\n",
        "value": "\n",
        "loc": {
            "start": {
                "line": 2,
                "column": 5
            },
            "end": {
                "line": 3,
                "column": 0
            }
        },
        "range": [
            11,
            12
        ]
    },
    {
        "type": "WhiteSpace",
        "raw": "\n",
        "value": "\n",
        "loc": {
            "start": {
                "line": 3,
                "column": 0
            },
            "end": {
                "line": 4,
                "column": 0
            }
        },
        "range": [
            12,
            13
        ]
    },
    {
        "type": "Sentence",
        "raw": "TextC",
        "value": "TextC",
        "loc": {
            "start": {
                "line": 4,
                "column": 0
            },
            "end": {
                "line": 4,
                "column": 5
            }
        },
        "range": [
            13,
            18
        ]
    }
]
```

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