import * as path from "path";
import * as fs from "fs";
import * as assert from "assert";
import { splitAST } from "../src/sentence-splitter";
import { TxtParentNode } from "@textlint/ast-node-types";

const fixturesDir = path.join(__dirname, "fixtures");
describe("fixtures testing", () => {
    fs.readdirSync(fixturesDir).map(caseName => {
        it(`Test ${caseName.replace(/-/g, " ")}`, function() {
            const fixtureDir = path.join(fixturesDir, caseName);
            const actualPath = path.join(fixtureDir, "input.json");
            const optionsPath = path.join(fixtureDir, "options.js");
            const actualContent: TxtParentNode = JSON.parse(fs.readFileSync(actualPath, "utf-8"));
            const splitOptions = fs.existsSync(optionsPath) ? require(optionsPath) : {};
            const actual = splitAST(actualContent, splitOptions);
            const outputFilePath = path.join(fixtureDir, "output.json");
            if (process.env.UPDATE_SNAPSHOT) {
                fs.writeFileSync(outputFilePath, JSON.stringify(actual, null, 4));
                this.skip();
            } else {
                const expected: TxtParentNode = JSON.parse(fs.readFileSync(outputFilePath, "utf-8"));
                assert.deepStrictEqual(
                    actual,
                    expected,
                    `
${actualPath}
${JSON.stringify(actual)}
`
                );
                // Test value
                const inputRaw = actualContent.children.reduce((string, node) => {
                    return string + node.raw;
                }, "");
                const outputRaw = expected.children.reduce((string, node) => {
                    return string + node.raw;
                }, "");
                assert.strictEqual(inputRaw, outputRaw);
                // test loc
                assert.deepEqual(
                    {
                        start: actual.children[0].loc.start,
                        end: actual.children[expected.children.length - 1].loc.end
                    },
                    {
                        start: expected.children[0].loc.start,
                        end: expected.children[expected.children.length - 1].loc.end
                    }
                );
                // test range
                assert.deepEqual(
                    [actual.children[0].range[0], actual.children[expected.children.length - 1].range[1]],
                    [expected.children[0].range[0], expected.children[expected.children.length - 1].range[1]]
                );
            }
        });
    });
});
