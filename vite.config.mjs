import * as path from "node:path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
export default {
    root: path.join(__dirname, "public")
};
