// Measure builds on a set: each measurement runs in a process of its own, and the builds run in turns
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ProfileError, log } from "./command.js";
import { entryOf } from "./builds.js";
import { summarizeCpuProfile } from "./cpuprofile.js";

const WORKER = fileURLToPath(new URL("../worker.js", import.meta.url));
// The number of processes that measure the times, for each build
const TIME_ROUNDS = 3;
const MAX_SHOWN_DIFFERENCES = 10;
// A CPU profile has about this much splitting of the slowest build, and at most this many passes
const CPU_PROFILE_MS = 1000;
const MAX_CPU_PROFILE_PASSES = 200;

const runWorker = (build, set, setFile, measurement, options = {}) => {
    const args = ["--expose-gc", ...(options.nodeArgs ?? []), WORKER, measurement, entryOf(build.root), setFile];
    if (options.argument !== undefined) args.push(options.argument);
    const result = spawnSync(process.execPath, args, {
        encoding: "utf-8",
        maxBuffer: 1024 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"]
    });
    if (result.error || result.status !== 0) {
        const reason = result.error ? result.error.message : result.stderr;
        throw new ProfileError(
            `The measurement "${measurement}" of the ${build.name} (${build.commit.slice(0, 12)}) failed for the set ${
                set.name
            }.\n${reason}`
        );
    }
    return JSON.parse(result.stdout);
};

/** The index of the first node that is not the same in two lists of nodes */
export const firstDifference = (baseNodes, headNodes) => {
    const length = Math.max(baseNodes.length, headNodes.length);
    for (let i = 0; i < length; i++) {
        if (JSON.stringify(baseNodes[i]) !== JSON.stringify(headNodes[i])) return i;
    }
    return -1;
};

/**
 * The first place where two values differ, as a path such as `children.1.type`, and the values there.
 * @returns {{ path: string, base: unknown, head: unknown } | null}
 */
export const firstDifferentValue = (base, head, path = "") => {
    if (JSON.stringify(base) === JSON.stringify(head)) return null;
    if (base !== null && head !== null && typeof base === "object" && typeof head === "object") {
        const keys =
            Array.isArray(base) && Array.isArray(head)
                ? Object.keys(base.length >= head.length ? base : head)
                : Object.keys({ ...base, ...head });
        for (const key of keys) {
            const difference = firstDifferentValue(base[key], head[key], path === "" ? key : `${path}.${key}`);
            if (difference !== null) return difference;
        }
    }
    return { path, base: base ?? null, head: head ?? null };
};

/**
 * The paragraphs and the files whose result differs between two builds.
 * @returns {{ paragraphs: number, files: number, shown: object[] }}
 */
const diffResults = (set, digests, nodesOf) => {
    const changed = [];
    for (const kind of ["paragraph", "file"]) {
        const base = digests.base[`${kind}s`];
        const head = digests.head[`${kind}s`];
        for (let index = 0; index < base.length; index++) {
            if (base[index] !== head[index]) changed.push({ kind, index });
        }
    }
    const selected = changed.slice(0, MAX_SHOWN_DIFFERENCES);
    const shown = [];
    if (selected.length > 0) {
        const baseNodes = nodesOf("base", selected);
        const headNodes = nodesOf("head", selected);
        selected.forEach(({ kind, index }, i) => {
            const node = firstDifference(baseNodes[i], headNodes[i]);
            const baseNode = baseNodes[i][node] ?? null;
            const headNode = headNodes[i][node] ?? null;
            shown.push({
                kind,
                text: kind === "paragraph" ? set.texts.paragraphs[index].raw : set.texts.files[index].path,
                node,
                // the raw text of the node, and the first field that differs in it
                raw: (headNode ?? baseNode).raw,
                difference: firstDifferentValue(baseNode, headNode)
            });
        });
    }
    return {
        paragraphs: changed.filter((entry) => entry.kind === "paragraph").length,
        files: changed.filter((entry) => entry.kind === "file").length,
        shown
    };
};

