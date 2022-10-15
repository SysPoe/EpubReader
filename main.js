"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.__esModule = true;
exports.permaUserKeys = exports.tempUserKeys = exports.KEY_SIZE = void 0;
var FileParser_1 = require("./parsers/FileParser");
var pdf_1 = require("./parsers/pdf");
var common_1 = require("./common");
var Epub = /** @class */ (function (_super) {
    __extends(Epub, _super);
    function Epub(chapterAmount, contentChapters, rawChapters, metadata) {
        var _this = _super.call(this) || this;
        _this.chapterAmount = chapterAmount;
        _this.contentChapters = contentChapters;
        _this.rawChapters = rawChapters;
        _this.metadata = metadata;
        return _this;
    }
    return Epub;
}(FileParser_1.ListableFile));
exports.KEY_SIZE = 1024;
var express = require("express");
var app = express();
var http = require("http");
var fs = require("fs");
var Server = require("socket.io").Server;
var EPub = require("epub");
var formidable = require("formidable");
var cheerio = require("cheerio");
var path = require("path");
var EventEmitter = require("events").EventEmitter;
var debug = true;
// .########.....###....########...######..####.##....##..######..
// .##.....##...##.##...##.....##.##....##..##..###...##.##....##.
// .##.....##..##...##..##.....##.##........##..####..##.##.......
// .########..##.....##.########...######...##..##.##.##.##...####
// .##........#########.##...##.........##..##..##..####.##....##.
// .##........##.....##.##....##..##....##..##..##...###.##....##.
// .##........##.....##.##.....##..######..####.##....##..######..
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
    var content = "";
    for (var _i = 0, contentEls_1 = contentEls; _i < contentEls_1.length; _i++) {
        var childNd = contentEls_1[_i];
        var child = $(childNd);
        content = content + "<p>".concat(child.text(), "</p>");
    }
    if (content.length < 1 && summary === undefined && afterword === undefined)
        return { id: id, loc: loc, html: html, type: "raw" };
    return {
        id: id,
        loc: loc,
        html: html,
        title: title,
        content: content,
        summary: summary,
        afterword: afterword,
        type: "content"
    };
}
function parseEpub(location) {
    var epub = new EPub(location, "/", "/");
    epub.on("error", function () {
        console.error("\u001B[38;2;255;50;50mERROR: Invalid file ".concat(location, "\u001B[0m"));
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
function authUsername(username) {
    switch (username) {
        case "syspoe":
        case "alex":
            return true;
        default:
            return false;
    }
}
function authPassword(username, password) {
    if (username == "alex" && password == "Crypto123")
        return true;
    if (username == "syspoe" && password == "")
        return true;
}
function getCookie(cname, documentCookie) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(documentCookie);
    var ca = decodedCookie.split(";");
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === " ") {
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
var server = http.createServer(app);
var parseEmitter = new EventEmitter();
var io = new Server(server);
exports.tempUserKeys = {};
exports.permaUserKeys = {};
var sockets = [];
var eventHandlers = [];
var pdfParser = new pdf_1.PdfParser();
eventHandlers = pdfParser.register(app, parseEmitter, eventHandlers);
var cache = {};
function tempKeyAuth(key, type, user) {
    if (key === undefined)
        return false;
    if (exports.tempUserKeys[key] === undefined)
        return false;
    if (exports.tempUserKeys[key].type !== type)
        return false;
    return exports.tempUserKeys[key].user === user;
}
function permaKeyAuth(key, user) {
    if (key === undefined)
        return false;
    if (exports.permaUserKeys[key] === undefined)
        return false;
    if (exports.permaUserKeys[key].expires < Date.now())
        return false;
    return exports.permaUserKeys[key].user === user;
}
app.get("/", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        res.end(fs.readFileSync("./public/index.html").toString());
        return [2 /*return*/];
    });
}); });
app.get("/socket.io.js", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        res.end(fs.readFileSync("./public/socket.io.js").toString());
        return [2 /*return*/];
    });
}); });
app.post("/upload", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var key, form;
    return __generator(this, function (_a) {
        key = getCookie("key", req.headers.cookie);
        form = new formidable.IncomingForm();
        form.parse(req, function (error, fields, file) {
            var filepath = file.file.filepath;
            var mypath = "./Epubs/";
            if (key !== "" && exports.permaUserKeys[key].expires > Date.now())
                mypath += "users/".concat(exports.permaUserKeys[key].user, "/");
            mypath += file.file.originalFilename;
            fs.rename(filepath, mypath, function () {
                res.writeHead(303, { Location: "/" });
                res.end();
            });
            if (key !== "" && exports.permaUserKeys[key].expires > Date.now())
                console.log("\u001B[93m".concat(exports.permaUserKeys[key].user, "\u001B[0m upload \"").concat(file.file.originalFilename, "\" \u001B[38;2;50;255;50mSUCCESSFUL\u001B[0m"));
            else
                console.log("\u001B[93mGUEST\u001B[0m upload \"".concat(file.file.originalFilename, "\" \u001B[38;2;50;255;50mSUCCESSFUL\u001B[0m"));
        });
        return [2 /*return*/];
    });
}); });
io.on("connection", function (socket) { return __awaiter(void 0, void 0, void 0, function () {
    var ID, user, index, currentKey;
    return __generator(this, function (_a) {
        ID = "".concat(socket.request.connection.remoteAddress, "-").concat(socket.id);
        user = "guest";
        index = sockets.length;
        sockets.push({ socket: socket, user: user });
        debugLog("Connection established to \u001B[93m".concat(ID, "\u001B[0m"));
        socket.on("disconnect", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                debugLog("Disconnected from client \u001B[93m".concat(ID, "\u001B[0m"));
                return [2 /*return*/];
            });
        }); });
        socket.on("key", function (key) { return __awaiter(void 0, void 0, void 0, function () {
            var userKey;
            return __generator(this, function (_a) {
                userKey = exports.permaUserKeys[key];
                if (userKey === undefined) {
                    console.log("\u001B[93m".concat(ID, "\u001B[0m key auth attempt \u001B[38;2;255;50;50mDENIED - INVALID KEY\u001B[0m"));
                    return [2 /*return*/, socket.emit("key_invalid")];
                }
                if (userKey.expires < Date.now()) {
                    console.log("\u001B[93m".concat(ID, "\u001B[0m key auth attempt \u001B[38;2;255;50;50mDENIED - EXPIRED KEY\u001B[0m"));
                    return [2 /*return*/, socket.emit("key_invalid")];
                }
                console.log("\u001B[93m".concat(ID, "\u001B[0m key auth attempt \u001B[38;2;50;255;50mACCEPTED - USER \"").concat(userKey.user, "\"\u001B[0m"));
                socket.emit("key_valid");
                currentKey = key;
                user = userKey.user;
                sockets[index].user = user;
                return [2 /*return*/];
            });
        }); });
        socket.on("username", function (username) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!authUsername(username)) {
                    console.log("\u001B[93m".concat(ID, "\u001B[0m password auth attempt \u001B[38;2;255;50;50mDENIED - INVALID USERNAME \"").concat(username, "\"\u001B[0m"));
                    return [2 /*return*/, socket.emit("invalid_auth")];
                }
                socket.emit("valid_username");
                user = username;
                return [2 /*return*/];
            });
        }); });
        socket.on("password", function (password) { return __awaiter(void 0, void 0, void 0, function () {
            var key, expires;
            return __generator(this, function (_a) {
                if (authPassword(user, password)) {
                    key = (0, common_1.generateKey)(exports.KEY_SIZE);
                    expires = Date.now() + 1000 * 60;
                    exports.permaUserKeys[key] = { user: user, expires: expires };
                    console.log("\u001B[93m".concat(ID, "\u001B[0m password auth attempt \u001B[38;2;50;255;50mACCEPTED - USER \"").concat(user, "\"\u001B[0m"));
                    sockets[index].user = user;
                    currentKey = key;
                    return [2 /*return*/, socket.emit("valid_password", { key: key, expires: expires })];
                }
                console.log("\u001B[93m".concat(ID, "\u001B[0m password auth attempt \u001B[38;2;255;50;50mDENIED - INVALID PASSWORD \"").concat(password, "\" FOR USERNAME \"").concat(user, "\"\u001B[0m"));
                socket.emit("invalid_auth");
                user = "guest";
                return [2 /*return*/];
            });
        }); });
        socket.on("deauth", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.log("\u001B[92mde-authenticate\u001B[0m - user \u001B[94m\"".concat(user, "\"\u001B[0m from \u001B[93m").concat(ID, "\u001B[0m"));
                user = "guest";
                if (currentKey !== undefined)
                    exports.permaUserKeys[currentKey] = undefined;
                currentKey = undefined;
                return [2 /*return*/];
            });
        }); });
        socket.on("deauthall", function () { return __awaiter(void 0, void 0, void 0, function () {
            var _i, sockets_1, newSocket;
            return __generator(this, function (_a) {
                for (_i = 0, sockets_1 = sockets; _i < sockets_1.length; _i++) {
                    newSocket = sockets_1[_i];
                    if (newSocket.user === user)
                        newSocket.socket.emit("deauth");
                }
                console.log("\u001B[92mde-authenticate all\u001B[0m - user \u001B[94m\"".concat(user, "\"\u001B[0m from \u001B[93m").concat(ID, "\u001B[0m"));
                return [2 /*return*/];
            });
        }); });
        socket.on("list", function () { return __awaiter(void 0, void 0, void 0, function () {
            var time, results, userArray, _i, _a, book, fileExt, bookResults, res;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        time = new Date().getTime();
                        results = [];
                        userArray = [];
                        if (fs.existsSync("./Epubs/users/".concat(user)))
                            userArray = fs
                                .readdirSync("./Epubs/users/".concat(user))
                                .map(function (value) { return "users/".concat(user, "/").concat(value); });
                        _i = 0, _a = fs.readdirSync("./Epubs").concat(userArray);
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 7];
                        book = _a[_i];
                        if (!(cache[book] !== undefined)) return [3 /*break*/, 2];
                        results.push(__assign(__assign({}, cache[book].metadata), { book: book }));
                        return [3 /*break*/, 6];
                    case 2:
                        fileExt = path.extname(book).toLowerCase();
                        bookResults = void 0;
                        if (fileExt.length < 1)
                            return [3 /*break*/, 6];
                        if (!(fileExt !== ".epub")) return [3 /*break*/, 3];
                        bookResults = eventHandlers[fileExt].parseList("".concat(__dirname, "/Epubs/").concat(book));
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, parseEpub("./Epubs/".concat(book))];
                    case 4:
                        res = _b.sent();
                        bookResults = res;
                        cache[book] = res;
                        _b.label = 5;
                    case 5:
                        results.push(__assign(__assign({}, bookResults.metadata), { book: book }));
                        _b.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 1];
                    case 7:
                        debugLog("\u001B[92mlist\u001B[0m - \u001B[94m".concat(new Date().getTime() - time, "ms\u001B[0m from \u001B[93m").concat(ID, "\u001B[0m"));
                        socket.emit("list", results);
                        return [2 /*return*/];
                }
            });
        }); });
        socket.on("parse", function (book) { return __awaiter(void 0, void 0, void 0, function () {
            var fileExt, results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(cache[book] !== undefined)) return [3 /*break*/, 1];
                        socket.emit("results", { book: book, results: cache[book] });
                        debugLog("\u001B[92mparse (C)\u001B[0m - \u001B[94m".concat(book, "\u001B[0m from \u001B[93m").concat(ID, "\u001B[0m"));
                        return [3 /*break*/, 3];
                    case 1:
                        if (book.startsWith("users/") && !book.startsWith("users/".concat(user)))
                            return [2 /*return*/];
                        fileExt = path.extname(book).toLowerCase();
                        if (fileExt !== ".epub")
                            return [2 /*return*/, parseEmitter.emit(fileExt, {
                                    loc: "".concat(__dirname, "/Epubs/").concat(book),
                                    socket: socket,
                                    user: user
                                })];
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
        socket.on("delete", function (book) { return __awaiter(void 0, void 0, void 0, function () {
            var _i, sockets_2, socketUser;
            return __generator(this, function (_a) {
                if (book.startsWith("users/") && !book.startsWith("users/".concat(user))) {
                    debugLog("\u001B[38;2;255;50;50mdelete\u001B[0m - \u001B[94m".concat(book, "\u001B[0m from \u001B[93m").concat(ID, "\u001B[38;2;255;50;50m DENIED - WRONG USER \"").concat(book.split("/")[1], "\" EXPECTED \"").concat(user, "\"\u001B[0m"));
                    return [2 /*return*/];
                }
                debugLog("\u001B[38;2;255;50;50mdelete\u001B[0m - \u001B[94m".concat(book, "\u001B[0m from \u001B[93m").concat(ID, "\u001B[38;2;50;255;50m ACCEPTED\u001B[0m"));
                cache[book] = undefined;
                for (_i = 0, sockets_2 = sockets; _i < sockets_2.length; _i++) {
                    socketUser = sockets_2[_i];
                    if (book.startsWith("users/") && socketUser.user === user)
                        socket.emit("delete", book);
                    else
                        socket.emit("delete", book);
                }
                fs.rmSync("./Epubs/".concat(book));
                return [2 /*return*/];
            });
        }); });
        return [2 /*return*/];
    });
}); });
server.listen(3000, function () {
    console.log("Listening on *:3000... Access at http://localhost:3000");
    // if(debug) require("openurl").open("http://localhost:3000");
});
