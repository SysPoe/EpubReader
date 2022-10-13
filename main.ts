import * as EvT from "events";
import {FileParser, ListableFile} from "./parsers/FileParser";
import {PdfParser} from "./parsers/pdf";
import {IncomingMessage, ServerResponse} from "http";

class Epub extends ListableFile {
    chapterAmount: number;
    contentChapters: (EpubContentChapter | 0)[];
    rawChapters: (EpubRawChapter | 0)[];
    metadata: any;

    constructor(chapterAmount: number, contentChapters: (EpubContentChapter | 0)[], rawChapters: (EpubRawChapter | 0)[], metadata: any) {
        super();
        this.chapterAmount = chapterAmount;
        this.contentChapters = contentChapters;
        this.rawChapters = rawChapters;
        this.metadata = metadata;
    }
}

type EpubContentChapter = {
    title: string; loc: number; id: string; content: string; html: string; summary: string | undefined; afterword: string | undefined; type: "content";
};
type EpubRawChapter = {
    loc: number; id: string; html: string; type: "raw";
};
type EpubCache = {
    [index: string]: Epub;
};
type TempUserKeyList = {
    [index: string]: {
        user: string; type: string; status: "valid" | "expired";
    };
}
type PermaUserKeyList = {
    [index: string]: {
        user: string; expires: number;
    };
}
export type ExpressApp = any;

const express = require("express");
const app: ExpressApp = express();
const http = require("http");
const fs = require("fs");
const {Server} = require("socket.io");
const EPub = require("epub");
const formidable = require("formidable");
const cheerio = require("cheerio");
const path = require("path");
const {EventEmitter} = require("events");
const debug = true;

// .########.....###....########...######..####.##....##..######..
// .##.....##...##.##...##.....##.##....##..##..###...##.##....##.
// .##.....##..##...##..##.....##.##........##..####..##.##.......
// .########..##.....##.########...######...##..##.##.##.##...####
// .##........#########.##...##.........##..##..##..####.##....##.
// .##........##.....##.##....##..##....##..##..##...###.##....##.
// .##........##.....##.##.....##..######..####.##....##..######..

function debugLog(...log) {
    if (debug) console.debug(...log);
}

function getChapters(manifest): number {
    let greatest: number = 0;
    for (const key in manifest) {
        if (Number.parseInt(key.replace("html", "")) > greatest) greatest = Number.parseInt(key.replace("html", ""));
    }
    return greatest;
}

function parseContentChapter(html: string, id: string, loc: number,): EpubContentChapter | EpubRawChapter {
    const $ = cheerio.load(html);

    let title: string = $("h2").text();
    let summary: string | undefined = $("blockquote.userstuff p.calibre7",).text();
    let afterword: string | undefined = $("div.afterword").text();

    if (afterword !== undefined && afterword.length === 0) afterword = undefined;
    if (summary !== undefined && summary.length === 0) summary = undefined;

    let contentBlock = $("div.userstuff2");
    let contentEls = contentBlock.children("p.calibre7");
    let content = "";
    for (const childNd of contentEls) {
        let child = $(childNd);
        content = content + (`<p>${child.text()}</p>`);
    }

    if (content.length < 1 && summary === undefined && afterword === undefined) return {id, loc, html, type: "raw"};

    return {id, loc, html, title, content, summary, afterword, type: "content"};
}

function parseEpub(location: string): Promise<Epub> {
    let epub = new EPub(location, "/", "/");
    epub.on("error", function (err: Error) {
        console.error(err);
    });
    let promise: Promise<Epub> = new Promise(resolve => {
        epub.on("end", async function () {
            const chapters = getChapters(epub.manifest);
            let contentChapters: (EpubContentChapter | 0)[] = [];
            let rawChapters: (EpubRawChapter | 0)[] = [];

            for (let i = 1; i <= chapters; i++) {
                let text: string = await new Promise(resolve => {
                    epub.getChapter(`html${i}`, function (err, text: string) {
                        resolve(text);
                    });
                });
                let result = parseContentChapter(text, `html${i}`, chapters - i);
                if (result.type == "content") {
                    contentChapters[i - 1] = result;
                    rawChapters[i - 1] = 0;
                } else if (result.type == "raw") {
                    contentChapters[i - 1] = 0;
                    rawChapters[i - 1] = result;
                }
            }
            resolve(new Epub(chapters, contentChapters, rawChapters, epub.metadata));
        });
    })
    epub.parse();
    return promise;
}


