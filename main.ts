const express = require("express");
const app = express();
const http = require("http");
const fs = require("fs");
const {Server} = require("socket.io");
const EPub = require("epub");
const formidable = require("formidable");
const cheerio = require("cheerio");
const debug = true;

// .########.....###....########...######..####.##....##..######..
// .##.....##...##.##...##.....##.##....##..##..###...##.##....##.
// .##.....##..##...##..##.....##.##........##..####..##.##.......
// .########..##.....##.########...######...##..##.##.##.##...####
// .##........#########.##...##.........##..##..##..####.##....##.
// .##........##.....##.##....##..##....##..##..##...###.##....##.
// .##........##.....##.##.....##..######..####.##....##..######..

class Epub {
    chapterAmount: number;
    contentChapters: (EpubContentChapter | 0)[];
    rawChapters: (EpubRawChapter | 0)[];
    metadata: any;

    constructor(chapterAmount: number, contentChapters: (EpubContentChapter | 0)[], rawChapters: (EpubRawChapter | 0)[], metadata: any) {
        this.chapterAmount = chapterAmount;
        this.contentChapters = contentChapters;
        this.rawChapters = rawChapters;
        this.metadata = metadata;
    }
}

type EpubContentChapter = {
    title: string; loc: number; id: string; content: string[]; html: string; summary: string | undefined; afterword: string | undefined; type: "content";
};
type EpubRawChapter = {
    loc: number; id: string; html: string; type: "raw";
};
type EpubCache = {
    [index: string]: Epub;
};

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
    let content: string[] = [];
    for (const childNd of contentEls) {
        let child = $(childNd);
        content.push(child.text());
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

// ..######..########.########..##.....##.########.########.
// .##....##.##.......##.....##.##.....##.##.......##.....##
// .##.......##.......##.....##.##.....##.##.......##.....##
// ..######..######...########..##.....##.######...########.
// .......##.##.......##...##....##...##..##.......##...##..
// .##....##.##.......##....##....##.##...##.......##....##.
// ..######..########.##.....##....###....########.##.....##

const server = http.createServer(app);
const io = new Server(server);
let cache: EpubCache = {};

app.get("/", (req, res) => {
    res.send(fs.readFileSync("./public/index.html").toString());
});
app.get("/socket.io.js", (req, res) => {
    res.send(fs.readFileSync("./public/socket.io.js").toString());
});
app.post("/upload", (req, res) => {
    let form = new formidable.IncomingForm();
    form.parse(req, function (error, fields, file) {
        console.log(file);
        let filepath = file.file.filepath;
        let mypath = './Epubs/';
        mypath += file.file.originalFilename;
        fs.rename(filepath, mypath, function () {
            res.writeHead(303, {Location: "/"})
            res.end();
        });
    })
});

io.on("connection", (socket) => {
    let ID = socket.id;
    debugLog(`Connection established to \u001b[93m${ID}\u001b[0m`);
    socket.on("disconnect", async () => {
        debugLog(`Disconnected from client \u001b[93m${ID}\u001b[0m`);
    });
    socket.on("list", async () => {
        let time = new Date().getTime();
        let results: any[] = []
        for (let book of fs.readdirSync("./Epubs")) {
            if (cache[book] !== undefined) {
                results.push({...cache[book].metadata, book});
            } else {
                let bookResults = await parseEpub(`./Epubs/${book}`);
                cache[book] = bookResults;
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
