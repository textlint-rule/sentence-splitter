import { SourceCode } from "./parser/SourceCode";

export function logSeek(offset: number, current?: string | boolean) {
    if (process.env.DEBUG !== "sentence-splitter") {
        return;
    }
    console.log("sentence-splitter: " + offset, current);
}

export function logNode(message: string, sourceCode?: SourceCode, currentNodeValue?: string) {
    if (process.env.DEBUG !== "sentence-splitter") {
        return;
    }

    if (!sourceCode || !currentNodeValue) {
        console.log("sentence-splitter: " + message);
        return;
    }
    const RowLength = 50;
    const currentChar = (sourceCode.read() || "").replace(/\n/g, "\\n");
    const nodeValue = currentNodeValue.replace(/\n/g, "\\n");
    console.log("sentence-splitter: " + sourceCode.offset + " " + message + " |" + currentChar + "| " + " ".repeat(RowLength - currentChar.length - message.length) + nodeValue);
}
