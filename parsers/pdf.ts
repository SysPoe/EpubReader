import {EventEmitter} from "events";
import {FileParser, ListableFile} from "./FileParser";
import {ExpressApp, KEY_SIZE, tempUserKeys} from "../main";
import {IncomingMessage, ServerResponse} from "http";
import * as fs from "fs";
import * as path from "path";
import {generateKey} from "../common";

export class PdfParser implements FileParser {
    parseList(absoluteFilePath: string): ListableFile {
        return new ListableFile(path.basename(absoluteFilePath), "[none]");
    }

    register(
        app: ExpressApp,
        emitter: EventEmitter,
        fileList: FileParser[],
    ): FileParser[] {
        app.get("/pdf", (req: IncomingMessage, res: ServerResponse) => {
            let url = new URL(`http://example.com${req.url}`);
            let key = tempUserKeys[url.searchParams.get("key")];
            let name = url.searchParams.get("name");
            if (key === undefined) {
                console.log(
                    `\u001b[93m${req.connection.remoteAddress}\u001b[0m request \u001b[94m${name}\u001b[0m \u001b[38;2;255;50;50mDENIED - INVALID KEY\u001b[0m`,
                );
                res.writeHead(401);
                return res.end();
            }
            if (key.status === "expired") {
                console.log(
                    `\u001b[93m${
                        req.connection.remoteAddress
                    }\u001b[0m request \u001b[94m${name}\u001b[0m \u001b[38;2;255;50;50mDENIED - EXPIRED KEY "${url.searchParams.get(
                        "key",
                    )}"\u001b[0m`,
                );
                res.writeHead(401);
                return res.end();
            }
            if (key.type !== "pdf") {
                console.log(
                    `\u001b[93m${req.connection.remoteAddress}\u001b[0m request \u001b[94m${name}\u001b[0m \u001b[38;2;255;50;50mDENIED - INVALID KEY TYPE "${key.type}" EXPECTED "pdf"\u001b[0m`,
                );
                tempUserKeys[url.searchParams.get("key")].status = "expired";
                res.writeHead(401);
                return res.end();
            }
            if (
                name.startsWith("users/") &&
                !name.startsWith(`users/${key.user}`)
            ) {
                console.log(
                    `\u001b[93m${
                        req.connection.remoteAddress
                    }\u001b[0m request \u001b[94m${name}\u001b[0m \u001b[38;2;255;50;50mDENIED - WRONG USER "${
                        name.split("/")[1]
                    }" EXPECTED "${key.user}"\u001b[0m`,
                );
                res.writeHead(401);
                tempUserKeys[url.searchParams.get("key")].status = "expired";
                return res.end();
            }
            tempUserKeys[url.searchParams.get("key")].status = "expired";
            fs.readFile(
                `${__dirname}/../Epubs/${name}`,
                (err: Error, data: Buffer) => {
                    if (err) {
                        res.writeHead(404);
                        return res.end();
                    }
                    res.writeHead(200, {"Content-Type": "application/pdf"});
                    res.end(data);
                },
            );
        });
        emitter.on(".pdf", async (res) => {
            let {loc, socket, user} = res;
            let basename = path.basename(loc);
            let split = loc.split("/");
            if (split[split.length - 3] === "users")
                basename = split.slice(-3).join("/");
            let key = generateKey(KEY_SIZE);
            tempUserKeys[key] = {user, type: "pdf", status: "valid"};
            socket.emit("pdf", {basename, key});
        });
        fileList[".pdf"] = this;
        console.log(
            `Registered \u001b[38;2;101;248;205mPDF Parser\u001b[0m for \u001b[38;2;243;205;53m.pdf\u001b[0m files`,
        );
        return fileList;
    }
}
