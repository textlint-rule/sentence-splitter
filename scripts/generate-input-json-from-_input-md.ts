import * as path from "path";
import * as fs from "fs";
import { TxtParentNode } from "@textlint/ast-node-types";

const { parse } = require("@textlint/markdown-to-ast");

// Create input.json from Markdown
// _input.md -> input.json
const fixturesDir = path.join(__dirname, "../test/fixtures");
fs.readdirSync(fixturesDir).map((caseName) => {
    const fixtureDir = path.join(fixturesDir, caseName);
    const actualPath = path.join(fixtureDir, "_input.md");
    if (!fs.existsSync(actualPath)) {
        return; // skip
    }
    const inputMarkdown = fs.readFileSync(actualPath, "utf-8");
    const AST: TxtParentNode = parse(inputMarkdown);
    const firstBodyNode = AST.children[0];
    fs.writeFileSync(path.join(fixtureDir, "input.json"), JSON.stringify(firstBodyNode, null, 2) + "\n", "utf-8");
});
