# sentence-splitter

Split {Japanese, English} text into sentences.

## Installation

    npm install sentence-splitter

### CLI

    $ npm install -g sentence-splitter
    $ echo "This is a pen. But, this is not pen" | sentence-splitter
    This is a pen.
    But This is not pen


## Usage

```
/**
 * split `text` into Sentence node list.
 */
export declare function split(text: string): (TxtParentNode | TxtNode)[];
/**
 * Convert Paragraph Node to Paragraph node that convert children to Sentence node
 * This Node is based on TxtAST.
 * See https://github.com/textlint/textlint/blob/master/docs/txtnode.md
 */
export declare function splitAST(paragraphNode: TxtParentNode): TxtParentNode;
```

`TxtParentNode` and `TxtNode` is defined in [TxtAST](https://github.com/textlint/textlint/blob/master/docs/txtnode.md "TxtAST").

### Example

```js
import {split, Syntax} from "sentence-splitter";
let sentences = split(`There it is! I found it.
Hello World. My name is Jonas.`);
console.log(JSON.stringify(sentences, null, 4));
/*
[
    {
        "type": "Sentence",
        "raw": "There it is!",
        "value": "There it is!",
        "loc": {
            "start": {
                "line": 1,
                "column": 0
            },
            "end": {
                "line": 1,
                "column": 12
            }
        },
        "range": [
            0,
            12
        ],
        "children": [
            {
                "type": "Str",
                "raw": "There",
                "value": "There",
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
                "raw": " ",
                "value": " ",
                "loc": {
                    "start": {
                        "line": 1,
                        "column": 5
                    },
                    "end": {
                        "line": 1,
                        "column": 6
                    }
                },
                "range": [
                    5,
                    6
                ]
            },
            {
                "type": "Str",
                "raw": "it",
                "value": "it",
                "loc": {
                    "start": {
                        "line": 1,
                        "column": 6
                    },
                    "end": {
                        "line": 1,
                        "column": 8
                    }
                },
                "range": [
                    6,
                    8
                ]
            },
            {
                "type": "WhiteSpace",
                "raw": " ",
                "value": " ",
                "loc": {
                    "start": {
                        "line": 1,
                        "column": 8
                    },
                    "end": {
                        "line": 1,
                        "column": 9
                    }
                },
                "range": [
                    8,
                    9
                ]
            },
            {
                "type": "Str",
                "raw": "is",
                "value": "is",
                "loc": {
                    "start": {
                        "line": 1,
                        "column": 9
                    },
                    "end": {
                        "line": 1,
                        "column": 11
                    }
                },
                "range": [
                    9,
                    11
                ]
            },
            {
                "type": "Punctuation",
                "raw": "!",
                "value": "!",
                "loc": {
                    "start": {
                        "line": 1,
                        "column": 11
                    },
                    "end": {
                        "line": 1,
                        "column": 12
                    }
                },
                "range": [
                    11,
                    12
                ]
            }
        ]
    },
    {
        "type": "WhiteSpace",
        "raw": " ",
        "value": " ",
        "loc": {
            "start": {
                "line": 1,
                "column": 12
            },
            "end": {
                "line": 1,
                "column": 13
            }
        },
        "range": [
            12,
            13
        ]
    },
    {
        "type": "Sentence",
        "raw": "I found it.\nHello World.",
        "value": "I found it.\nHello World.",
        "loc": {
            "start": {
                "line": 1,
                "column": 13
            },
            "end": {
                "line": 2,
                "column": 12
            }
        },
        "range": [
            13,
            37
        ],
        "children": [
            {
                "type": "Str",
                "raw": "I",
                "value": "I",
                "loc": {
                    "start": {
                        "line": 1,
                        "column": 13
                    },
                    "end": {
                        "line": 1,
                        "column": 14
                    }
                },
                "range": [
                    13,
                    14
                ]
            },
            {
                "type": "WhiteSpace",
                "raw": " ",
                "value": " ",
                "loc": {
                    "start": {
                        "line": 1,
                        "column": 14
                    },
                    "end": {
                        "line": 1,
                        "column": 15
                    }
                },
                "range": [
                    14,
                    15
                ]
            },
            {
                "type": "Str",
                "raw": "found",
                "value": "found",
                "loc": {
                    "start": {
                        "line": 1,
                        "column": 15
                    },
                    "end": {
                        "line": 1,
                        "column": 20
                    }
                },
                "range": [
                    15,
                    20
                ]
            },
            {
                "type": "WhiteSpace",
                "raw": " ",
                "value": " ",
                "loc": {
                    "start": {
                        "line": 1,
                        "column": 20
                    },
                    "end": {
                        "line": 1,
                        "column": 21
                    }
                },
                "range": [
                    20,
                    21
                ]
            },
            {
                "type": "Str",
                "raw": "it.",
                "value": "it.",
                "loc": {
                    "start": {
                        "line": 1,
                        "column": 21
                    },
                    "end": {
                        "line": 1,
                        "column": 24
                    }
                },
                "range": [
                    21,
                    24
                ]
            },
            {
                "type": "WhiteSpace",
                "raw": "\n",
                "value": "\n",
                "loc": {
                    "start": {
                        "line": 1,
                        "column": 24
                    },
                    "end": {
                        "line": 2,
                        "column": 0
                    }
                },
                "range": [
                    24,
                    25
                ]
            },
            {
                "type": "Str",
                "raw": "Hello",
                "value": "Hello",
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
                    25,
                    30
                ]
            },
            {
                "type": "WhiteSpace",
                "raw": " ",
                "value": " ",
                "loc": {
                    "start": {
                        "line": 2,
                        "column": 5
                    },
                    "end": {
                        "line": 2,
                        "column": 6
                    }
                },
                "range": [
                    30,
                    31
                ]
            },
            {
                "type": "Str",
                "raw": "World",
                "value": "World",
                "loc": {
                    "start": {
                        "line": 2,
                        "column": 6
                    },
                    "end": {
                        "line": 2,
                        "column": 11
                    }
                },
                "range": [
                    31,
                    36
                ]
            },
            {
                "type": "Punctuation",
                "raw": ".",
                "value": ".",
                "loc": {
                    "start": {
                        "line": 2,
                        "column": 11
                    },
                    "end": {
                        "line": 2,
                        "column": 12
                    }
                },
                "range": [
                    36,
                    37
                ]
            }
        ]
    },
    {
        "type": "WhiteSpace",
        "raw": " ",
        "value": " ",
        "loc": {
            "start": {
                "line": 2,
                "column": 12
            },
            "end": {
                "line": 2,
                "column": 13
            }
        },
        "range": [
            37,
            38
        ]
    },
    {
        "type": "Sentence",
        "raw": "My name is Jonas.",
        "value": "My name is Jonas.",
        "loc": {
            "start": {
                "line": 2,
                "column": 13
            },
            "end": {
                "line": 2,
                "column": 30
            }
        },
        "range": [
            38,
            55
        ],
        "children": [
            {
                "type": "Str",
                "raw": "My",
                "value": "My",
                "loc": {
                    "start": {
                        "line": 2,
                        "column": 13
                    },
                    "end": {
                        "line": 2,
                        "column": 15
                    }
                },
                "range": [
                    38,
                    40
                ]
            },
            {
                "type": "WhiteSpace",
                "raw": " ",
                "value": " ",
                "loc": {
                    "start": {
                        "line": 2,
                        "column": 15
                    },
                    "end": {
                        "line": 2,
                        "column": 16
                    }
                },
                "range": [
                    40,
                    41
                ]
            },
            {
                "type": "Str",
                "raw": "name",
                "value": "name",
                "loc": {
                    "start": {
                        "line": 2,
                        "column": 16
                    },
                    "end": {
                        "line": 2,
                        "column": 20
                    }
                },
                "range": [
                    41,
                    45
                ]
            },
            {
                "type": "WhiteSpace",
                "raw": " ",
                "value": " ",
                "loc": {
                    "start": {
                        "line": 2,
                        "column": 20
                    },
                    "end": {
                        "line": 2,
                        "column": 21
                    }
                },
                "range": [
                    45,
                    46
                ]
            },
            {
                "type": "Str",
                "raw": "is",
                "value": "is",
                "loc": {
                    "start": {
                        "line": 2,
                        "column": 21
                    },
                    "end": {
                        "line": 2,
                        "column": 23
                    }
                },
                "range": [
                    46,
                    48
                ]
            },
            {
                "type": "WhiteSpace",
                "raw": " ",
                "value": " ",
                "loc": {
                    "start": {
                        "line": 2,
                        "column": 23
                    },
                    "end": {
                        "line": 2,
                        "column": 24
                    }
                },
                "range": [
                    48,
                    49
                ]
            },
            {
                "type": "Str",
                "raw": "Jonas.",
                "value": "Jonas.",
                "loc": {
                    "start": {
                        "line": 2,
                        "column": 24
                    },
                    "end": {
                        "line": 2,
                        "column": 30
                    }
                },
                "range": [
                    49,
                    55
                ]
            }
        ]
    }
]
*/
```

- `line`: start with **1**
- `column`: start with **0**

See more detail on [Why do `line` of location in JavaScript AST(ESTree) start with 1 and not 0?](https://gist.github.com/azu/8866b2cb9b7a933e01fe "Why do `line` of location in JavaScript AST(ESTree) start with 1 and not 0?")

### Node's type

- `Str`: Str node has `value`
- `Sentence`: Sentence Node has `Str`, `WhiteSpace`, or `Punctuation` nodes as children
- `WhiteSpace`: WhiteSpace Node has `\n`.
- `Punctuation`: Punctuation Node has `.`, `。`

Get these `Syntax` constants value from the module:

```js
import {Syntax} from "sentence-splitter";
console.log(Syntax.Sentence);// "Sentence"
````

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
