"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var express = require("express");
var app = express();
var http = require("http");
var fs = require("fs");
var Server = require("socket.io").Server;
var EPub = require("epub");
var formidable = require("formidable");
var cheerio = require("cheerio");
var debug = true;
// .########.....###....########...######..####.##....##..######..
// .##.....##...##.##...##.....##.##....##..##..###...##.##....##.
// .##.....##..##...##..##.....##.##........##..####..##.##.......
// .########..##.....##.########...######...##..##.##.##.##...####
// .##........#########.##...##.........##..##..##..####.##....##.
// .##........##.....##.##....##..##....##..##..##...###.##....##.
// .##........##.....##.##.....##..######..####.##....##..######..
var Epub = /** @class */ (function () {
    function Epub(chapterAmount, contentChapters, rawChapters, metadata) {
        this.chapterAmount = chapterAmount;
        this.contentChapters = contentChapters;
        this.rawChapters = rawChapters;
        this.metadata = metadata;
    }
    return Epub;
}());
function debugLog() {
    var log = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        log[_i] = arguments[_i];
    }
    if (debug)
        console.debug.apply(console, log);
}
function getChapters(manifest) {
    var greatest = 0;
    for (var key in manifest) {
        if (Number.parseInt(key.replace("html", "")) > greatest)
            greatest = Number.parseInt(key.replace("html", ""));
    }
    return greatest;
}
function parseContentChapter(html, id, loc) {
    var $ = cheerio.load(html);
    var title = $("h2").text();
    var summary = $("blockquote.userstuff p.calibre7").text();
    var afterword = $("div.afterword").text();
    if (afterword !== undefined && afterword.length === 0)
        afterword = undefined;
    if (summary !== undefined && summary.length === 0)
        summary = undefined;
    var contentBlock = $("div.userstuff2");
    var contentEls = contentBlock.children("p.calibre7");
    var content = [];
    for (var _i = 0, contentEls_1 = contentEls; _i < contentEls_1.length; _i++) {
        var childNd = contentEls_1[_i];
        var child = $(childNd);
        content.push(child.text());
    }
    if (content.length < 1 && summary === undefined && afterword === undefined)
        return { id: id, loc: loc, html: html, type: "raw" };
    return { id: id, loc: loc, html: html, title: title, content: content, summary: summary, afterword: afterword, type: "content" };
}
function parseEpub(location) {
    var epub = new EPub(location, "/", "/");
    epub.on("error", function (err) {
        console.log(location);
        console.error(err);
    });
    var promise = new Promise(function (resolve) {
        epub.on("end", function () {
            return __awaiter(this, void 0, void 0, function () {
                var chapters, contentChapters, rawChapters, _loop_1, i;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            chapters = getChapters(epub.manifest);
                            contentChapters = [];
                            rawChapters = [];
                            _loop_1 = function (i) {
                                var text, result;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4 /*yield*/, new Promise(function (resolve) {
                                                epub.getChapter("html".concat(i), function (err, text) {
                                                    resolve(text);
                                                });
                                            })];
                                        case 1:
                                            text = _b.sent();
                                            result = parseContentChapter(text, "html".concat(i), chapters - i);
                                            if (result.type == "content") {
                                                contentChapters[i - 1] = result;
                                                rawChapters[i - 1] = 0;
                                            }
                                            else if (result.type == "raw") {
                                                contentChapters[i - 1] = 0;
                                                rawChapters[i - 1] = result;
                                            }
                                            return [2 /*return*/];
                                    }
                                });
                            };
                            i = 1;
                            _a.label = 1;
                        case 1:
                            if (!(i <= chapters)) return [3 /*break*/, 4];
                            return [5 /*yield**/, _loop_1(i)];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            i++;
                            return [3 /*break*/, 1];
                        case 4:
                            resolve(new Epub(chapters, contentChapters, rawChapters, epub.metadata));
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
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
var server = http.createServer(app);
var io = new Server(server);
var cache = {};
app.get("/", function (req, res) {
    res.send(fs.readFileSync("./public/index.html").toString());
});
app.get("/socket.io.js", function (req, res) {
    res.send(fs.readFileSync("./public/socket.io.js").toString());
});
app.post("/upload", function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (error, fields, file) {
        console.log(file);
        var filepath = file.file.filepath;
        var mypath = './Epubs/';
        mypath += file.file.originalFilename;
        fs.rename(filepath, mypath, function () {
            res.writeHead(303, { Location: "/" });
            res.end();
        });
    });
});
io.on("connection", function (socket) {
    var ID = socket.id;
    debugLog("Connection established to \u001B[93m".concat(ID, "\u001B[0m"));
    socket.on("disconnect", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            debugLog("Disconnected from client \u001B[93m".concat(ID, "\u001B[0m"));
            return [2 /*return*/];
        });
    }); });
    socket.on("list", function () { return __awaiter(void 0, void 0, void 0, function () {
        var time, results, _i, _a, book, bookResults;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    time = new Date().getTime();
                    results = [];
                    _i = 0, _a = fs.readdirSync("./Epubs");
                    _b.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    book = _a[_i];
                    if (!(cache[book] !== undefined)) return [3 /*break*/, 2];
                    results.push(__assign(__assign({}, cache[book].metadata), { book: book }));
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, parseEpub("./Epubs/".concat(book))];
                case 3:
                    bookResults = _b.sent();
                    cache[book] = bookResults;
                    results.push(__assign(__assign({}, bookResults.metadata), { book: book }));
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5:
                    debugLog("\u001B[92mlist\u001B[0m - \u001B[94m".concat(new Date().getTime() - time, "ms\u001B[0m from \u001B[93m").concat(ID, "\u001B[0m"));
                    socket.emit("list", results);
                    return [2 /*return*/];
            }
        });
    }); });
    socket.on("parse", function (book) { return __awaiter(void 0, void 0, void 0, function () {
        var results;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(cache[book] !== undefined)) return [3 /*break*/, 1];
                    socket.emit("results", { book: book, results: cache[book] });
                    debugLog("\u001B[92mparse (C)\u001B[0m - \u001B[94m".concat(book, "\u001B[0m from \u001B[93m").concat(ID, "\u001B[0m"));
                    return [3 /*break*/, 3];
                case 1:
                    debugLog("\u001B[92mparse (NC)\u001B[0m - \u001B[94m".concat(book, "\u001B[0m from \u001B[93m").concat(ID, "\u001B[0m"));
                    return [4 /*yield*/, parseEpub("./Epubs/".concat(book))];
                case 2:
                    results = _a.sent();
                    cache[book] = results;
                    socket.emit("results", { book: book, results: results });
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    }); });
});
server.listen(3000, function () {
    console.log("Listening on *:3000... Access at http://localhost:3000");
    // if(debug) require("openurl").open("http://localhost:3000");
});
