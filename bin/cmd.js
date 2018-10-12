#!/usr/bin/env node
var split = require("../").split;
var Syntax = require("../").Syntax;
var concat = require("concat-stream");
var fs = require("fs");
var file = process.argv[2];
var input = file && file !== "-" ? fs.createReadStream(process.argv[2]) : process.stdin;
input.pipe(
    concat(function(buf) {
        split(buf.toString("utf8"))
            .filter(function(node) {
                return node.type === Syntax.Sentence;
            })
            .forEach(function(sentence, index) {
                console.log("Sentence " + index + ": " + sentence.raw);
            });
    })
);
