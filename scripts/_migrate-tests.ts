import * as path from "path";
import * as fs from "fs";
import { TxtParentNode } from "@textlint/ast-node-types";

// input.json -> input.md
const fixturesDir = path.join(__dirname, "../test/fixtures");
fs.readdirSync(fixturesDir).map((caseName) => {
    const fixtureDir = path.join(fixturesDir, caseName);
    const actualPath = path.join(fixtureDir, "input.json");
    const actualContent: TxtParentNode = JSON.parse(fs.readFileSync(actualPath, "utf-8"));
    const inputRaw = actualContent.raw;
    if (!inputRaw) {
        throw new Error(actualPath);
    }
    fs.writeFileSync(path.join(fixtureDir, "_input.md"), inputRaw, "utf-8");
});
