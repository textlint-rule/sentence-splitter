import { TxtNode, TxtParentNode } from "@textlint/ast-node-types";
import { AbstractParser } from "./AbstractParser";

const StructureSource = require("structured-source");

export class SourceCode {
    private _index: number = 0;
    private source: any;
    private text: string;
    private sourceNode?: TxtParentNode;
    private contexts: string[] = [];
    private contextRanges: [number, number][] = [];
    private firstChildOffset: number;
    private startOffset: number;

    constructor(input: string | TxtParentNode) {
        if (typeof input === "string") {
            this.text = input;
            this.source = new StructureSource(input);
            this.firstChildOffset = 0;
            this.startOffset = 0;
        } else {
            this.text = input.raw;
            this.sourceNode = input;
            this.source = new StructureSource(input.raw);
            // Header Node's children does not start with index 0
            // Example: # Header
            // It start index is `2`
            if (this.sourceNode.children[0]) {
                this.startOffset = this.sourceNode.range[0];
                this.firstChildOffset = this.sourceNode.children[0].range[0] - this.sourceNode.range[0];
                console.log(this.firstChildOffset);
            } else {
                this.firstChildOffset = 0;
                this.startOffset = 0;
            }
        }
    }

    get index() {
        return this._index;
    }

    set index(newIndex) {
        this._index = newIndex;
    }

    markContextRange(range: [number, number]) {
        this.contextRanges.push(range);
    }

    isInContextRange() {
        const index = this.index;
        return this.contextRanges.some(range => {
            return range[0] <= index && index < range[1];
        });
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
        const index = this.contexts.lastIndexOf(context);
        if (index !== -1) {
            this.contexts.splice(index, 1);
        }
    }

    /**
     * Return absolute position object
     */
    now() {
        const indexWithChildrenOffset = this.index + this.startOffset + this.firstChildOffset;
        const position = this.source.indexToPosition(indexWithChildrenOffset);
        return {
            line: position.line as number,
            column: position.column as number,
            offset: indexWithChildrenOffset
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
        const index = this.index + over + this.firstChildOffset;
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
        const index = this.index + over + this.firstChildOffset + this.startOffset;
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
        const value = this.sliceRange(startPosition.offset, endPosition.offset);
        return {
            value,
            startPosition,
            endPosition
        };
    }

    sliceRange(start: number, end: number) {
        const number2 = this.startOffset;
        return this.text.slice(start - number2, end - number2);
    }
}
