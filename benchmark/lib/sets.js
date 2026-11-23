// The sets of documents that the builds split
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { HEAD_ROOT, ProfileError, git, log } from "./command.js";

const SETS = JSON.parse(fs.readFileSync(new URL("../sets.json", import.meta.url), "utf-8"));
export const SET_NAMES = Object.keys(SETS);

// The Markdown parser of the working tree. Both builds split the same paragraphs
const { parse } = createRequire(path.join(HEAD_ROOT, "package.json"))("@textlint/markdown-to-ast");

const listFiles = (dir, ending) => {
    const files = [];
    const walk = (current) => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const entryPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                walk(entryPath);
            } else if (entry.isFile() && entry.name.endsWith(ending)) {
                files.push(entryPath);
            }
        }
    };
    walk(dir);
    // readdir gives no order
    return files.sort();
};

const collectParagraphs = (node, paragraphs) => {
    if (node.type === "Paragraph") {
        paragraphs.push(node);
        return paragraphs;
    }
    for (const child of node.children ?? []) {
        collectParagraphs(child, paragraphs);
    }
    return paragraphs;
};

/**
 * The texts that the builds split.
 * `paragraphs`: the Paragraph nodes of the documents, which `splitAST` splits, as a textlint rule does.
 * `files`: the documents, which `split` splits as plain text.
 * @param {{ path: string, text: string }[]} documents
 */
export const createTexts = (documents) => {
    const paragraphs = [];
    for (const document of documents) {
        collectParagraphs(parse(document.text), paragraphs);
    }
    const characters = documents.reduce((sum, document) => sum + document.text.length, 0);
    return { paragraphs, files: documents, characters };
};

/** Download the documents of a set at its commit, once for a machine */
const downloadSet = (name, set, cacheDir) => {
    const dir = path.join(cacheDir, "sets", `${name}-${set.commit}`);
    const marker = path.join(dir, ".profile-ready");
    if (!fs.existsSync(marker)) {
        fs.rmSync(dir, { recursive: true, force: true });
        fs.mkdirSync(dir, { recursive: true });
        log(`downloading ${set.repository} ${set.commit.slice(0, 12)} (${set.path})`);
        try {
            git(["init", "--quiet"], dir);
            git(["remote", "add", "origin", set.repository], dir);
            git(["sparse-checkout", "set", "--no-cone", `/${set.path}/**`], dir);
            git(["fetch", "--quiet", "--depth", "1", "--filter=blob:none", "origin", set.commit], dir);
            git(["checkout", "--quiet", "FETCH_HEAD"], dir);
        } catch (error) {
            throw new ProfileError(
                `The set ${name} cannot be downloaded from ${set.repository} at ${set.commit}.\n${error.message}`
            );
        }
        fs.writeFileSync(marker, set.commit);
    }
    return path.join(dir, set.path);
};

export const checkSetNames = (names) => {
    for (const name of names) {
        if (!SET_NAMES.includes(name)) {
            throw new ProfileError(`Unknown set: ${name}. The sets are ${SET_NAMES.join(", ")}.`);
        }
    }
};

/**
 * @param {string} name
 * @param {string} cacheDir
 */
export const prepareSet = (name, cacheDir) => {
    const set = SETS[name];
    const dir = set.repository ? downloadSet(name, set, cacheDir) : path.join(HEAD_ROOT, set.path);
    const documents = listFiles(dir, set.ending).map((file) => ({
        path: path.relative(dir, file).split(path.sep).join("/"),
        text: fs.readFileSync(file, "utf-8")
    }));
    if (documents.length === 0) {
        throw new ProfileError(`The set ${name} has no document: no file that ends with ${set.ending} in ${dir}.`);
    }
    return {
        name,
        label: set.label,
        repository: set.repository ?? null,
        commit: set.commit ?? null,
        texts: createTexts(documents)
    };
};
