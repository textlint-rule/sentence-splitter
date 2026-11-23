// The builds that are measured: the working tree, and the base of a comparison
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { HEAD_ROOT, ProfileError, run, git, log } from "./command.js";

const hasCommit = (ref) =>
    spawnSync("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], { cwd: HEAD_ROOT, stdio: "ignore" })
        .status === 0;

export const defaultBase = () => {
    const ref = ["origin/master", "master"].find(hasCommit);
    if (ref === undefined) {
        throw new ProfileError("No base: neither origin/master nor master exists. Pass --base <ref>.");
    }
    return ref;
};

/**
 * The ES module of a build, from the "module" field of its package.json.
 * The worker uses only `split` and `splitAST` of it, so any commit that has them can be measured.
 */
export const entryOf = (root) => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
    return path.join(root, pkg.module ?? pkg.main);
};

const build = (root, label) => {
    log(`building ${label}`);
    run("pnpm", ["run", "build"], { cwd: root, label: `The build of ${label}` });
};

const checkBuilt = (root, label) => {
    const entry = entryOf(root);
    if (!fs.existsSync(entry)) {
        throw new ProfileError(`${label} is not built: ${entry} does not exist. Run "pnpm run build" first.`);
    }
};

/** The working tree */
export const prepareHead = (options) => {
    if (options.build) {
        build(HEAD_ROOT, "the working tree");
    }
    checkBuilt(HEAD_ROOT, "The working tree");
    const dirty = git(["status", "--porcelain", "--untracked-files=no"]) !== "";
    return { name: "head", root: HEAD_ROOT, ref: null, commit: git(["rev-parse", "HEAD"]), dirty };
};

/**
 * The base: a worktree of its commit with the dependencies that the commit locks.
 * It is kept in the cache directory for the next comparison with the same commit.
 */
export const prepareBase = (ref, cacheDir) => {
    if (!hasCommit(ref)) {
        throw new ProfileError(`The base ${ref} is not a commit of this repository.`);
    }
    const commit = git(["rev-parse", "--verify", `${ref}^{commit}`]);
    const dir = path.join(cacheDir, `base-${commit}`);
    const marker = path.join(dir, ".profile-built");
    if (!fs.existsSync(marker)) {
        if (fs.existsSync(dir)) {
            // a comparison that was stopped before the build ended
            spawnSync("git", ["worktree", "remove", "--force", dir], { cwd: HEAD_ROOT, stdio: "ignore" });
            fs.rmSync(dir, { recursive: true, force: true });
        }
        spawnSync("git", ["worktree", "prune"], { cwd: HEAD_ROOT, stdio: "ignore" });
        fs.mkdirSync(cacheDir, { recursive: true });
        log(`creating a worktree of the base ${commit.slice(0, 12)}`);
        git(["worktree", "add", "--detach", dir, commit]);
        log("installing the dependencies of the base");
        // --ignore-scripts: the scripts of the package would build it and set the Git hooks of the repository
        run("pnpm", ["install", "--frozen-lockfile", "--ignore-scripts"], {
            cwd: dir,
            label: "pnpm install of the base"
        });
        build(dir, "the base");
        fs.writeFileSync(marker, commit);
    }
    checkBuilt(dir, "The base");
    // CI passes the commit itself as the base: a ref that is the commit says nothing more
    return { name: "base", root: dir, ref: ref === commit ? null : ref, commit, dirty: false };
};
