// The self time of a CPU profile, by package and by function
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WITHOUT_FILE = ["(garbage collector)", "(program)", "(idle)", "(root)"];

/**
 * @param {object} profile a profile of `node --cpu-prof`
 * @param {string} root the root of the build that ran
 * @param {string} [measurementFile] the script that ran the build. It is not a part of the build
 */
export const summarizeCpuProfile = (profile, root, measurementFile) => {
    const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
    const selfTimes = new Map();
    for (let i = 0; i < profile.samples.length; i++) {
        selfTimes.set(profile.samples[i], (selfTimes.get(profile.samples[i]) ?? 0) + (profile.timeDeltas[i] ?? 0));
    }
    const rootPrefix = `${fs.existsSync(root) ? fs.realpathSync(root) : root}${path.sep}`;
    const placeOf = (callFrame) => {
        const { url, functionName } = callFrame;
        if (!url) {
            // V8 itself, or a native function
            return { owner: WITHOUT_FILE.includes(functionName) ? functionName : "(native)", file: "" };
        }
        if (url.startsWith("node:")) {
            return { owner: "(node)", file: url };
        }
        const filePath = url.startsWith("file://") ? fileURLToPath(url) : url;
        if (filePath === measurementFile) {
            return { owner: "(measurement)", file: "" };
        }
        const marker = `${path.sep}node_modules${path.sep}`;
        const index = filePath.lastIndexOf(marker);
        if (index !== -1) {
            const parts = filePath.slice(index + marker.length).split(path.sep);
            const scoped = parts[0].startsWith("@");
            return {
                owner: scoped ? `${parts[0]}/${parts[1]}` : parts[0],
                file: parts.slice(scoped ? 2 : 1).join("/")
            };
        }
        if (filePath.startsWith(rootPrefix)) {
            return { owner: "sentence-splitter", file: filePath.slice(rootPrefix.length).split(path.sep).join("/") };
        }
        return { owner: "(other)", file: path.basename(filePath) };
    };
    const packages = new Map();
    const functions = new Map();
    let total = 0;
    for (const [id, time] of selfTimes) {
        const { callFrame } = nodes.get(id);
        const { owner, file } = placeOf(callFrame);
        // the time that the process waits is not CPU time
        if (owner === "(idle)" || owner === "(root)") continue;
        total += time;
        packages.set(owner, (packages.get(owner) ?? 0) + time);
        const name = callFrame.functionName || "(anonymous)";
        // without the line, so that a function keeps its key when the lines above it change
        const key = `${owner}\t${file}\t${name}`;
        const entry = functions.get(key) ?? { name, package: owner, file, ms: 0 };
        entry.ms += time / 1000;
        functions.set(key, entry);
    }
    return {
        totalMs: total / 1000,
        packages: [...packages].map(([name, time]) => ({ name, ms: time / 1000 })).sort((a, b) => b.ms - a.ms),
        functions: [...functions.values()].sort((a, b) => b.ms - a.ms).slice(0, 50)
    };
};
