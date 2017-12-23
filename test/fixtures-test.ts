import * as path from "path";
import * as fs from "fs";
import * as assert from "assert";
import { splitAST } from "../src/sentence-splitter";
import { TxtNode, TxtParentNode } from "@textlint/ast-node-types";

const fixturesDir = path.join(__dirname, "fixtures");
describe("fixtures testing", () => {
    fs.readdirSync(fixturesDir).map(caseName => {
        it(`Test ${caseName.replace(/-/g, " ")}`, function() {
            const fixtureDir = path.join(fixturesDir, caseName);
            const actualPath = path.join(fixtureDir, "input.json");
            const actualContent = JSON.parse(fs.readFileSync(actualPath, "utf-8"));
            const actual = splitAST(actualContent);
            const outputFilePath = path.join(fixtureDir, "output.json");
            if (process.env.UPDATE) {
                fs.writeFileSync(outputFilePath, JSON.stringify(actual, null, 4));
                this.skip();
            } else {
                const expected = JSON.parse(fs.readFileSync(outputFilePath, "utf-8"));
                assert.deepStrictEqual(
                    actual,
                    expected,
                    `
${actualPath}
${JSON.stringify(actual)}
`
                );
                // Test value
                const inputRaw = (actualContent as TxtParentNode).raw;
                const outputRaw = (expected as (TxtParentNode | TxtNode)[]).reduce((string, node) => {
                    return string + node.raw;
                }, "");
                assert.strictEqual(inputRaw, outputRaw);
            }
        });
    });
});
