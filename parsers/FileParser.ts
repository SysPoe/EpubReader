import { EventEmitter } from "events";
import { ExpressApp } from "../main";

export type Metadata = {
	title: string;
	creator: string;
};

export class ListableFile {
	metadata: Metadata;

	constructor ( title: string = "", creator: string = "" ) {
		this.metadata = { title, creator };
	}
}

export interface FileParser {
	register (
		app: ExpressApp,
		emitter: EventEmitter,
		fileList: FileParser[],
	): FileParser[];

	parseList ( absoluteFilePath: string ): ListableFile;
}
