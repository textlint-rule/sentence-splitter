import { TxtNode, TxtParentNode } from "@textlint/ast-node-types";
import { AbstractParser } from "./AbstractParser";

const StructureSource = require("structured-source");

export class SourceCode {
    private _index: number = 0;
    private source: any;
    private textCharacters: string[];
    private sourceNode?: TxtParentNode;
    private contexts: string[] = [];
    private contextRanges: [number, number][] = [];
    private firstChildOffset: number;
    private startOffset: number;

    constructor(input: string | TxtParentNode) {
        if (typeof input === "string") {
            this.textCharacters = input.split("");
            this.source = new StructureSource(input);
            this.startOffset = 0;
            this.firstChildOffset = 0;
        } else {
            this.sourceNode = input;
            // When pass AST, fist node may be >=
            // Preserve it as `startOffset`
            this.startOffset = this.sourceNode.range[0];
            // start index is startOffset
            this.index = this.startOffset;
            const offset = Array.from(new Array(this.startOffset));
            this.textCharacters = offset.concat(input.raw.split(""));
            this.source = new StructureSource(input.raw);
            if (this.sourceNode.children[0]) {
                // Header Node's children does not start with index 0
                // Example: # Header
                // It firstChildOffset is `2`
                this.firstChildOffset = this.sourceNode.children[0].range[0] - this.startOffset;
            } else {
                this.firstChildOffset = 0;
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
        const indexWithChildrenOffset = this.index + this.firstChildOffset;
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
        const index = this.index + this.firstChildOffset + over;
        if (index < this.startOffset) {
            return false;
        }
        if (0 <= index && index < this.textCharacters.length) {
            return this.textCharacters[index];
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
        const index = this.index + this.firstChildOffset + over;
        if (index < this.startOffset) {
            return false;
        }
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

    sliceRange(start: number, end: number): string {
        return this.textCharacters.slice(start, end).join("");
    }
}
