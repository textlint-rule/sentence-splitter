// Commands that the profile and the comparison run
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const HEAD_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** An error whose message is for the person who runs the profile: it is printed without a stack */
export class ProfileError extends Error {}

export const run = (command, args, options = {}) => {
    const result = spawnSync(command, args, {
        cwd: options.cwd ?? HEAD_ROOT,
        encoding: "utf-8",
        maxBuffer: 1024 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, ...options.env }
    });
    const label = options.label ?? `${command} ${args.join(" ")}`;
    if (result.error) {
        throw new ProfileError(`${label} failed: ${result.error.message}`);
    }
    if (result.status !== 0) {
        throw new ProfileError(`${label} failed with the exit status ${result.status}.\n${result.stderr ?? ""}`);
    }
    return result.stdout;
};
export const log = (message) => process.stderr.write(`[profile] ${message}\n`);
export const git = (args, cwd = HEAD_ROOT) => run("git", args, { cwd }).trim();
