// The commands of the profile and the comparison
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { HEAD_ROOT, ProfileError, log } from "./command.js";
import { SET_NAMES, checkSetNames, prepareSet } from "./sets.js";
import { defaultBase, prepareHead, prepareBase } from "./builds.js";
import { measureSet } from "./measure.js";
import { createResult, renderMarkdown } from "./report.js";

const usage = (compare) =>
    [
        compare
            ? "Usage: pnpm run compare [--base <ref>] [--set <names>] [--out-dir <dir>] [--cache-dir <dir>] [--no-build]"
            : "Usage: pnpm run profile [--set <names>] [--out-dir <dir>] [--cache-dir <dir>] [--no-build]",
        "",
        ...(compare
            ? ["  --base <ref>       the commit to compare the working tree with. Default: origin/master, or master"]
            : []),
        `  --set <names>      the sets of documents, separated by commas. Default: ${SET_NAMES.join(",")}`,
        "  --out-dir <dir>    where the Markdown, the JSON, and the CPU profiles are written. Default: profile-result",
        "  --cache-dir <dir>  where a downloaded set and the build of a base are kept. Default: ~/.cache/sentence-splitter-profile",
        "  --no-build         do not build the working tree before the measurements",
        ""
    ].join("\n");

/**
 * @param {{ compare: boolean }} command the comparison measures a base too
 * @param {string[]} argv
 */
const main = (command, argv) => {
    const { values } = parseArgs({
        args: argv,
        options: {
            ...(command.compare ? { base: { type: "string" } } : {}),
            set: { type: "string" },
            "out-dir": { type: "string" },
            "cache-dir": { type: "string" },
            "no-build": { type: "boolean" },
            help: { type: "boolean" }
        }
    });
    if (values.help) {
        process.stdout.write(usage(command.compare));
        return;
    }
    const setNames = values.set === undefined ? SET_NAMES : values.set.split(",").filter(Boolean);
    checkSetNames(setNames);
    const outDir = path.resolve(values["out-dir"] ?? path.join(HEAD_ROOT, "profile-result"));
    const cacheDir = path.resolve(
        values["cache-dir"] ?? path.join(os.homedir(), ".cache", "sentence-splitter-profile")
    );

    // The base first: an error of the base stops the comparison before anything is measured
    const base = command.compare ? prepareBase(values.base ?? defaultBase(), cacheDir) : undefined;
    const head = prepareHead({ build: !values["no-build"] });
    const builds = base === undefined ? { head } : { base, head };
    const buildList = Object.values(builds);
    const sets = setNames.map((name) => prepareSet(name, cacheDir));

    // The result is written only when every measurement has ended
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sentence-splitter-profile-"));
    try {
        const measuredSets = sets.map((set) => ({ set, ...measureSet(set, buildList, tmpDir, tmpDir) }));
        const result = createResult(builds, measuredSets, {
            node: process.version,
            platform: `${process.platform} ${process.arch}`,
            cpus: os.cpus().length
        });
        const markdown = renderMarkdown(result);
        fs.rmSync(path.join(outDir, "cpuprofiles"), { recursive: true, force: true });
        fs.mkdirSync(outDir, { recursive: true });
        fs.cpSync(path.join(tmpDir, "cpuprofiles"), path.join(outDir, "cpuprofiles"), { recursive: true });
        fs.writeFileSync(path.join(outDir, "profile.json"), `${JSON.stringify(result, null, 2)}\n`);
        fs.writeFileSync(path.join(outDir, "profile.md"), markdown);
        process.stdout.write(markdown);
        log(`wrote ${outDir}`);
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
};

/** Run a command, and print an error for the person who runs it without a stack */
export const runMain = (command) => {
    try {
        main(command, process.argv.slice(2));
    } catch (error) {
        if (error instanceof ProfileError || (error && error.code && String(error.code).startsWith("ERR_PARSE_ARGS"))) {
            process.stderr.write(`${error.message}\n`);
            process.exitCode = 1;
            return;
        }
        throw error;
    }
};
