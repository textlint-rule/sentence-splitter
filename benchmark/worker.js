// Measure one build of sentence-splitter in this process, and print the result as JSON.
//
// Usage: node --expose-gc worker.js <measurement> <ES module of the build> <file of the set> [argument]
//
// It uses only `split` and `splitAST` of the build, so it measures any commit of sentence-splitter.
import fs from "node:fs";
import crypto from "node:crypto";
import inspector from "node:inspector";
import { pathToFileURL } from "node:url";
import { performance, PerformanceObserver, constants } from "node:perf_hooks";

const [measurement, entry, setFile, argument] = process.argv.slice(2);

// A pass is repeated at least MIN_PASSES times, and until the passes take MIN_TOTAL_MS.
// No pass starts after MAX_TOTAL_MS, so that a slow build is measured in a bounded time.
const MIN_PASSES = 5;
const MAX_PASSES = 200;
const MIN_TOTAL_MS = 1000;
const MAX_TOTAL_MS = 10000;
// The allocation of a small set is measured over several passes, so that it has enough samples
const MIN_ALLOCATION_CHARACTERS = 2000000;
// The garbage collections are counted over more passes: a pass of a large set has only a few collections,
// and one long pause of them would decide the number
const MIN_GC_CHARACTERS = 40000000;
const MIN_GC_PASSES = 10;
const SAMPLING_INTERVAL_BYTES = 8192;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const timePasses = (pass) => {
    const times = [];
    let total = 0;
    while (total < MAX_TOTAL_MS && (times.length < MIN_PASSES || (total < MIN_TOTAL_MS && times.length < MAX_PASSES))) {
        const start = performance.now();
        pass();
        const time = performance.now() - start;
        times.push(time);
        total += time;
    }
    return times;
};

const digest = (value) => crypto.createHash("sha1").update(JSON.stringify(value)).digest("hex").slice(0, 16);

const post = (session, method, params) =>
    new Promise((resolve, reject) =>
        session.post(method, params, (error, result) => (error ? reject(error) : resolve(result)))
    );

const main = async () => {
    const { split, splitAST } = await import(pathToFileURL(entry).href);
    const set = JSON.parse(fs.readFileSync(setFile, "utf-8"));
    const splitParagraphs = () => {
        for (let i = 0; i < set.paragraphs.length; i++) splitAST(set.paragraphs[i]);
    };
    const splitFiles = () => {
        for (let i = 0; i < set.files.length; i++) split(set.files[i].text);
    };

    const measurements = {
        /** The digest of the result of every paragraph and of every file */
        async digest() {
            let sentences = 0;
            const paragraphs = set.paragraphs.map((paragraph) => {
                const result = splitAST(paragraph);
                sentences += result.children.filter((node) => node.type === "Sentence").length;
                return digest(result);
            });
            const files = set.files.map((file) => digest(split(file.text)));
            return { paragraphs, files, sentences };
        },

        /** The nodes of the paragraphs and the files that the argument selects: [{ kind, index }] */
        async nodes() {
            return JSON.parse(argument).map(({ kind, index }) =>
                kind === "paragraph" ? splitAST(set.paragraphs[index]).children : split(set.files[index].text)
            );
        },

        /** The times of `splitAST` of every paragraph and of `split` of every file */
        async time() {
            return { paragraphsMs: timePasses(splitParagraphs), filesMs: timePasses(splitFiles) };
        },

        /** The bytes that `splitAST` of every paragraph allocates, and its garbage collections. All numbers are for one pass. */
        async allocation() {
            const passes = Math.max(1, Math.ceil(MIN_ALLOCATION_CHARACTERS / set.characters));
            const gcPasses = Math.max(MIN_GC_PASSES, Math.ceil(MIN_GC_CHARACTERS / set.characters));
            // the first pass compiles the code
            splitParagraphs();
            global.gc();
            await wait(10);

            // The collections are counted without the sampling, because the sampling changes them
            const collections = [];
            const observer = new PerformanceObserver((list) => collections.push(...list.getEntries()));
            observer.observe({ entryTypes: ["gc"] });
            for (let i = 0; i < gcPasses; i++) splitParagraphs();
            await wait(50);
            observer.disconnect();
            const minor = collections.filter((entry) => entry.detail.kind === constants.NODE_PERFORMANCE_GC_MINOR);

            const session = new inspector.Session();
            session.connect();
            await post(session, "HeapProfiler.startSampling", {
                samplingInterval: SAMPLING_INTERVAL_BYTES,
                // count what a collection has freed too
                includeObjectsCollectedByMajorGC: true,
                includeObjectsCollectedByMinorGC: true
            });
            for (let i = 0; i < passes; i++) splitParagraphs();
            const { profile } = await post(session, "HeapProfiler.stopSampling");
            session.disconnect();
            let bytes = 0;
            const walk = (node) => {
                bytes += node.selfSize;
                node.children.forEach(walk);
            };
            walk(profile.head);
            return {
                passes,
                allocatedMB: bytes / passes / 1e6,
                gcPasses,
                gcPauseMs: collections.reduce((sum, entry) => sum + entry.duration, 0) / gcPasses,
                minorGcs: minor.length / gcPasses,
                majorGcs: (collections.length - minor.length) / gcPasses
            };
        },

        /** The splits, for a CPU profile of the process. The argument is the number of passes. */
        async cpu() {
            const passes = JSON.parse(argument);
            for (let pass = 0; pass < passes.paragraphs; pass++) splitParagraphs();
            for (let pass = 0; pass < passes.files; pass++) splitFiles();
            return passes;
        }
    };
    if (!Object.prototype.hasOwnProperty.call(measurements, measurement)) {
        throw new Error(`Unknown measurement: ${measurement}`);
    }
    process.stdout.write(JSON.stringify(await measurements[measurement]()));
};

main().catch((error) => {
    process.stderr.write(`${error && error.stack ? error.stack : error}\n`);
    process.exitCode = 1;
});
