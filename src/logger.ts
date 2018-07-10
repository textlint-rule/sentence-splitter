export function debugLog(...args: any[]) {
    if (process.env.NODE_ENV !== "test") {
        return;
    }
    console.log("sentence-splitter: ", ...args);
}