/**
 * @param {object} set a set of `prepareSet`
 * @param {object[]} builds the builds, the base first when there are two
 * @param {string} outDir the CPU profiles are written into its `cpuprofiles` directory
 * @param {string} tmpDir
 * @returns the numbers of each build by the name of the build, the differences of the results of two builds,
 *   and the number of passes of the CPU profiles
 */
export const measureSet = (set, builds, outDir, tmpDir) => {
    const setFile = path.join(tmpDir, `set-${set.name}.json`);
    fs.writeFileSync(setFile, JSON.stringify(set.texts));
    const each = (measurement, options) =>
        Object.fromEntries(builds.map((build) => [build.name, runWorker(build, set, setFile, measurement, options)]));

    log(`${set.name}: results`);
    const digests = each("digest");
    const results =
        builds.length === 2
            ? diffResults(set, digests, (name, selected) =>
                  runWorker(
                      builds.find((build) => build.name === name),
                      set,
                      setFile,
                      "nodes",
                      { argument: JSON.stringify(selected) }
                  )
              )
            : null;
    log(`${set.name}: times`);
    const times = Object.fromEntries(builds.map((build) => [build.name, []]));
    for (let round = 0; round < TIME_ROUNDS; round++) {
        for (const build of builds) times[build.name].push(runWorker(build, set, setFile, "time"));
    }
    log(`${set.name}: allocation`);
    // The pause of the collections changes from process to process: the median of TIME_ROUNDS processes
    const allocationRuns = Object.fromEntries(builds.map((build) => [build.name, []]));
    for (let round = 0; round < TIME_ROUNDS; round++) {
        for (const build of builds) allocationRuns[build.name].push(runWorker(build, set, setFile, "allocation"));
    }
    const median = (values) => {
        const sorted = [...values].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    };
    const allocations = Object.fromEntries(
        builds.map((build) => {
            const runs = allocationRuns[build.name];
            const of = (key) => median(runs.map((run) => run[key]));
            return [
                build.name,
                {
                    allocatedMB: of("allocatedMB"),
                    gcPauseMs: of("gcPauseMs"),
                    minorGcs: of("minorGcs"),
                    majorGcs: of("majorGcs")
                }
            ];
        })
    );
    log(`${set.name}: CPU profiles`);
    const cpuDir = path.join(outDir, "cpuprofiles");
    fs.mkdirSync(cpuDir, { recursive: true });

    // The fastest pass of all processes has the least noise of the machine
    const fastest = (name, key) => Math.min(...times[name].flatMap((result) => result[key]));
    // Every build does the same work in its CPU profile, so the times of the profiles can be compared
    const passesOf = (key) => {
        const slowest = Math.max(...builds.map((build) => fastest(build.name, key)));
        return Math.max(1, Math.min(MAX_CPU_PROFILE_PASSES, Math.ceil(CPU_PROFILE_MS / slowest)));
    };
    const cpuPasses = { paragraphs: passesOf("paragraphsMs"), files: passesOf("filesMs") };

    const measures = {};
    for (const build of builds) {
        const cpuProfile = `${set.name}-${build.name}.cpuprofile`;
        runWorker(build, set, setFile, "cpu", {
            nodeArgs: ["--cpu-prof", "--cpu-prof-dir", cpuDir, "--cpu-prof-name", cpuProfile],
            argument: JSON.stringify(cpuPasses)
        });
        const allocation = allocations[build.name];
        measures[build.name] = {
            sentences: digests[build.name].sentences,
            paragraphsMs: fastest(build.name, "paragraphsMs"),
            filesMs: fastest(build.name, "filesMs"),
            allocatedMB: allocation.allocatedMB,
            gcPauseMs: allocation.gcPauseMs,
            minorGcs: allocation.minorGcs,
            majorGcs: allocation.majorGcs,
            cpuProfile: `cpuprofiles/${cpuProfile}`,
            cpu: summarizeCpuProfile(
                JSON.parse(fs.readFileSync(path.join(cpuDir, cpuProfile), "utf-8")),
                build.root,
                WORKER
            )
        };
    }
    return { measures, results, cpuPasses };
};
