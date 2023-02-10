import { SourceCode } from "./SourceCode.js";

export abstract class AbstractMarker {
    abstract mark(source: SourceCode): void;
}
