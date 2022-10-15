"use strict";
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
exports.PdfParser = void 0;
var FileParser_1 = require("./FileParser");
var main_1 = require("../main");
var fs = require("fs");
var path = require("path");
var common_1 = require("../common");
var PdfParser = /** @class */ (function () {
    function PdfParser() {
    }
    PdfParser.prototype.parseList = function (absoluteFilePath) {
        return new FileParser_1.ListableFile(path.basename(absoluteFilePath), "[none]");
    };
    PdfParser.prototype.register = function (app, emitter, fileList) {
        var _this = this;
        app.get("/pdf", function (req, res) {
            var url = new URL("http://example.com".concat(req.url));
            var key = main_1.tempUserKeys[url.searchParams.get("key")];
            var name = url.searchParams.get("name");
            if (key === undefined) {
                console.log("\u001B[93m".concat(req.connection.remoteAddress, "\u001B[0m request \u001B[94m").concat(name, "\u001B[0m \u001B[38;2;255;50;50mDENIED - INVALID KEY\u001B[0m"));
                res.writeHead(401);
                return res.end();
            }
            if (key.status === "expired") {
                console.log("\u001B[93m".concat(req.connection.remoteAddress, "\u001B[0m request \u001B[94m").concat(name, "\u001B[0m \u001B[38;2;255;50;50mDENIED - EXPIRED KEY \"").concat(url.searchParams.get("key"), "\"\u001B[0m"));
                res.writeHead(401);
                return res.end();
            }
            if (key.type !== "pdf") {
                console.log("\u001B[93m".concat(req.connection.remoteAddress, "\u001B[0m request \u001B[94m").concat(name, "\u001B[0m \u001B[38;2;255;50;50mDENIED - INVALID KEY TYPE \"").concat(key.type, "\" EXPECTED \"pdf\"\u001B[0m"));
                main_1.tempUserKeys[url.searchParams.get("key")].status = "expired";
                res.writeHead(401);
                return res.end();
            }
            if (name.startsWith("users/") &&
                !name.startsWith("users/".concat(key.user))) {
                console.log("\u001B[93m".concat(req.connection.remoteAddress, "\u001B[0m request \u001B[94m").concat(name, "\u001B[0m \u001B[38;2;255;50;50mDENIED - WRONG USER \"").concat(name.split("/")[1], "\" EXPECTED \"").concat(key.user, "\"\u001B[0m"));
                res.writeHead(401);
                main_1.tempUserKeys[url.searchParams.get("key")].status = "expired";
                return res.end();
            }
            main_1.tempUserKeys[url.searchParams.get("key")].status = "expired";
            fs.readFile("".concat(__dirname, "/../Epubs/").concat(name), function (err, data) {
                if (err) {
                    res.writeHead(404);
                    return res.end();
                }
                res.writeHead(200, { "Content-Type": "application/pdf" });
                res.end(data);
            });
        });
        emitter.on(".pdf", function (res) { return __awaiter(_this, void 0, void 0, function () {
            var loc, socket, user, basename, split, key;
            return __generator(this, function (_a) {
                loc = res.loc, socket = res.socket, user = res.user;
                basename = path.basename(loc);
                split = loc.split("/");
                if (split[split.length - 3] === "users")
                    basename = split.slice(-3).join("/");
                key = (0, common_1.generateKey)(main_1.KEY_SIZE);
                main_1.tempUserKeys[key] = { user: user, type: "pdf", status: "valid" };
                socket.emit("pdf", { basename: basename, key: key });
                return [2 /*return*/];
            });
        }); });
        fileList[".pdf"] = this;
        console.log("Registered \u001B[38;2;101;248;205mPDF Parser\u001B[0m for \u001B[38;2;243;205;53m.pdf\u001B[0m files");
        return fileList;
    };
    return PdfParser;
}());
exports.PdfParser = PdfParser;
