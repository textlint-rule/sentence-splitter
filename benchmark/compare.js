// Compare the performance profile of a base, such as master, and of the working tree.
//
// Usage: pnpm run compare --help
import { runMain } from "./lib/main.js";

runMain({ compare: true });
