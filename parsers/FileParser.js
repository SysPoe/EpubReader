"use strict";
exports.__esModule = true;
exports.ListableFile = void 0;
var ListableFile = /** @class */ (function () {
    function ListableFile(title, creator) {
        if (title === void 0) { title = ""; }
        if (creator === void 0) { creator = ""; }
        this.metadata = { title: title, creator: creator };
    }
    return ListableFile;
}());
exports.ListableFile = ListableFile;
