import { TxtNode, TxtParentNode } from "@textlint/ast-node-types";
import { AbstractParser } from "./AbstractParser";

const StructureSource = require("structured-source");

export class SourceCode {
    private source: any;
    private index: number = 0;
    private contexts: string[] = [];
    private text: string;
    private sourceNode?: TxtParentNode;

    constructor(input: string | TxtParentNode) {
        if (typeof input === "string") {
            this.text = input;
            this.source = new StructureSource(input);
        } else {
            this.text = input.raw;
            this.sourceNode = input;
            this.source = new StructureSource(input.raw);
        }
    }

    enterContext(context: string) {
        this.contexts.push(context);
    }

    isInContext(context?: string) {
        if (!context) {
            return this.contexts.length > 0;
        }
        return this.contexts.some(targetContext => targetContext === context);
    }

    leaveContext(context: string) {
        const index = this.contexts.indexOf(context);
        if (index !== -1) {
            this.contexts.splice(index, 1);
        }
    }

    now() {
        const position = this.source.indexToPosition(this.index);
        return {
            line: position.line as number,
            column: position.column as number,
            offset: this.index
        };
    }

    get hasEnd() {
        return this.readOrFalse() === false;
    }

    readOrFalse() {
        const char = this.read();
        return char !== "" ? char : false;
    }

    /**
     * read char
     * if can not read, return empty string
     * @returns {string}
     */
    read(over: number = 0) {
        const index = this.index + over;
        if (0 <= index && index < this.text.length) {
            return this.text[index];
        }
        return false;
    }

    /**
     * read node
     * if can not read, return empty string
     * @returns {node}
     */
    readNode(over: number = 0) {
        if (!this.sourceNode) {
            return false;
        }
        const index = this.index + over;
        const matchNodeList = this.sourceNode.children.filter(node => {
            return node.range[0] <= index && index <= node.range[1];
        });
        if (matchNodeList.length > 0) {
            // last match
            // because, range is overlap two nodes
            return matchNodeList[matchNodeList.length - 1];
        }
        return false;
    }

    peek() {
        this.index += 1;
    }

    peekNode(node: TxtNode) {
        this.index += node.range[1] - node.range[0];
    }

    seekNext(
        parser: AbstractParser
    ): {
        value: string;
        startPosition: {
            line: number;
            column: number;
            offset: number;
        };
        endPosition: {
            line: number;
            column: number;
            offset: number;
        };
    } {
        const startPosition = this.now();
        parser.seek(this);
        const endPosition = this.now();
        const value = this.slice(startPosition.offset, endPosition.offset);
        return {
            value,
            startPosition,
            endPosition
        };
    }

    slice(start: number, end: number) {
        return this.text.slice(start, end);
    }
}