function authUsername(username: string): boolean {
    switch (username) {
        case "syspoe":
        case "alex":
            return true;
        default:
            return false
    }
}

function authPassword(username: string, password: string): boolean {
    if (username == "alex" && password == "") return true;
    if (username == "syspoe" && password == "") return true;
}

function getCookie(cname, documentCookie) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(documentCookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

// ..######..########.########..##.....##.########.########.
// .##....##.##.......##.....##.##.....##.##.......##.....##
// .##.......##.......##.....##.##.....##.##.......##.....##
// ..######..######...########..##.....##.######...########.
// .......##.##.......##...##....##...##..##.......##...##..
// .##....##.##.......##....##....##.##...##.......##....##.
// ..######..########.##.....##....###....########.##.....##

const server = http.createServer(app);
const parseEmitter: EvT.EventEmitter = new EventEmitter();
const io = new Server(server);
export let tempUserKeys: TempUserKeyList = {};
export let permaUserKeys: PermaUserKeyList = {};
let eventHandlers: FileParser[] = [];

const pdfParser = new PdfParser();
eventHandlers = pdfParser.register(app, parseEmitter, eventHandlers);

let cache: EpubCache = {};

function tempKeyAuth(key: string, type: string, user: string): boolean {
    if(key === undefined) return false;
    if(tempUserKeys[key] === undefined) return false;
    if(tempUserKeys[key].type !== type) return false;
    return tempUserKeys[key].user === user;
}

function permaKeyAuth(key: string, user: string): boolean {
    if(key === undefined) return false;
    if(permaUserKeys[key] === undefined) return false;
    if(permaUserKeys[key].expires < Date.now()) return false;
    return permaUserKeys[key].user === user;
}

app.get("/", async (req: IncomingMessage, res: ServerResponse) => {
    res.end(fs.readFileSync("./public/index.html").toString());
});
app.get("/socket.io.js", async (req: IncomingMessage, res: ServerResponse) => {
    res.end(fs.readFileSync("./public/socket.io.js").toString());
});
app.post("/upload", async (req: IncomingMessage, res: ServerResponse) => {
    let key = getCookie("key", req.headers.cookie);
    let form = new formidable.IncomingForm();
    form.parse(req, function (error, fields, file) {
        let filepath = file.file.filepath;
        let mypath = './Epubs/';
        if (key !== "" && permaUserKeys[key].expires > Date.now()) mypath += `users/${permaUserKeys[key].user}/`;
        mypath += file.file.originalFilename;
        fs.rename(filepath, mypath, function () {
            res.writeHead(303, {Location: "/"})
            res.end();
        });
        if (key !== "" && permaUserKeys[key].expires > Date.now()) console.log(`\u001b[93m${permaUserKeys[key].user}\u001b[0m upload "${file.file.originalFilename}" \u001b[38;2;50;255;50mSUCCESSFUL\u001b[0m`); else console.log(`\u001b[93mGUEST\u001b[0m upload "${file.file.originalFilename}" \u001b[38;2;50;255;50mSUCCESSFUL\u001b[0m`);
    })
});

io.on("connection", (socket) => {
    let ID = `${socket.request.connection.remoteAddress}-${socket.id}`;
    let user = "guest";
    debugLog(`Connection established to \u001b[93m${ID}\u001b[0m`);
    socket.on("disconnect", async () => {
        debugLog(`Disconnected from client \u001b[93m${ID}\u001b[0m`);
    });
    socket.on("key", key => {
        let userKey = permaUserKeys[key];
        if (userKey === undefined) {
            console.log(`\u001b[93m${ID}\u001b[0m key auth attempt \u001b[38;2;255;50;50mDENIED - INVALID KEY\u001b[0m`);
            return socket.emit("key_invalid");
        }
        if (userKey.expires < Date.now()) {
            console.log(`\u001b[93m${ID}\u001b[0m key auth attempt \u001b[38;2;255;50;50mDENIED - EXPIRED KEY\u001b[0m`);
            return socket.emit("key_invalid");
        }
        console.log(`\u001b[93m${ID}\u001b[0m key auth attempt \u001b[38;2;50;255;50mACCEPTED - USER "${userKey.user}"\u001b[0m`);
        socket.emit("key_valid");
        user = userKey.user;
    });
    socket.on("username", username => {
        if (!authUsername(username)) {
            console.log(`\u001b[93m${ID}\u001b[0m password auth attempt \u001b[38;2;255;50;50mDENIED - INVALID USERNAME "${username}"\u001b[0m`);
            return socket.emit("invalid_auth")
        }
        socket.emit("valid_username");
        user = username;
    });
    socket.on("password", password => {
        if (authPassword(user, password)) {
            let key = Math.random().toString(36);
            let expires = Date.now() + 1000 * 60;
            permaUserKeys[key] = {user, expires};
            console.log(`\u001b[93m${ID}\u001b[0m password auth attempt \u001b[38;2;50;255;50mACCEPTED - USER "${user}"\u001b[0m`);
            return socket.emit("valid_password", {key, expires});
        }
        console.log(`\u001b[93m${ID}\u001b[0m password auth attempt \u001b[38;2;255;50;50mDENIED - INVALID PASSWORD "${password}" FOR USERNAME "${user}"\u001b[0m`);
        socket.emit("invalid_auth");
        user = "guest";
    })
    socket.on("list", async () => {
        let time = new Date().getTime();
        let results: any[] = []
        let userArray = [];
        if (fs.existsSync(`./Epubs/users/${user}`)) userArray = fs.readdirSync(`./Epubs/users/${user}`).map((value: string) => `users/${user}/${value}`);
        for (let book of fs.readdirSync("./Epubs").concat(userArray)) {
            if (cache[book] !== undefined) {
                results.push({...cache[book].metadata, book});
            } else {
                const fileExt = path.extname(book).toLowerCase();
                let bookResults: ListableFile;
                if (fileExt.length < 1) continue
                if (fileExt !== ".epub") bookResults = eventHandlers[fileExt].parseList(`${__dirname}/Epubs/${book}`); else {
                    let res = await parseEpub(`./Epubs/${book}`);
                    bookResults = res;
                    cache[book] = res;
                }
                results.push({...bookResults.metadata, book});
            }
        }
        debugLog(`\u001b[92mlist\u001b[0m - \u001b[94m${new Date().getTime() - time}ms\u001b[0m from \u001b[93m${ID}\u001b[0m`);
        socket.emit("list", results);
    })
    socket.on("parse", async book => {
        if (cache[book] !== undefined) {
            socket.emit("results", {book, results: cache[book]});
            debugLog(`\u001b[92mparse (C)\u001b[0m - \u001b[94m${book}\u001b[0m from \u001b[93m${ID}\u001b[0m`);
        } else {
            if (book.startsWith("users/") && !book.startsWith(`users/${user}`)) return;
            const fileExt = path.extname(book).toLowerCase();
            if (fileExt !== ".epub") return parseEmitter.emit(fileExt, {
                loc: `${__dirname}/Epubs/${book}`, socket, user
            });
            debugLog(`\u001b[92mparse (NC)\u001b[0m - \u001b[94m${book}\u001b[0m from \u001b[93m${ID}\u001b[0m`);
            let results = await parseEpub(`./Epubs/${book}`);
            cache[book] = results;
            socket.emit("results", {book, results})
        }
    })
});

server.listen(3000, () => {
    console.log("Listening on *:3000... Access at http://localhost:3000");
    // if(debug) require("openurl").open("http://localhost:3000");
});
